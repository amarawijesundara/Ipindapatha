# Multi-Tenant Monastery Booking System - Developer Guide

## Table of Contents
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Database Management](#database-management)
- [Authentication & Authorization](#authentication--authorization)
- [Multi-Tenant Implementation](#multi-tenant-implementation)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Testing Guidelines](#testing-guidelines)
- [Adding New Features](#adding-new-features)
- [Code Standards](#code-standards)
- [Debugging](#debugging)

## Development Setup

### Prerequisites

#### Required Software
```bash
# Node.js (18.0.0 or higher)
node --version  # v18.0.0+

# PostgreSQL (13.0 or higher)
psql --version  # PostgreSQL 13+

# npm (comes with Node.js)
npm --version   # 8.0.0+

# Git
git --version   # 2.0.0+
```

#### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB free space for development
- **Network**: Internet connection for dependencies

### Local Environment Setup

#### 1. Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-org/monastery-booking.git
cd monastery-booking

# Switch to develop branch
git checkout develop
```

#### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

#### 3. Database Setup
```bash
# Start PostgreSQL service
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Windows: Start PostgreSQL service

# Create database
createdb auth_app

# Or using psql
psql -U postgres -c "CREATE DATABASE auth_app;"
```

#### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

**Required Environment Variables:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=auth_app
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 5. Database Migration and Seeding
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed

# Verify database setup
npm run db:status
```

#### 6. Start Development Server
```bash
# Start development server with hot reload
npm run dev

# Server will start at http://localhost:3000
# Check health: http://localhost:3000/api/health
```

#### 7. Verify Setup
```bash
# Test API endpoints
curl http://localhost:3000/api/health

# Test super admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"SuperAdmin123!"}'
```

### Development Tools

#### Recommended IDE Extensions
```
Visual Studio Code:
├── ES7+ React/Redux/React-Native snippets
├── Prisma (syntax highlighting)
├── Tailwind CSS IntelliSense
├── TypeScript Importer
├── ESLint
├── Prettier
└── GitLens
```

#### Useful npm Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database
npm run db:reset     # Reset and re-seed database
npm run db:studio    # Open Prisma Studio

# Testing
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Project Structure

### Directory Organization
```
monastery-booking/
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── USER_GUIDE.md
│   ├── DEVELOPER.md
│   └── API.md
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── admin/          # Super admin pages
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # User dashboard
│   │   ├── login/          # Authentication pages
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   └── forms/         # Form components
│   ├── lib/               # Utility libraries
│   │   ├── auth.ts        # Authentication utilities
│   │   ├── db.ts          # Database configuration
│   │   ├── jwt.ts         # JWT utilities
│   │   ├── rbac.ts        # Role-based access control
│   │   └── tenant.ts      # Tenant management
│   ├── types/             # TypeScript type definitions
│   └── middleware.ts      # Next.js middleware
├── prisma/                # Database schema and migrations
│   └── schema.prisma      # Prisma schema
├── scripts/              # Database and utility scripts
├── tests/                # Test files
└── public/               # Static assets
```

### Key Files and Their Purposes

#### Core Configuration Files
```typescript
// next.config.js - Next.js configuration
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['localhost'],
  },
}

// tsconfig.json - TypeScript configuration
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### Database Schema (Prisma)
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Multi-tenant models with proper relationships
model Tenant {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  subdomain   String   @unique @db.VarChar(50)
  // ... other fields
  
  users       User[]
  bookings    Booking[]
  // ... relationships
  
  @@map("tenants")
}
```

## Database Management

### Prisma Workflow

#### Schema Changes
```bash
# 1. Modify prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name describe_change

# 3. Generate Prisma client
npx prisma generate

# 4. Update TypeScript types if needed
```

#### Common Database Operations
```typescript
// lib/db.ts - Database client
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
```

#### Query Patterns

**Tenant-Scoped Queries:**
```typescript
// Always filter by tenant_id for tenant-scoped data
const userBookings = await prisma.booking.findMany({
  where: {
    tenantId: tenantId,
    userId: userId
  },
  include: {
    user: {
      select: {
        username: true,
        email: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
})
```

**Cross-Tenant Queries (Super Admin Only):**
```typescript
// Super admin can query across all tenants
const allBookings = await prisma.booking.findMany({
  include: {
    tenant: {
      select: {
        name: true,
        subdomain: true
      }
    },
    user: {
      select: {
        username: true,
        email: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
})
```

### Migration Management

#### Creating Migrations
```bash
# Create new migration for schema changes
npx prisma migrate dev --name add_new_feature

# Generate SQL migration file
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datamodel prisma/new-schema.prisma \
  --script > migration.sql
```

#### Production Migrations
```bash
# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Seeding Strategy

#### Database Seeding Script
```typescript
// scripts/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create super admin
  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    }
  })
  
  // Create sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'test-monastery' },
    update: {},
    create: {
      name: 'Test Monastery',
      subdomain: 'test-monastery',
      description: 'Sample monastery for testing'
    }
  })
  
  // Create tenant admin
  const tenantAdmin = await prisma.user.upsert({
    where: { email: 'admin@test-monastery.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'tenantadmin',
      email: 'admin@test-monastery.com',
      password: hashedPassword,
      role: 'tenant_admin',
      isActive: true
    }
  })
  
  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## Authentication & Authorization

### JWT Implementation

#### Token Generation
```typescript
// lib/jwt.ts
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  userId: number
  username: string
  email: string
  role: string
  tenantId?: number
  subdomain?: string
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'monastery-booking-system',
      audience: 'monastery-users'
    }
  )
}

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET!,
      {
        issuer: 'monastery-booking-system',
        audience: 'monastery-users'
      }
    ) as JWTPayload
    
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}
```

#### Role-Based Access Control
```typescript
// lib/rbac.ts
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_MANAGER: 'tenant_manager',
  USER: 'user'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Role hierarchy for permission checking
const ROLE_HIERARCHY = [
  ROLES.USER,
  ROLES.TENANT_MANAGER,
  ROLES.TENANT_ADMIN,
  ROLES.SUPER_ADMIN
]

export const hasRolePermission = (userRole: string, requiredRole: string): boolean => {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole as Role)
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole as Role)
  
  return userRoleIndex >= requiredRoleIndex
}

// RBAC middleware wrapper
export const withRBAC = (options: {
  roles?: Role[]
  tenantScoped?: boolean
  allowSuperAdmin?: boolean
}) => {
  return async (request: NextRequest, handler: Function) => {
    // Implementation details...
  }
}
```

### Authentication Flow

#### Login Implementation
```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json()
    
    // Get tenant context
    const tenantIdHeader = request.headers.get('x-tenant-id')
    const tenantId = tenantIdHeader ? parseInt(tenantIdHeader) : undefined
    
    // Find user by email or username within tenant scope
    const user = await UserService.findByEmailOrUsername(identifier, tenantId)
    
    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password!)
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Generate JWT token with tenant context
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      subdomain: tenantSubdomain
    })
    
    return NextResponse.json({
      message: 'Login successful',
      user: UserService.toJSON(user),
      tenant,
      token
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Protected Route Middleware
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { TenantService } from '@/lib/tenant'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')

  // Tenant detection for API routes
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/admin/')) {
    const tenantContext = await TenantService.resolveTenantContext(request)
    
    if (tenantContext) {
      const response = NextResponse.next()
      response.headers.set('x-tenant-id', tenantContext.tenantId.toString())
      response.headers.set('x-tenant-subdomain', tenantContext.tenant.subdomain)
      return response
    }
  }

  // Authentication for protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}
```

## Multi-Tenant Implementation

### Tenant Context Resolution

#### Subdomain Detection
```typescript
// lib/tenant.ts
export class TenantService {
  static extractSubdomain(host: string): string | null {
    const hostname = host.split(':')[0]
    
    // Skip localhost and IP addresses
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null
    }

    const parts = hostname.split('.')
    if (parts.length < 3) return null

    const subdomain = parts[0]
    
    // Ignore reserved subdomains
    if (['www', 'api', 'admin'].includes(subdomain)) {
      return null
    }

    return subdomain
  }

  static async resolveTenantContext(request: NextRequest): Promise<TenantContext | null> {
    const subdomain = this.extractTenantIdentifier(request)
    
    if (!subdomain) return null

    const tenant = await this.findBySubdomain(subdomain)
    
    if (!tenant) return null

    return {
      tenant,
      tenantId: tenant.id
    }
  }
}
```

### Data Isolation Patterns

#### Automatic Tenant Filtering
```typescript
// lib/auth.ts - User service with tenant scoping
export class UserService {
  static async findMany(tenantId?: number) {
    return await prisma.user.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
  }

  static async findById(id: number, tenantId?: number) {
    return await prisma.user.findFirst({
      where: {
        id,
        ...(tenantId && { tenantId })
      }
    })
  }

  // Ensure user can only be created within correct tenant
  static async create(userData: UserCreateInput) {
    return await prisma.user.create({
      data: {
        ...userData,
        password: await bcrypt.hash(userData.password, 12)
      }
    })
  }
}
```

#### Booking Service with Tenant Scope
```typescript
// lib/bookings.ts
export class BookingService {
  static async createBooking(data: BookingCreateInput, tenantId: number) {
    // Verify user belongs to tenant
    const user = await prisma.user.findFirst({
      where: {
        id: data.userId,
        tenantId: tenantId,
        isActive: true
      }
    })

    if (!user) {
      throw new Error('User not found or does not belong to this tenant')
    }

    // Check availability within tenant
    const availability = await prisma.bookingAvailability.findFirst({
      where: {
        tenantId: tenantId,
        date: new Date(data.bookingDate),
        timeSlot: data.bookingTime,
        isAvailable: true
      }
    })

    if (!availability) {
      throw new Error('Time slot not available')
    }

    // Create booking within tenant
    return await prisma.booking.create({
      data: {
        tenantId: tenantId,
        userId: data.userId,
        bookingDate: new Date(data.bookingDate),
        bookingTime: data.bookingTime,
        eventNote: data.eventNote,
        status: 'pending'
      }
    })
  }

  static async getTenantBookings(tenantId: number) {
    return await prisma.booking.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
}
```

## API Development

### API Route Structure

#### Tenant-Scoped API Route
```typescript
// app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { BookingService } from '@/lib/bookings'

export async function GET(request: NextRequest) {
  try {
    // Get authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get tenant context from middleware
    const tenantIdHeader = request.headers.get('x-tenant-id')
    if (!tenantIdHeader) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const tenantId = parseInt(tenantIdHeader)

    // Verify user belongs to tenant (unless super admin)
    if (payload.role !== 'super_admin' && payload.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get bookings for tenant
    const bookings = await BookingService.getTenantBookings(tenantId)

    return NextResponse.json({
      message: 'Bookings retrieved successfully',
      bookings
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Super Admin API Route
```typescript
// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7)
    const payload = verifyToken(token!)
    
    // Verify super admin access
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Get platform-wide statistics (cross-tenant)
    const stats = await getPlatformStats()

    return NextResponse.json({
      message: 'Platform statistics retrieved',
      stats
    })

  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Error Handling

#### Standardized Error Responses
```typescript
// lib/api-errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export const handleAPIError = (error: unknown): NextResponse => {
  console.error('API Error:', error)

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.code || 'API_ERROR',
        message: error.message
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error'
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred'
    },
    { status: 500 }
  )
}
```

#### Input Validation
```typescript
// lib/validation.ts
import { z } from 'zod'

export const BookingCreateSchema = z.object({
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
  eventNote: z.string().max(500).optional(),
})

export const UserRegistrationSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  phoneNumber: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
})

// Usage in API routes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = BookingCreateSchema.parse(body)
    
    // Process validated data...
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }
    // Handle other errors...
  }
}
```

## Frontend Development

### Component Structure

#### Tenant-Aware Components
```typescript
// components/TenantProvider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface TenantContextType {
  tenant: Tenant | null
  loading: boolean
  error: string | null
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null
})

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get tenant from subdomain or API call
    const fetchTenant = async () => {
      try {
        const response = await fetch('/api/tenant/current')
        if (response.ok) {
          const data = await response.json()
          setTenant(data.tenant)
        }
      } catch (err) {
        setError('Failed to load tenant information')
      } finally {
        setLoading(false)
      }
    }

    fetchTenant()
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
```

#### Protected Route Component
```typescript
// components/ProtectedRoute.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyToken } from '@/lib/jwt-client'
import Loading from './ui/Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  allowRoles?: string[]
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  allowRoles = []
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
          localStorage.removeItem('token')
          router.push('/login')
          return
        }

        const { user } = await response.json()

        // Check role requirements
        if (requiredRole && user.role !== requiredRole) {
          if (!allowRoles.includes(user.role)) {
            router.push('/dashboard') // Redirect to safe page
            return
          }
        }

        setAuthorized(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [requiredRole, allowRoles, router])

  if (loading) {
    return <Loading />
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
```

### State Management Patterns

#### Authentication Context
```typescript
// components/AuthContext.tsx
'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'

interface AuthState {
  user: User | null
  tenant: Tenant | null
  token: string | null
  loading: boolean
  error: string | null
}

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tenant?: Tenant; token: string } }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null }
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token)
      return {
        ...state,
        user: action.payload.user,
        tenant: action.payload.tenant || null,
        token: action.payload.token,
        loading: false,
        error: null
      }
    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.payload }
    case 'LOGOUT':
      localStorage.removeItem('token')
      return {
        ...state,
        user: null,
        tenant: null,
        token: null,
        loading: false,
        error: null
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const AuthContext = createContext<{
  state: AuthState
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
}>({
  state: {
    user: null,
    tenant: null,
    token: null,
    loading: true,
    error: null
  },
  login: async () => {},
  logout: () => {}
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    tenant: null,
    token: null,
    loading: true,
    error: null
  })

  const login = async (identifier: string, password: string) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json()
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: {
          user: data.user,
          tenant: data.tenant,
          token: data.token
        }
      })
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: error instanceof Error ? error.message : 'Login failed' 
      })
      throw error
    }
  }

  const logout = () => {
    dispatch({ type: 'LOGOUT' })
  }

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      try {
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: data.user,
              tenant: data.tenant,
              token
            }
          })
        } else {
          localStorage.removeItem('token')
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        localStorage.removeItem('token')
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

## Testing Guidelines

### Test Structure

#### Unit Tests
```typescript
// tests/lib/tenant.test.ts
import { TenantService } from '@/lib/tenant'

describe('TenantService', () => {
  describe('extractSubdomain', () => {
    it('should extract subdomain correctly', () => {
      expect(TenantService.extractSubdomain('test.example.com')).toBe('test')
      expect(TenantService.extractSubdomain('monastery.example.com')).toBe('monastery')
    })

    it('should return null for localhost', () => {
      expect(TenantService.extractSubdomain('localhost:3000')).toBe(null)
      expect(TenantService.extractSubdomain('localhost')).toBe(null)
    })

    it('should ignore reserved subdomains', () => {
      expect(TenantService.extractSubdomain('www.example.com')).toBe(null)
      expect(TenantService.extractSubdomain('api.example.com')).toBe(null)
      expect(TenantService.extractSubdomain('admin.example.com')).toBe(null)
    })
  })
})
```

#### API Route Tests
```typescript
// tests/api/bookings.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/bookings/route'

describe('/api/bookings', () => {
  it('should require authentication', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
  })

  it('should return tenant bookings for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
        'x-tenant-id': '1',
        'x-tenant-subdomain': 'test-monastery'
      },
    })

    // Mock authentication and database
    // ... test implementation
  })
})
```

#### Component Tests
```typescript
// tests/components/ProtectedRoute.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import ProtectedRoute from '@/components/ProtectedRoute'

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

