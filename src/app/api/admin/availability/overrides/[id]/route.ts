import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

interface RouteParams {
  params: {
    id: string
  }
}

// DELETE /api/admin/availability/overrides/[id] - Delete override
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const overrideId = parseInt(params.id)
    if (isNaN(overrideId)) {
      return NextResponse.json(
        { error: 'Invalid override ID' },
        { status: 400 }
      )
    }

    // Check if override exists and user has access
    const existingOverride = await prisma.availabilityOverride.findFirst({
      where: {
        id: overrideId,
        ...(payload.role !== 'super_admin' && { tenantId: payload.tenantId || 1 })
      }
    })

    if (!existingOverride) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.availabilityOverride.update({
      where: { id: overrideId },
      data: { isActive: false }
    })

    return NextResponse.json({
      message: 'Override deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete override error:', error)
    return NextResponse.json(
      { error: 'Failed to delete override', message: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/availability/overrides/[id] - Update override
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const overrideId = parseInt(params.id)
    if (isNaN(overrideId)) {
      return NextResponse.json(
        { error: 'Invalid override ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      overrideType, 
      maxBookings, 
      reason,
      isActive 
    } = body

    // Validate data if provided
    if (overrideType && !['disable', 'enable', 'modify_capacity'].includes(overrideType)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'overrideType must be disable, enable, or modify_capacity' },
        { status: 400 }
      )
    }

    // Check if override exists and user has access
    const existingOverride = await prisma.availabilityOverride.findFirst({
      where: {
        id: overrideId,
        ...(payload.role !== 'super_admin' && { tenantId: payload.tenantId || 1 })
      }
    })

    if (!existingOverride) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      )
    }

    // Update override
    const updatedOverride = await prisma.availabilityOverride.update({
      where: { id: overrideId },
      data: {
        ...(overrideType !== undefined && { overrideType }),
        ...(maxBookings !== undefined && { maxBookings }),
        ...(reason !== undefined && { reason }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({
      message: 'Override updated successfully',
      override: {
        id: updatedOverride.id,
        tenantId: updatedOverride.tenantId,
        date: updatedOverride.date.toISOString().split('T')[0],
        timeSlot: updatedOverride.timeSlot,
        overrideType: updatedOverride.overrideType,
        maxBookings: updatedOverride.maxBookings,
        reason: updatedOverride.reason,
        isActive: updatedOverride.isActive,
        createdBy: updatedOverride.createdBy,
        createdAt: updatedOverride.createdAt,
        updatedAt: updatedOverride.updatedAt
      }
    })

  } catch (error: any) {
    console.error('Update override error:', error)
    return NextResponse.json(
      { error: 'Failed to update override', message: error.message },
      { status: 500 }
    )
  }
}