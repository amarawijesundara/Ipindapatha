# API Documentation

This document describes the REST API endpoints available in the JWT Authentication Next.js application.

## Base URL
```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "message": "Success message",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Endpoints

### Health Check

#### GET /api/health
Check if the API is running.

**Headers:** None required

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

---

### Authentication

#### POST /api/auth/register
Register a new user account.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Validation failed (missing/invalid fields)
- `409` - User already exists

#### POST /api/auth/login
Authenticate user and get JWT token.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "identifier": "john@example.com",  // email or username
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Missing credentials
- `401` - Invalid credentials

#### GET /api/auth/profile
Get current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "phone_number": null,
    "address": null,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Invalid or missing token
- `404` - User not found

#### GET /api/auth/verify
Verify if JWT token is valid.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Token is valid",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Errors:**
- `401` - Invalid or expired token

#### POST /api/auth/logout
Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

### Bookings

#### GET /api/bookings
Get current user's bookings.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Bookings retrieved successfully",
  "bookings": [
    {
      "id": 1,
      "user_id": 1,
      "booking_date": "2024-01-15",
      "booking_time": "10:00:00",
      "event_note": "Meeting with team",
      "status": "confirmed",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Errors:**
- `401` - Authentication required

#### POST /api/bookings
Create a new booking.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "bookingDate": "2024-01-15",
  "bookingTime": "10:00:00",
  "eventNote": "Meeting with team"  // optional
}
```

**Response (201):**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": 1,
    "user_id": 1,
    "booking_date": "2024-01-15",
    "booking_time": "10:00:00",
    "event_note": "Meeting with team",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Missing required fields or time slot not available
- `401` - Authentication required

#### GET /api/bookings/availability
Get available booking time slots.

**Query Parameters:**
- `date` (optional) - Filter by specific date (YYYY-MM-DD format)

**Example:**
```
GET /api/bookings/availability?date=2024-01-15
```

**Response (200):**
```json
{
  "message": "Availability retrieved successfully",
  "availability": [
    {
      "id": 1,
      "date": "2024-01-15",
      "time_slot": "09:00:00",
      "is_available": true,
      "max_bookings": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "date": "2024-01-15",
      "time_slot": "10:00:00",
      "is_available": true,
      "max_bookings": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Statistics

#### GET /api/stats
Get dashboard statistics (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Stats retrieved successfully",
  "stats": {
    "totalUsers": 5,
    "totalBookings": 10,
    "pendingBookings": 3,
    "confirmedBookings": 6,
    "cancelledBookings": 1
  }
}
```

**Errors:**
- `401` - Authentication required

---

## HTTP Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Invalid request data)
- `401` - Unauthorized (Authentication required or failed)
- `404` - Not Found (Resource not found)
- `409` - Conflict (Resource already exists)
- `500` - Internal Server Error (Server error)

## Rate Limiting

The API includes rate limiting to prevent abuse:
- **Window**: 15 minutes
- **Max Requests**: 100 per IP address per window
- **Headers**: Rate limit info is returned in response headers

When rate limit is exceeded:
```json
{
  "error": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later."
}
```

## CORS Policy

The API is configured with CORS to allow requests from:
- **Development**: http://localhost:3000
- **Production**: Configure allowed origins in `src/middleware.ts`

## Example Usage

### JavaScript/Fetch
```javascript
// Register
const registerUser = async () => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123'
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    localStorage.setItem('token', data.token);
  }
  return data;
};

// Authenticated request
const getProfile = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

### cURL Examples
```bash
# Health check
curl -X GET http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"john@example.com","password":"password123"}'

# Get profile (replace TOKEN with actual JWT)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"

# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingDate":"2024-01-15","bookingTime":"10:00:00","eventNote":"Team meeting"}'
```

## Security Considerations

1. **JWT Tokens**: Store securely, include in Authorization header
2. **HTTPS**: Use HTTPS in production
3. **Token Expiration**: Tokens expire after 24 hours by default
4. **Password Security**: Passwords are hashed with bcrypt (cost factor 12)
5. **Input Validation**: All inputs are validated server-side
6. **SQL Injection**: Using parameterized queries to prevent SQL injection