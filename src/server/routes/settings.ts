import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { hashSecret } from '../../lib/utils.js';
import { requireAdminSession } from '../auth/adminAuth.js';

export const settingsRouter = Router();

settingsRouter.get('/status', requireAdminSession, async (req, res) => {

  const rec = await prisma.setting.findUnique({
    where: { key: 'easyorders_webhook_secret_hash' },
  });

  res.json({
    success: true,
    easyorders: {
      configured: Boolean(process.env.EASYORDERS_WEBHOOK_SECRET || rec?.value),
      source: process.env.EASYORDERS_WEBHOOK_SECRET ? 'env' : rec?.value ? 'dashboard' : 'none',
      updatedAt: rec?.updatedAt ?? null,
    },
  });
});

settingsRouter.put('/easyorders-webhook-secret', requireAdminSession, async (req, res) => {

  const schema = z.object({
    secret: z.string().min(6),
  });

  try {
    const { secret } = schema.parse(req.body);
    const secretHash = hashSecret(secret);

    await prisma.setting.upsert({
      where: { key: 'easyorders_webhook_secret_hash' },
      update: { value: secretHash },
      create: { key: 'easyorders_webhook_secret_hash', value: secretHash },
    });

    return res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: e.errors });
    }
    return res.status(500).json({ success: false, error: 'Failed to save secret' });
  }
});

