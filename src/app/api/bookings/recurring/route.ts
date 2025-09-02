import { NextRequest, NextResponse } from 'next/server'
import { requireTenantUser } from '@/lib/rbac'
import { RecurringBookingService } from '@/lib/recurring-bookings'

export async function GET(request: NextRequest) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      // Get user's recurring bookings
      const recurringBookings = await RecurringBookingService.getUserRecurringBookings(
        req.user.userId, 
        req.tenantId !== null ? req.tenantId : undefined
      )

      return NextResponse.json({
        message: 'Recurring bookings retrieved successfully',
        recurringBookings
      })

    } catch (error) {
      console.error('Get recurring bookings error:', error)
      return NextResponse.json(
        { error: 'Internal server error', message: 'Failed to retrieve recurring bookings' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      const body = await request.json()
      const { bookingDate, bookingTime, eventNote } = body

      // Basic validation
      if (!bookingDate || !bookingTime) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Booking date and time are required' },
          { status: 400 }
        )
      }

      // Create recurring booking
      const recurringBooking = await RecurringBookingService.createRecurringBooking({
        tenantId: req.tenantId || 1, // Use default tenant if tenantId is null (super admin)
        userId: req.user.userId,
        bookingDate,
        bookingTime,
        eventNote: eventNote || 'Yearly Dhane offering ceremony'
      })

      return NextResponse.json(
        { 
          message: 'Recurring booking created successfully', 
          recurringBooking,
          note: 'This booking will automatically repeat every year on the same date and time.'
        },
        { status: 201 }
      )

    } catch (error: any) {
      console.error('Create recurring booking error:', error)
      return NextResponse.json(
        { 
          error: 'Recurring booking failed', 
          message: error.message || 'Failed to create recurring booking' 
        },
        { status: 400 }
      )
    }
  })
}