describe('ProtectedRoute', () => {
  it('should redirect to login when no token', async () => {
    const mockPush = jest.fn()
    require('next/navigation').useRouter.mockReturnValue({ push: mockPush })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- --testPathPattern=tenant.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

## Adding New Features

### Feature Development Workflow

#### 1. Planning Phase
```markdown
# Feature: New Booking Notification System

## Requirements
- Email notifications for booking status changes
- SMS notifications (optional)
- User preference management
- Admin notification settings

## Database Changes
- Add notification_preferences to users table
- Create notifications_log table
- Update tenant_settings for admin preferences

## API Changes
- POST /api/notifications/preferences
- GET /api/notifications/history
- POST /api/admin/notifications/settings
```

#### 2. Database Schema Updates
```typescript
// prisma/schema.prisma - Add new fields
model User {
  // ... existing fields
  notificationPreferences Json? @map("notification_preferences")
}

model NotificationLog {
  id        Int      @id @default(autoincrement())
  tenantId  Int      @map("tenant_id")
  userId    Int      @map("user_id")
  type      String   @db.VarChar(50)
  channel   String   @db.VarChar(20) // email, sms, push
  content   Json
  status    String   @default("pending")
  sentAt    DateTime? @map("sent_at")
  createdAt DateTime @default(now()) @map("created_at")
  
  user   User   @relation(fields: [userId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@map("notification_log")
}
```

#### 3. Create Migration
```bash
# Generate migration
npx prisma migrate dev --name add_notifications

# Update Prisma client
npx prisma generate
```

#### 4. Implement Service Layer
```typescript
// lib/notifications.ts
export class NotificationService {
  static async sendBookingNotification(
    bookingId: number,
    type: 'created' | 'approved' | 'cancelled',
    tenantId: number
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            email: true,
            notificationPreferences: true
          }
        },
        tenant: {
          select: {
            name: true,
            subdomain: true
          }
        }
      }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Check user preferences
    const preferences = booking.user.notificationPreferences as any
    if (!preferences?.email?.bookingUpdates) {
      return // User opted out
    }

    // Send email notification
    await this.sendEmail({
      to: booking.user.email,
      subject: `Booking ${type} - ${booking.tenant.name}`,
      template: `booking-${type}`,
      data: {
        booking,
        tenant: booking.tenant
      }
    })

    // Log notification
    await prisma.notificationLog.create({
      data: {
        tenantId: tenantId,
        userId: booking.userId,
        type: `booking_${type}`,
        channel: 'email',
        content: {
          bookingId: booking.id,
          subject: `Booking ${type}`,
          recipient: booking.user.email
        },
        status: 'sent',
        sentAt: new Date()
      }
    })
  }

  private static async sendEmail(params: {
    to: string
    subject: string
    template: string
    data: any
  }) {
    // Email sending implementation
    console.log(`Sending email to ${params.to}: ${params.subject}`)
    // Integrate with email service (SendGrid, AWS SES, etc.)
  }
}
```

#### 5. Create API Endpoints
```typescript
// app/api/notifications/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7)
    const payload = verifyToken(token!)
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        notificationPreferences: true
      }
    })

    const preferences = user?.notificationPreferences || {
      email: {
        bookingUpdates: true,
        reminders: true,
        newsletters: false
      },
      sms: {
        bookingUpdates: false,
        reminders: false
      }
    }

    return NextResponse.json({
      message: 'Preferences retrieved',
      preferences
    })

  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7)
    const payload = verifyToken(token!)
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { preferences } = await request.json()

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        notificationPreferences: preferences
      }
    })

    return NextResponse.json({
      message: 'Preferences updated successfully'
    })

  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### 6. Update Frontend Components
```typescript
// components/NotificationSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface NotificationPreferences {
  email: {
    bookingUpdates: boolean
    reminders: boolean
    newsletters: boolean
  }
  sms: {
    bookingUpdates: boolean
    reminders: boolean
  }
}

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      })

      if (response.ok) {
        alert('Preferences saved successfully!')
      } else {
        alert('Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !preferences) {
    return <div>Loading preferences...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Notification Preferences</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Email Notifications</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.bookingUpdates}
                onChange={(e) => setPreferences({
                  ...preferences,
                  email: {
                    ...preferences.email,
                    bookingUpdates: e.target.checked
                  }
                })}
                className="mr-2"
              />
              Booking status updates
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.reminders}
                onChange={(e) => setPreferences({
                  ...preferences,
                  email: {
                    ...preferences.email,
                    reminders: e.target.checked
                  }
                })}
                className="mr-2"
              />
              Booking reminders
            </label>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">SMS Notifications</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.sms.bookingUpdates}
                onChange={(e) => setPreferences({
                  ...preferences,
                  sms: {
                    ...preferences.sms,
                    bookingUpdates: e.target.checked
                  }
                })}
                className="mr-2"
              />
              Booking status updates
            </label>
          </div>
        </div>
      </div>

      <Button onClick={savePreferences} loading={saving}>
        Save Preferences
      </Button>
    </div>
  )
}
```

#### 7. Integration with Existing Features
```typescript
// Update booking service to send notifications
// lib/bookings.ts
import { NotificationService } from './notifications'

