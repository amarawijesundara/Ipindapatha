import prisma from './db'
import { Booking, BookingAvailability, BookingCreateInput, AvailabilityCreateInput } from '@/types'
import { validateDateFilters, DateFilterOptions, safeCreateDate, createTimeFromString } from '@/lib/utils/dateValidation'
import { AvailabilityService } from '@/lib/availability'
import { RecurringBookingService } from '@/lib/recurring-bookings'

export class BookingService {
  // Get bookings for a user within a tenant
  static async getUserBookings(userId: number, tenantId?: number, filters?: { 
    status?: string 
    startDate?: string
    endDate?: string
  }): Promise<Booking[]> {
    try {
      const whereCondition: any = { 
        userId: userId
      }

      // Add tenant filtering if provided
      if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId
      }

      // Add status filtering if provided
      if (filters?.status) {
        whereCondition.status = filters.status
      }

      // Add date range filtering if provided
      if (filters?.startDate || filters?.endDate) {
        whereCondition.bookingDate = {}
        if (filters.startDate) {
          const startDate = safeCreateDate(filters.startDate)
          if (!startDate) {
            throw new Error(`Invalid start date: ${filters.startDate}`)
          }
          whereCondition.bookingDate.gte = startDate
        }
        if (filters.endDate) {
          const endDate = safeCreateDate(filters.endDate)
          if (!endDate) {
            throw new Error(`Invalid end date: ${filters.endDate}`)
          }
          whereCondition.bookingDate.lte = endDate
        }
      }

      const bookings = await prisma.booking.findMany({
        where: whereCondition,
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

  // Create booking with tenant context (supports recurring bookings)
  static async createBooking(bookingData: BookingCreateInput & { isRecurring?: boolean }): Promise<Booking | null> {
    try {
      // Validate booking date
      const bookingDate = safeCreateDate(bookingData.bookingDate)
      if (!bookingDate) {
        throw new Error(`Invalid booking date: ${bookingData.bookingDate}`)
      }

      // Validate booking time
      const bookingTime = createTimeFromString(bookingData.bookingTime)
      if (!bookingTime) {
        throw new Error(`Invalid booking time: ${bookingData.bookingTime}`)
      }

      // Prevent booking past dates
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      bookingDate.setHours(0, 0, 0, 0)
      
      if (bookingDate < today) {
        throw new Error('Cannot book past dates')
      }

      // Handle recurring booking
      if (bookingData.isRecurring) {
        return this.createRecurringBookingWrapper({
          tenantId: bookingData.tenantId,
          userId: bookingData.userId,
          bookingDate: bookingData.bookingDate,
          bookingTime: bookingData.bookingTime,
          eventNote: bookingData.eventNote
        })
      }
      
      // Check availability using dynamic system
      const dateStr = bookingDate.toISOString().split('T')[0]
      const timeStr = bookingData.bookingTime

      // Check if date/time is blocked by recurring bookings
      const isBlocked = await RecurringBookingService.isDateTimeBlockedByRecurring(
        bookingData.tenantId,
        bookingDate,
        timeStr
      )

      if (isBlocked) {
        throw new Error('This time slot is reserved by a yearly booking and cannot be booked')
      }
      
      const dynamicAvailability = await AvailabilityService.getDynamicAvailability(
        bookingData.tenantId,
        { date: dateStr, limit: 100 }
      )
      
      const availableSlot = dynamicAvailability.find(slot => 
        slot.time_slot === timeStr && slot.is_available
      )
      
      if (!availableSlot) {
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

  // Get availability for tenant (now uses dynamic generation)
  static async getAvailability(tenantId: number, options: DateFilterOptions = {}): Promise<BookingAvailability[]> {
    try {
      // Use the new dynamic availability service
      const dynamicAvailability = await AvailabilityService.getDynamicAvailability(tenantId, options)
      
      // Convert to the expected format for backward compatibility
      return dynamicAvailability.map(item => ({
        id: typeof item.id === 'string' ? parseInt(item.id.split('-')[0]) || 0 : item.id,
        tenant_id: item.tenant_id,
        date: item.date,
        time_slot: item.time_slot,
        timeSlot: item.timeSlot,
        is_available: item.is_available,
        max_bookings: item.max_bookings,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    } catch (error) {
      console.error('Error getting availability:', error)
      throw error // Re-throw to allow proper error handling in API routes
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
      // Validate availability date
      const date = safeCreateDate(availabilityData.date)
      if (!date) {
        throw new Error(`Invalid availability date: ${availabilityData.date}`)
      }

      // Validate time slot
      const timeSlot = createTimeFromString(availabilityData.timeSlot)
      if (!timeSlot) {
        throw new Error(`Invalid time slot: ${availabilityData.timeSlot}`)
      }

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

  // Helper method to create recurring booking and return it in Booking format
  private static async createRecurringBookingWrapper(data: {
    tenantId: number
    userId: number
    bookingDate: string
    bookingTime: string
    eventNote?: string
  }): Promise<Booking | null> {
    try {
      const recurringBooking = await RecurringBookingService.createRecurringBooking(data)
      
      if (!recurringBooking) {
        throw new Error('Failed to create recurring booking')
      }

      // Find the generated booking instance for the requested date
      const bookingDate = safeCreateDate(data.bookingDate)
      const bookingTime = createTimeFromString(data.bookingTime)
      
      if (!bookingDate || !bookingTime) {
        throw new Error('Invalid date or time format')
      }

      const generatedBooking = await prisma.booking.findFirst({
        where: {
          tenantId: data.tenantId,
          userId: data.userId,
          bookingDate,
          bookingTime,
          recurringBookingId: recurringBooking.id,
          status: { not: 'cancelled' }
        }
      })

      if (generatedBooking) {
        return {
          id: generatedBooking.id,
          tenant_id: generatedBooking.tenantId,
          user_id: generatedBooking.userId,
          booking_date: generatedBooking.bookingDate,
          booking_time: generatedBooking.bookingTime.toISOString().substring(11, 19),
          event_note: generatedBooking.eventNote || undefined,
          status: generatedBooking.status as 'pending' | 'confirmed' | 'cancelled',
          created_at: generatedBooking.createdAt,
          updated_at: generatedBooking.updatedAt,
          is_recurring: true,
          recurring_booking_id: generatedBooking.recurringBookingId
        } as any
      }

      throw new Error('Failed to find generated booking instance')
    } catch (error) {
      console.error('Error creating recurring booking wrapper:', error)
      throw error
    }
  }
}