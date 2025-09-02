# Multi-Tenant Monastery Booking System - API Reference

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Tenant Context](#tenant-context)
- [API Endpoints](#api-endpoints)
  - [Authentication APIs](#authentication-apis)
  - [Tenant-Scoped APIs](#tenant-scoped-apis)
  - [Super Admin APIs](#super-admin-apis)
  - [Public APIs](#public-apis)
- [Response Formats](#response-formats)
- [Code Examples](#code-examples)

## Overview

The Multi-Tenant Monastery Booking System provides RESTful APIs for managing monasteries, users, bookings, and platform administration. All APIs follow consistent patterns for authentication, error handling, and response formatting.

### Base URLs
- **Tenant-Specific**: `https://{monastery}.example.com/api`
- **Super Admin**: `https://example.com/api/admin`
- **Public APIs**: `https://example.com/api`

### API Version
Current API version: **v1** (included in all routes)

---

## Authentication

### JWT Token Authentication
All protected endpoints require a valid JWT token passed in the Authorization header.

```http
Authorization: Bearer <your-jwt-token>
```

### Token Structure
```json
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

### Token Expiration
- Default: 24 hours
- Configurable via `JWT_EXPIRES_IN` environment variable

---

## Error Handling

### Standard Error Format
```json
{
  "error": "ErrorType",
  "message": "Human readable error message",
  "details": {
    "field": "Additional context (optional)"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

### Common Error Types
- `AuthenticationError` - Invalid or missing token
- `AuthorizationError` - Insufficient permissions
- `ValidationError` - Invalid input data
- `TenantNotFoundError` - Tenant resolution failed
- `ResourceNotFoundError` - Requested resource not found
- `ConflictError` - Resource already exists

---

## Rate Limiting

### Limits
- **General APIs**: 100 requests per 15 minutes per IP
- **Authentication APIs**: 10 requests per 15 minutes per IP
- **Admin APIs**: 200 requests per 15 minutes per authenticated user

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

---

## Tenant Context

### Automatic Tenant Detection
Tenant context is automatically detected from:
1. Subdomain (e.g., `st-marys.example.com` → tenant: "st-marys")
2. Custom domain mapping (if configured)
3. X-Tenant-Subdomain header (for API clients)

### Tenant Headers in Response
```http
X-Tenant-ID: 5
X-Tenant-Subdomain: st-marys
```

---

## API Endpoints

### Authentication APIs

#### POST /api/auth/register
Register a new user within the current tenant.

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@stmarys.com",
  "password": "SecurePass123!",
  "phone_number": "+1234567890",
  "address": "123 Main St, City, State"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@stmarys.com",
    "role": "user",
    "tenantId": 5,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "identifier": "john@stmarys.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@stmarys.com",
    "role": "user",
    "tenantId": 5
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/auth/profile
Get current user profile (requires authentication).

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@stmarys.com",
    "role": "user",
    "phoneNumber": "+1234567890",
    "address": "123 Main St, City, State",
    "tenantId": 5,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "tenant": {
    "id": 5,
    "name": "St. Mary's Monastery",
    "subdomain": "st-marys"
  }
}
```

---

### Tenant-Scoped APIs

#### GET /api/bookings
Get user's bookings (requires authentication).

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `confirmed`, `cancelled`)
- `from` (optional): Start date filter (YYYY-MM-DD)
- `to` (optional): End date filter (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

**Response (200):**
```json
{
  "bookings": [
    {
      "id": 456,
      "userId": 123,
      "bookingDate": "2024-01-20",
      "bookingTime": "10:00:00",
      "eventNote": "Prayer session",
      "status": "confirmed",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### POST /api/bookings
Create a new booking (requires authentication).

**Request:**
```json
{
  "bookingDate": "2024-01-25",
  "bookingTime": "14:00:00",
  "eventNote": "Meditation session"
}
```

**Response (201):**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": 789,
    "userId": 123,
    "bookingDate": "2024-01-25",
    "bookingTime": "14:00:00",
    "eventNote": "Meditation session",
    "status": "pending",
    "createdAt": "2024-01-15T13:00:00Z"
  }
}
```

---

### Super Admin APIs

#### GET /api/admin/tenants
Get all tenants (requires super_admin role).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `active` (optional): Filter by active status (true/false)

**Response (200):**
```json
{
  "tenants": [
    {
      "id": 5,
      "name": "St. Mary's Monastery",
      "subdomain": "st-marys",
      "domain": null,
      "description": "A peaceful monastery in the hills",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "userCount": 45,
      "bookingCount": 150
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### POST /api/admin/tenants
Create new tenant (requires super_admin role).

**Request:**
```json
{
  "name": "Holy Spirit Monastery",
  "subdomain": "holy-spirit",
  "domain": "holyspirit.org",
  "description": "Contemplative monastery",
  "adminUser": {
    "username": "admin",
    "email": "admin@holyspirit.org",
    "password": "SecureAdminPass123!"
  }
}
```

**Response (201):**
```json
{
  "message": "Tenant created successfully",
  "tenant": {
    "id": 10,
    "name": "Holy Spirit Monastery",
    "subdomain": "holy-spirit",
    "domain": "holyspirit.org",
    "description": "Contemplative monastery",
    "isActive": true,
    "createdAt": "2024-01-15T16:00:00Z"
  }
}
```

#### GET /api/admin/settings
Get platform settings (requires super_admin role).

**Response (200):**
```json
{
  "settings": {
    "platformName": "Monastery Booking Platform",
    "maintenanceMode": false,
    "allowRegistrations": true,
    "requireEmailVerification": false,
    "maxTenantsPerDay": 5,
    "maxUsersPerTenant": 100,
    "maxBookingsPerUser": 10,
    "sessionTimeout": 24,
    "enableAuditLog": true,
    "enableNotifications": true
  }
}
```

#### POST /api/admin/settings
Update platform settings (requires super_admin role).

**Request:**
```json
{
  "settings": {
    "platformName": "Monastery Booking Platform",
    "maintenanceMode": false,
    "allowRegistrations": true,
    "maxUsersPerTenant": 150
  }
}
```

**Response (200):**
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "platformName": "Monastery Booking Platform",
    "maintenanceMode": false,
    "allowRegistrations": true,
    "maxUsersPerTenant": 150,
    "updatedAt": "2024-01-15T19:00:00Z"
  }
}
```

---

### Public APIs

#### GET /api/health
System health check (public access).

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T20:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "email": "available"
  },
  "version": "1.0.0"
}
```

#### POST /api/tenants/create
Request new tenant creation (public access).

**Request:**
```json
{
  "monasteryName": "New Monastery",
  "subdomain": "new-monastery",
  "contactEmail": "admin@newmonastery.org",
  "contactName": "Father John",
  "description": "Brief description of the monastery"
}
```

**Response (201):**
```json
{
  "message": "Tenant creation request submitted",
  "requestId": "req_abc123",
  "status": "pending_approval"
}
```

---

## Code Examples

### JavaScript/TypeScript Client

```typescript
class MonasteryAPI {
  private baseURL: string
  private token?: string

  constructor(baseURL: string, token?: string) {
    this.baseURL = baseURL
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'API request failed')
    }

    return data
  }

  async login(identifier: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    
    this.token = data.token
    return data
  }

  async createBooking(bookingData: any) {
    return await this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    })
  }
}

// Usage
const api = new MonasteryAPI('https://st-marys.example.com')
await api.login('john@stmarys.com', 'password')
const booking = await api.createBooking({
  bookingDate: '2024-01-25',
  bookingTime: '14:00:00',
  eventNote: 'Prayer session'
})
```

### cURL Examples

```bash
# Register
curl -X POST https://st-marys.example.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@stmarys.com",
    "password": "SecurePass123!"
  }'

# Login
curl -X POST https://st-marys.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@stmarys.com",
    "password": "SecurePass123!"
  }'

# Create booking
curl -X POST https://st-marys.example.com/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingDate": "2024-01-25",
    "bookingTime": "14:00:00",
    "eventNote": "Prayer session"
  }'

# Get platform settings (super admin)
curl -X GET https://example.com/api/admin/settings \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"
```

---

This API reference provides comprehensive documentation for the Multi-Tenant Monastery Booking System. For additional help, refer to the [User Guide](./USER_GUIDE.md) and [Architecture Documentation](./ARCHITECTURE.md).