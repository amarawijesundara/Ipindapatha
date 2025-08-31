# Troubleshooting Guide

This document covers common issues and their solutions for the JWT Authentication Next.js application.

## Quick Diagnostics

### Health Check Checklist
- [ ] PostgreSQL is running and accessible
- [ ] Environment variables are correctly set
- [ ] Dependencies are installed (`node_modules` exists)
- [ ] Database tables exist
- [ ] Application builds without errors
- [ ] Port 3000 is available

### Basic Troubleshooting Commands
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Test database connection
psql -h localhost -U postgres -d auth_app -c "SELECT NOW();"

# Check Node.js and npm versions
node --version  # Should be 18+
npm --version

# Check if Next.js is installed
npx next --version

# Check port availability
lsof -i :3000
```

---

## Common Issues

### 1. Database Connection Issues

#### Error: "Database connection failed"
**Symptoms:**
- Application won't start
- Error: `ECONNREFUSED` or `Connection terminated`

**Solutions:**

**Check PostgreSQL Status**
```bash
# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql  # if not running

# macOS
brew services start postgresql

# Windows
# Check Services.msc for PostgreSQL service
```

**Verify Database Exists**
```bash
psql -U postgres -l  # List all databases
# If auth_app doesn't exist:
createdb auth_app
```

**Check Connection Settings**
```bash
# Test connection with same credentials as .env.local
psql -h localhost -p 5432 -U postgres -d auth_app

# If connection fails, check:
# 1. Password in .env.local
# 2. Database host/port
# 3. Database name
```

**Check pg_hba.conf (PostgreSQL access control)**
```bash
# Find config file
sudo -u postgres psql -c "SHOW config_file;"

# Common location: /etc/postgresql/*/main/pg_hba.conf
# Add line for local development:
host    all             all             127.0.0.1/32            md5
```

---

### 2. Application Won't Start

#### Error: "next: not found"
**Symptoms:**
```bash
sh: 1: next: not found
```

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use npx if still failing
npx next dev

# Check if Next.js is in package.json
cat package.json | grep next
```

#### Error: "Port 3000 already in use"
**Solutions:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different port
npm run dev -- -p 3001
```

#### Error: "Module not found"
**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm install

# Check for TypeScript issues
npx tsc --noEmit
```

---

### 3. Authentication Issues

#### JWT Token Issues
**Error: "Invalid token" or "Token verification failed"**

**Check JWT Configuration**
```bash
# Verify JWT_SECRET is set and long enough
echo $JWT_SECRET  # Should be 32+ characters
```

**Debug Token**
```javascript
// Add to API route for debugging
console.log('Token:', token);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
```

**Token Expiration**
```bash
# Check token expiration time
grep JWT_EXPIRES_IN .env.local
# Default is 24h, adjust if needed
```

#### Login/Registration Fails
**Check Password Hashing**
```javascript
// Test bcrypt manually
const bcrypt = require('bcrypt');
const test = async () => {
  const hash = await bcrypt.hash('password123', 12);
  console.log('Hash:', hash);
  console.log('Valid:', await bcrypt.compare('password123', hash));
};
test();
```

**Database User Issues**
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'test@example.com';

-- Check user status
SELECT username, email, is_active FROM users;

-- Reset user password (development only)
UPDATE users SET password = '$2b$12$newhashedpassword' WHERE email = 'user@example.com';
```

---

### 4. Database Issues

#### Migration Failures
**Error: "relation already exists" or migration hangs**

**Reset Database (Development)**
```bash
# WARNING: This deletes all data
psql -U postgres -c "DROP DATABASE IF EXISTS auth_app;"
psql -U postgres -c "CREATE DATABASE auth_app;"
npm run db:migrate
npm run db:seed
```

**Check Migration Status**
```sql
-- Connect to database
psql -U postgres -d auth_app

-- List all tables
\dt

-- Check if tables have data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM booking_availability;
```

#### Seed Data Issues
**Default Admin Not Created**
```sql
-- Check if super admin exists
SELECT * FROM users WHERE role = 'super_admin';

