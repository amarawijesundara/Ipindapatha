// Multi-Tenant Types
export interface Tenant {
  id: number
  name: string
  subdomain: string
  domain?: string
  description?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface TenantCreateInput {
  name: string
  subdomain: string
  domain?: string
  description?: string
}

export interface TenantUser {
  id: number
  tenant_id: number
  user_id: number
  role: 'user' | 'admin' | 'tenant_admin' | 'tenant_manager'
  is_active: boolean
  created_at: Date
}

export interface TenantSettings {
  id: number
  tenant_id: number
  business_hours?: any
  booking_rules?: any
  custom_fields?: any
  branding?: any
  notifications?: any
  features?: any
  created_at: Date
  updated_at: Date
}

export interface TenantSubscription {
  id: number
  tenant_id: number
  plan: string
  status: 'active' | 'inactive' | 'suspended' | 'cancelled'
  start_date: Date
  end_date?: Date
  max_users: number
  max_bookings: number
  features?: any
  created_at: Date
  updated_at: Date
}

export interface User {
  id: number
  tenant_id?: number
  username: string
  email: string
  password?: string
  role: 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager'
  phone_number?: string
  address?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface UserCreateInput {
  tenant_id?: number
  username: string
  email: string
  password: string
  role?: 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager'
  phone_number?: string
  address?: string
}

export interface Booking {
  id: number
  tenant_id: number
  user_id: number
  booking_date: Date
  booking_time: string
  event_note?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: Date
  updated_at: Date
}

export interface BookingAvailability {
  id: number
  tenant_id: number
  date: Date
  time_slot: string
  is_available: boolean
  max_bookings: number
  created_at: Date
  updated_at: Date
}

export interface RefreshToken {
  id: number
  tenant_id: number
  user_id: number
  token: string
  expires_at: Date
  created_at: Date
}

export interface AuthResponse {
  message: string
  user: Omit<User, 'password'>
  tenant?: Tenant
  token: string
}

export interface ApiError {
  error: string
  message: string
}

// Tenant Context Type for Request Processing
export interface TenantContext {
  tenant: Tenant
  tenantId: number
}

// JWT Payload with Tenant Information
export interface JWTPayload {
  userId: number
  username: string
  email: string
  role: string
  tenantId?: number
  subdomain?: string
  iat?: number
  exp?: number
}

// Multi-tenant Service Input Types
export interface TenantAwareInput {
  tenantId: number
}

export interface BookingCreateInput extends TenantAwareInput {
  userId: number
  bookingDate: string
  bookingTime: string
  eventNote?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  adminOverride?: boolean
}

export interface AvailabilityCreateInput extends TenantAwareInput {
  date: string
  timeSlot: string
  isAvailable?: boolean
  maxBookings?: number
}