import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/jwt'
import prisma from '@/lib/db'

// Get platform-wide statistics (Super Admin only)
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
    const period = searchParams.get('period') || '30' // days

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get platform-wide statistics
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      totalBookings,
      recentBookings,
      tenantsByPlan,
      usersByRole,
      recentTenants,
      topTenants
    ] = await Promise.all([
      // Total tenants
      prisma.tenant.count(),
      
      // Active tenants
      prisma.tenant.count({
        where: { isActive: true }
      }),
      
      // Total users
      prisma.user.count(),
      
      // Active users
      prisma.user.count({
        where: { isActive: true }
      }),
      
      // Total bookings
      prisma.booking.count(),
      
      // Recent bookings (within period)
      prisma.booking.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Tenants by subscription plan
      prisma.tenantSubscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
        where: {
          status: 'active'
        }
      }),
      
      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: {
          isActive: true
        }
      }),
      
      // Recent tenants (within period)
      prisma.tenant.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        include: {
          _count: {
            select: {
              users: true,
              bookings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Top tenants by user count
      prisma.tenant.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              users: true,
              bookings: true
            }
          },
          tenantSubscription: {
            select: {
              plan: true,
              status: true
            }
          }
        },
        orderBy: {
          users: { _count: 'desc' }
        },
        take: 10
      })
    ])

    // Calculate growth rates
    const previousPeriodStart = new Date()
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (periodDays * 2))
    previousPeriodStart.setDate(previousPeriodStart.getDate() + periodDays)

    const [previousTenants, previousUsers, previousBookings] = await Promise.all([
      prisma.tenant.count({
        where: {
          createdAt: { 
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: { 
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      }),
      prisma.booking.count({
        where: {
          createdAt: { 
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      })
    ])

    const currentTenants = await prisma.tenant.count({
      where: { createdAt: { gte: startDate } }
    })
    const currentUsers = await prisma.user.count({
      where: { createdAt: { gte: startDate } }
    })
    const currentBookings = recentBookings

    // Calculate percentage growth
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const stats = {
      overview: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        inactive_tenants: totalTenants - activeTenants,
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: totalUsers - activeUsers,
        total_bookings: totalBookings,
        recent_bookings: recentBookings
      },
      growth: {
        tenants: {
          current_period: currentTenants,
          previous_period: previousTenants,
          growth_percentage: calculateGrowth(currentTenants, previousTenants)
        },
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
        tenants_by_plan: tenantsByPlan.map(item => ({
          plan: item.plan,
          count: item._count.plan
        })),
        users_by_role: usersByRole.map(item => ({
          role: item.role,
          count: item._count.role
        }))
      },
      recent_activity: {
        new_tenants: recentTenants.map(tenant => ({
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          created_at: tenant.createdAt,
          user_count: tenant._count.users,
          booking_count: tenant._count.bookings
        }))
      },
      top_tenants: topTenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        user_count: tenant._count.users,
        booking_count: tenant._count.bookings,
        subscription_plan: tenant.tenantSubscription?.plan || 'none',
        subscription_status: tenant.tenantSubscription?.status || 'none'
      }))
    }

    return NextResponse.json({
      message: 'Platform statistics retrieved successfully',
      period_days: periodDays,
      stats
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve platform statistics' },
      { status: 500 }
    )
  }
}