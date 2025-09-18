import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { formatDateForDatabase } from '@/lib/utils/dateValidation'

// Meal period definitions with time ranges for display
const MEAL_PERIODS = {
  morning_meal: {
    name: 'Morning Meal',
    icon: '🌅',
    timeRange: '6:30 AM - 7:30 AM',
    description: 'First meal of the day',
    color: 'bg-amber-50 border-amber-200 text-amber-800'
  },
  morning_tea: {
    name: 'Morning Tea',
    icon: '🍵',
    timeRange: '9:30 AM - 10:30 AM',
    description: 'Morning refreshment',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  lunch_meal: {
    name: 'Lunch Meal',
    icon: '🍽️',
    timeRange: '11:30 AM - 12:00 PM',
    description: 'Main meal - last food before evening',
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  evening_tea: {
    name: 'Evening Tea',
    icon: '☕',
    timeRange: '3:00 PM - 4:00 PM',
    description: 'Final refreshment of the day',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  }
}

// Helper function to get meal cost from tenant settings
async function getMealCosts(tenantId: number) {
  try {
    const settings = await prisma.tenantSettings.findFirst({
      where: { tenantId },
      select: { mealCosts: true }
    })

    // Default costs if not configured
    const defaultCosts = {
      morning_meal: 75,
      morning_tea: 25,
      lunch_meal: 100,
      evening_tea: 30
    }

    return settings?.mealCosts ?
      { ...defaultCosts, ...settings.mealCosts } :
      defaultCosts
  } catch (error) {
    console.error('Error fetching meal costs:', error)
    return {
      morning_meal: 75,
      morning_tea: 25,
      lunch_meal: 100,
      evening_tea: 30
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limitParam = searchParams.get('limit')

    // Validate and parse limit parameter
    let limit = 30 // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: 'Invalid limit parameter', message: 'Limit must be a positive integer' },
          { status: 400 }
        )
      }
      limit = parsedLimit
    }

    // Use default tenant ID for multi-tenant system
    const DEFAULT_TENANT_ID = 1

    // Get meal costs for this tenant
    const mealCosts = await getMealCosts(DEFAULT_TENANT_ID)

    // Generate date range
    let dates: Date[] = []
    if (date) {
      dates = [new Date(date)]
    } else {
      const start = startDate ? new Date(startDate) : new Date()
      const end = endDate ? new Date(endDate) : new Date(Date.now() + limit * 24 * 60 * 60 * 1000)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d))
      }

      if (dates.length > limit) {
        dates = dates.slice(0, limit)
      }
    }

    const availability = []

    for (const currentDate of dates) {
      const dateStr = formatDateForDatabase(currentDate)

      // Check each meal period for this date
      for (const [mealPeriodId, mealInfo] of Object.entries(MEAL_PERIODS)) {

        // Check if this meal period is booked
        const existingBooking = await prisma.booking.findFirst({
          where: {
            tenantId: DEFAULT_TENANT_ID,
            bookingDate: currentDate,
            mealPeriod: mealPeriodId,
            status: { in: ['pending', 'confirmed'] }
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

        // Check for availability overrides
        const override = await prisma.availabilityOverride.findFirst({
          where: {
            tenantId: DEFAULT_TENANT_ID,
            date: currentDate,
            mealPeriod: mealPeriodId,
            isActive: true
          }
        })

        // Check recurring bookings
        const recurringBooking = await prisma.recurringBooking.findFirst({
          where: {
            tenantId: DEFAULT_TENANT_ID,
            bookingMonth: currentDate.getMonth() + 1,
            bookingDay: currentDate.getDate(),
            mealPeriod: mealPeriodId,
            isActive: true
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

        // Determine availability status
        let isAvailable = true
        let isBooked = false
        let bookedBy = null
        let status = 'available'
        let source = 'generated'

        if (override?.overrideType === 'disable') {
          isAvailable = false
          status = 'disabled'
          source = 'override'
        } else if (recurringBooking) {
          isAvailable = false
          isBooked = true
          bookedBy = recurringBooking.user
          status = 'recurring_booked'
          source = 'recurring'
        } else if (existingBooking) {
          isAvailable = false
          isBooked = true
          bookedBy = existingBooking.user
          status = 'booked'
          source = 'booking'
        }

        availability.push({
          date: dateStr,
          mealPeriod: mealPeriodId,
          mealName: mealInfo.name,
          icon: mealInfo.icon,
          timeRange: mealInfo.timeRange,
          description: mealInfo.description,
          color: mealInfo.color,
          cost: mealCosts[mealPeriodId],
          isAvailable,
          isBooked,
          bookedBy: bookedBy ? {
            username: bookedBy.username,
            email: bookedBy.email
          } : null,
          status,
          source
        })
      }
    }

    return NextResponse.json({
      message: 'Meal-based availability retrieved successfully',
      availability,
      mealPeriods: MEAL_PERIODS,
      mealCosts
    })

  } catch (error: any) {
    console.error('Get meal availability error:', error)

    // Handle validation errors with specific error messages
    if (error.message && error.message.includes('Invalid date')) {
      return NextResponse.json(
        { error: 'Date validation error', message: error.message },
        { status: 400 }
      )
    }

    // Generic server error for unknown issues
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve meal availability' },
      { status: 500 }
    )
  }
}