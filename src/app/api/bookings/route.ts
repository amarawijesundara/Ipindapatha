import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { BookingService } from '@/lib/bookings'
import { TenantService } from '@/lib/tenant'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies (consistent with other endpoints)
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to view your bookings' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // filter by status
    const startDate = searchParams.get('start_date') // date range filtering
    const endDate = searchParams.get('end_date')

    // Determine tenant context (same logic as POST method)
    let tenantId: number | undefined
    if (payload.role === 'super_admin') {
      // Super admin can access all tenants, default to tenant 1 if not specified
      tenantId = undefined // Allow access across tenants for super admins
    } else if (payload.tenantId) {
      tenantId = payload.tenantId
    } else {
      tenantId = 1 // Default tenant
    }

    // Get user's bookings within their tenant
    const bookings = await BookingService.getUserBookings(
      payload.userId,
      tenantId,
      {
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      },
      payload.role // Pass user role for role-based filtering
    )

    return NextResponse.json({
      message: 'Bookings retrieved successfully',
      bookings
    })

  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingDate, mealPeriod, eventNote, sessionId, guestName, guestEmail, guestPhone, isRecurring, offeringType, donationAmount } = body

    // Basic validation
    if (!bookingDate || !mealPeriod) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Booking date and meal period are required' },
        { status: 400 }
      )
    }

    // Validate meal period
    const validMealPeriods = ['morning_meal', 'morning_tea', 'lunch_meal', 'evening_tea']
    if (!validMealPeriods.includes(mealPeriod)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Invalid meal period' },
        { status: 400 }
      )
    }

    // Validate offering type and donation amount
    if (offeringType && !['food_preparation', 'monetary_donation'].includes(offeringType)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Invalid offering type' },
        { status: 400 }
      )
    }

    // Note: For monetary donations, donation amount is optional
    // If not provided, we'll use a default amount when creating the payment record

    // Extract tenant context from subdomain FIRST (consistent with availability API)
    let tenantId = 1 // Default fallback
    let tenantContext = null

    console.log('Booking: Starting tenant resolution process')

    // Try subdomain resolution first
    try {
      tenantContext = await TenantService.resolveTenantContext(request)
      if (tenantContext) {
        tenantId = tenantContext.tenantId
        console.log('Booking: Resolved tenant context for subdomain:', tenantContext.tenant.subdomain, 'tenant ID:', tenantId)
      } else {
        console.log('Booking: No tenant context found (localhost or no subdomain)')
      }
    } catch (error) {
      console.error('Booking: Error resolving tenant context:', error)
      // Continue with default tenant for localhost/development
    }

    // Get user authentication - required for all bookings
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to complete your booking' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
        { status: 401 }
      )
    }

    let user = payload

    // Validate user access to tenant (same logic as availability API)
    if (tenantContext && tenantId) {
      // We have a specific tenant subdomain - validate user access
      if (payload.role !== 'super_admin') {
        // Regular users must belong to the subdomain's tenant
        if (!payload.tenantId || payload.tenantId !== tenantId) {
          console.log(`Booking: Access denied - User ${payload.username} (tenant: ${payload.tenantId}) tried to create booking for tenant ${tenantId}`)
          return NextResponse.json(
            {
              error: 'Access denied',
              message: 'You are not authorized to create bookings for this organization'
            },
            { status: 403 }
          )
        }
        console.log(`Booking: Access granted - User ${payload.username} belongs to tenant ${tenantId}`)
      } else {
        console.log(`Booking: Super admin ${payload.username} granted access to tenant ${tenantId}`)
      }
    } else {
      // No tenant context (localhost) - use user's JWT tenant or handle super admin
      if (payload.role === 'super_admin') {
        // Super admin on localhost can specify tenant or use their JWT tenant or default
        tenantId = body.tenantId || payload.tenantId || 1
        console.log(`Booking: Super admin ${payload.username} using tenant ${tenantId} on localhost`)
      } else if (payload.tenantId) {
        tenantId = payload.tenantId
        console.log(`Booking: Regular user ${payload.username} using JWT tenant ${tenantId} on localhost`)
      } else {
        tenantId = 1
        console.log(`Booking: User ${payload.username} using default tenant ${tenantId} on localhost`)
      }
    }

    // Create booking (regular or recurring)
    const booking = await BookingService.createBooking({
      userId: user.userId,
      tenantId,
      bookingDate,
      mealPeriod,
      eventNote: eventNote || `Dhane offering ceremony - ${guestName || user.username}`,
      guestName: guestName || undefined,
      guestEmail: guestEmail || undefined,
      guestPhone: guestPhone || undefined,
      isRecurring: isRecurring || false,
      offeringType: offeringType || 'food_preparation'
    })

    // Create payment record if monetary donation
    let paymentRecord = null
    if (offeringType === 'monetary_donation') {
      // Get tenant-specific meal period cost
      let paymentAmount = donationAmount

      if (!paymentAmount || paymentAmount <= 0) {
        // Use tenant-specific meal period cost as default
        try {
          const { calculateTenantMealCosts } = await import('@/lib/utils/mealCategories')
          paymentAmount = await calculateTenantMealCosts(tenantId, [mealPeriod])
        } catch (error) {
          console.error('Error calculating tenant meal costs:', error)
          paymentAmount = 100.00 // Fallback to default
        }
      }
      try {
        const { PaymentService } = await import('@/lib/payments')
        
        // Calculate payment deadline (2 weeks before booking date)
        const bookingDateObj = new Date(bookingDate)
        const paymentDeadline = PaymentService.calculatePaymentDeadline(bookingDateObj)
        
        // Check if payment deadline has already passed
        const now = new Date()
        if (paymentDeadline < now) {
          return NextResponse.json(
            { 
              error: 'Payment deadline passed', 
              message: 'The payment deadline for this booking has already passed. Payment must be made at least 2 weeks before the ceremony date.' 
            },
            { status: 400 }
          )
        }

        // Create payment record (currency will be automatically determined by tenant settings)
        paymentRecord = await PaymentService.createPayment({
          bookingId: booking.id,
          tenantId,
          userId: user.userId,
          amount: parseFloat(paymentAmount.toString()),
          paymentDeadline
        })

        if (!paymentRecord) {
          console.error('Failed to create payment record for booking:', booking.id)
        }
      } catch (error) {
        console.error('Error creating payment record:', error)
        // Don't fail the booking if payment record creation fails
      }
    }

    // Note: Temporary reservations are no longer needed with meal period system
    // Each meal period can only be booked by one person, so no race conditions

    const successMessage = isRecurring 
      ? 'Yearly recurring booking created successfully! This booking will automatically repeat every year on the same date and time.'
      : 'Booking created successfully'

    // Build response data
    const responseData: any = {
      message: successMessage, 
      booking,
      isRecurring: isRecurring || false
    }

    // Add payment information if payment record was created
    if (paymentRecord) {
      responseData.payment = paymentRecord
      responseData.message += ' Payment record created - please make payment by the deadline to confirm your booking.'
    }

    return NextResponse.json(responseData, { status: 201 })

  } catch (error: any) {
    console.error('Create booking error:', error)
    return NextResponse.json(
      { 
        error: 'Booking failed', 
        message: error.message || 'Failed to create booking' 
      },
      { status: 400 }
    )
  }
}