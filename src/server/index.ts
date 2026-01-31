import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { prisma } from '../lib/prisma.js';
import { collectRouter } from './routes/collect.js';
import { webhookRouter } from './routes/webhooks.js';
import { attributionRouter } from './routes/attribution.js';
import { settingsRouter } from './routes/settings.js';
import { authRouter } from './routes/auth.js';
import { requireAdminSession } from './auth/adminAuth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
app.use(cors({
  origin: (origin, callback) => {
    // If no allowlist provided, allow all (useful when dashboard is served same-origin)
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/collect', collectRouter);
app.use('/api/webhooks', webhookRouter);
// Protect analytics data (dashboard must login)
app.use('/api/attribution', requireAdminSession, attributionRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);

// Serve tracker script
app.get('/tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const trackerPath = fileURLToPath(new URL('../tracker/tracker.js', import.meta.url));
  res.sendFile(path.resolve(trackerPath));
});

// Serve dashboard (production)
if (isProd) {
  const dashboardDist = path.resolve(process.cwd(), 'dashboard', 'dist');
  app.use(express.static(dashboardDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(dashboardDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Tracker available at http://localhost:${PORT}/tracker.js`);
});

// Bootstrap admin user from env (optional but recommended)
async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!username || !passwordHash) return;

  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
}

ensureAdminUser().catch((e) => {
  console.error('Failed to ensure admin user:', e);
});
