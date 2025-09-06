import prisma from './db'
import { safeCreateDate, createTimeFromString } from '@/lib/utils/dateValidation'

export interface RecurringBooking {
  id: number
  tenant_id: number
  user_id: number
  booking_month: number
  booking_day: number
  booking_time: string
  event_note?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface RecurringBookingCreateInput {
  tenantId: number
  userId: number
  bookingDate: string
  bookingTime: string
  eventNote?: string
}

export class RecurringBookingService {
  
  /**
   * Create a yearly recurring booking
   */
  static async createRecurringBooking(data: RecurringBookingCreateInput): Promise<RecurringBooking | null> {
    try {
      // Parse the booking date
      const bookingDate = safeCreateDate(data.bookingDate)
      if (!bookingDate) {
        throw new Error(`Invalid booking date: ${data.bookingDate}`)
      }

      // Parse the booking time
      const bookingTime = createTimeFromString(data.bookingTime)
      if (!bookingTime) {
        throw new Error(`Invalid booking time: ${data.bookingTime}`)
      }

      // Prevent booking past dates
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      bookingDate.setHours(0, 0, 0, 0)
      
      if (bookingDate < today) {
        throw new Error('Cannot create recurring booking for past dates')
      }

      const bookingMonth = bookingDate.getMonth() + 1 // 1-based month
      const bookingDay = bookingDate.getDate()

      // Note: We don't blanket-block recurring bookings for the same date/time
      // The availability system will handle capacity limits when actual bookings are created
      // This allows multiple users to have recurring bookings for popular dates (like special holidays)

      // Check if user already has a recurring booking for this date/time
      const userExisting = await prisma.recurringBooking.findFirst({
        where: {
          tenantId: data.tenantId,
          userId: data.userId,
          bookingMonth,
          bookingDay,
          bookingTime,
          isActive: true
        }
      })

      if (userExisting) {
        throw new Error('You already have a yearly booking for this date and time')
      }

      // Create the recurring booking
      const recurringBooking = await prisma.recurringBooking.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          bookingMonth,
          bookingDay,
          bookingTime,
          eventNote: data.eventNote
        }
      })

      // Generate booking instances for current year and next year
      await this.generateBookingInstances(recurringBooking.id, data.tenantId)