export class BookingService {
  static async approveBooking(bookingId: number, tenantId: number) {
    // Update booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' }
    })

    // Send notification
    await NotificationService.sendBookingNotification(
      bookingId,
      'approved',
      tenantId
    )

    return { success: true }
  }

  // Similar updates for other booking operations...
}
```

### Code Quality Checklist

#### Before Submitting Feature
- [ ] Database migrations run successfully
- [ ] All API endpoints have proper authentication
- [ ] Tenant isolation is maintained
- [ ] Error handling is comprehensive
- [ ] Input validation is implemented
- [ ] Unit tests are written and passing
- [ ] Integration tests cover main flows
- [ ] Documentation is updated
- [ ] Code follows project standards
- [ ] Security review is completed

## Code Standards

### TypeScript Guidelines

#### Type Definitions
```typescript
// Always define proper interfaces
interface BookingCreateRequest {
  bookingDate: string // ISO date string
  bookingTime: string // HH:MM format
  eventNote?: string
}

interface APIResponse<T = any> {
  message: string
  data?: T
  error?: string
}

// Use discriminated unions for status types
type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
```

#### Error Handling
```typescript
// Use custom error types
class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Consistent error responses
const handleError = (error: unknown): NextResponse => {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: error.message },
      { status: 400 }
    )
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Internal server error' },
    { status: 500 }
  )
}
```

### React/Next.js Guidelines

#### Component Structure
```typescript
// Use proper TypeScript interfaces for props
interface BookingCardProps {
  booking: Booking
  onStatusChange?: (bookingId: number, status: BookingStatus) => void
  showActions?: boolean
}

