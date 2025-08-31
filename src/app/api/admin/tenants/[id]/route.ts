import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/jwt'
import prisma from '@/lib/db'

// Get single tenant details (Super Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'No valid authentication token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    if (!isSuperAdmin(token)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Super admin access required' },
        { status: 403 }
      )
    }

    const tenantId = parseInt(params.id)
    
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID', message: 'Tenant ID must be a number' },
        { status: 400 }
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        tenantSubscription: true,
        tenantSettings: true,
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        bookings: {
          select: {
            id: true,
            bookingDate: true,
            bookingTime: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                username: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            users: true,
            bookings: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found', message: 'The specified tenant does not exist' },
        { status: 404 }
      )
    }

    const formattedTenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      domain: tenant.domain,
      description: tenant.description,
      is_active: tenant.isActive,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
      subscription: tenant.tenantSubscription ? {
        plan: tenant.tenantSubscription.plan,
        status: tenant.tenantSubscription.status,
        start_date: tenant.tenantSubscription.startDate,
        end_date: tenant.tenantSubscription.endDate,
        max_users: tenant.tenantSubscription.maxUsers,
        max_bookings: tenant.tenantSubscription.maxBookings
      } : null,
      settings: tenant.tenantSettings ? {
        business_hours: tenant.tenantSettings.businessHours,
        booking_settings: tenant.tenantSettings.bookingSettings,
        notification_settings: tenant.tenantSettings.notificationSettings,
        customization: tenant.tenantSettings.customization
      } : null,
      stats: {
        total_users: tenant._count.users,
        total_bookings: tenant._count.bookings
      },
      users: tenant.users,
      recent_bookings: tenant.bookings
    }

    return NextResponse.json({
      message: 'Tenant details retrieved successfully',
      tenant: formattedTenant
    })

  } catch (error) {
    console.error('Admin tenant details error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve tenant details' },
      { status: 500 }
    )
  }
}

// Update tenant (Super Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    if (!isSuperAdmin(token)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Super admin access required' },
        { status: 403 }
      )
    }

    const tenantId = parseInt(params.id)
    
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID', message: 'Tenant ID must be a number' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, domain, description, isActive } = body

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name) updateData.name = name
    if (domain !== undefined) updateData.domain = domain
    if (description !== undefined) updateData.description = description
    if (typeof isActive === 'boolean') updateData.isActive = isActive

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      include: {
        tenantSubscription: {
          select: {
            plan: true,
            status: true,
            maxUsers: true,
            maxBookings: true
          }
        },
        _count: {
          select: {
            users: true,
            bookings: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Tenant updated successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        subdomain: updatedTenant.subdomain,
        domain: updatedTenant.domain,
        description: updatedTenant.description,
        is_active: updatedTenant.isActive,
        updated_at: updatedTenant.updatedAt,
        subscription: updatedTenant.tenantSubscription,
        stats: {
          total_users: updatedTenant._count.users,
          total_bookings: updatedTenant._count.bookings
        }
      }
    })

  } catch (error) {
    console.error('Admin tenant update error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update tenant' },
      { status: 500 }
    )
  }
}

// Suspend/activate tenant (Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    if (!isSuperAdmin(token)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Super admin access required' },
        { status: 403 }
      )
    }

    const tenantId = parseInt(params.id)
    
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID', message: 'Tenant ID must be a number' },
        { status: 400 }
      )
    }

    // Soft delete - deactivate tenant and all its users
    const [updatedTenant] = await Promise.all([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      }),
      prisma.user.updateMany({
        where: { tenantId },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      })
    ])

    return NextResponse.json({
      message: 'Tenant suspended successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        subdomain: updatedTenant.subdomain,
        is_active: updatedTenant.isActive,
        updated_at: updatedTenant.updatedAt
      }
    })

  } catch (error) {
    console.error('Admin tenant suspension error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to suspend tenant' },
      { status: 500 }
    )
  }
}