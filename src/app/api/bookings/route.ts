import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { BookingService } from '@/lib/bookings'

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
      }
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
    const { bookingDate, bookingTime, eventNote, sessionId, guestName, guestEmail, guestPhone, isRecurring } = body

    // Basic validation
    if (!bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Booking date and time are required' },
        { status: 400 }
      )
    }

    // Try to get user from authentication
    let user = null
    let tenantId = 1 // Default tenant for simplified system
    
    try {
      const token = request.cookies.get('token')?.value
      if (token) {
        const payload = await verifyToken(token)
        user = payload
        // For super_admin and tenant_admin, use proper tenant context
        if (payload?.role === 'super_admin') {
          // Super admin can book for any tenant, use provided tenantId or default
          tenantId = body.tenantId || 1
        } else if (payload?.tenantId) {
          tenantId = payload.tenantId
        } else {
          tenantId = 1 // Default tenant
        }
      }
    } catch (error) {
      // No authentication - this is a guest booking (should not happen with current flow)
      console.log('No authentication found for booking request')
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to complete your booking' },
        { status: 401 }
      )
    }

    // Create booking (regular or recurring)
    const booking = await BookingService.createBooking({
      userId: user.userId,
      tenantId,
      bookingDate,
      bookingTime,
      eventNote: eventNote || `Dhane offering ceremony - ${guestName || user.username}`,
      guestName: guestName || undefined,
      guestEmail: guestEmail || undefined,
      guestPhone: guestPhone || undefined,
      isRecurring: isRecurring || false
    })

    // Clean up temporary reservation if sessionId provided
    if (sessionId) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/bookings/reserve-temp`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: bookingDate, timeSlot: bookingTime, sessionId })
        })
      } catch (error) {
        console.error('Failed to clean up temporary reservation:', error)
      }
    }

    const successMessage = isRecurring 
      ? 'Yearly recurring booking created successfully! This booking will automatically repeat every year on the same date and time.'
      : 'Booking created successfully'

    return NextResponse.json(
      { 
        message: successMessage, 
        booking,
        isRecurring: isRecurring || false
      },
      { status: 201 }
    )

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