// Use proper component patterns
const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onStatusChange,
  showActions = true
}) => {
  // Component implementation...
}

export default BookingCard
```

#### Hooks Usage
```typescript
// Custom hooks for reusable logic
const useBookings = (tenantId?: number) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/bookings', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setBookings(data.bookings)
        } else {
          setError('Failed to fetch bookings')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [tenantId])

  return { bookings, loading, error, refetch: fetchBookings }
}
```

### Database Guidelines

#### Query Optimization
```typescript
// Always use proper indexes and includes
const bookingWithDetails = await prisma.booking.findMany({
  where: {
    tenantId: tenantId,
    userId: userId
  },
  include: {
    user: {
      select: {
        username: true,
        email: true
      }
    },
    tenant: {
      select: {
        name: true,
        subdomain: true
      }
    }
  },
  orderBy: [
    { bookingDate: 'asc' },
    { bookingTime: 'asc' }
  ]
})
```

#### Transaction Usage
```typescript
// Use transactions for related operations
const createBookingWithNotification = await prisma.$transaction(async (tx) => {
  const booking = await tx.booking.create({
    data: bookingData
  })

  await tx.notificationLog.create({
    data: {
      tenantId: booking.tenantId,
      userId: booking.userId,
      type: 'booking_created',
      channel: 'email',
      content: { bookingId: booking.id }
    }
  })

  return booking
})
```

## Debugging

### Common Issues and Solutions

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
psql -U postgres -l | grep auth_app

# Test connection
npm run db:status

# Reset database if needed
npm run db:reset
```