      return {
        id: recurringBooking.id,
        tenant_id: recurringBooking.tenantId,
        user_id: recurringBooking.userId,
        booking_month: recurringBooking.bookingMonth,
        booking_day: recurringBooking.bookingDay,
        booking_time: recurringBooking.bookingTime.toISOString().substring(11, 19),
        event_note: recurringBooking.eventNote || undefined,
        is_active: recurringBooking.isActive,
        created_at: recurringBooking.createdAt,
        updated_at: recurringBooking.updatedAt
      }
    } catch (error) {
      console.error('Error creating recurring booking:', error)
      throw error
    }
  }

  /**
   * Get user's recurring bookings
   */
  static async getUserRecurringBookings(userId: number, tenantId?: number): Promise<RecurringBooking[]> {
    try {
      const whereCondition: any = { 
        userId: userId,
        isActive: true
      }

      if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId
      }

      const recurringBookings = await prisma.recurringBooking.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: [
          { bookingMonth: 'asc' },
          { bookingDay: 'asc' },
          { bookingTime: 'asc' }
        ]
      })

      return recurringBookings.map(booking => ({
        id: booking.id,
        tenant_id: booking.tenantId,
        user_id: booking.userId,
        booking_month: booking.bookingMonth,
        booking_day: booking.bookingDay,
        booking_time: booking.bookingTime.toISOString().substring(11, 19),
        event_note: booking.eventNote || undefined,
        is_active: booking.isActive,
        created_at: booking.createdAt,
        updated_at: booking.updatedAt
      }))
    } catch (error) {
      console.error('Error getting user recurring bookings:', error)
      return []
    }
  }

  /**
   * Get all active recurring bookings for a tenant
   */
  static async getTenantRecurringBookings(tenantId: number): Promise<RecurringBooking[]> {
    try {
      const recurringBookings = await prisma.recurringBooking.findMany({
        where: {
          tenantId,
          isActive: true
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
          { bookingMonth: 'asc' },
          { bookingDay: 'asc' },
          { bookingTime: 'asc' }
        ]
      })

      return recurringBookings.map(booking => ({
        id: booking.id,
        tenant_id: booking.tenantId,
        user_id: booking.userId,
        booking_month: booking.bookingMonth,
        booking_day: booking.bookingDay,
        booking_time: booking.bookingTime.toISOString().substring(11, 19),
        event_note: booking.eventNote || undefined,
        is_active: booking.isActive,
        created_at: booking.createdAt,
        updated_at: booking.updatedAt,
        username: (booking.user as any).username,
        email: (booking.user as any).email
      } as any))
    } catch (error) {
      console.error('Error getting tenant recurring bookings:', error)
      return []
    }
  }

  /**
   * Cancel/deactivate a recurring booking
   */
  static async cancelRecurringBooking(recurringBookingId: number, tenantId: number, userId: number): Promise<boolean> {
    try {
      // Verify ownership and tenant
      const recurringBooking = await prisma.recurringBooking.findFirst({
        where: {
          id: recurringBookingId,
          tenantId,
          userId,
          isActive: true
        }
      })

      if (!recurringBooking) {
        throw new Error('Recurring booking not found or not accessible')
      }

      // Deactivate the recurring booking
      await prisma.recurringBooking.update({
        where: { id: recurringBookingId },
        data: { isActive: false }
      })

      // Cancel all future booking instances
      const today = new Date()
      await prisma.booking.updateMany({
        where: {
          recurringBookingId,
          bookingDate: {
            gte: today
          },
          status: {
            in: ['pending', 'confirmed']
          }
        },
        data: {
          status: 'cancelled'
        }
      })

      return true
    } catch (error) {
      console.error('Error canceling recurring booking:', error)
      throw error
    }
  }

  /**
   * Check if a date/time is blocked by recurring bookings
   */
  static async isDateTimeBlockedByRecurring(
    tenantId: number,
    date: Date,
    timeSlot: string
  ): Promise<boolean> {
    try {
      const month = date.getMonth() + 1
      const day = date.getDate()
      
      const timeObj = createTimeFromString(timeSlot)
      if (!timeObj) return false

      const recurring = await prisma.recurringBooking.findFirst({
        where: {
          tenantId,
          bookingMonth: month,
          bookingDay: day,
          bookingTime: timeObj,
          isActive: true
        }
      })

      return !!recurring
    } catch (error) {
      console.error('Error checking recurring booking conflict:', error)
      return false
    }
  }

  /**
   * Generate booking instances for a recurring booking
   */
  private static async generateBookingInstances(recurringBookingId: number, tenantId: number): Promise<void> {
    try {
      // Get the recurring booking details
      const recurringBooking = await prisma.recurringBooking.findUnique({
        where: { id: recurringBookingId }
      })

      if (!recurringBooking || !recurringBooking.isActive) return

      const currentYear = new Date().getFullYear()
      const yearsToGenerate = [currentYear, currentYear + 1] // Current and next year

      for (const year of yearsToGenerate) {
        try {
          // Calculate the target date for this year
          const targetDate = new Date(year, recurringBooking.bookingMonth - 1, recurringBooking.bookingDay)
          
          // Skip if date is invalid (e.g., Feb 29 in non-leap year)
          if (targetDate.getMonth() !== recurringBooking.bookingMonth - 1) {
            continue
          }

          // Skip if date is in the past
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          targetDate.setHours(0, 0, 0, 0)
          
          if (targetDate < today) continue

          // Check if booking instance already exists
          const existingBooking = await prisma.booking.findFirst({
            where: {
              tenantId,
              userId: recurringBooking.userId,
              bookingDate: targetDate,
              bookingTime: recurringBooking.bookingTime,
              recurringBookingId,
              status: { not: 'cancelled' }
            }
          })

          if (existingBooking) continue

          // Create the booking instance
          await prisma.booking.create({
            data: {
              tenant: {
                connect: { id: tenantId }
              },
              user: {
                connect: { id: recurringBooking.userId }
              },
              bookingDate: targetDate,
              bookingTime: recurringBooking.bookingTime,
              eventNote: recurringBooking.eventNote || `Yearly booking - ${targetDate.toDateString()}`,
              status: 'confirmed',
              isRecurring: true,
              recurringBooking: recurringBookingId ? {
                connect: { id: recurringBookingId }
              } : undefined
            }
          })
        } catch (yearError) {
          console.error(`Error generating booking for year ${year}:`, yearError)
        }
      }
    } catch (error) {
      console.error('Error generating booking instances:', error)
      throw error
    }
  }

  /**
   * Generate booking instances for all active recurring bookings (called periodically)
   */
  static async generateAllRecurringInstances(): Promise<void> {
    try {
      const activeRecurringBookings = await prisma.recurringBooking.findMany({
        where: { isActive: true }
      })

      for (const recurring of activeRecurringBookings) {
        await this.generateBookingInstances(recurring.id, recurring.tenantId)
      }
    } catch (error) {
      console.error('Error generating all recurring instances:', error)
      throw error
    }
  }

  /**
   * Clean up past recurring booking instances (called periodically)
   */
  static async cleanupPastInstances(): Promise<void> {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      await prisma.booking.deleteMany({
        where: {
          isRecurring: true,
          bookingDate: {
            lt: oneYearAgo
          }
        }
      })
    } catch (error) {
      console.error('Error cleaning up past instances:', error)
      throw error
    }
  }
}