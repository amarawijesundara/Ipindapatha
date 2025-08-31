import prisma from './db'
import { Booking, BookingAvailability, BookingCreateInput, AvailabilityCreateInput } from '@/types'

export class BookingService {
  // Get bookings for a user within a tenant
  static async getUserBookings(userId: number, tenantId: number): Promise<Booking[]> {
    try {
      const bookings = await prisma.booking.findMany({
        where: { 
          userId: userId,
          tenantId: tenantId 
        },
        orderBy: [
          { bookingDate: 'desc' },
          { bookingTime: 'desc' }
        ]
      })
      
      return bookings.map(booking => ({
        id: booking.id,
        tenant_id: booking.tenantId,
        user_id: booking.userId,
        booking_date: booking.bookingDate,
        booking_time: booking.bookingTime.toISOString().substring(11, 19),
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        created_at: booking.createdAt,
        updated_at: booking.updatedAt
      }))
    } catch (error) {
      console.error('Error getting user bookings:', error)
      return []
    }
  }

  // Get all bookings for a tenant
  static async getAllBookings(tenantId: number): Promise<Booking[]> {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          tenantId: tenantId
        },
        include: {
          user: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: [
          { bookingDate: 'desc' },
          { bookingTime: 'desc' }
        ]
      })
      
      return bookings.map(booking => ({
        id: booking.id,
        tenant_id: booking.tenantId,
        user_id: booking.userId,
        booking_date: booking.bookingDate,
        booking_time: booking.bookingTime.toISOString().substring(11, 19),
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        created_at: booking.createdAt,
        updated_at: booking.updatedAt,
        username: booking.user.username,
        email: booking.user.email
      } as any))
    } catch (error) {
      console.error('Error getting all bookings:', error)
      return []
    }
  }

  // Create booking with tenant context
  static async createBooking(bookingData: BookingCreateInput): Promise<Booking | null> {
    try {
      const bookingDate = new Date(bookingData.bookingDate)
      const bookingTime = new Date(`1970-01-01T${bookingData.bookingTime}`)
      
      // Check availability within tenant
      const availability = await prisma.bookingAvailability.findFirst({
        where: {
          tenantId: bookingData.tenantId,
          date: bookingDate,
          timeSlot: bookingTime,
          isAvailable: true
        }
      })

      if (!availability) {
        throw new Error('This time slot is not available')
      }

      // Check if user already has a booking at this time within tenant
      const existingBooking = await prisma.booking.findFirst({
        where: {
          tenantId: bookingData.tenantId,
          userId: bookingData.userId,
          bookingDate: bookingDate,
          bookingTime: bookingTime,
          status: {
            not: 'cancelled'
          }
        }
      })

      if (existingBooking) {
        throw new Error('You already have a booking at this time')
      }

      // Create the booking
      const booking = await prisma.booking.create({
        data: {
          tenantId: bookingData.tenantId,
          userId: bookingData.userId,
          bookingDate: bookingDate,
          bookingTime: bookingTime,
          eventNote: bookingData.eventNote,
          status: 'pending'
        }
      })

      return {
        id: booking.id,
        user_id: booking.userId,
        booking_date: booking.bookingDate,
        booking_time: booking.bookingTime.toISOString().substring(11, 19),
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        created_at: booking.createdAt,
        updated_at: booking.updatedAt
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      throw error
    }
  }

  // Update booking status within tenant context
  static async updateBookingStatus(bookingId: number, status: 'confirmed' | 'cancelled', tenantId: number): Promise<Booking | null> {
    try {
      const booking = await prisma.booking.update({
        where: { 
          id: bookingId,
          tenantId: tenantId
        },
        data: { status: status }
      })
      
      return {
        id: booking.id,
        tenant_id: booking.tenantId,
        user_id: booking.userId,
        booking_date: booking.bookingDate,
        booking_time: booking.bookingTime.toISOString().substring(11, 19),
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        created_at: booking.createdAt,
        updated_at: booking.updatedAt
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      return null
    }
  }

  // Get availability for tenant
  static async getAvailability(tenantId: number, date?: string): Promise<BookingAvailability[]> {
    try {
      const where: any = { 
        tenantId: tenantId,
        isAvailable: true 
      }
      
      if (date) {
        where.date = new Date(date)
      } else {
        where.date = { gte: new Date() }
      }
      
      const availability = await prisma.bookingAvailability.findMany({
        where,
        orderBy: [
          { date: 'asc' },
          { timeSlot: 'asc' }
        ]
      })
      
      return availability.map(item => ({
        id: item.id,
        tenant_id: item.tenantId,
        date: item.date,
        time_slot: item.timeSlot.toISOString().substring(11, 19),
        is_available: item.isAvailable,
        max_bookings: item.maxBookings,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      }))
    } catch (error) {
      console.error('Error getting availability:', error)
      return []
    }
  }

  // Get booking stats for tenant
  static async getBookingStats(tenantId: number): Promise<{
    totalBookings: number
    pendingBookings: number
    confirmedBookings: number
    cancelledBookings: number
  }> {
    try {
      const [totalBookings, pendingBookings, confirmedBookings, cancelledBookings] = await Promise.all([
        prisma.booking.count({ where: { tenantId } }),
        prisma.booking.count({ where: { tenantId, status: 'pending' } }),
        prisma.booking.count({ where: { tenantId, status: 'confirmed' } }),
        prisma.booking.count({ where: { tenantId, status: 'cancelled' } })
      ])

      return {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings
      }
    } catch (error) {
      console.error('Error getting booking stats:', error)
      return {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
      }
    }
  }

  // Create availability slots for tenant
  static async createAvailability(availabilityData: AvailabilityCreateInput): Promise<BookingAvailability | null> {
    try {
      const date = new Date(availabilityData.date)
      const timeSlot = new Date(`1970-01-01T${availabilityData.timeSlot}`)

      const availability = await prisma.bookingAvailability.create({
        data: {
          tenantId: availabilityData.tenantId,
          date: date,
          timeSlot: timeSlot,
          isAvailable: availabilityData.isAvailable ?? true,
          maxBookings: availabilityData.maxBookings ?? 1
        }
      })

      return {
        id: availability.id,
        tenant_id: availability.tenantId,
        date: availability.date,
        time_slot: availability.timeSlot.toISOString().substring(11, 19),
        is_available: availability.isAvailable,
        max_bookings: availability.maxBookings,
        created_at: availability.createdAt,
        updated_at: availability.updatedAt
      }
    } catch (error) {
      console.error('Error creating availability:', error)
      return null
    }
  }
}