import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for temporary reservations (in production, use Redis or database)
const temporaryReservations = new Map<string, {
  date: string
  timeSlot: string
  sessionId: string
  expiresAt: Date
  userAgent?: string
}>()

// Cleanup expired reservations
const cleanupExpiredReservations = () => {
  const now = new Date()
  for (const [key, reservation] of temporaryReservations.entries()) {
    if (reservation.expiresAt <= now) {
      temporaryReservations.delete(key)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, timeSlot, sessionId } = body

    if (!date || !timeSlot || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Date, timeSlot, and sessionId are required' },
        { status: 400 }
      )
    }

    // Clean up expired reservations first
    cleanupExpiredReservations()

    const reservationKey = `${date}-${timeSlot}`
    
    // Check if slot is already temporarily reserved
    const existing = temporaryReservations.get(reservationKey)
    if (existing && existing.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Slot temporarily unavailable', message: 'This slot is currently being booked by another user' },
        { status: 409 }
      )
    }

    // Create or update temporary reservation (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    temporaryReservations.set(reservationKey, {
      date,
      timeSlot,
      sessionId,
      expiresAt,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      message: 'Slot temporarily reserved',
      expiresAt: expiresAt.toISOString(),
      remainingMinutes: 15
    })

  } catch (error) {
    console.error('Temporary reservation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to reserve slot temporarily' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, timeSlot, sessionId } = body

    if (!date || !timeSlot || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const reservationKey = `${date}-${timeSlot}`
    const existing = temporaryReservations.get(reservationKey)
    
    if (existing && existing.sessionId === sessionId) {
      temporaryReservations.delete(reservationKey)
      return NextResponse.json({ message: 'Temporary reservation released' })
    }

    return NextResponse.json(
      { error: 'Reservation not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Release reservation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return all active temporary reservations (for availability checking)
  cleanupExpiredReservations()
  
  const activeReservations = Array.from(temporaryReservations.entries()).map(([key, reservation]) => ({
    key,
    ...reservation,
    expiresAt: reservation.expiresAt.toISOString()
  }))

  return NextResponse.json({ 
    temporaryReservations: activeReservations,
    count: activeReservations.length
  })
}