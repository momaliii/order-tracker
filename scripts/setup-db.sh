#!/bin/bash

# Database setup script for Attribution Tracker

echo "🚀 Setting up Attribution Tracker database..."

# Prisma migrations will use DIRECT_URL (if set), otherwise DATABASE_URL.
if [ -z "$DIRECT_URL" ] && [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: Neither DIRECT_URL nor DATABASE_URL is set"
  echo ""
  echo "For Supabase:"
  echo "  - Set DATABASE_URL to the Pooler (6543) connection string"
  echo "  - Set DIRECT_URL to the Direct (5432) connection string (for migrations)"
  echo ""
  echo "For local Postgres:"
  echo "  - Set DATABASE_URL and DIRECT_URL to the same local connection string"
  exit 1
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npm run db:generate

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

echo "✅ Database setup complete!"
echo ""
echo "You can now:"
echo "  - Start the server: npm run dev"
echo "  - Open Prisma Studio: npm run db:studio"