#### Authentication Problems
```javascript
// Debug JWT token
const token = localStorage.getItem('token')
console.log('Token:', token)

if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  console.log('Token payload:', payload)
  console.log('Token expires:', new Date(payload.exp * 1000))
}
```

#### Tenant Resolution Issues
```javascript
// Debug tenant detection
const host = window.location.host
console.log('Current host:', host)
console.log('Expected subdomain:', host.split('.')[0])

// Check tenant API
fetch('/api/tenant/current')
  .then(res => res.json())
  .then(data => console.log('Tenant data:', data))
```

### Logging and Monitoring

#### Development Logging
```typescript
// lib/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data)
    }
  },
  
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data)
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data)
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error)
  }
}

// Usage in API routes
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    logger.info('Creating booking', { userId, tenantId })
    // ... implementation
  } catch (error) {
    logger.error('Booking creation failed', error)
    throw error
  }
}
```

#### Performance Monitoring
```typescript
// lib/performance.ts
export const measureTime = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now()
  const result = await fn()
  const duration = Date.now() - start
  
  console.log(`[PERF] ${name} took ${duration}ms`)
  
  return result
}

// Usage
const bookings = await measureTime('fetch-bookings', () =>
  prisma.booking.findMany({ where: { tenantId } })
)
```

---

This developer guide provides comprehensive information for working with the multi-tenant monastery booking system. For additional technical details, refer to the [Architecture Documentation](./ARCHITECTURE.md) and [API Reference](./API.md).