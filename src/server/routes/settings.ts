import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { hashSecret } from '../../lib/utils.js';
import { verifySupabaseJwt } from '../lib/supabaseAuth.js';

export const settingsRouter = Router();

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function requireAdmin(req: any): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return { ok: false, message: 'Missing Authorization header' };
  }

  const token = auth.slice('Bearer '.length).trim();
  try {
    const user = await verifySupabaseJwt(token);
    const allow = parseAdminEmails();
    if (allow.size === 0) {
      return { ok: false, message: 'ADMIN_EMAILS not configured on server' };
    }
    if (!user.email || !allow.has(user.email.toLowerCase())) {
      return { ok: false, message: 'Forbidden' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unauthorized' };
  }
}

settingsRouter.get('/status', async (req, res) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ success: false, error: auth.message });

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

settingsRouter.put('/easyorders-webhook-secret', async (req, res) => {
  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ success: false, error: auth.message });

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

