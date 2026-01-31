import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { hashIdentifier, hashSecret } from '../../lib/utils.js';

export const webhookRouter = Router();

const easyOrdersOrderSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  store_id: z.string(),
  cost: z.number(),
  shipping_cost: z.number(),
  total_cost: z.number(),
  status: z.string(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  government: z.string().optional(),
  address: z.string().optional(),
  payment_method: z.string().optional(),
  cart_items: z.array(z.object({
    id: z.string(),
    product_id: z.string(),
    variant_id: z.string().optional(),
    price: z.number(),
    quantity: z.number(),
    product: z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string().optional(),
      price: z.number(),
    }),
    variant: z.object({
      id: z.string().optional(),
      taager_code: z.string().optional(),
    }).optional(),
  })),
});

const easyOrdersStatusUpdateSchema = z.object({
  event_type: z.literal('order-status-update'),
  order_id: z.string(),
  old_status: z.string().optional(),
  new_status: z.string(),
  payment_ref_id: z.string().optional(),
});

async function verifyWebhookSecret(req: any): Promise<boolean> {
  const providedSecret = req.headers['secret'] || req.headers.secret;

  // If env secret is configured, always use it
  const envSecret = process.env.EASYORDERS_WEBHOOK_SECRET;
  if (envSecret) {
    return Boolean(providedSecret) && String(providedSecret) === envSecret;
  }

  // Otherwise, try DB-stored hash (set via dashboard)
  const rec = await prisma.setting.findUnique({
    where: { key: 'easyorders_webhook_secret_hash' },
  });
  if (rec?.value) {
    if (!providedSecret) return false;
    return hashSecret(String(providedSecret)) === rec.value;
  }

  // If nothing configured, allow (dev-friendly) but warn loudly
  console.warn('EasyOrders webhook secret not configured (env or dashboard). Skipping verification.');
  return true;
}

webhookRouter.post('/easyorders', async (req, res) => {
  try {
    // Verify webhook secret
    if (!(await verifyWebhookSecret(req))) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
    }
    
    // Check if this is an order status update or order created
    if (req.body.event_type === 'order-status-update') {
      const data = easyOrdersStatusUpdateSchema.parse(req.body);
      
      // Find order by external order ID
      const order = await prisma.order.findUnique({
        where: { orderId: data.order_id },
      });
      
      if (!order) {
        console.warn(`Order ${data.order_id} not found for status update`);
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: { status: data.new_status },
      });
      
      // Create status event
      await prisma.orderStatusEvent.create({
        data: {
          orderId: order.id,
          oldStatus: data.old_status,
          newStatus: data.new_status,
          paymentRefId: data.payment_ref_id,
          timestamp: new Date(),
        },
      });
      
      return res.json({ success: true, message: 'Order status updated' });
    }
    
    // Handle order created
    const data = easyOrdersOrderSchema.parse(req.body);
    
    // Check if order already exists (idempotency)
    const existingOrder = await prisma.order.findUnique({
      where: { orderId: data.id },
    });
    
    if (existingOrder) {
      console.log(`Order ${data.id} already exists, skipping`);
      return res.json({ success: true, message: 'Order already processed' });
    }
    
    // Try to find visitor by vid if passed in order (via custom field/note)
    // For now, we'll create order without visitor link and link it later via attribution
    let visitorId: string | undefined = undefined;
    
    // TODO: If EasyOrders supports custom fields/notes, extract vid from there
    // For now, we'll rely on heuristic linking via attribution engine
    
    // Hash customer identifiers for privacy
    const hashedPhone = data.phone ? hashIdentifier(data.phone) : null;
    const hashedEmail = null; // EasyOrders doesn't provide email in webhook
    
    // Create order
    const order = await prisma.order.create({
      data: {
        orderId: data.id,
        visitorId: visitorId || null,
        storeId: data.store_id,
        totalCost: data.total_cost,
        shippingCost: data.shipping_cost,
        currency: 'USD', // TODO: Get from order if available
        status: data.status,
        customerName: data.full_name || null,
        customerPhone: hashedPhone,
        customerEmail: hashedEmail,
        address: data.address || null,
        createdAt: new Date(data.created_at),
        items: {
          create: data.cart_items.map(item => ({
            productId: item.product_id,
            variantId: item.variant_id,
            price: item.price,
            quantity: item.quantity,
            sku: item.product.sku || null,
          })),
        },
      },
    });
    
    // Create initial status event
    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        oldStatus: null,
        newStatus: data.status,
        timestamp: new Date(data.created_at),
      },
    });
    
    // Trigger attribution linking (async, don't wait)
    // This will be handled by a background job or on-demand via API
    // For now, we'll link it when attribution queries are made
    
    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Error processing webhook:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid webhook payload', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to process webhook' });
  }
});
