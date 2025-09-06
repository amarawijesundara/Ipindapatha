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
    const { date, timeSlot, timeSlots, sessionId } = body

    // Support both single timeSlot and multiple timeSlots for backward compatibility
    let slotsToReserve: string[]
    if (timeSlots && Array.isArray(timeSlots)) {
      slotsToReserve = timeSlots
    } else if (timeSlot) {
      slotsToReserve = [timeSlot]
    } else {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Date, timeSlot (or timeSlots), and sessionId are required' },
        { status: 400 }
      )
    }

    if (!date || !sessionId || slotsToReserve.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Date, time slots, and sessionId are required' },
        { status: 400 }
      )
    }

    // Clean up expired reservations first
    cleanupExpiredReservations()

    // Check for conflicts across all requested slots
    const conflicts: string[] = []
    const conflictDetails: { slot: string; sessionId: string }[] = []
    
    for (const slot of slotsToReserve) {
      const reservationKey = `${date}-${slot}`
      const existing = temporaryReservations.get(reservationKey)
      if (existing && existing.sessionId !== sessionId) {
        conflicts.push(slot)
        conflictDetails.push({ slot, sessionId: existing.sessionId })
      }
    }

    // If there are conflicts, return error with details
    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Slots temporarily unavailable', 
          message: `${conflicts.length} slot(s) currently being booked by other users: ${conflicts.join(', ')}`,
          conflicts: conflicts,
          conflictDetails: conflictDetails
        },
        { status: 409 }
      )
    }

    // Create or update temporary reservations for all slots (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    const reservedSlots: string[] = []
    
    for (const slot of slotsToReserve) {
      const reservationKey = `${date}-${slot}`
      temporaryReservations.set(reservationKey, {
        date,
        timeSlot: slot,
        sessionId,
        expiresAt,
        userAgent: request.headers.get('user-agent') || undefined
      })
      reservedSlots.push(slot)
    }

    return NextResponse.json({
      message: `${reservedSlots.length} slot${reservedSlots.length > 1 ? 's' : ''} temporarily reserved`,
      expiresAt: expiresAt.toISOString(),
      remainingMinutes: 15,
      reservedSlots: reservedSlots,
      count: reservedSlots.length
    })

  } catch (error) {
    console.error('Temporary reservation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to reserve slots temporarily' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, timeSlot, timeSlots, sessionId } = body

    // Support both single timeSlot and multiple timeSlots for backward compatibility
    let slotsToRelease: string[]
    if (timeSlots && Array.isArray(timeSlots)) {
      slotsToRelease = timeSlots
    } else if (timeSlot) {
      slotsToRelease = [timeSlot]
    } else {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Date, timeSlot (or timeSlots), and sessionId are required' },
        { status: 400 }
      )
    }

    if (!date || !sessionId || slotsToRelease.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const releasedSlots: string[] = []
    const notFoundSlots: string[] = []
    
    for (const slot of slotsToRelease) {
      const reservationKey = `${date}-${slot}`
      const existing = temporaryReservations.get(reservationKey)
      
      if (existing && existing.sessionId === sessionId) {
        temporaryReservations.delete(reservationKey)
        releasedSlots.push(slot)
      } else {
        notFoundSlots.push(slot)
      }
    }

    // Return success if any slots were released
    if (releasedSlots.length > 0) {
      const response: any = {
        message: `${releasedSlots.length} temporary reservation${releasedSlots.length > 1 ? 's' : ''} released`,
        releasedSlots: releasedSlots,
        releasedCount: releasedSlots.length
      }
      
      // Include information about slots that weren't found
      if (notFoundSlots.length > 0) {
        response.partialRelease = true
        response.notFoundSlots = notFoundSlots
        response.notFoundCount = notFoundSlots.length
        response.message += ` (${notFoundSlots.length} slot${notFoundSlots.length > 1 ? 's' : ''} not found or already released)`
      }
      
      return NextResponse.json(response)
    }

    // No slots were found to release
    return NextResponse.json(
      { 
        error: 'Reservations not found', 
        message: `No reservations found for the specified ${slotsToRelease.length} slot${slotsToRelease.length > 1 ? 's' : ''}`,
        notFoundSlots: notFoundSlots
      },
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