-- Manually create admin (development only)
INSERT INTO users (username, email, password, role) 
VALUES (
  'super_admin', 
  'admin@example.com',
  '$2b$12$YourHashedPasswordHere',
  'super_admin'
);
```

#### Connection Pool Issues
**Error: "too many clients already"**
```javascript
// Increase connection pool size in src/lib/db.ts
const pool = new Pool({
  // ... other config
  max: 20,  // Increase if needed
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

### 5. Build and TypeScript Issues

#### Build Failures
**TypeScript Compilation Errors**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

**Common TypeScript Fixes**
```typescript
// Fix JWT payload types
interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Fix environment variable types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET: string;
      DB_HOST: string;
      DB_PASSWORD: string;
      // ... other env vars
    }
  }
}
```

#### ESLint Errors
```bash
# Fix common ESLint issues
npm run lint -- --fix

# Disable specific rules if needed (not recommended)
// eslint-disable-next-line react/no-unescaped-entities
```

---

### 6. Environment Variables

#### Variables Not Loading
**Check File Location**
```bash
# Ensure .env.local exists in root directory
ls -la .env*
cat .env.local  # Verify content
```

**Next.js Environment Rules**
- Variables starting with `NEXT_PUBLIC_` are available in browser
- Other variables are server-side only
- Restart application after changing variables

**Debug Environment Variables**
```javascript
// Add to API route
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  DB_HOST: process.env.DB_HOST,
});
```

---

### 7. API Issues

#### CORS Errors
**Error: "Access-Control-Allow-Origin"**

**Check Middleware Configuration**
```typescript
// In src/middleware.ts
response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
```

**Development Workaround**
```bash
# Start browser with disabled security (development only)
google-chrome --disable-web-security --user-data-dir="/tmp/chrome_dev"
```

#### API Routes Not Found
**Check File Structure**
```bash
# Ensure API routes are in correct location
find src/app/api -name "*.ts" -type f
```

**Route Naming**
- Files must be named `route.ts` in App Router
- Functions must be named after HTTP methods: `GET`, `POST`, etc.

---

### 8. Performance Issues

#### Slow Database Queries
**Add Database Indexes**
```sql
-- Analyze slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_bookings_user_id ON bookings(user_id);
```

#### High Memory Usage
**Check for Memory Leaks**
```javascript
// Monitor memory usage
setInterval(() => {
  console.log('Memory:', process.memoryUsage());
}, 10000);
```

**Optimize Database Connections**
```javascript
// Close connections properly
export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    // ... your code
  } finally {
    client.release();  // Always release
  }
}
```

---

## Debugging Tools

### Application Debugging
```javascript
// Add debug logging
const debug = require('debug')('app:auth');
debug('User login attempt:', { email: user.email });

// Use Chrome DevTools
node --inspect-brk=0.0.0.0:9229 node_modules/.bin/next dev
```

### Database Debugging
```sql
-- Enable query logging (development)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- View recent queries
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE datname = 'auth_app';
```

### Network Debugging
```bash
# Test API endpoints
curl -v http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"SuperAdmin123!"}'
```

---

## Log Locations

### Application Logs
```bash
# Next.js development logs
# Shown in terminal where npm run dev is running

# PM2 logs (production)
pm2 logs jwt-auth-app
pm2 logs --lines 100

# Docker logs
docker logs container_name
```

### Database Logs
```bash
# PostgreSQL logs (varies by installation)
# Ubuntu/Debian
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# CentOS/RHEL
sudo tail -f /var/lib/pgsql/data/pg_log/postgresql-*.log

# macOS Homebrew
tail -f /usr/local/var/log/postgres.log

# Docker
docker logs postgres-container
```

### System Logs
```bash
# System logs
journalctl -u postgresql -f
journalctl -u nginx -f

# Application logs
tail -f /var/log/app.log
```

---

## Getting Help

### Information to Collect
When asking for help, provide:

1. **Environment Information**
   ```bash
   node --version
   npm --version
   npx next --version
   cat /etc/os-release  # Linux
   ```

2. **Error Messages**
   - Full error message and stack trace
   - Browser console errors (if applicable)
   - Server logs

3. **Configuration**
   ```bash
   # Sanitized environment variables (remove passwords)
   cat .env.local | sed 's/password.*/password=REDACTED/g'
   ```

4. **Steps to Reproduce**
   - What you were trying to do
   - Exact steps taken
   - Expected vs actual behavior

### Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- Application README.md file
- API documentation (docs/API.md)

---

## Emergency Procedures

### Complete Reset (Development Only)
```bash
# WARNING: This deletes all data and reinstalls everything
rm -rf node_modules package-lock.json .next
psql -U postgres -c "DROP DATABASE IF EXISTS auth_app;"
psql -U postgres -c "CREATE DATABASE auth_app;"
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Backup Before Troubleshooting
```bash
# Backup database
pg_dump -U postgres auth_app > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup configuration
cp -r . ../jwt-auth-backup-$(date +%Y%m%d_%H%M%S)
```

### Recovery
```bash
# Restore database
psql -U postgres -d auth_app < backup_file.sql

# Restore files
cp -r ../jwt-auth-backup-date/* ./
npm install
```