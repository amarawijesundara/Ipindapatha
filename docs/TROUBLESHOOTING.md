# Multi-Tenant Monastery Booking System - Troubleshooting Guide

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
  - [Authentication Issues](#authentication-issues)
  - [Tenant Resolution Issues](#tenant-resolution-issues)
  - [Database Problems](#database-problems)
  - [Booking System Issues](#booking-system-issues)
  - [Admin Panel Issues](#admin-panel-issues)
- [Development Environment](#development-environment)
- [Production Issues](#production-issues)
- [Performance Problems](#performance-problems)
- [Security Concerns](#security-concerns)
- [Debugging Tools](#debugging-tools)
- [Log Analysis](#log-analysis)
- [Recovery Procedures](#recovery-procedures)

## Quick Diagnostics

### System Health Check
```bash
# Check if the application is running
curl http://localhost:3000/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "email": "available"
  }
}
```

### Database Connection Test
```bash
# Test PostgreSQL connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW();"

# Alternative using environment variables
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'Database Error:' + err : 'Database OK:', res.rows[0]);
  pool.end();
});
"
```

### Environment Variables Check
```bash
# Check critical environment variables
node -e "
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
required.forEach(key => {
  console.log(key + ':', process.env[key] ? '✓ Set' : '✗ Missing');
});
"
```

---

## Common Issues

### Authentication Issues

#### Problem: "Invalid or expired token" error
**Symptoms:**
- Users getting logged out unexpectedly
- API requests returning 401 errors
- Token verification failing

**Diagnosis:**
```bash
# Check JWT token validity
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token valid:', decoded);
} catch (err) {
  console.log('Token error:', err.message);
}
"
```

**Solutions:**
1. **Token Expiry**: Check if token has expired
   ```javascript
   // Check token expiration
   const decoded = jwt.decode(token);
   const now = Math.floor(Date.now() / 1000);
   if (decoded.exp < now) {
     console.log('Token expired');
   }
   ```

2. **JWT Secret Mismatch**: Verify JWT_SECRET is consistent
   ```bash
   # Ensure JWT_SECRET is set and consistent across restarts
   echo $JWT_SECRET | wc -c  # Should be at least 32 characters
   ```

3. **Token Format**: Ensure token is properly formatted
   ```javascript
   // Token should start with "Bearer " in Authorization header
   const authHeader = request.headers.authorization;
   const token = authHeader?.substring(7);  // Remove "Bearer "
   ```

#### Problem: User registration fails
**Solutions:**
1. **Check Tenant Context**:
   ```bash
   # Verify subdomain resolution
   curl -H "Host: st-marys.localhost:3000" http://localhost:3000/api/auth/register
   ```

2. **Database Constraints**:
   ```sql
   -- Check for existing users
   SELECT username, email, tenant_id FROM users 
   WHERE username = 'existing_user' OR email = 'user@example.com';
   ```

---

### Tenant Resolution Issues

#### Problem: "Tenant not found" error
**Symptoms:**
- 404 errors when accessing tenant subdomains
- Middleware tenant resolution failing
- Cross-tenant data access issues

**Diagnosis:**
```bash
# Test subdomain extraction
node -e "
const extractSubdomain = (host) => {
  const hostname = host.split(':')[0];
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  const parts = hostname.split('.');
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (['www', 'api', 'admin'].includes(subdomain)) {
    return null;
  }
  return subdomain;
};
console.log('st-marys.example.com:', extractSubdomain('st-marys.example.com'));
console.log('localhost:3000:', extractSubdomain('localhost:3000'));
"
```

**Solutions:**
1. **Check Tenant Exists**:
   ```sql
   SELECT id, name, subdomain, is_active FROM tenants 
   WHERE subdomain = 'st-marys' AND is_active = true;
   ```

2. **DNS/Host Configuration**:
   ```bash
   # For development, add to /etc/hosts
   echo "127.0.0.1 st-marys.localhost" >> /etc/hosts
   ```

---

### Database Problems

#### Problem: Connection pool exhaustion
**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Check connection limits
SHOW max_connections;

-- Check slow queries
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;
```

**Solutions:**
1. **Increase Pool Size**:
   ```javascript
   // In db.ts or Prisma configuration
   const pool = new Pool({
     max: 20,  // Increase from default 10
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

---

### Booking System Issues

#### Problem: Booking conflicts or double bookings
**Diagnosis:**
```sql
-- Check for booking conflicts
SELECT b1.id, b1.booking_date, b1.booking_time, b1.user_id, b1.tenant_id
FROM bookings b1
JOIN bookings b2 ON b1.booking_date = b2.booking_date 
                 AND b1.booking_time = b2.booking_time 
                 AND b1.tenant_id = b2.tenant_id
                 AND b1.id != b2.id
WHERE b1.status != 'cancelled' AND b2.status != 'cancelled';
```

**Solutions:**
1. **Database Constraints**:
   ```sql
   -- Add unique constraint
   ALTER TABLE bookings 
   ADD CONSTRAINT unique_booking_slot 
   UNIQUE (tenant_id, booking_date, booking_time);
   ```

---

### Admin Panel Issues

#### Problem: Admin panel not loading
**Solutions:**
1. **Check Admin User Role**:
   ```sql
   -- Verify user has correct role
   SELECT id, username, email, role FROM users WHERE role IN ('super_admin', 'tenant_admin');
   
   -- Update user role if needed
   UPDATE users SET role = 'super_admin' WHERE email = 'admin@example.com';
   ```

---

## Development Environment

### Problem: Hot reload not working
**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev

# Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Production Issues

### Problem: 502 Bad Gateway errors
**Diagnosis:**
```bash
# Check if application is running
ps aux | grep node

# Check application logs
pm2 logs jwt-auth-app

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

---

## Performance Problems

### Problem: Slow page loads
**Solutions:**
1. **Database Optimization**:
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_bookings_tenant_date ON bookings(tenant_id, booking_date);
   CREATE INDEX CONCURRENTLY idx_users_tenant_active ON users(tenant_id, is_active);
   ```

---

## Security Concerns

### Problem: Suspicious login attempts
**Diagnosis:**
```sql
-- Check recent login attempts
SELECT 
  username, 
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM admin_audit_log 
WHERE action = 'login_failed' 
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY username
ORDER BY attempts DESC;
```

---

## Debugging Tools

### Application Debugging
```javascript
// Add debug logging
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
  }
}
```

### Database Debugging
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

---

## Log Analysis

### Application Logs
```bash
# PM2 logs
pm2 logs jwt-auth-app --lines 100

# System logs
journalctl -u nginx -f
journalctl -u postgresql -f
```

---

## Recovery Procedures

### Database Recovery
```bash
# Backup current state
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_file.sql
```

### Application Recovery
```bash
# Quick restart
pm2 restart jwt-auth-app

# Full application reset
pm2 stop jwt-auth-app
rm -rf .next node_modules/.cache
npm install
npm run build
pm2 start jwt-auth-app
```

---

This troubleshooting guide covers the most common issues in the Multi-Tenant Monastery Booking System. For additional help, refer to the [Architecture Documentation](./ARCHITECTURE.md), [User Guide](./USER_GUIDE.md), and [API Reference](./API.md).