import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

// Get tenant-specific statistics (Tenant Admin or Super Admin)
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
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (!['super_admin', 'tenant_admin'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const tenantId = parseInt(params.id)
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      )
    }

    // For tenant admins, ensure they can only access their own tenant
    if (payload.role === 'tenant_admin' && payload.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Verify tenant exists
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId },
      include: {
        tenantSubscription: {
          select: {
            plan: true,
            status: true,
            maxUsers: true,
            maxBookings: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get tenant-specific statistics
    const [
      totalUsers,
      activeUsers,
      totalBookings,
      recentBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      usersByRole,
      recentUsers,
      recentBookingsList,
      bookingsByPeriod
    ] = await Promise.all([
      // Total users for this tenant
      prisma.user.count({
        where: { tenantId: tenantId }
      }),

      // Active users for this tenant
      prisma.user.count({
        where: {
          tenantId: tenantId,
          isActive: true
        }
      }),

      // Total bookings for this tenant
      prisma.booking.count({
        where: {
          user: { tenantId: tenantId }
        }
      }),

      // Recent bookings (within period) for this tenant
      prisma.booking.count({
        where: {
          user: { tenantId: tenantId },
          createdAt: { gte: startDate }
        }
      }),

      // Confirmed bookings for this tenant
      prisma.booking.count({
        where: {
          user: { tenantId: tenantId },
          status: 'confirmed'
        }
      }),

      // Pending bookings for this tenant
      prisma.booking.count({
        where: {
          user: { tenantId: tenantId },
          status: 'pending'
        }
      }),

      // Cancelled bookings for this tenant
      prisma.booking.count({
        where: {
          user: { tenantId: tenantId },
          status: 'cancelled'
        }
      }),

      // Users by role for this tenant
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: {
          tenantId: tenantId,
          isActive: true
        }
      }),

      // Recent users (within period) for this tenant
      prisma.user.findMany({
        where: {
          tenantId: tenantId,
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          isActive: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Recent bookings list for this tenant
      prisma.booking.findMany({
        where: {
          user: { tenantId: tenantId },
          createdAt: { gte: startDate }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Bookings by status over time (for charts)
      prisma.booking.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          user: { tenantId: tenantId },
          createdAt: { gte: startDate }
        }
      })
    ])

    // Calculate growth rates for previous period
    const previousPeriodStart = new Date()
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (periodDays * 2))
    previousPeriodStart.setDate(previousPeriodStart.getDate() + periodDays)

    const [previousUsers, previousBookings] = await Promise.all([
      prisma.user.count({
        where: {
          tenantId: tenantId,
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      prisma.booking.count({
        where: {
          user: { tenantId: tenantId },
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      })
    ])

    const currentUsers = await prisma.user.count({
      where: {
        tenantId: tenantId,
        createdAt: { gte: startDate }
      }
    })
    const currentBookings = recentBookings

    // Calculate percentage growth
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const stats = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        is_active: tenant.isActive,
        subscription: tenant.tenantSubscription
      },
      overview: {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: totalUsers - activeUsers,
        total_bookings: totalBookings,
        recent_bookings: recentBookings,
        confirmed_bookings: confirmedBookings,
        pending_bookings: pendingBookings,
        cancelled_bookings: cancelledBookings
      },
      growth: {
        users: {
          current_period: currentUsers,
          previous_period: previousUsers,
          growth_percentage: calculateGrowth(currentUsers, previousUsers)
        },
        bookings: {
          current_period: currentBookings,
          previous_period: previousBookings,
          growth_percentage: calculateGrowth(currentBookings, previousBookings)
        }
      },
      distribution: {
        users_by_role: usersByRole.map(item => ({
          role: item.role,
          count: item._count.role
        })),
        bookings_by_status: bookingsByPeriod.map(item => ({
          status: item.status,
          count: item._count.status
        }))
      },
      recent_activity: {
        new_users: recentUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.createdAt,
          is_active: user.isActive
        })),
        recent_bookings: recentBookingsList.map(booking => ({
          id: booking.id,
          booking_date: booking.bookingDate,
          booking_time: booking.bookingTime,
          status: booking.status,
          created_at: booking.createdAt,
          user: booking.user
        }))
      },
      usage_limits: tenant.tenantSubscription ? {
        max_users: tenant.tenantSubscription.maxUsers,
        current_users: totalUsers,
        users_remaining: Math.max(0, (tenant.tenantSubscription.maxUsers || 0) - totalUsers),
        max_bookings: tenant.tenantSubscription.maxBookings,
        current_bookings: totalBookings,
        bookings_remaining: Math.max(0, (tenant.tenantSubscription.maxBookings || 0) - totalBookings)
      } : null
    }

    return NextResponse.json({
      message: 'Tenant statistics retrieved successfully',
      period_days: periodDays,
      stats
    })

  } catch (error) {
    console.error('Tenant stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve tenant statistics' },
      { status: 500 }
    )
  }
}