import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'
import { formatDateForDatabase, createSafeDateRange } from '@/lib/utils/dateValidation'

// Meal period definitions with time ranges for display
const MEAL_PERIODS = {
  morning_meal: {
    name: 'Morning Meal',
    icon: '🌅',
    timeRange: '6:30 AM - 7:30 AM',
    description: 'First meal of the day',
    color: 'bg-amber-50 border-amber-200 text-amber-800'
  },
  morning_tea: {
    name: 'Morning Tea',
    icon: '🍵',
    timeRange: '9:30 AM - 10:30 AM',
    description: 'Morning refreshment',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  lunch_meal: {
    name: 'Lunch Meal',
    icon: '🍽️',
    timeRange: '11:30 AM - 12:00 PM',
    description: 'Main meal - last food before evening',
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  evening_tea: {
    name: 'Evening Tea',
    icon: '☕',
    timeRange: '3:00 PM - 4:00 PM',
    description: 'Final refreshment of the day',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  }
}

// Helper function to get meal costs and currency from tenant settings
async function getMealCostsAndCurrency(tenantId: number) {
  try {
    const settings = await prisma.tenantSettings.findFirst({
      where: { tenantId },
      select: { mealCosts: true, mealPeriods: true, currency: true }
    })

    // Default costs if not configured
    const defaultCosts = {
      morning_meal: 75,
      morning_tea: 25,
      lunch_meal: 100,
      evening_tea: 30
    }

    let mealCosts = defaultCosts

    // First, try to get costs from mealPeriods (new format from organization settings)
    if (settings?.mealPeriods && Array.isArray(settings.mealPeriods)) {
      console.log('📊 Using meal costs from mealPeriods field for tenant:', tenantId)
      const extractedCosts: Record<string, number> = {}

      for (const period of settings.mealPeriods) {
        if (period.id && typeof period.cost === 'number') {
          extractedCosts[period.id] = period.cost
        }
      }

      // Merge with defaults to ensure all periods have costs
      mealCosts = { ...defaultCosts, ...extractedCosts }
      console.log('📊 Extracted costs from mealPeriods:', extractedCosts)
    }
    // Fallback to legacy mealCosts field for backward compatibility
    else if (settings?.mealCosts) {
      console.log('📊 Using meal costs from legacy mealCosts field for tenant:', tenantId)
      mealCosts = { ...defaultCosts, ...settings.mealCosts }
    } else {
      console.log('📊 Using default meal costs for tenant:', tenantId)
    }

    const currency = settings?.currency || 'USD'
    console.log('💰 Final meal costs for tenant', tenantId, ':', mealCosts, 'Currency:', currency)

    return { mealCosts, currency }
  } catch (error) {
    console.error('Error fetching meal costs and currency:', error)
    return {
      mealCosts: {
        morning_meal: 75,
        morning_tea: 25,
        lunch_meal: 100,
        evening_tea: 30
      },
      currency: 'USD'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limitParam = searchParams.get('limit')

    // Validate and parse limit parameter
    let limit = 30 // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: 'Invalid limit parameter', message: 'Limit must be a positive integer' },
          { status: 400 }
        )
      }
      limit = parsedLimit
    }

    // Extract tenant context from multiple sources
    let tenantId: number = 1 // Default tenant
    let payload: any = null

    // Check for tenant context via subdomain FIRST (works for both auth and guest users)
    const subdomainHeader = request.headers.get('x-tenant-subdomain')
    let subdomainTenantId: number | null = null

    console.log('API: Received x-tenant-subdomain header:', subdomainHeader || 'none')

    if (subdomainHeader) {
      // Look up tenant by subdomain
      try {
        const tenant = await prisma.tenant.findFirst({
          where: {
            subdomain: subdomainHeader.toLowerCase(),
            isActive: true
          }
        })

        if (tenant) {
          subdomainTenantId = tenant.id
          console.log('API: Found tenant for subdomain', subdomainHeader, '- tenant ID:', tenant.id)
        } else {
          console.log('API: No tenant found for subdomain:', subdomainHeader)
        }
      } catch (error) {
        console.error('Error looking up tenant by subdomain:', error)
        // Continue with default tenant if lookup fails
      }
    }

    // Try to get authentication token
    const token = request.cookies.get('token')?.value

    if (token) {
      // User is authenticated - verify token and extract tenant context
      payload = await verifyToken(token)
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
          { status: 401 }
        )
      }

      // Debug logging for JWT payload
      console.log('API: JWT Payload:', {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        tenantId: payload.tenantId,
        hasSubdomain: !!subdomainTenantId,
        subdomainTenantId: subdomainTenantId
      })

      // Determine tenant context: SUBDOMAIN ALWAYS TAKES PRIORITY
      // This allows any authenticated user to view any tenant via subdomain
      if (subdomainTenantId) {
        // Subdomain context found - use it regardless of user role or JWT tenant
        tenantId = subdomainTenantId
        console.log('API: Using subdomain tenant ID:', subdomainTenantId)
      } else if (payload.role === 'super_admin') {
        // Super admin with no subdomain - check query param or default
        const requestedTenantId = searchParams.get('tenantId')
        tenantId = requestedTenantId ? parseInt(requestedTenantId) : 1
        console.log('API: Super admin using tenant ID:', tenantId)
      } else if (payload.tenantId) {
        // Regular user with JWT tenant assignment
        tenantId = payload.tenantId
        console.log('API: Using JWT tenant ID:', payload.tenantId)
      } else {
        // Fallback to default tenant
        tenantId = 1
        console.log('API: Using default tenant ID:', 1)
      }
    } else {
      // Guest user - use subdomain tenant if found, otherwise default
      if (subdomainTenantId) {
        tenantId = subdomainTenantId
      }
      // Guest users can view availability but booking operations may be restricted
    }

    console.log('API: Final tenant ID being used:', tenantId)

    // Get meal costs and currency for this tenant
    const { mealCosts, currency } = await getMealCostsAndCurrency(tenantId)

    // Generate date range
    let dates: Date[] = []
    if (date) {
      dates = [new Date(date)]
    } else {
      const start = startDate ? new Date(startDate) : new Date()
      const end = endDate ? new Date(endDate) : new Date(Date.now() + limit * 24 * 60 * 60 * 1000)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d))
      }

      if (dates.length > limit) {
        dates = dates.slice(0, limit)
      }
    }

    const availability = []

    for (const currentDate of dates) {
      const dateStr = formatDateForDatabase(currentDate)

      // Check each meal period for this date
      for (const [mealPeriodId, mealInfo] of Object.entries(MEAL_PERIODS)) {

        // Use PostgreSQL's DATE() function to extract date part for comparison
        // This ignores timezone and compares only the date portion
        console.log(`[AVAILABILITY DEBUG] Date check for ${dateStr} ${mealPeriodId}:`)
        console.log(`  Date String: ${dateStr}`)
        console.log(`  Tenant ID: ${tenantId}`)

        const existingBooking = await prisma.$queryRaw`
          SELECT b.id, b.tenant_id, b.user_id, b.booking_date, b.meal_period,
                 b.event_note, b.status, b.offering_type, b.is_recurring,
                 b.recurring_booking_id, b.created_at, b.updated_at,
                 u.username, u.email
          FROM bookings b
          JOIN users u ON b.user_id = u.id
          WHERE b.tenant_id = ${tenantId}
            AND DATE(b.booking_date) = ${dateStr}::date
            AND b.meal_period = ${mealPeriodId}
            AND b.status IN ('pending', 'confirmed')
          LIMIT 1
        `

        const bookingResult = existingBooking as any[]
        const foundBooking = bookingResult.length > 0 ? bookingResult[0] : null

        if (foundBooking) {
          console.log(`  ✅ BOOKING FOUND:`)
          console.log(`    Booking ID: ${foundBooking.id}`)
          console.log(`    Booking Date (stored): ${foundBooking.booking_date}`)
          console.log(`    User: ${foundBooking.username} (${foundBooking.email})`)
          console.log(`    Status: ${foundBooking.status}`)
        } else {
          console.log(`  ❌ No booking found for this date/meal period`)
        }


        // Check for availability overrides using DATE() function
        const overrideResult = await prisma.$queryRaw`
          SELECT * FROM availability_overrides
          WHERE tenant_id = ${tenantId}
            AND DATE(date) = ${dateStr}::date
            AND meal_period = ${mealPeriodId}
            AND is_active = true
          LIMIT 1
        `
        const override = (overrideResult as any[]).length > 0 ? (overrideResult as any[])[0] : null

        // Check recurring bookings
        const recurringBooking = await prisma.recurringBooking.findFirst({
          where: {
            tenantId: tenantId,
            bookingMonth: currentDate.getMonth() + 1,
            bookingDay: currentDate.getDate(),
            mealPeriod: mealPeriodId,
            isActive: true
          },
          include: {
            user: {
              select: {
                username: true,
                email: true
              }
            }
          }
        })

        // Determine availability status
        let isAvailable = true
        let isBooked = false
        let bookedBy = null
        let status = 'available'
        let source = 'generated'

        if (override?.override_type === 'disable') {
          isAvailable = false
          status = 'disabled'
          source = 'override'
        } else if (recurringBooking) {
          isAvailable = false
          isBooked = true
          bookedBy = recurringBooking.user
          status = 'recurring_booked'
          source = 'recurring'
        } else if (foundBooking) {
          isAvailable = false
          isBooked = true
          bookedBy = {
            username: foundBooking.username,
            email: foundBooking.email
          }
          status = 'booked'
          source = 'booking'
        }

        availability.push({
          date: dateStr,
          mealPeriod: mealPeriodId,
          mealName: mealInfo.name,
          icon: mealInfo.icon,
          timeRange: mealInfo.timeRange,
          description: mealInfo.description,
          color: mealInfo.color,
          cost: mealCosts[mealPeriodId],
          isAvailable,
          isBooked,
          bookedBy: bookedBy ? {
            username: bookedBy.username,
            email: bookedBy.email
          } : null,
          status,
          source
        })
      }
    }

    return NextResponse.json({
      message: 'Meal-based availability retrieved successfully',
      availability,
      mealPeriods: MEAL_PERIODS,
      mealCosts,
      currency
    })

  } catch (error: any) {
    console.error('Get meal availability error:', error)

    // Handle validation errors with specific error messages
    if (error.message && error.message.includes('Invalid date')) {
      return NextResponse.json(
        { error: 'Date validation error', message: error.message },
        { status: 400 }
      )
    }

    // Generic server error for unknown issues
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve meal availability' },
      { status: 500 }
    )
  }
}