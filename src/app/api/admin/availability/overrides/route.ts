import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { AvailabilityService } from '@/lib/availability'
import { safeCreateDate } from '@/lib/utils/dateValidation'
import prisma from '@/lib/db'

// GET /api/admin/availability/overrides - List overrides
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const overrideType = searchParams.get('override_type')
    const isActive = searchParams.get('is_active')
    
    // For super_admin, allow querying specific tenant; for admin, use their tenant
    const targetTenantId = payload.role === 'super_admin' && tenantId 
      ? parseInt(tenantId) 
      : payload.tenantId || 1

    // Build where clause
    const where: any = {
      tenantId: targetTenantId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        const start = safeCreateDate(startDate)
        if (start) where.date.gte = start
      }
      if (endDate) {
        const end = safeCreateDate(endDate)
        if (end) where.date.lte = end
      }
    }

    if (overrideType) {
      where.overrideType = overrideType
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    // Get overrides
    const overrides = await prisma.availabilityOverride.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { timeSlot: 'asc' }
      ]
    })

    return NextResponse.json({
      message: 'Overrides retrieved successfully',
      overrides: overrides.map(override => ({
        id: override.id,
        tenantId: override.tenantId,
        date: override.date.toISOString().split('T')[0],
        timeSlot: override.timeSlot,
        overrideType: override.overrideType,
        maxBookings: override.maxBookings,
        reason: override.reason,
        isActive: override.isActive,
        createdBy: {
          id: override.creator.id,
          username: override.creator.username,
          email: override.creator.email
        },
        createdAt: override.createdAt,
        updatedAt: override.updatedAt
      }))
    })

  } catch (error: any) {
    console.error('Get overrides error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/admin/availability/overrides - Create new override
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
    const { 
      date, 
      timeSlot, 
      overrideType, 
      maxBookings, 
      reason,
      tenantId 
    } = body

    // Validation
    if (!date || !overrideType) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Date and overrideType are required' },
        { status: 400 }
      )
    }

    if (!['disable', 'enable', 'modify_capacity'].includes(overrideType)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'overrideType must be disable, enable, or modify_capacity' },
        { status: 400 }
      )
    }

    if (overrideType === 'modify_capacity' && !maxBookings) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'maxBookings is required for modify_capacity override' },
        { status: 400 }
      )
    }

    if (timeSlot) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(timeSlot)) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'timeSlot must be in HH:MM format' },
          { status: 400 }
        )
      }
    }

    // Determine target tenant ID
    const targetTenantId = payload.role === 'super_admin' && tenantId 
      ? parseInt(tenantId) 
      : payload.tenantId || 1

    // Create override using service
    const override = await AvailabilityService.createOverride({
      tenantId: targetTenantId,
      date,
      timeSlot,
      overrideType,
      maxBookings,
      reason,
      createdBy: payload.userId
    })

    return NextResponse.json(
      { message: 'Override created successfully', override },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Create override error:', error)
    return NextResponse.json(
      { error: 'Failed to create override', message: error.message },
      { status: 500 }
    )
  }
}