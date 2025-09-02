import { NextRequest, NextResponse } from 'next/server'
import { BookingService } from '@/lib/bookings'

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
    // For simplified system, we'll get availability for all tenants or default tenant
    const availability = await BookingService.getAvailability(
      1, // Default tenant ID - adjust based on your system
      {
        date: date || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit
      }
    )

    // Get temporary reservations to show "partially booked" status
    const tempReservations = await getTemporaryReservations()
    
    // Mark slots with temporary reservations
    const enhancedAvailability = availability.map(slot => {
      const slotDate = new Date(slot.date).toISOString().split('T')[0]
      const slotTime = slot.timeSlot || slot.time_slot
      
      const tempReservation = tempReservations.find(temp => 
        temp.date === slotDate && temp.timeSlot === slotTime
      )
      
      if (tempReservation) {
        return {
          ...slot,
          isTemporarilyReserved: true,
          reservationExpiresAt: tempReservation.expiresAt,
          status: 'partially_booked'
        }
      }
      
      return slot
    })

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