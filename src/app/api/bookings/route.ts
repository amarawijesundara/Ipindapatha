import { NextRequest, NextResponse } from 'next/server'
import { requireTenantUser } from '@/lib/rbac'
import { BookingService } from '@/lib/bookings'

export async function GET(request: NextRequest) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      const { searchParams } = new URL(req.url)
      const status = searchParams.get('status') // filter by status
      const startDate = searchParams.get('start_date') // date range filtering
      const endDate = searchParams.get('end_date')

      // Get user's bookings within their tenant
      const bookings = await BookingService.getUserBookings(
        req.user.userId, 
        req.tenantId,
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
  })
}

export async function POST(request: NextRequest) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      const body = await req.json()
      const { bookingDate, bookingTime, eventNote } = body

      // Basic validation
      if (!bookingDate || !bookingTime) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Booking date and time are required' },
          { status: 400 }
        )
      }

      // Create booking within tenant context
      const booking = await BookingService.createBooking({
        userId: req.user.userId,
        tenantId: req.tenantId!,
        bookingDate,
        bookingTime,
        eventNote
      })

      return NextResponse.json(
        { message: 'Booking created successfully', booking },
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
  })
}