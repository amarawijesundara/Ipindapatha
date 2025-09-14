import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/jwt'
import prisma from '@/lib/db'

// Get all tenants (Super Admin only)
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
    
    const isSuper = await isSuperAdmin(token)
    if (!isSuper) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // 'active', 'inactive'
    const search = searchParams.get('search') // Search by name or subdomain

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [tenants, totalCount] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          tenantSubscription: true,
          _count: {
            select: {
              users: true,
              bookings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.tenant.count({ where })
    ])

    const formattedTenants = tenants.map(tenant => ({
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
        max_users: tenant.tenantSubscription.maxUsers,
        max_bookings: tenant.tenantSubscription.maxBookings
      } : null,
      stats: {
        total_users: tenant._count.users,
        total_bookings: tenant._count.bookings
      }
    }))

    return NextResponse.json({
      message: 'Tenants retrieved successfully',
      tenants: formattedTenants,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Admin tenants list error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve tenants' },
      { status: 500 }
    )
  }
}

// Create tenant (Super Admin only) - Alternative to public tenant creation
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    const isSuper = await isSuperAdmin(token)
    if (!isSuper) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, subdomain, domain, description, isActive = true } = body

    // Basic validation
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Name and subdomain are required' },
        { status: 400 }
      )
    }

    // Check subdomain availability
    const existing = await prisma.tenant.findFirst({
      where: { subdomain: subdomain.toLowerCase() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Subdomain unavailable', message: 'Subdomain already exists' },
        { status: 409 }
      )
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain: subdomain.toLowerCase(),
        domain,
        description,
        isActive
      }
    })

    // Create default settings and subscription
    await Promise.all([
      prisma.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          businessHours: {
            monday: { open: '09:00', close: '17:00', enabled: true },
            tuesday: { open: '09:00', close: '17:00', enabled: true },
            wednesday: { open: '09:00', close: '17:00', enabled: true },
            thursday: { open: '09:00', close: '17:00', enabled: true },
            friday: { open: '09:00', close: '17:00', enabled: true },
            saturday: { open: '09:00', close: '17:00', enabled: false },
            sunday: { open: '09:00', close: '17:00', enabled: false }
          }
        }
      }),
      prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'starter',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          maxUsers: 10,
          maxBookings: 1000
        }
      })
    ])

    return NextResponse.json({
      message: 'Tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        domain: tenant.domain,
        description: tenant.description,
        is_active: tenant.isActive,
        created_at: tenant.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Admin tenant creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}