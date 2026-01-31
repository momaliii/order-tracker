import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { isDirectTouchpoint } from '../../lib/utils.js';
import type { Touchpoint } from '@prisma/client';

export const attributionRouter = Router();

// Attribution window in days (default 30)
const DEFAULT_ATTRIBUTION_WINDOW = 30;

/**
 * Link orders to touchpoints and create attribution records
 */
async function linkOrderToTouchpoints(orderId: string, attributionWindowDays: number = DEFAULT_ATTRIBUTION_WINDOW) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { attributions: true },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // If order already has attributions, skip
  if (order.attributions.length > 0) {
    return order.attributions;
  }
  
  const windowStart = new Date(order.createdAt);
  windowStart.setDate(windowStart.getDate() - attributionWindowDays);
  
  // Find touchpoints for this visitor within the attribution window
  let touchpoints: Touchpoint[] = [];
  
  if (order.visitorId) {
    // Direct link via visitor ID
    touchpoints = await prisma.touchpoint.findMany({
      where: {
        visitorId: order.visitorId,
        timestamp: {
          gte: windowStart,
          lte: order.createdAt,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  } else {
    // Heuristic linking: try to find by hashed phone/email + time window
    // This is less accurate but still useful
    if (order.customerPhone) {
      // Find visitors with matching touchpoints that might have the same phone
      // Since we hash phones, we can't directly match, so we'll use time-based heuristics
      // For now, we'll skip heuristic linking and only use direct visitor links
      touchpoints = [];
    } else {
      touchpoints = [];
    }
  }
  
  // Filter out direct traffic (no attribution data)
  const attributedTouchpoints = touchpoints.filter(
    (tp) =>
      !isDirectTouchpoint({
        utm_source: tp.utmSource,
        utm_medium: tp.utmMedium,
        fbclid: tp.fbclid,
        ttclid: tp.ttclid,
        gclid: tp.gclid,
        referrer: tp.referrer,
      })
  );
  
  if (attributedTouchpoints.length === 0) {
    return [];
  }
  
  // Create attribution records
  const firstTouchpoint = attributedTouchpoints[0];
  const lastTouchpoint = attributedTouchpoints[attributedTouchpoints.length - 1];
  
  const attributions = [];
  
  // First touch attribution
  const timeToPurchaseFirst = Math.floor(
    (order.createdAt.getTime() - firstTouchpoint.timestamp.getTime()) / 1000
  );
  attributions.push(
    await prisma.attribution.create({
      data: {
        orderId: order.id,
        touchpointId: firstTouchpoint.id,
        model: 'first_touch',
        timeToPurchase: timeToPurchaseFirst,
      },
    })
  );
  
  // Last touch attribution
  const timeToPurchaseLast = Math.floor(
    (order.createdAt.getTime() - lastTouchpoint.timestamp.getTime()) / 1000
  );
  attributions.push(
    await prisma.attribution.create({
      data: {
        orderId: order.id,
        touchpointId: lastTouchpoint.id,
        model: 'last_touch',
        timeToPurchase: timeToPurchaseLast,
      },
    })
  );
  
  // Assisted touches (all touchpoints except first and last)
  for (const touchpoint of attributedTouchpoints.slice(1, -1)) {
    const timeToPurchase = Math.floor(
      (order.createdAt.getTime() - touchpoint.timestamp.getTime()) / 1000
    );
    attributions.push(
      await prisma.attribution.create({
        data: {
          orderId: order.id,
          touchpointId: touchpoint.id,
          model: 'assisted',
          timeToPurchase,
        },
      })
    );
  }
  
  return attributions;
}

/**
 * Get revenue attribution by source/medium/campaign
 */
attributionRouter.get('/revenue', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      model = 'last_touch',
      groupBy = 'source',
      status,
    } = req.query;

    const groupByKey = typeof groupBy === 'string' ? groupBy : 'source';
    const modelKey = typeof model === 'string' ? model : 'last_touch';
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Link orders to touchpoints if not already linked
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(status ? { status: status as string } : {}),
      },
      include: {
        attributions: {
          where: { model: modelKey },
          include: {
            touchpoint: true,
          },
        },
      },
    });
    
    // Process orders and link if needed
    for (const order of orders) {
      if (order.attributions.length === 0) {
        await linkOrderToTouchpoints(order.id);
      }
    }
    
    // Re-fetch with attributions
    const ordersWithAttributions = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(status ? { status: status as string } : {}),
      },
      include: {
        attributions: {
          where: { model: modelKey },
          include: {
            touchpoint: true,
          },
        },
      },
    });
    
    // Aggregate revenue by groupBy field
    const revenueMap = new Map<string, { revenue: number; orders: number; aov: number }>();
    
    for (const order of ordersWithAttributions) {
      if (order.attributions.length === 0) {
        // No attribution - mark as "direct" or "unknown"
        const key = 'direct';
        const existing = revenueMap.get(key) || { revenue: 0, orders: 0, aov: 0 };
        existing.revenue += order.totalCost;
        existing.orders += 1;
        existing.aov = existing.revenue / existing.orders;
        revenueMap.set(key, existing);
        continue;
      }
      
      // Use the attribution touchpoint
      const attribution = order.attributions[0];
      const tp = attribution.touchpoint;
      
      let key: string;
      switch (groupByKey) {
        case 'source':
          key = tp.utmSource || 'direct';
          break;
        case 'medium':
          key = tp.utmMedium || 'direct';
          break;
        case 'campaign':
          key = tp.utmCampaign || 'direct';
          break;
        case 'creative':
          key = tp.utmContent || 'direct';
          break;
        case 'source_medium':
          key = `${tp.utmSource || 'direct'}/${tp.utmMedium || 'direct'}`;
          break;
        default:
          key = tp.utmSource || 'direct';
      }
      
      const existing = revenueMap.get(key) || { revenue: 0, orders: 0, aov: 0 };
      existing.revenue += order.totalCost;
      existing.orders += 1;
      existing.aov = existing.revenue / existing.orders;
      revenueMap.set(key, existing);
    }
    
    const results = Array.from(revenueMap.entries()).map(([key, data]) => ({
      [groupByKey]: key,
      revenue: data.revenue,
      orders: data.orders,
      aov: data.aov,
    }));
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error getting revenue attribution:', error);
    res.status(500).json({ success: false, error: 'Failed to get revenue attribution' });
  }
});

