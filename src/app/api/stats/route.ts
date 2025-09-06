import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { UserService } from '@/lib/auth'
import { BookingService } from '@/lib/bookings'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using cookies (consistent with admin endpoints)
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'No valid authentication token provided' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'The provided token is invalid or expired' },
        { status: 401 }
      )
    }

    // Get user info (handle tenant ID for super admins vs tenant users)
    const tenantId = payload.tenantId !== null && payload.tenantId !== undefined ? payload.tenantId : undefined
    const user = await UserService.findById(payload.userId, tenantId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User account no longer exists' },
        { status: 404 }
      )
    }

    // Handle super admin - show platform-wide stats
    if (user.role === 'super_admin') {
      return await getPlatformStats(request)
    }

    // Handle tenant users - show tenant-specific stats  
    const userTenantId = user.tenant_id
    if (!userTenantId) {
      return NextResponse.json(
        { error: 'Tenant required', message: 'Tenant context is required for this user' },
        { status: 400 }
      )
    }

    return await getTenantStats(request, userTenantId)

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve stats' },
      { status: 500 }
    )
  }
}

async function getPlatformStats(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '30') // days

    // Get platform-wide stats (all tenants)
    const totalUsers = await prisma.user.count({
      where: { isActive: true }
    })

    const totalBookings = await prisma.booking.count()
    const pendingBookings = await prisma.booking.count({
      where: { status: 'pending' }
    })
    const confirmedBookings = await prisma.booking.count({
      where: { status: 'confirmed' }
    })
    const cancelledBookings = await prisma.booking.count({
      where: { status: 'cancelled' }
    })

    // Get recent activity (last N days)
    const periodDaysAgo = new Date()
    periodDaysAgo.setDate(periodDaysAgo.getDate() - period)

    const [recentUsers, recentBookings, totalTenants] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: periodDaysAgo } }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: periodDaysAgo } }
      }),
      prisma.tenant.count({
        where: { isActive: true }
      })
    ])

    // Get booking status distribution
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    return NextResponse.json({
      message: 'Platform stats retrieved successfully',
      stats: {
        totalUsers,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        totalTenants,
        recentUsers,
        recentBookings,
        bookingsByStatus: bookingsByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        period_days: period,
        type: 'platform'
      }
    })

  } catch (error) {
    console.error('Get platform stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve platform stats' },
      { status: 500 }
    )
  }
}

async function getTenantStats(request: NextRequest, tenantId: number) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '30') // days

    // Get tenant-specific booking stats
    const totalBookings = await prisma.booking.count({
      where: { tenantId }
    })
    const pendingBookings = await prisma.booking.count({
      where: { tenantId, status: 'pending' }
    })
    const confirmedBookings = await prisma.booking.count({
      where: { tenantId, status: 'confirmed' }
    })
    const cancelledBookings = await prisma.booking.count({
      where: { tenantId, status: 'cancelled' }
    })
    
    // Get tenant users count
    const totalUsers = await prisma.user.count({
      where: { 
        isActive: true,
        tenantId: tenantId
      }
    })

    // Get recent activity (last N days)
    const periodDaysAgo = new Date()
    periodDaysAgo.setDate(periodDaysAgo.getDate() - period)

    const [recentUsers, recentBookings] = await Promise.all([
      prisma.user.count({
        where: {
          tenantId: tenantId,
          createdAt: { gte: periodDaysAgo }
        }
      }),
      prisma.booking.count({
        where: {
          tenantId: tenantId,
          createdAt: { gte: periodDaysAgo }
        }
      })
    ])

    // Get booking status distribution for this tenant
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { tenantId: tenantId }
    })

    return NextResponse.json({
      message: 'Tenant stats retrieved successfully',
      stats: {
        totalUsers,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        recentUsers,
        recentBookings,
        bookingsByStatus: bookingsByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        period_days: period,
        type: 'tenant'
      }
    })

  } catch (error) {
    console.error('Get tenant stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve tenant stats' },
      { status: 500 }
    )
  }
}