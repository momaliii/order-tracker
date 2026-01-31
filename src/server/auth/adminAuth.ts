import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';

export const ADMIN_SESSION_COOKIE = 'att_admin_session';

export type AdminAuthContext = {
  adminUserId: string;
  username: string;
  sessionId: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    adminAuth?: AdminAuthContext;
  }
}

export function createSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setAdminSessionCookie(res: Response, sessionId: string, maxAgeMs: number) {
  res.cookie(ADMIN_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeMs,
    path: '/',
  });
}

export function clearAdminSessionCookie(res: Response) {
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (!sessionId) return res.status(401).json({ success: false, error: 'Not authenticated' });

  const session = await prisma.adminSession.findUnique({
    where: { id: String(sessionId) },
    include: { adminUser: true },
  });

  if (!session) return res.status(401).json({ success: false, error: 'Invalid session' });
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return res.status(401).json({ success: false, error: 'Session expired' });
  }

  req.adminAuth = {
    adminUserId: session.adminUserId,
    username: session.adminUser.username,
    sessionId: session.id,
  };

  return next();
}

