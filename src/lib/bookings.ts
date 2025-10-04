import prisma from './db'
import { Booking, BookingAvailability, BookingCreateInput, AvailabilityCreateInput } from '@/types'
import { validateDateFilters, DateFilterOptions, safeCreateDate, createTimeFromString, formatDateForDatabase, createSafeDateRange, areSameDay, normalizeToLocalMidnight } from '@/lib/utils/dateValidation'
import { AvailabilityService } from '@/lib/availability'
import { RecurringBookingService } from '@/lib/recurring-bookings'
import { getMealPeriodDefaultTime } from '@/lib/utils/mealCategories'

export class BookingService {
  // Get bookings for a user within a tenant (includes both regular and recurring bookings)
  static async getUserBookings(userId: number, tenantId?: number, filters?: {
    status?: string
    startDate?: string
    endDate?: string
  }, userRole?: string): Promise<Booking[]> {
    try {
      console.log(`[DEBUG] getUserBookings called with userId: ${userId}, tenantId: ${tenantId}, role: ${userRole}`)

      const whereCondition: any = {}

      // Role-based filtering: admins see all tenant bookings, regular users see only their own
      if (userRole === 'tenant_admin' || userRole === 'super_admin') {
        // Admins see all bookings in their tenant
        console.log(`[DEBUG] Admin user - showing all tenant bookings`)
      } else {
        // Regular users see only their own bookings
        whereCondition.userId = userId
        console.log(`[DEBUG] Regular user - showing personal bookings only`)
      }

      // Add tenant filtering if provided
      if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId
      }

      // Add status filtering if provided for regular bookings
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

      // Fetch regular bookings
      console.log(`[DEBUG] Regular booking query:`, JSON.stringify(whereCondition, null, 2))
      const regularBookings = await prisma.booking.findMany({
        where: whereCondition,
        orderBy: [
          { bookingDate: 'desc' },
          { mealPeriod: 'asc' }
        ]
      })
      console.log(`[DEBUG] Found ${regularBookings.length} regular bookings`)

      // Log each booking's key details
      regularBookings.forEach((booking, index) => {
        console.log(`[DEBUG] Regular booking ${index + 1}:`, {
          id: booking.id,
          userId: booking.userId,
          tenantId: booking.tenantId,
          bookingDate: booking.bookingDate,
          mealPeriod: booking.mealPeriod,
          status: booking.status
        })
      })

      // Build where condition for recurring bookings (similar logic but different table)
      const recurringWhere: any = {
        isActive: true
      }

      // Apply same role-based filtering for recurring bookings
      if (userRole === 'tenant_admin' || userRole === 'super_admin') {
        // Admins see all recurring bookings in their tenant
        console.log(`[DEBUG] Admin user - showing all tenant recurring bookings`)
      } else {
        // Regular users see only their own recurring bookings
        recurringWhere.userId = userId
        console.log(`[DEBUG] Regular user - showing personal recurring bookings only`)
      }

      // Add tenant filtering for recurring bookings
      if (tenantId !== undefined) {
        recurringWhere.tenantId = tenantId
      }

      // For recurring bookings, we don't filter by status as they're always active
      // Note: Skipping complex date filtering for recurring bookings for now
      // Since My Account typically shows all user bookings without date filters
      // This can be enhanced later if needed

      // Fetch recurring bookings
      console.log(`[DEBUG] Recurring booking query:`, JSON.stringify(recurringWhere, null, 2))
      const recurringBookings = await prisma.recurringBooking.findMany({
        where: recurringWhere,
        orderBy: [
          { createdAt: 'desc' },
          { bookingMonth: 'desc' },
          { bookingDay: 'desc' }
        ]
      })
      console.log(`[DEBUG] Found ${recurringBookings.length} recurring bookings`)

      // Log each recurring booking's key details
      recurringBookings.forEach((booking, index) => {
        console.log(`[DEBUG] Recurring booking ${index + 1}:`, {
          id: booking.id,
          userId: booking.userId,
          tenantId: booking.tenantId,
          bookingMonth: booking.bookingMonth,
          bookingDay: booking.bookingDay,
          mealPeriod: booking.mealPeriod,
          isActive: booking.isActive
        })
      })

      // Convert regular bookings to standard format
      const formattedRegularBookings = regularBookings.map(booking => {
        // Use PostgreSQL local date interpretation to match the availability API
        // This ensures both APIs show the same date for the same booking
        const localDateStr = booking.bookingDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
        const displayDate = new Date(localDateStr + 'T00:00:00.000Z')

        console.log(`[USER BOOKINGS DEBUG] Regular booking ${booking.id}:`)
        console.log(`  Database Date: ${booking.bookingDate.toISOString()}`)
        console.log(`  Local Date String: ${localDateStr}`)
        console.log(`  Display Date: ${displayDate.toISOString()}`)

        return {
          id: booking.id,
          tenant_id: booking.tenantId,
          user_id: booking.userId,
          booking_date: displayDate,
          meal_period: booking.mealPeriod as 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea',
          event_note: booking.eventNote || undefined,
          status: booking.status as 'pending' | 'confirmed' | 'cancelled',
          offering_type: booking.offeringType as 'food_preparation' | 'monetary_donation',
          created_at: booking.createdAt,
          updated_at: booking.updatedAt,
          is_recurring: false,
          booking_type: 'regular' as const
        }
      })

      // Convert recurring bookings to standard format
      const formattedRecurringBookings = recurringBookings.map(booking => {
        // Generate synthetic booking date using current year + bookingMonth + bookingDay as UTC
        const currentYear = new Date().getFullYear()
        const month = booking.bookingMonth.toString().padStart(2, '0')
        const day = booking.bookingDay.toString().padStart(2, '0')
        const dateStr = `${currentYear}-${month}-${day}`
        const utcDate = new Date(dateStr + 'T00:00:00.000Z')

        return {
          id: `recurring-${booking.id}`,
          tenant_id: booking.tenantId,
          user_id: booking.userId,
          booking_date: utcDate,
          meal_period: booking.mealPeriod as 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea',
          event_note: booking.eventNote || undefined,
          status: 'recurring' as const,
          offering_type: booking.offeringType as 'food_preparation' | 'monetary_donation',
          created_at: booking.createdAt,
          updated_at: booking.updatedAt,
          is_recurring: true,
          booking_type: 'recurring' as const,
          recurring_pattern: `Every ${booking.bookingMonth}/${booking.bookingDay}`
        }
      })

      // Combine and sort all bookings by creation date (most recent first)
      const allBookings = [...formattedRegularBookings, ...formattedRecurringBookings]
      allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log(`[DEBUG] Final result: ${allBookings.length} total bookings (${formattedRegularBookings.length} regular + ${formattedRecurringBookings.length} recurring)`)

      // Log summary of what we're returning
      allBookings.forEach((booking, index) => {
        console.log(`[DEBUG] Final booking ${index + 1}:`, {
          id: booking.id,
          booking_date: booking.booking_date,
          meal_period: booking.meal_period,
          status: booking.status,
          is_recurring: booking.is_recurring,
          booking_type: booking.booking_type
        })
      })

      return allBookings
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
          { mealPeriod: 'asc' }
        ]
      })

      return bookings.map(booking => ({
        id: booking.id,
        tenant_id: booking.tenantId,
        user_id: booking.userId,
        booking_date: booking.bookingDate,
        meal_period: booking.mealPeriod as 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea',
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        offering_type: booking.offeringType as 'food_preparation' | 'monetary_donation',
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
  static async createBooking(bookingData: BookingCreateInput & { isRecurring?: boolean, offeringType?: 'food_preparation' | 'monetary_donation' }): Promise<Booking | null> {
    try {
      // Validate booking date
      const bookingDate = safeCreateDate(bookingData.bookingDate)
      if (!bookingDate) {
        throw new Error(`Invalid booking date: ${bookingData.bookingDate}`)
      }

      // Validate meal period
      const validMealPeriods = ['morning_meal', 'morning_tea', 'lunch_meal', 'evening_tea']
      if (!validMealPeriods.includes(bookingData.mealPeriod)) {
        throw new Error(`Invalid meal period: ${bookingData.mealPeriod}`)
      }

      // Prevent booking past dates using timezone-safe comparison
      const today = normalizeToLocalMidnight(new Date())
      const normalizedBookingDate = normalizeToLocalMidnight(bookingDate)

      if (normalizedBookingDate < today) {
        throw new Error('Cannot book past dates')
      }

      // Handle recurring booking
      if (bookingData.isRecurring) {
        return this.createRecurringBookingWrapper({
          tenantId: bookingData.tenantId,
          userId: bookingData.userId,
          bookingDate: bookingData.bookingDate,
          mealPeriod: bookingData.mealPeriod,
          eventNote: bookingData.eventNote,
          offeringType: (bookingData as any).offeringType || 'food_preparation'
        })
      }

      // Skip availability checks if admin override is enabled
      if (!bookingData.adminOverride) {
        // FIRST: Check if user already has a booking for this meal period on this date
        if (bookingData.userId) {
          // Use timezone-safe date range
          const { dayStart, dayEnd } = createSafeDateRange(bookingDate)

          const existingUserBooking = await prisma.booking.findFirst({
            where: {
              tenantId: bookingData.tenantId,
              userId: bookingData.userId,
              bookingDate: {
                gte: dayStart,
                lte: dayEnd
              },
              mealPeriod: bookingData.mealPeriod,
              status: {
                not: 'cancelled'
              }
            }
          })

          if (existingUserBooking) {
            const conflictDate = existingUserBooking.bookingDate.toLocaleDateString()
            throw new Error(`You already have a booking for ${bookingData.mealPeriod.replace('_', ' ')} on ${conflictDate}. Please cancel the existing booking first or choose a different meal period. (Booking ID: ${existingUserBooking.id})`)
          }
        }

        // SECOND: Check if meal period is already booked by another user on this date
        // Use timezone-safe date range
        const { dayStart, dayEnd } = createSafeDateRange(bookingDate)

        const existingMealBooking = await prisma.booking.findFirst({
          where: {
            tenantId: bookingData.tenantId,
            bookingDate: {
              gte: dayStart,
              lte: dayEnd
            },
            mealPeriod: bookingData.mealPeriod,
            status: { in: ['pending', 'confirmed'] },
            userId: { not: bookingData.userId } // Exclude current user since we already checked above
          },
          include: {
            user: {
              select: {
                username: true,
                email: true
              }
            }
          }
        })

        if (existingMealBooking) {
          throw new Error(`This meal period is already booked for ${bookingDate.toLocaleDateString()} by ${existingMealBooking.user.username} (${existingMealBooking.user.email}). Status: ${existingMealBooking.status}. Please choose a different meal period or date.`)
        }

        // Check if date/meal period is blocked by recurring bookings
        const recurringBooking = await prisma.recurringBooking.findFirst({
          where: {
            tenantId: bookingData.tenantId,
            bookingMonth: bookingDate.getMonth() + 1,
            bookingDay: bookingDate.getDate(),
            mealPeriod: bookingData.mealPeriod,
            isActive: true
          }
        })

        if (recurringBooking) {
          throw new Error('This meal period is reserved by a yearly booking and cannot be booked')
        }

        // Check for availability overrides
        const override = await prisma.availabilityOverride.findFirst({
          where: {
            tenantId: bookingData.tenantId,
            date: bookingDate,
            mealPeriod: bookingData.mealPeriod,
            overrideType: 'disable',
            isActive: true
          }
        })

        if (override) {
          throw new Error(`This meal period is disabled: ${override.reason || 'No reason provided'}`)
        }
      }


      // For admin bookings without userId, we need to provide a userId since it's required in schema
      // We'll require the admin to provide userId for now
      if (!bookingData.userId) {
        throw new Error('User ID is required for booking creation')
      }

      // Create the booking
      const booking = await prisma.booking.create({
        data: {
          tenant: {
            connect: { id: bookingData.tenantId }
          },
          user: {
            connect: { id: bookingData.userId }
          },
          bookingDate: bookingDate,
          mealPeriod: bookingData.mealPeriod,
          eventNote: bookingData.eventNote,
          offeringType: (bookingData as any).offeringType || 'food_preparation',
          status: bookingData.adminOverride ? 'confirmed' : 'pending'
        }
      })

      return {
        id: booking.id,
        user_id: booking.userId,
        tenant_id: booking.tenantId,
        booking_date: booking.bookingDate,
        meal_period: booking.mealPeriod as 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea',
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        offering_type: booking.offeringType as 'food_preparation' | 'monetary_donation',
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
        meal_period: booking.mealPeriod as 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea',
        event_note: booking.eventNote || undefined,
        status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        offering_type: booking.offeringType as 'food_preparation' | 'monetary_donation',
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
        source: item.source, // Preserve the source field for status determination
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
    mealPeriod: 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'
    eventNote?: string
    offeringType?: 'food_preparation' | 'monetary_donation'
  }): Promise<Booking | null> {
    try {
      // Pass mealPeriod instead of bookingTime to the recurring booking service
      const recurringBooking = await RecurringBookingService.createRecurringBooking({
        tenantId: data.tenantId,
        userId: data.userId,
        bookingDate: data.bookingDate,
        mealPeriod: data.mealPeriod,
        eventNote: data.eventNote,
        offeringType: data.offeringType || 'food_preparation'
      })
      
      if (!recurringBooking) {
        throw new Error('Failed to create recurring booking')
      }

      // Find the generated booking instance for the requested date
      const bookingDate = safeCreateDate(data.bookingDate)

      if (!bookingDate) {
        throw new Error('Invalid date format')
      }

      // Try to find the generated booking instance
      let generatedBooking = await prisma.booking.findFirst({
        where: {
          tenantId: data.tenantId,
          userId: data.userId,
          bookingDate,
          mealPeriod: data.mealPeriod,
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
          meal_period: data.mealPeriod,
          event_note: generatedBooking.eventNote || undefined,
          status: generatedBooking.status as 'pending' | 'confirmed' | 'cancelled',
          offering_type: generatedBooking.offeringType as 'food_preparation' | 'monetary_donation',
          created_at: generatedBooking.createdAt,
          updated_at: generatedBooking.updatedAt,
          is_recurring: true,
          recurring_booking_id: generatedBooking.recurringBookingId
        } as any
      }

      // If still not found, return a synthetic booking response based on the recurring booking
      // This ensures the UI gets a successful response even if the instance lookup fails
      console.warn('Generated booking instance not found, returning synthetic booking response')
      return {
        id: 0, // Temporary ID
        tenant_id: recurringBooking.tenant_id,
        user_id: recurringBooking.user_id,
        booking_date: bookingDate,
        meal_period: data.mealPeriod,
        event_note: recurringBooking.event_note,
        status: 'confirmed' as 'confirmed',
        offering_type: 'food_preparation' as 'food_preparation',
        created_at: new Date(),
        updated_at: new Date(),
        is_recurring: true,
        recurring_booking_id: recurringBooking.id
      } as any
    } catch (error) {
      console.error('Error creating recurring booking wrapper:', error)
      throw error
    }
  }
}