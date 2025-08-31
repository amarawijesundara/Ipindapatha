# Setup Guide

This document provides detailed setup instructions for the JWT Authentication Next.js application.

## Prerequisites

### Required Software
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **PostgreSQL 12+** - Download from [postgresql.org](https://www.postgresql.org/)
- **npm or yarn** - Comes with Node.js

### System Requirements
- Operating System: Windows, macOS, or Linux
- RAM: Minimum 4GB (8GB recommended)
- Storage: At least 1GB free space

## Installation Steps

### 1. Clone and Setup Project
```bash
# Navigate to project directory
cd /path/to/jwt-auth-nextjs-app

# Install dependencies
npm install
```

### 2. PostgreSQL Database Setup

#### Option A: Local PostgreSQL
```bash
# Start PostgreSQL service (varies by OS)
# macOS with Homebrew:
brew services start postgresql

# Ubuntu/Debian:
sudo systemctl start postgresql

# Windows: Start via Services or pgAdmin
```

```sql
-- Create database (connect as postgres user)
createdb auth_app

-- Or via psql:
psql -U postgres
CREATE DATABASE auth_app;
\q
```

#### Option B: Docker PostgreSQL
```bash
# Run PostgreSQL in Docker
docker run --name postgres-auth \
  -e POSTGRES_DB=auth_app \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local  # or use your preferred editor
```

**Required Environment Variables:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_actual_password
DB_NAME=auth_app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
```

### 4. Database Migration and Seeding

```bash
# Run database migrations (creates tables)
npm run db:migrate

# Seed database with initial data
npm run db:seed
```

**What gets created:**
- **Tables**: users, bookings, booking_availability, refresh_tokens
- **Indexes**: Performance optimized indexes on key columns
- **Triggers**: Auto-update timestamps
- **Default Admin**: admin@example.com / SuperAdmin123!
- **Sample Data**: 30 days of booking availability (weekdays only)

### 5. Start the Application

#### Development Mode
```bash
npm run dev
```
- URL: http://localhost:3000
- Hot reload enabled
- Source maps for debugging

#### Production Mode
```bash
npm run build
npm start
```
- Optimized build
- Production performance

## Verification

### 1. Check Database Connection
```bash
# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('DB Error:', err);
  else console.log('DB Connected:', res.rows[0]);
  pool.end();
});
"
```

### 2. Test Application Features
1. **Homepage**: http://localhost:3000
2. **Registration**: Create a new account
3. **Login**: Use registered account or admin credentials
4. **Dashboard**: View user dashboard with statistics
5. **API Health**: http://localhost:3000/api/health

### 3. Verify Database Tables
```sql
-- Connect to database
psql -U postgres -d auth_app

-- List all tables
\dt

-- Check user table
SELECT * FROM users;

-- Check availability
SELECT * FROM booking_availability LIMIT 5;
```

## Troubleshooting

### Common Issues

#### "Database connection failed"
- Verify PostgreSQL is running
- Check database credentials in `.env.local`
- Ensure database `auth_app` exists
- Test connection with `psql`

#### "next: not found"
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Use `npx next dev` instead of `npm run dev`

#### "Port 3000 is already in use"
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different port
npx next dev -p 3001
```

#### "JWT_SECRET is required"
- Ensure `.env.local` file exists
- Set a strong JWT_SECRET (minimum 32 characters)
- Restart the application after changing environment variables

#### TypeScript Errors
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Database Issues

#### Reset Database
```bash
# WARNING: This will delete all data
psql -U postgres -c "DROP DATABASE auth_app;"
psql -U postgres -c "CREATE DATABASE auth_app;"

# Re-run migrations and seeding
npm run db:migrate
npm run db:seed
```

#### Check Database Logs
```bash
# PostgreSQL logs location varies by installation:
# Ubuntu: /var/log/postgresql/
# macOS Homebrew: /usr/local/var/log/
# Docker: docker logs postgres-auth
```

## Development Tips

### Hot Reload
- Changes to pages and components reload automatically
- API route changes require manual refresh
- Environment variable changes require restart

### Database Schema Changes
1. Modify migration script in `scripts/migrate.js`
2. Run `npm run db:migrate` (uses CREATE TABLE IF NOT EXISTS)
3. For destructive changes, reset database and re-migrate

### Testing API Endpoints
```bash
# Using curl
curl -X GET http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"password123"}'
```

## Next Steps

After successful setup:
1. Customize the application for your needs
2. Add additional features or modify existing ones
3. Set up production deployment (see [DEPLOYMENT.md](./DEPLOYMENT.md))
4. Configure monitoring and logging
5. Set up automated backups

## Support

If you encounter issues not covered here:
1. Check the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guide
2. Review the [API.md](./API.md) documentation
3. Examine application logs and database logs
4. Ensure all prerequisites are properly installed