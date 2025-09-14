import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/bookings'
import prisma from '@/lib/db'
import { createTimeFromString, formatDateForDatabase } from '@/lib/utils/dateValidation'

// Helper function to get temporary reservations
async function getTemporaryReservations() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/bookings/reserve-temp`)
    if (response.ok) {
      const data = await response.json()
      return data.temporaryReservations || []
    }
  } catch (error) {
    console.error('Error fetching temporary reservations:', error)
  }
  return []
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limitParam = searchParams.get('limit')
    const sessionId = searchParams.get('sessionId') // Add session context
    
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

    // Get availability (public access - no authentication required)
    // Use default tenant ID for multi-tenant system
    const DEFAULT_TENANT_ID = 1
    const availability = await BookingService.getAvailability(
      DEFAULT_TENANT_ID,
      {
        date: date || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit
      }
    )

    // Get temporary reservations to show "partially booked" status
    const tempReservations = await getTemporaryReservations()
    
    // Get actual booking counts for each slot
    const enhancedAvailability = await Promise.all(availability.map(async slot => {
      const slotDate = formatDateForDatabase(new Date(slot.date))
      const slotTime = slot.timeSlot || slot.time_slot
      
      // Check for temporary reservations
      const tempReservation = tempReservations.find(temp => 
        temp.date === slotDate && temp.timeSlot === slotTime
      )
      
      // Check if this is the current user's reservation
      const isMyReservation = tempReservation && sessionId && tempReservation.sessionId === sessionId
      
      // Count actual bookings for this slot
      let bookingCount = 0
      try {
        // Parse date and time correctly using proper PostgreSQL type casting
        const bookingTime = createTimeFromString(slotTime)
        
        if (bookingTime) {
          // Extract time portion from Date object for PostgreSQL TIME comparison
          const timeString = bookingTime.toISOString().substring(11, 19) // "HH:MM:SS"
          
          // Use string date casting to avoid timezone issues with JavaScript Date objects
          const result = await prisma.$queryRaw`
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE tenant_id = ${DEFAULT_TENANT_ID}
              AND booking_date = ${slotDate}::date
              AND booking_time = ${timeString}::time
              AND status IN ('pending', 'confirmed')
          `
          bookingCount = Number(result[0]?.count) || 0
        }
        
      } catch (error) {
        console.error(`Error counting bookings for slot ${slotDate} ${slotTime}:`, error)
      }
      
      // Determine slot status
      let status = 'available'
      let isAvailable = slot.is_available
      const maxBookings = slot.max_bookings || 1
      
      if (slot.source === 'recurring_blocked') {
        status = 'recurring_booked'
        isAvailable = false
      } else if (tempReservation) {
        status = isMyReservation ? 'my_reservation' : 'partially_booked'
        isAvailable = isMyReservation || bookingCount < maxBookings
      } else if (bookingCount >= maxBookings) {
        status = 'fully_booked'
        isAvailable = false
      } else if (bookingCount > 0) {
        status = 'partially_available'
        isAvailable = true
      } else {
        // Available slot with no bookings
        status = 'available'
        isAvailable = true
      }
      
      return {
        ...slot,
        booking_count: bookingCount,
        available_slots: Math.max(0, maxBookings - bookingCount),
        status,
        is_available: isAvailable,
        isTemporarilyReserved: !!tempReservation,
        isMyReservation: !!isMyReservation,
        reservationExpiresAt: tempReservation?.expiresAt,
        reservationSessionId: tempReservation?.sessionId
      }
    }))

    return NextResponse.json({
      message: 'Availability retrieved successfully',
      availability: enhancedAvailability,
      temporaryReservationsCount: tempReservations.length
    })

  } catch (error: any) {
    console.error('Get availability error:', error)
    
    // Handle validation errors with specific error messages
    if (error.message && error.message.includes('Invalid date filters')) {
      return NextResponse.json(
        { error: 'Date validation error', message: error.message },
        { status: 400 }
      )
    }
    
    // Handle other known error types
    if (error.message && error.message.includes('date')) {
      return NextResponse.json(
        { error: 'Date format error', message: 'Please provide dates in YYYY-MM-DD format' },
        { status: 400 }
      )
    }
    
    // Generic server error for unknown issues
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve availability' },
      { status: 500 }
    )
  }
}