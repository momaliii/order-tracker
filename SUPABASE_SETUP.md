# Supabase Setup Guide

This guide walks you through setting up Supabase as your database for the Attribution Tracker.

## Why Supabase?

- ✅ **Free tier** with generous limits (500MB database, 2GB bandwidth)
- ✅ **No local PostgreSQL needed** - fully hosted
- ✅ **Easy setup** - 5 minutes to get started
- ✅ **Built-in dashboard** - view your data easily
- ✅ **Automatic backups** - peace of mind
- ✅ **Connection pooling** - better performance

## Step-by-Step Setup

### 1. Create Supabase Account

1. Go to https://supabase.com
2. Click **"Start your project"** or **"Sign in"**
3. Sign up with GitHub, Google, or email

### 2. Create New Project

1. Click **"New Project"**
2. Fill in project details:
   - **Name**: `attribution-tracker` (or any name you like)
   - **Database Password**: Create a strong password (save it securely!)
   - **Region**: Choose closest to you or your users
   - **Pricing Plan**: Free tier is perfect to start
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize

### 3. Get Connection String

1. Once project is ready, go to **Project Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll to **Connection String** section
4. You'll see two options:

   **For Migrations** (use this first):
   - Select **"Direct connection"** tab
   - Copy the connection string
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

   **For Application** (use this after migrations):
   - Select **"Connection pooling"** tab
   - Copy the connection string
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - Note the port difference: `5432` (direct) vs `6543` (pooling)

### 4. Configure Your Project

1. **Copy `.env.example` to `.env`**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** and paste your connection string:
   ```bash
   # For initial setup (migrations), use Direct connection:
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
   
   # App runtime (recommended): Connection pooling for better performance:
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   ```

3. **Set other environment variables**:
   ```bash
   PORT=3000
   NODE_ENV=development
   EASYORDERS_WEBHOOK_SECRET=""  # Set this later
   ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
   ```

### 5. Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (uses Direct connection URL)
npm run db:migrate
```

You should see:
```
✔ Migration applied successfully
```

### 6. Switch to Connection Pooling (Optional but Recommended)

After migrations are done, keep `DIRECT_URL` as-is (direct), and use `DATABASE_URL` as pooling for the running app:

```bash
# In .env:
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

**Why?** Connection pooling handles multiple concurrent connections better, which is important for production.

### 7. Verify Setup

1. **Check tables created**:
   - Go to Supabase Dashboard → **Table Editor**
   - You should see tables: `Visitor`, `Session`, `Touchpoint`, `Order`, etc.

2. **Test connection**:
   ```bash
   npm run dev
   ```
   - Visit http://localhost:3000/health
   - Should show: `{"status":"ok","database":"connected"}`

## Using Supabase Dashboard

Supabase provides a nice web interface to view your data:

1. **Table Editor**: View/edit data in tables
2. **SQL Editor**: Run custom queries
3. **Database**: View schema, indexes, etc.
4. **Logs**: See database activity

## Connection String Formats

### Direct Connection (for migrations)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### Connection Pooling (for application)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Key differences**:
- Port: `5432` (direct) vs `6543` (pooling)
- Pooling URL includes `?pgbouncer=true` parameter (added automatically)

## Troubleshooting

### "Connection refused" error
- Check if you're using the correct port (5432 for direct, 6543 for pooling)
- Verify your password is correct
- Make sure your IP is allowed (Supabase allows all by default, but check if you have restrictions)

### "Too many connections" error
- Switch to connection pooling URL (port 6543)
- Connection pooling manages connections more efficiently

### Migrations fail
- Use the **Direct connection** URL (port 5432) for migrations
- Some Prisma operations require direct connections

### Can't find connection string
- Go to: Project Settings → Database → Connection String
- Make sure you're in the right project
- Check that the project has finished initializing

## Production Considerations

### Environment Variables
- Never commit `.env` to git
- Use environment variables in your hosting platform
- Supabase provides connection strings that include passwords - keep them secret!

### Database Backups
- Supabase Free tier includes daily backups
- Paid tiers offer point-in-time recovery
- You can also export data via SQL Editor

### Performance
- Use **Connection pooling** URL in production (port 6543)
- Monitor usage in Supabase Dashboard → Settings → Usage
- Free tier: 500MB database, 2GB bandwidth/month

### Security
- Use strong database passwords
- Enable Row Level Security (RLS) if exposing Supabase API (we're not using it, but good to know)
- Rotate passwords periodically

## Next Steps

Once Supabase is set up:
1. ✅ Database is ready
2. Continue with [SETUP.md](SETUP.md) step 5 (Start Development Servers)
3. Add tracker to your website
4. Set up EasyOrders webhook

## Free Tier Limits

Supabase Free tier includes:
- ✅ 500MB database storage
- ✅ 2GB bandwidth/month
- ✅ 2GB file storage
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

This is more than enough for most attribution tracking needs!

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Check Supabase Dashboard → Logs for connection issues
