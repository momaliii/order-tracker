# Quick Start Guide

Get your attribution tracker running in 5 minutes!

## 1. Install Dependencies

```bash
npm install
cd dashboard && npm install && cd ..
```

## 2. Set Up Database (Supabase Recommended)

### Quick Supabase Setup:

1. **Create account** at https://supabase.com
2. **Create new project** → Wait ~2 minutes
3. **Get connection string**:
   - Project Settings → Database → Connection String
   - Copy the **"Direct connection"** URL (for migrations)
4. **Update `.env`**:
   ```bash
   cp .env.example .env
   # Paste your Supabase DATABASE_URL (pooling) + DIRECT_URL (direct) in .env
   ```

Then run migrations:

```bash
npm run db:generate
npm run db:migrate
```

**Note**: For Supabase, use the "Direct connection" URL for migrations, then switch to "Connection pooling" URL for running the app (better performance).

## 3. Start Servers

```bash
npm run dev
```

- Backend: http://localhost:3000
- Dashboard: http://localhost:5173

## 4. Add Tracker to Your Website

Paste this before `</head>`:

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

## 5. Set Up EasyOrders Webhook

1. Go to EasyOrders dashboard → **Public API** → **Webhooks**
2. Create webhook: `http://your-domain.com/api/webhooks/easyorders`
3. Copy secret → Add to `.env` as `EASYORDERS_WEBHOOK_SECRET`
4. Restart server

## 6. Test It!

1. Visit your site with UTM: `?utm_source=test&utm_campaign=demo`
2. Check dashboard at http://localhost:5173
3. Create a test order in EasyOrders
4. See it appear in the dashboard!

## What's Next?

- See [SETUP.md](SETUP.md) for detailed setup
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- See [README.md](README.md) for full documentation

## Troubleshooting

**Database connection error?**
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`

**Tracker not working?**
- Check browser console for errors
- Verify CORS settings in `.env`

**Webhook not receiving orders?**
- Check webhook secret matches
- Test with: `curl -X POST http://localhost:3000/api/webhooks/easyorders -H "secret: YOUR_SECRET" -d '{"test":"data"}'`
