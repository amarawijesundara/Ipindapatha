# Multi-Tenant Monastery Booking System - Architecture Documentation

## Table of Contents
- [System Overview](#system-overview)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Database Schema](#database-schema)
- [API Architecture](#api-architecture)
- [Security & RBAC](#security--rbac)
- [Subdomain Routing](#subdomain-routing)
- [Technology Stack](#technology-stack)

## System Overview

The **Multi-Tenant Monastery Booking System** is a SaaS application that allows multiple monasteries to operate independently on the same platform. Each monastery gets their own subdomain, user base, and booking system, while a central super admin can manage the entire platform.

### Key Features
- **Multi-Tenant Architecture**: Complete data isolation between monasteries
- **Subdomain-Based Access**: Each monastery accessed via `monastery.domain.com`
- **Role-Based Access Control**: Four-tier permission system
- **Platform Administration**: Centralized management of all monasteries
- **Booking Management**: Monastery-specific reservation systems
- **Audit Logging**: Comprehensive action tracking

## Multi-Tenant Architecture

### Tenant Isolation Strategy
```
┌─────────────────────────────────────────────────────┐
│                Platform Level                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │            Super Admin                          │ │
│  │  - Global Settings                              │ │
│  │  - All Tenant Management                       │ │
│  │  - Platform Analytics                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Tenant A  │  │   Tenant B  │  │   Tenant C  │  │
│  │             │  │             │  │             │  │
│  │ Users       │  │ Users       │  │ Users       │  │
│  │ Bookings    │  │ Bookings    │  │ Bookings    │  │
│  │ Settings    │  │ Settings    │  │ Settings    │  │
│  │ Availability│  │ Availability│  │ Availability│  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Data Isolation Mechanisms
1. **Database Level**: All tenant-specific tables include `tenant_id` foreign key
2. **Application Level**: Middleware automatically filters queries by tenant
3. **API Level**: Tenant context injected into all requests
4. **User Level**: Users can only access data within their tenant

## Database Schema

### Core Tenant Tables

#### Tenants Table
```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subdomain VARCHAR(50) UNIQUE NOT NULL,
  domain VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Users Table (Multi-Tenant)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  phone_number VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, username),
  UNIQUE(tenant_id, email)
);
```

#### Bookings Table (Tenant-Scoped)
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  event_note TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tenant Configuration Tables

#### Tenant Settings
```sql
CREATE TABLE tenant_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_hours JSON,
  booking_rules JSON,
  custom_fields JSON,
  branding JSON,
  notifications JSON,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tenant Subscriptions
```sql
CREATE TABLE tenant_subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  max_users INTEGER DEFAULT 10,
  max_bookings INTEGER DEFAULT 1000,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Platform Administration Tables

#### Platform Settings
```sql
CREATE TABLE platform_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Admin Audit Log
```sql
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Entity Relationships

```
┌─────────────┐    1:N    ┌─────────────┐    1:N    ┌─────────────┐
│   tenants   │ ────────> │    users    │ ────────> │   bookings  │
└─────────────┘           └─────────────┘           └─────────────┘
       │                         │                         │
       │ 1:1                     │ N:M                     │
       ▼                         ▼                         │
┌─────────────┐           ┌─────────────┐                  │
│tenant_      │           │tenant_users │                  │
│settings     │           │(junction)   │                  │
└─────────────┘           └─────────────┘                  │
       │                                                   │
       │ 1:1                                              │
       ▼                                                   │
┌─────────────┐                                           │
│tenant_      │                                           │
│subscriptions│                                           │
└─────────────┘                                           │
                                                          │
┌─────────────┐    1:N    ┌─────────────┐                │
│platform_    │ ────────> │admin_audit_ │ <──────────────┘
│settings     │           │log          │
└─────────────┘           └─────────────┘
```

## API Architecture

### Request Flow

#### Tenant-Scoped Request Flow
```
Client Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│               Middleware                            │
│  1. Extract subdomain from host header              │
│  2. Resolve tenant from subdomain                   │
│  3. Inject tenant context into headers              │
│  4. Verify JWT token                                │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│               RBAC Layer                            │
│  1. Verify user permissions                         │
│  2. Check tenant scoping                            │
│  3. Validate resource ownership                     │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│               API Handler                           │
│  1. Extract tenant_id from headers                  │
│  2. Filter all queries by tenant_id                 │
│  3. Process business logic                          │
│  4. Return tenant-scoped results                    │
└─────────────────────────────────────────────────────┘
```

#### Super Admin Request Flow
```
Super Admin Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│               Admin Middleware                      │
│  1. Skip tenant detection (admin routes)            │
│  2. Verify JWT token                                │
│  3. Verify super_admin role                         │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│               Admin Handler                         │
│  1. Access cross-tenant data                        │
│  2. Perform platform-wide operations                │
│  3. Log admin actions                               │
│  4. Return aggregated results                       │
└─────────────────────────────────────────────────────┘
```

### API Endpoints Structure

#### Tenant-Scoped APIs
- `/api/auth/*` - Authentication within tenant
- `/api/bookings/*` - Tenant-specific bookings
- `/api/availability/*` - Tenant booking availability
- `/api/profile` - User profile management
- `/api/stats` - Tenant statistics

#### Super Admin APIs
- `/api/admin/tenants/*` - Tenant management
- `/api/admin/users/*` - Cross-tenant user management
- `/api/admin/bookings/*` - Platform-wide booking management
- `/api/admin/settings/*` - Platform configuration
- `/api/admin/stats/*` - Platform statistics

#### Public APIs
- `/api/health` - System health check
- `/api/tenants/create` - Tenant registration

## Security & RBAC

### Role Hierarchy
```
┌─────────────────────────────────────────────────────┐
│                 SUPER_ADMIN                         │
│  • Platform-wide access                             │
│  • All tenant management                            │
│  • Global settings                                  │
│  • Cross-tenant operations                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                TENANT_ADMIN                         │
│  • Full tenant administration                       │
│  • User management within tenant                    │
│  • Booking management                               │
│  • Tenant settings                                  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               TENANT_MANAGER                        │
│  • Booking management                               │
│  • Limited user management                          │
│  • View tenant reports                              │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                    USER                             │
│  • Profile management                               │
│  • Create bookings                                  │
│  • View own data                                    │
└─────────────────────────────────────────────────────┘
```

### Permission Matrix

| Operation | User | Manager | Admin | Super Admin |
|-----------|------|---------|-------|-------------|
| Create Booking | ✓ | ✓ | ✓ | ✓ |
| View Own Bookings | ✓ | ✓ | ✓ | ✓ |
| View All Tenant Bookings | ✗ | ✓ | ✓ | ✓ |
| Manage Users | ✗ | Limited | ✓ | ✓ |
| Tenant Settings | ✗ | ✗ | ✓ | ✓ |
| Create Tenants | ✗ | ✗ | ✗ | ✓ |
| Platform Settings | ✗ | ✗ | ✗ | ✓ |
| Cross-Tenant Access | ✗ | ✗ | ✗ | ✓ |

### Authentication Flow

#### JWT Token Structure
```javascript
{
  "userId": 123,
  "username": "john_doe",
  "email": "john@stmarys.com",
  "role": "tenant_admin",
  "tenantId": 5,
  "subdomain": "st-marys",
  "iat": 1640995200,
  "exp": 1641081600
}
```

#### Token Validation Process
1. **Extract Token**: From Authorization header or cookie
2. **Verify Signature**: Using JWT_SECRET
3. **Check Expiration**: Ensure token is not expired
4. **Validate Tenant**: Match token tenant with request tenant
5. **Authorize Role**: Check role permissions for requested resource

### Security Measures

#### Data Protection
- **Password Hashing**: bcrypt with salt rounds 12
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Protection**: Input sanitization and validation
- **CORS Configuration**: Restricted origins in production

#### Tenant Isolation
- **Database Level**: Foreign key constraints with CASCADE
- **Application Level**: Automatic tenant_id filtering
- **API Level**: Middleware tenant context injection
- **Session Level**: Tenant-scoped JWT tokens

#### Audit Trail
- **Admin Actions**: All super admin operations logged
- **Authentication Events**: Login/logout tracking
- **Data Changes**: Modification tracking with timestamps
- **Error Logging**: Comprehensive error tracking

## Subdomain Routing

### Subdomain Detection Logic

```javascript
// Extract subdomain from host header
const extractSubdomain = (host) => {
  const hostname = host.split(':')[0]  // Remove port
  
  // Skip localhost and IP addresses
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null
  }
  
  const parts = hostname.split('.')
  if (parts.length < 3) return null  // No subdomain
  
  const subdomain = parts[0]
  
  // Ignore reserved subdomains
  if (['www', 'api', 'admin'].includes(subdomain)) {
    return null
  }
  
  return subdomain
}
```

### Routing Patterns

#### Tenant Access Patterns
- `st-marys.example.com` → Tenant: "st-marys"
- `holy-spirit.example.com` → Tenant: "holy-spirit"
- `www.example.com` → Main platform site
- `example.com` → Main platform site

#### Admin Access Patterns
- `example.com/admin` → Super admin panel
- `admin.example.com` → Alternative admin access
- `st-marys.example.com/admin` → Tenant admin (within monastery)

### DNS Configuration

#### Production Setup
```
# DNS Records
A     example.com           → 192.168.1.100
CNAME *.example.com        → example.com
A     admin.example.com    → 192.168.1.100
```

#### SSL Certificate
```
# Wildcard SSL Certificate Required
*.example.com
example.com
```

## Technology Stack

### Backend Technologies
- **Runtime**: Node.js 18+
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5+
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5+
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt

### Frontend Technologies
- **Framework**: React 18
- **Styling**: Tailwind CSS 3
- **State Management**: React Hooks + Context
- **HTTP Client**: Fetch API
- **UI Components**: Custom component library

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Database Migrations**: Prisma CLI
- **Development Server**: Next.js Dev Server

### Infrastructure
- **Web Server**: Next.js Production Server
- **Database**: PostgreSQL with connection pooling
- **Reverse Proxy**: Nginx (recommended)
- **SSL**: Let's Encrypt or commercial certificate
- **Monitoring**: Built-in health checks

### Dependencies

#### Core Dependencies
```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "@prisma/client": "5.x",
  "prisma": "5.x",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "tailwindcss": "^3.3.0"
}
```

#### Development Dependencies
```json
{
  "@types/node": "20.x",
  "@types/react": "18.x",
  "@types/jsonwebtoken": "^9.0.0",
  "@types/bcryptjs": "^2.4.0",
  "eslint": "^8.0.0",
  "eslint-config-next": "14.x"
}
```

## System Requirements

### Development Environment
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 13.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB for development

### Production Environment
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 15.0 or higher with connection pooling
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB minimum
- **Network**: SSL certificate for wildcard domain

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## Performance Considerations

### Database Optimization
- **Indexes**: All foreign keys and commonly queried fields
- **Connection Pooling**: Prisma connection pooling
- **Query Optimization**: Efficient joins and filtering
- **Data Archiving**: Strategy for old booking data

### Application Performance
- **Caching**: Static asset caching with Next.js
- **Bundle Size**: Optimized JavaScript bundles
- **Code Splitting**: Route-based code splitting
- **Image Optimization**: Next.js image optimization

### Scalability
- **Horizontal Scaling**: Stateless application design
- **Database Scaling**: Read replicas for reporting
- **CDN**: Static asset distribution
- **Load Balancing**: Multiple application instances

---

This architecture provides a robust, secure, and scalable foundation for a multi-tenant monastery booking system with complete data isolation and comprehensive administrative capabilities.