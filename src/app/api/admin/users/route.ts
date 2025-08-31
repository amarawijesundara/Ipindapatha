import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/jwt'
import prisma from '@/lib/db'

// Get all users across all tenants (Super Admin only)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role') // Filter by role
    const tenant = searchParams.get('tenant') // Filter by tenant ID
    const search = searchParams.get('search') // Search by name or email
    const status = searchParams.get('status') // 'active', 'inactive'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (role && role !== 'all') {
      where.role = role
    }

    if (tenant && tenant !== 'all') {
      where.tenantId = parseInt(tenant)
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              isActive: true
            }
          },
          _count: {
            select: {
              bookings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      phone_number: user.phoneNumber,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      tenant: user.tenant ? {
        id: user.tenant.id,
        name: user.tenant.name,
        subdomain: user.tenant.subdomain,
        is_active: user.tenant.isActive
      } : null,
      stats: {
        total_bookings: user._count.bookings
      }
    }))

    return NextResponse.json({
      message: 'Users retrieved successfully',
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve users' },
      { status: 500 }
    )
  }
}

// Update user status or role (Super Admin only)
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { userId, isActive, role } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
    }

    if (role) {
      const allowedRoles = ['user', 'tenant_manager', 'tenant_admin', 'super_admin']
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role', message: 'Invalid role specified' },
          { status: 400 }
        )
      }
      updateData.role = role
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        is_active: updatedUser.isActive,
        updated_at: updatedUser.updatedAt,
        tenant: updatedUser.tenant
      }
    })

  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update user' },
      { status: 500 }
    )
  }
}