import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { AvailabilityService } from '@/lib/availability'
import prisma from '@/lib/db'

// GET /api/admin/availability/templates - List all templates
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
    
    // For super_admin, allow querying specific tenant; for admin, use their tenant
    const targetTenantId = payload.role === 'super_admin' && tenantId 
      ? parseInt(tenantId) 
      : payload.tenantId || 1

    // Get templates
    const templates = await prisma.availabilityTemplate.findMany({
      where: {
        tenantId: targetTenantId
      },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      message: 'Templates retrieved successfully',
      templates: templates.map(template => ({
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
      }))
    })

  } catch (error: any) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/admin/availability/templates - Create new template
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
      name, 
      description, 
      daysOfWeek, 
      timeSlots, 
      maxBookings, 
      priority, 
      validFrom, 
      validUntil,
      tenantId 
    } = body

    // Validation
    if (!name || !daysOfWeek || !timeSlots) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Name, daysOfWeek, and timeSlots are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(daysOfWeek) || !Array.isArray(timeSlots)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'daysOfWeek and timeSlots must be arrays' },
        { status: 400 }
      )
    }

    // Validate days of week (1-7)
    if (daysOfWeek.some(day => day < 1 || day > 7)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'daysOfWeek must contain values between 1-7' },
        { status: 400 }
      )
    }

    // Validate time slots format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (timeSlots.some(time => !timeRegex.test(time))) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'timeSlots must be in HH:MM format' },
        { status: 400 }
      )
    }

    // Determine target tenant ID
    const targetTenantId = payload.role === 'super_admin' && tenantId 
      ? parseInt(tenantId) 
      : payload.tenantId || 1

    // Create template using service
    const template = await AvailabilityService.createTemplate({
      tenantId: targetTenantId,
      name,
      description,
      daysOfWeek,
      timeSlots,
      maxBookings: maxBookings || 1,
      priority: priority || 0,
      validFrom,
      validUntil
    })

    return NextResponse.json(
      { message: 'Template created successfully', template },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { error: 'Failed to create template', message: error.message },
      { status: 500 }
    )
  }
}