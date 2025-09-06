import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Helper function to anonymize customer names for privacy
const anonymizeName = (fullName: string): string => {
  if (!fullName || fullName.trim() === '') return 'Anonymous'
  
  const parts = fullName.trim().split(' ')
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1]?.[0] || ''
  
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json(
        { error: 'Missing required parameter', message: 'Date parameter is required' },
        { status: 400 }
      )
    }
    
    // Validate date format
    const bookingDate = new Date(date)
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', message: 'Please provide date in YYYY-MM-DD format' },
        { status: 400 }
      )
    }
    
    // Get all bookings for the specific date with user information
    const DEFAULT_TENANT_ID = 1
    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        bookingDate: bookingDate,
        status: {
          in: ['pending', 'confirmed'] // Only show active bookings
        }
      },
      include: {
        user: {
          select: {
            username: true,
            email: true // We'll use this to get guest names if needed
          }
        }
      },
      orderBy: [
        { bookingTime: 'asc' }
      ]
    })
    
    // Format booking details with anonymized customer names
    const bookingDetails = bookings.map(booking => {
      // Get customer name (prioritize username, fallback to guest name in event note)
      let customerName = booking.user?.username || 'Guest'
      
      // Try to extract guest name from event note if it's a guest booking
      if (booking.eventNote && booking.eventNote.includes('Dhane offering ceremony - ')) {
        const guestNameMatch = booking.eventNote.match(/Dhane offering ceremony - (.+?)(?:\s\(|$)/)
        if (guestNameMatch && guestNameMatch[1]) {
          customerName = guestNameMatch[1]
        }
      }
      
      return {
        time: booking.bookingTime.toISOString().substring(11, 16), // HH:MM format
        customerName: anonymizeName(customerName),
        status: booking.status,
        isRecurring: !!booking.recurringBookingId,
        bookingType: booking.recurringBookingId ? 'Yearly Booking' : 'Single Booking'
      }
    })
    
    // Group bookings by time slot for easier display
    const timeSlotBookings = bookingDetails.reduce((acc, booking) => {
      if (!acc[booking.time]) {
        acc[booking.time] = []
      }
      acc[booking.time].push(booking)
      return acc
    }, {} as Record<string, typeof bookingDetails>)
    
    return NextResponse.json({
      message: 'Date bookings retrieved successfully',
      date: date,
      totalBookings: bookingDetails.length,
      bookings: bookingDetails,
      timeSlotBookings: timeSlotBookings,
      hasBookings: bookingDetails.length > 0
    })
    
  } catch (error: any) {
    console.error('Get date bookings error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve date bookings' },
      { status: 500 }
    )
  }
}