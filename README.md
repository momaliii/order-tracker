# Ecommerce Attribution Tracker

A platform-agnostic attribution tracking system that captures visitor touchpoints and links them to real orders for accurate revenue attribution across Meta, TikTok, Google, Snapchat, and other ad platforms.

## Features

- **Universal Tracker Snippet**: One JavaScript snippet to add to any website
- **Multi-Touch Attribution**: First-touch, last-touch, and assisted touch attribution models
- **Real Order Tracking**: Webhook integration with EasyOrders (extensible to other platforms)
- **Revenue Attribution**: Track which platform/campaign/ad/creative drove each purchase
- **Dashboard**: Visual reports showing revenue, orders, and attribution data

## Quick Start

### Prerequisites

- Node.js 18+ 
- Database: **Supabase (Recommended)** or PostgreSQL 14+
- EasyOrders account with API access

### Installation

1. Clone and install dependencies:
```bash
npm install
cd dashboard && npm install && cd ..
```

2. Set up database and environment:
   - **Option A (Recommended)**: Use Supabase - see [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
   - **Option B**: Use local PostgreSQL or other hosting
   
   Then copy and edit `.env`:
```bash
cp .env.example .env
# Edit .env with your database URL and webhook secret
```

If you want to set the EasyOrders webhook secret from the dashboard UI, also set `ADMIN_API_KEY` in `.env`.

3. Set up database:
```bash
npm run db:generate
npm run db:migrate
```

4. Start development servers:
```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3000`
- Dashboard on `http://localhost:5173`

### Adding the Tracker to Your Website

Add this snippet before `</head>` on all pages:

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

For production, replace `http://localhost:3000` with your deployed API URL.

### Setting Up EasyOrders Webhook

1. Log into your EasyOrders seller dashboard
2. Go to **Public API** → **Webhooks**
3. Click **Create Webhook**
4. Enter your webhook URL: `https://your-domain.com/api/webhooks/easyorders`
5. Copy the generated secret key
6. Add it to your `.env` file as `EASYORDERS_WEBHOOK_SECRET`

## Architecture

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Dashboard**: React + TypeScript + Vite
- **Tracker**: Vanilla JavaScript (no dependencies)

## API Endpoints

- `POST /api/collect` - Event collection endpoint (used by tracker)
- `POST /api/webhooks/easyorders` - EasyOrders webhook receiver
- `GET /api/attribution/*` - Attribution query endpoints (used by dashboard)

## License

MIT
