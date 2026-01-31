# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Database: **Supabase (Recommended)** or PostgreSQL 14+ installed locally
- EasyOrders account with API access

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
cd dashboard && npm install && cd ..
```

### 2. Set Up Database

#### Option A: Supabase (Recommended - Easiest)

1. **Create Supabase Account**: Go to https://supabase.com and sign up
2. **Create New Project**:
   - Click "New Project"
   - Choose organization
   - Enter project name (e.g., "attribution-tracker")
   - Set a database password (save it!)
   - Choose a region close to you
   - Wait for project to be created (~2 minutes)

3. **Get Connection String**:
   - Go to **Project Settings** → **Database**
   - Scroll to **Connection String** section
   - Copy the **"Connection pooling"** URL (for production) or **"Direct connection"** (for migrations)
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

4. **Update `.env`**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and paste your Supabase connection string:
   ```
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   ```

#### Option B: Local PostgreSQL

1. Install PostgreSQL 14+ on your machine
2. Create database:
   ```bash
   createdb attribution_tracker
   ```
3. Update `.env` with local connection string:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/attribution_tracker?schema=public"
   ```

### 3. Configure Environment

Copy the example environment file (if you haven't already):

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL`: Your database connection string (from step 2)
- `EASYORDERS_WEBHOOK_SECRET`: Will be set after creating webhook in EasyOrders dashboard
- `ADMIN_API_KEY`: Required if you want to set the EasyOrders secret from the dashboard UI
- `PORT`: Backend server port (default: 3000)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

Example `.env` (Supabase):
```
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
PORT=3000
EASYORDERS_WEBHOOK_SECRET=""
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations to create tables
npm run db:migrate
```

**Note for Supabase**: Prisma migrations use `DIRECT_URL` (direct 5432). Your app runtime uses `DATABASE_URL` (pooling 6543). This avoids common Prisma+pgBouncer issues.

Or use the setup script:
```bash
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3000`
- Dashboard on `http://localhost:5173`

### 6. Add Tracker to Your Website

Add this snippet before `</head>` on all pages of your website:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'http://localhost:3000/tracker.js';
    script.async = true;
    script.setAttribute('data-api-url', 'http://localhost:3000');
    document.head.appendChild(script);
  })();
</script>
```

**For production**, replace `http://localhost:3000` with your deployed API URL.

### 7. Set Up EasyOrders Webhook

1. Log into your EasyOrders seller dashboard
2. Navigate to **Public API** → **Webhooks**
3. Click **Create Webhook**
4. Enter your webhook URL: `https://your-domain.com/api/webhooks/easyorders`
   - For local testing, use a tool like [ngrok](https://ngrok.com/) to expose your local server
5. Copy the generated secret key
6. Add it to your `.env` file as `EASYORDERS_WEBHOOK_SECRET`
7. Restart your server

### 8. Verify Installation

1. Visit your website (with the tracker installed)
2. Check the browser console for any errors
3. Visit `http://localhost:5173` to see the dashboard
4. Create a test order in EasyOrders
5. Check the dashboard to see if the order appears

## Testing the Tracker

### Manual Testing

1. Visit your website with UTM parameters:
   ```
   https://your-site.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=test
   ```

2. Check the browser's Network tab - you should see a request to `/api/collect`

3. Check the dashboard - you should see a page view event

### Testing Webhooks Locally

Use [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3000
```

Then use the ngrok URL in your EasyOrders webhook configuration.

## Production Deployment

### Backend Deployment

1. Build the backend:
   ```bash
   npm run build:server
   ```

2. Set environment variables on your hosting platform

3. Run migrations:
   ```bash
   npm run db:migrate
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Dashboard Deployment

1. Build the dashboard:
   ```bash
   npm run build:dashboard
   ```

2. Deploy the `dashboard/dist` folder to a static hosting service (Vercel, Netlify, etc.)

3. Update the API URL in your deployment:
   - Set `VITE_API_URL` environment variable to your backend URL
   - Or update the API_URL in `dashboard/src/components/Dashboard.tsx`

### Update Tracker Script URL

Update the tracker script URL in your website to point to your production backend:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-api-domain.com/tracker.js';
    script.async = true;
    script.setAttribute('data-api-url', 'https://your-api-domain.com');
    document.head.appendChild(script);
  })();
</script>
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure database exists: `createdb attribution_tracker`

### Tracker Not Sending Events

- Check browser console for errors
- Verify CORS settings in `.env` (ALLOWED_ORIGINS)
- Check network tab for failed requests
- Verify API_URL is correct

### Webhooks Not Working

- Verify webhook secret matches in `.env`
- Check server logs for webhook errors
- Test webhook endpoint manually with curl:
  ```bash
  curl -X POST http://localhost:3000/api/webhooks/easyorders \
    -H "Content-Type: application/json" \
    -H "secret: YOUR_SECRET" \
    -d '{"test": "data"}'
  ```

### Dashboard Not Loading Data

- Verify backend is running and accessible
- Check browser console for API errors
- Verify CORS settings allow dashboard origin
- Check date range filters in dashboard

## Next Steps

- Set up server-side conversion APIs (Meta CAPI, TikTok Events API) for better attribution
- Configure custom attribution windows
- Set up alerts for order status changes
- Export data for external analysis
