# Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. **Create Railway Account**: https://railway.app
2. **New Project** → **Deploy from GitHub** (or use Railway CLI)
3. **Add PostgreSQL** service
4. **Set Environment Variables**:
   - `DATABASE_URL` (auto-set by Railway PostgreSQL)
   - `EASYORDERS_WEBHOOK_SECRET` (from EasyOrders dashboard)
   - `ALLOWED_ORIGINS` (your dashboard URL + website domain)
   - `NODE_ENV=production`
   - `PORT` (Railway sets this automatically)

5. **Deploy Commands**:
   - Build: `npm run build:server`
   - Start: `npm start`
   - Migrations: Add a one-off service or run `npm run db:migrate` via Railway CLI

6. **Dashboard**: Deploy separately to Vercel/Netlify (see below)

### Option 2: Render

1. **Backend Service**:
   - New Web Service
   - Connect GitHub repo
   - Build: `npm run build:server`
   - Start: `npm start`
   - Add PostgreSQL database
   - Set environment variables

2. **Dashboard**: Deploy as Static Site (see below)

### Option 3: DigitalOcean App Platform

1. **Create App** from GitHub
2. **Add PostgreSQL** database
3. **Set Environment Variables**
4. **Build & Run Commands**: Same as Railway

### Option 4: Self-Hosted (VPS)

#### Backend Setup

```bash
# On your VPS (Ubuntu/Debian)
sudo apt update
sudo apt install nodejs npm postgresql

# Clone repo
git clone <your-repo>
cd real-order-tracker

# Install dependencies
npm install

# Set up PostgreSQL
sudo -u postgres createdb attribution_tracker
sudo -u postgres createuser attribution_user

# Set environment variables
nano .env
# Add DATABASE_URL, etc.

# Run migrations
npm run db:migrate

# Build
npm run build:server

# Use PM2 for process management
npm install -g pm2
pm2 start dist/server/index.js --name attribution-tracker
pm2 save
pm2 startup
```

#### Dashboard Setup

```bash
cd dashboard
npm install
npm run build

# Serve with nginx
sudo apt install nginx
sudo nano /etc/nginx/sites-available/attribution-dashboard

# Add nginx config:
server {
    listen 80;
    server_name dashboard.yourdomain.com;
    root /path/to/real-order-tracker/dashboard/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/attribution-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Dashboard Deployment (Static)

### Vercel

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Navigate to dashboard**: `cd dashboard`
3. **Deploy**: `vercel`
4. **Set Environment Variable**: `VITE_API_URL=https://your-backend-url.com`
5. **Redeploy**: `vercel --prod`

### Netlify

1. **Connect GitHub repo**
2. **Build Settings**:
   - Base directory: `dashboard`
   - Build command: `npm run build`
   - Publish directory: `dashboard/dist`
3. **Environment Variables**: `VITE_API_URL=https://your-backend-url.com`
4. **Deploy**

## Environment Variables Checklist

### Backend (.env)

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
PORT=3000
NODE_ENV=production
EASYORDERS_WEBHOOK_SECRET="your-secret-from-easyorders"
ALLOWED_ORIGINS="https://your-dashboard.com,https://your-website.com"
```

### Dashboard (Build-time)

```bash
VITE_API_URL="https://your-backend-api.com"
```

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Backend health check: `curl https://your-api.com/health`
- [ ] Tracker script accessible: `curl https://your-api.com/tracker.js`
- [ ] Dashboard loads and connects to API
- [ ] EasyOrders webhook configured with production URL
- [ ] Test order created and appears in dashboard
- [ ] CORS configured correctly
- [ ] SSL/HTTPS enabled (required for webhooks)

## Monitoring

### Health Checks

Set up monitoring for:
- `GET /health` endpoint (should return 200)
- Database connection
- Webhook endpoint availability

### Logs

- Backend logs: Check your hosting platform's logs
- Database queries: Enable query logging in Prisma for debugging
- Webhook logs: Check server logs for webhook processing errors

## Scaling Considerations

- **Database**: Use connection pooling (Prisma does this automatically)
- **API**: Consider adding Redis for session caching if needed
- **CDN**: Serve tracker.js via CDN for better performance
- **Rate Limiting**: Add rate limiting middleware for `/api/collect` endpoint

## Security Checklist

- [ ] Webhook secret is set and verified
- [ ] CORS origins are restricted
- [ ] Database credentials are secure
- [ ] HTTPS/SSL enabled
- [ ] Environment variables not exposed in client code
- [ ] IP addresses are hashed (already implemented)
- [ ] Customer data (phone/email) is hashed (already implemented)
