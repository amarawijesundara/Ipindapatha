# Deployment Guide

This guide covers deploying the JWT Authentication Next.js application to various platforms.

## Production Preparation

### 1. Build Optimization
```bash
# Create production build
npm run build

# Test production build locally
npm start
```

### 2. Environment Configuration
Create production environment variables:

```env
# Database Configuration
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USER=your-production-db-user
DB_PASSWORD=your-secure-password
DB_NAME=auth_app_prod

# JWT Configuration (MUST be different from development)
JWT_SECRET=your-production-jwt-secret-minimum-64-characters-long
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Database Setup
```bash
# Run migrations on production database
NODE_ENV=production npm run db:migrate

# Seed initial data (optional for production)
NODE_ENV=production npm run db:seed
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest option for Next.js applications.

#### Prerequisites
- Vercel account
- GitHub repository
- Production PostgreSQL database (see database options below)

#### Steps
1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all production environment variables

3. **Database Connection**
   - Use managed PostgreSQL (see database options)
   - Update DB_HOST, DB_USER, DB_PASSWORD in Vercel environment variables

4. **Custom Domain** (Optional)
   - Go to Domains tab in Vercel dashboard
   - Add your custom domain

#### Automatic Deployments
- Push to main branch triggers automatic deployment
- Preview deployments for pull requests

---

### Option 2: Railway

Railway provides simple deployment with built-in PostgreSQL.

#### Steps
1. **Create Account**: Sign up at railway.app
2. **Deploy from GitHub**: Connect your repository
3. **Add PostgreSQL**: 
   ```bash
   # Railway automatically provides DATABASE_URL
   # Update your db.ts to use DATABASE_URL if provided
   ```
4. **Environment Variables**: Add in Railway dashboard
5. **Custom Domain**: Available in Railway dashboard

---

### Option 3: DigitalOcean App Platform

#### Steps
1. **Create App**: DigitalOcean → App Platform → Create App
2. **Connect Repository**: Link GitHub repository
3. **Configure Build**:
   ```yaml
   # .do/app.yaml
   name: jwt-auth-app
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/your-repo
       branch: main
     run_command: npm start
     build_command: npm run build
     http_port: 3000
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
   databases:
   - name: auth-db
     engine: PG
     version: "14"
   ```

---

### Option 4: AWS (Advanced)

Deploy using AWS services for maximum control.

#### Architecture
- **Compute**: AWS Lambda + API Gateway (serverless) or EC2
- **Database**: RDS PostgreSQL
- **CDN**: CloudFront
- **Domain**: Route 53

#### EC2 Deployment
1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.micro for small applications
   - Configure security groups (HTTP/HTTPS)

2. **Server Setup**
   ```bash
   # Connect to EC2
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Clone repository
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   
   # Install dependencies and build
   npm install
   npm run build
   
   # Start with PM2
   pm2 start npm --name "jwt-auth-app" -- start
   pm2 save
   pm2 startup
   ```

3. **Setup Nginx (Optional)**
   ```bash
   sudo apt install nginx
   
   # Configure nginx
   sudo nano /etc/nginx/sites-available/jwt-auth-app
   ```
   
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Database Options

### Option 1: Managed PostgreSQL Services

#### Neon (Recommended)
- Free tier available
- Serverless PostgreSQL
- Automatic scaling
- Built-in connection pooling

```env
# Example connection string
DATABASE_URL=postgresql://username:password@hostname/database
```

#### Supabase
- PostgreSQL with additional features
- Real-time subscriptions
- Built-in authentication (can be used alongside your JWT auth)

#### AWS RDS
- Fully managed PostgreSQL
- Automatic backups
- Multi-AZ deployment for high availability

#### Google Cloud SQL
- Managed PostgreSQL on Google Cloud
- Automatic updates and patches

### Option 2: Self-Hosted PostgreSQL

#### Docker Deployment
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: auth_app_prod
      POSTGRES_USER: your_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## SSL/TLS Configuration

### Free SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Monitoring and Logging

### Application Monitoring
```javascript
// Add to next.config.js for production monitoring
module.exports = {
  // ... other config
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health',
      },
    ]
  },
}
```

### Log Management
```bash
# PM2 logs
pm2 logs jwt-auth-app

# System logs
journalctl -u nginx -f
```

### Health Checks
Set up monitoring for:
- Application health: `GET /api/health`
- Database connectivity
- Response times
- Error rates

---

## Security Checklist

### Before Deployment
- [ ] Change default JWT_SECRET to strong random string
- [ ] Use HTTPS in production
- [ ] Update CORS origins in middleware
- [ ] Set strong database passwords
- [ ] Enable database SSL connections
- [ ] Configure rate limiting
- [ ] Set up proper backup strategy
- [ ] Update default admin credentials

### Production Security
```env
# Strong JWT secret (64+ characters)
JWT_SECRET=your-super-long-random-secret-key-for-production-use-64-chars-min

# Database SSL (if supported)
DB_SSL=true

# Security headers
SECURE_HEADERS=true
```

---

## Backup Strategy

### Database Backups
```bash
# Automated PostgreSQL backups
#!/bin/bash
# backup.sh
export PGPASSWORD="your-password"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-host -U your-user -d auth_app_prod > /backups/backup_$DATE.sql

# Keep only last 7 days
find /backups -name "backup_*.sql" -mtime +7 -delete
```

### Automated Backups
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## Performance Optimization

### Next.js Optimizations
```javascript
// next.config.js
module.exports = {
  // Enable image optimization
  images: {
    domains: ['yourdomain.com'],
  },
  
  // Enable compression
  compress: true,
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin())
      return config
    },
  }),
}
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX CONCURRENTLY idx_availability_date_available ON booking_availability(date) WHERE is_available = true;
```

---

## Rollback Strategy

### Quick Rollback
```bash
# If using PM2
pm2 stop jwt-auth-app
git checkout previous-stable-commit
npm install
npm run build
pm2 start jwt-auth-app

# Database rollback (if needed)
psql -U username -d database_name -f backup_file.sql
```

### Blue-Green Deployment
Deploy to secondary environment, test, then switch traffic.

---

## Support and Maintenance

### Regular Maintenance Tasks
1. **Monthly**: Update dependencies (`npm audit`, `npm update`)
2. **Weekly**: Review logs and monitoring
3. **Daily**: Check backup status
4. **As needed**: Security patches

### Monitoring Alerts
Set up alerts for:
- High error rates (>5%)
- Slow response times (>2s)
- Database connection failures
- High CPU/memory usage
- SSL certificate expiration

### Documentation Updates
Keep deployment documentation updated with:
- Environment variables
- Database schema changes
- New dependencies
- Configuration changes