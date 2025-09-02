import { NextRequest, NextResponse } from 'next/server'
import { requireTenantUser } from '@/lib/rbac'
import { RecurringBookingService } from '@/lib/recurring-bookings'

interface RouteParams {
  params: {
    id: string
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: RouteParams
) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      const recurringBookingId = parseInt(params.id)
      
      if (isNaN(recurringBookingId)) {
        return NextResponse.json(
          { error: 'Invalid ID', message: 'Recurring booking ID must be a valid number' },
          { status: 400 }
        )
      }

      // Cancel the recurring booking
      const success = await RecurringBookingService.cancelRecurringBooking(
        recurringBookingId,
        req.tenantId || 1, // Use default tenant if tenantId is null (super admin)
        req.user.userId
      )

      if (!success) {
        return NextResponse.json(
          { error: 'Not found', message: 'Recurring booking not found or not accessible' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        message: 'Recurring booking cancelled successfully',
        note: 'All future yearly bookings have been cancelled. Past bookings remain unchanged.'
      })

    } catch (error: any) {
      console.error('Cancel recurring booking error:', error)
      return NextResponse.json(
        { 
          error: 'Cancellation failed', 
          message: error.message || 'Failed to cancel recurring booking' 
        },
        { status: 400 }
      )
    }
  })
}