/**
 * Get order details with full attribution path
 */
attributionRouter.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        statusEvents: {
          orderBy: { timestamp: 'desc' },
        },
        attributions: {
          include: {
            touchpoint: true,
          },
          orderBy: {
            touchpoint: {
              timestamp: 'asc',
            },
          },
        },
      },
    });
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Link if not already linked
    if (order.attributions.length === 0) {
      await linkOrderToTouchpoints(order.id);
      // Re-fetch
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          statusEvents: {
            orderBy: { timestamp: 'desc' },
          },
          attributions: {
            include: {
              touchpoint: true,
            },
            orderBy: {
              touchpoint: {
                timestamp: 'asc',
              },
            },
          },
        },
      });
      return res.json({ success: true, data: updatedOrder });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, error: 'Failed to get order' });
  }
});

/**
 * Get all orders with pagination
 */
attributionRouter.get('/orders', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50',
      startDate,
      endDate,
      status,
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (status) {
      where.status = status as string;
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          attributions: {
            where: { model: 'last_touch' },
            include: {
              touchpoint: true,
            },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, error: 'Failed to get orders' });
  }
});

/**
 * Trigger attribution linking for an order
 */
attributionRouter.post('/link/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const attributions = await linkOrderToTouchpoints(orderId);
    res.json({ success: true, attributions: attributions.length });
  } catch (error) {
    console.error('Error linking order:', error);
    res.status(500).json({ success: false, error: 'Failed to link order' });
  }
});
