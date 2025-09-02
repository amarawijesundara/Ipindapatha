import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { safeCreateDate } from '@/lib/utils/dateValidation'
import prisma from '@/lib/db'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/availability/templates/[id] - Get specific template
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const templateId = parseInt(params.id)
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    const template = await prisma.availabilityTemplate.findFirst({
      where: {
        id: templateId,
        // Ensure admin can only access their tenant's templates (unless super_admin)
        ...(payload.role !== 'super_admin' && { tenantId: payload.tenantId || 1 })
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Template retrieved successfully',
      template: {
        id: template.id,
        tenantId: template.tenantId,
        name: template.name,
        description: template.description,
        daysOfWeek: template.daysOfWeek,
        timeSlots: template.timeSlots,
        maxBookings: template.maxBookings,
        isActive: template.isActive,
        priority: template.priority,
        validFrom: template.validFrom?.toISOString().split('T')[0],
        validUntil: template.validUntil?.toISOString().split('T')[0],
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    })

  } catch (error: any) {
    console.error('Get template error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/availability/templates/[id] - Update template
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

    const templateId = parseInt(params.id)
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      daysOfWeek, 
      timeSlots, 
      maxBookings, 
      priority, 
      validFrom, 
      validUntil,
      isActive 
    } = body

    // Validate data if provided
    if (daysOfWeek && (!Array.isArray(daysOfWeek) || daysOfWeek.some(day => day < 1 || day > 7))) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'daysOfWeek must be an array with values 1-7' },
        { status: 400 }
      )
    }

    if (timeSlots) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!Array.isArray(timeSlots) || timeSlots.some(time => !timeRegex.test(time))) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'timeSlots must be an array of HH:MM formatted strings' },
          { status: 400 }
        )
      }
    }

    // Check if template exists and user has access
    const existingTemplate = await prisma.availabilityTemplate.findFirst({
      where: {
        id: templateId,
        ...(payload.role !== 'super_admin' && { tenantId: payload.tenantId || 1 })
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Update template
    const updatedTemplate = await prisma.availabilityTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
        ...(timeSlots !== undefined && { timeSlots }),
        ...(maxBookings !== undefined && { maxBookings }),
        ...(priority !== undefined && { priority }),
        ...(validFrom !== undefined && { validFrom: validFrom ? safeCreateDate(validFrom) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? safeCreateDate(validUntil) : null }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({
      message: 'Template updated successfully',
      template: {
        id: updatedTemplate.id,
        tenantId: updatedTemplate.tenantId,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        daysOfWeek: updatedTemplate.daysOfWeek,
        timeSlots: updatedTemplate.timeSlots,
        maxBookings: updatedTemplate.maxBookings,
        isActive: updatedTemplate.isActive,
        priority: updatedTemplate.priority,
        validFrom: updatedTemplate.validFrom?.toISOString().split('T')[0],
        validUntil: updatedTemplate.validUntil?.toISOString().split('T')[0],
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt
      }
    })

  } catch (error: any) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { error: 'Failed to update template', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/availability/templates/[id] - Delete template
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

    const templateId = parseInt(params.id)
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    // Check if template exists and user has access
    const existingTemplate = await prisma.availabilityTemplate.findFirst({
      where: {
        id: templateId,
        ...(payload.role !== 'super_admin' && { tenantId: payload.tenantId || 1 })
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.availabilityTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    })

    return NextResponse.json({
      message: 'Template deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template', message: error.message },
      { status: 500 }
    )
  }
}