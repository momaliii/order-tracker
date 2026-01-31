import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import {
  clearAdminSessionCookie,
  createSessionId,
  requireAdminSession,
  setAdminSessionCookie,
} from '../auth/adminAuth.js';

export const authRouter = Router();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

authRouter.get('/me', async (req, res) => {
  const sessionId = req.cookies?.att_admin_session;
  if (!sessionId) return res.json({ success: true, authenticated: false });

  const session = await prisma.adminSession.findUnique({
    where: { id: String(sessionId) },
    include: { adminUser: true },
  });

  if (!session) return res.json({ success: true, authenticated: false });
  if (session.expiresAt.getTime() <= Date.now()) return res.json({ success: true, authenticated: false });

  return res.json({
    success: true,
    authenticated: true,
    username: session.adminUser.username,
  });
});

authRouter.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });

  try {
    const { username, password } = schema.parse(req.body);

    const user = await prisma.adminUser.findUnique({
      where: { username },
    });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const sessionId = createSessionId();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await prisma.adminSession.create({
      data: {
        id: sessionId,
        adminUserId: user.id,
        expiresAt,
      },
    });

    setAdminSessionCookie(res, sessionId, SESSION_TTL_MS);
    return res.json({ success: true, username: user.username });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid payload', details: e.errors });
    }
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

authRouter.post('/logout', async (req, res) => {
  const sessionId = req.cookies?.att_admin_session;
  if (sessionId) {
    await prisma.adminSession.delete({ where: { id: String(sessionId) } }).catch(() => {});
  }
  clearAdminSessionCookie(res);
  return res.json({ success: true });
});

authRouter.post('/logout-all', requireAdminSession, async (req, res) => {
  await prisma.adminSession.deleteMany({ where: { adminUserId: req.adminAuth!.adminUserId } });
  clearAdminSessionCookie(res);
  return res.json({ success: true });
});

