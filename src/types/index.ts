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
  meal_period: 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'
  event_note?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  offering_type: 'food_preparation' | 'monetary_donation'
  created_at: Date
  updated_at: Date
}

export interface BookingAvailability {
  id: number
  tenant_id: number
  date: Date
  meal_period: 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'
  is_available: boolean
  is_booked: boolean
  booked_by?: number
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
  mealPeriod: 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'
  eventNote?: string
  offeringType?: 'food_preparation' | 'monetary_donation'
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  adminOverride?: boolean
}

export interface AvailabilityCreateInput extends TenantAwareInput {
  date: string
  mealPeriod: 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'
  isAvailable?: boolean
  isBooked?: boolean
  bookedBy?: number
}

// Payment System Types
export interface BookingPayment {
  id: number
  booking_id: number
  tenant_id: number
  user_id: number
  amount: number
  currency: string
  payment_deadline: Date
  status: 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled'
  paid_at?: Date
  verified_at?: Date
  verified_by?: number
  notes?: string
  created_at: Date
  updated_at: Date
}

export interface PaymentReceipt {
  id: number
  payment_id: number
  tenant_id: number
  user_id: number
  file_name: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  reviewed_at?: Date
  reviewed_by?: number
  created_at: Date
  updated_at: Date
}

export interface PaymentCreateInput extends TenantAwareInput {
  bookingId: number
  userId: number
  amount: number
  currency?: string
  paymentDeadline: Date
}

export interface ReceiptUploadInput extends TenantAwareInput {
  paymentId: number
  userId: number
  file: File
}

export interface PaymentWithReceipts extends BookingPayment {
  receipts: PaymentReceipt[]
}

export interface BookingWithPayment extends Booking {
  bookingPayment?: PaymentWithReceipts
}

// Meal Period Types
export type MealPeriodId = 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'

export interface MealPeriod {
  id: MealPeriodId
  name: string
  icon: string
  timeRange: string
  description: string
  color: string
}

export interface MealAvailability {
  date: string
  mealPeriod: MealPeriodId
  mealName: string
  icon: string
  timeRange: string
  description: string
  color: string
  cost: number
  isAvailable: boolean
  isBooked: boolean
  bookedBy?: {
    username: string
    email: string
  }
  status: 'available' | 'booked' | 'disabled' | 'recurring_booked'
  source: 'generated' | 'booking' | 'override' | 'recurring'
}