import { NextRequest, NextResponse } from 'next/server'
import { requireTenantUser } from '@/lib/rbac'
import { BookingService } from '@/lib/bookings'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  return requireTenantUser()(request, async (req: NextRequest & { user: any, tenantId?: number }) => {
    try {
      const { searchParams } = new URL(req.url)
      const period = parseInt(searchParams.get('period') || '30') // days

      // Get tenant-specific booking stats
      const bookingStats = await BookingService.getBookingStats(req.tenantId!)
      
      // Get tenant users count
      const totalUsers = await prisma.user.count({
        where: { 
          isActive: true,
          tenantId: req.tenantId
        }
      })

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - period)

      const [recentUsers, recentBookings] = await Promise.all([
        prisma.user.count({
          where: {
            tenantId: req.tenantId,
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        prisma.booking.count({
          where: {
            tenantId: req.tenantId,
            createdAt: { gte: thirtyDaysAgo }
          }
        })
      ])

      // Get booking status distribution
      const bookingsByStatus = await prisma.booking.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { tenantId: req.tenantId }
      })

      return NextResponse.json({
        message: 'Tenant stats retrieved successfully',
        stats: {
          totalUsers,
          recentUsers,
          recentBookings,
          bookingsByStatus: bookingsByStatus.map(item => ({
            status: item.status,
            count: item._count.status
          })),
          period_days: period,
          ...bookingStats
        }
      })

    } catch (error) {
      console.error('Get tenant stats error:', error)
      return NextResponse.json(
        { error: 'Internal server error', message: 'Failed to retrieve tenant stats' },
        { status: 500 }
      )
    }
  })
}