import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

// GET /api/admin/bookings - Get all bookings across tenants (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'confirmed', 'cancelled', or null for all
    const tenantId = searchParams.get('tenantId') // Filter by tenant
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status
    }
    if (tenantId) {
      where.tenantId = parseInt(tenantId)
    }

    // Get bookings with user and tenant information
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phoneNumber: true
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.booking.count({ where })

    // Transform bookings for response
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      user_id: booking.userId,
      booking_date: booking.bookingDate.toISOString().split('T')[0], // YYYY-MM-DD format
      booking_time: booking.bookingTime.toISOString().split('T')[1].split('.')[0], // HH:MM:SS format
      event_note: booking.eventNote,
      status: booking.status,
      created_at: booking.createdAt.toISOString(),
      updated_at: booking.updatedAt.toISOString(),
      username: booking.user.username,
      email: booking.user.email,
      phone_number: booking.user.phoneNumber,
      tenant: {
        id: booking.tenant.id,
        name: booking.tenant.name,
        subdomain: booking.tenant.subdomain,
        is_active: booking.tenant.isActive
      }
    }))

    return NextResponse.json({
      message: 'Bookings retrieved successfully',
      bookings: transformedBookings,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching admin bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/bookings - Update booking status (Super Admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication using cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { bookingId, status, notes } = body

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: 'Booking ID and status are required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, confirmed, or cancelled' },
        { status: 400 }
      )
    }

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { username: true, email: true } },
        tenant: { select: { name: true, subdomain: true } }
      }
    })

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Update booking in transaction with audit log
    await prisma.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: { 
          status: status,
          updatedAt: new Date()
        }
      })

      // Log admin action
      await tx.adminAuditLog.create({
        data: {
          userId: payload.userId,
          action: 'UPDATE_BOOKING_STATUS',
          targetType: 'booking',
          targetId: bookingId,
          details: {
            old_status: existingBooking.status,
            new_status: status,
            booking_date: existingBooking.bookingDate,
            user: existingBooking.user.username,
            tenant: existingBooking.tenant.subdomain,
            notes: notes || null
          }
        }
      })
    })

    return NextResponse.json({
      message: 'Booking status updated successfully',
      booking: {
        id: bookingId,
        status: status,
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating booking status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/bookings - Create booking on behalf of user (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    
    if (!payload || !['super_admin', 'tenant_admin'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      userId, 
      tenantId, 
      bookingDate, 
      bookingTime, 
      eventNote, 
      guestName, 
      guestEmail, 
      guestPhone,
      overrideCapacity = false
    } = body

    // Basic validation
    if (!bookingDate || !bookingTime) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Booking date and time are required' },
        { status: 400 }
      )
    }

    // Validate tenantId for tenant_admin
    if (payload.role === 'tenant_admin' && payload.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Tenant admin can only create bookings for their tenant' },
        { status: 403 }
      )
    }

    // userId is required - verify user exists and belongs to the correct tenant
    if (!userId) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'User ID is required for booking creation' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // For tenant_admin, ensure user belongs to their tenant
    if (payload.role === 'tenant_admin' && user.tenantId !== payload.tenantId) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Cannot create booking for user from different tenant' },
        { status: 403 }
      )
    }

    // Create the booking using BookingService but with admin privileges
    const BookingService = (await import('@/lib/bookings')).default
    
    const booking = await BookingService.createBooking({
      userId: userId, // userId is required
      tenantId: tenantId,
      bookingDate,
      bookingTime,
      eventNote: eventNote || `Admin booking - ${user.username}`,
      guestName,
      guestEmail, 
      guestPhone,
      isRecurring: false,
      adminOverride: overrideCapacity || false // Allow admin to choose override
    })

    // Log admin action
    await prisma.adminAuditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_ADMIN_BOOKING',
        targetType: 'booking',
        targetId: booking.id,
        details: {
          booking_date: bookingDate,
          booking_time: bookingTime,
          target_user_id: userId,
          guest_name: guestName,
          tenant_id: tenantId,
          override_capacity: overrideCapacity
        }
      }
    })

    return NextResponse.json({
      message: 'Admin booking created successfully',
      booking
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating admin booking:', error)
    
    // Handle specific booking errors
    if (error instanceof Error) {
      if (error.message.includes('already have a booking') || error.message.includes('time slot is not available')) {
        return NextResponse.json(
          { error: 'Booking conflict', message: error.message },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/bookings/bulk - Bulk operations on bookings (Super Admin only)
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication using cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { operation, bookingIds, newStatus } = body

    if (!operation || !bookingIds || !Array.isArray(bookingIds)) {
      return NextResponse.json(
        { error: 'Operation and booking IDs are required' },
        { status: 400 }
      )
    }

    if (operation === 'update_status' && !newStatus) {
      return NextResponse.json(
        { error: 'New status is required for update_status operation' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (newStatus) {
      const validStatuses = ['pending', 'confirmed', 'cancelled']
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: pending, confirmed, or cancelled' },
          { status: 400 }
        )
      }
    }

    let updatedCount = 0

    await prisma.$transaction(async (tx) => {
      if (operation === 'update_status') {
        // Update multiple bookings
        const result = await tx.booking.updateMany({
          where: { 
            id: { in: bookingIds }
          },
          data: { 
            status: newStatus,
            updatedAt: new Date()
          }
        })
        updatedCount = result.count

        // Log bulk admin action
        await tx.adminAuditLog.create({
          data: {
            userId: payload.userId,
            action: 'BULK_UPDATE_BOOKING_STATUS',
            targetType: 'booking',
            targetId: null,
            details: {
              operation: operation,
              new_status: newStatus,
              booking_ids: bookingIds,
              affected_count: updatedCount
            }
          }
        })
      }
    })

    return NextResponse.json({
      message: `Bulk operation completed successfully`,
      operation: operation,
      affected_count: updatedCount
    })

  } catch (error) {
    console.error('Error performing bulk booking operation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}