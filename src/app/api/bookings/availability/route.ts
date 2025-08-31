import { NextRequest, NextResponse } from 'next/server'
import { requireTenantUser } from '@/lib/rbac'
import { BookingService } from '@/lib/bookings'

export async function GET(request: NextRequest) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      const { searchParams } = new URL(req.url)
      const date = searchParams.get('date')
      const startDate = searchParams.get('start_date')
      const endDate = searchParams.get('end_date')
      const limit = parseInt(searchParams.get('limit') || '30')

      // Get availability within tenant context
      const availability = await BookingService.getAvailability(
        req.tenantId!, 
        {
          date: date || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit
        }
      )

      return NextResponse.json({
        message: 'Availability retrieved successfully',
        availability
      })

    } catch (error) {
      console.error('Get availability error:', error)
      return NextResponse.json(
        { error: 'Internal server error', message: 'Failed to retrieve availability' },
        { status: 500 }
      )
    }
  })
}