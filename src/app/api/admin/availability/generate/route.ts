import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { AvailabilityService } from '@/lib/availability'
import { safeCreateDate } from '@/lib/utils/dateValidation'

// POST /api/admin/availability/generate - Generate availability from templates
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { startDate, endDate, tenantId } = body

    // Validation
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = safeCreateDate(startDate)
    const end = safeCreateDate(endDate)

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'startDate must be before endDate' },
        { status: 400 }
      )
    }

    // Limit generation to prevent excessive data
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 365) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Date range cannot exceed 365 days' },
        { status: 400 }
      )
    }

    // Determine target tenant ID
    const targetTenantId = payload.role === 'super_admin' && tenantId 
      ? parseInt(tenantId) 
      : payload.tenantId || 1

    // Generate availability
    const generatedSlots = await AvailabilityService.generateAvailability(
      targetTenantId,
      start,
      end
    )

    return NextResponse.json({
      message: 'Availability generated successfully',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      tenantId: targetTenantId,
      generatedSlots: generatedSlots.length,
      preview: generatedSlots.slice(0, 10).map(slot => ({
        date: slot.date.toISOString().split('T')[0],
        timeSlot: slot.timeSlot,
        isAvailable: slot.isAvailable,
        maxBookings: slot.maxBookings,
        source: slot.source
      }))
    })

  } catch (error: any) {
    console.error('Generate availability error:', error)
    return NextResponse.json(
      { error: 'Failed to generate availability', message: error.message },
      { status: 500 }
    )
  }
}