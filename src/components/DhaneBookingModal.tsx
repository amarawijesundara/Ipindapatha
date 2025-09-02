'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAuth } from '@/components/AuthContext'

interface DhaneBookingModalProps {
  selectedDate: Date | null
  onClose: () => void
  onBookingComplete: () => void
}

interface TimeSlot {
  time: string
  available: boolean
  maxBookings: number
  isTemporarilyReserved?: boolean
  reservationExpiresAt?: string
  status?: string
}

interface BookingFormData {
  name: string
  email: string
  phone: string
  eventNote: string
}

export default function DhaneBookingModal({ selectedDate, onClose, onBookingComplete }: DhaneBookingModalProps) {
  const { user } = useAuth()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingSlots, setFetchingSlots] = useState(true)
  const [reservationTimer, setReservationTimer] = useState<number | null>(null)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))
  const [isRecurring, setIsRecurring] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    eventNote: ''
  })

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots()
    }
  }, [selectedDate])

  const fetchTimeSlots = async () => {
    if (!selectedDate) return
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(`/api/bookings/availability?date=${dateStr}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const slots = data.availability.map((slot: any) => ({
          time: slot.timeSlot || slot.time_slot,
          available: slot.is_available && !slot.isTemporarilyReserved,
          maxBookings: slot.max_bookings,
          isTemporarilyReserved: slot.isTemporarilyReserved,
          reservationExpiresAt: slot.reservationExpiresAt,
          status: slot.status
        }))
        
        // Sort time slots
        slots.sort((a: TimeSlot, b: TimeSlot) => a.time.localeCompare(b.time))
        setTimeSlots(slots)
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error)
    } finally {
      setFetchingSlots(false)
    }
  }

  const reserveSlotTemporarily = async (timeSlot: string) => {
    try {
      const response = await fetch('/api/bookings/reserve-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate?.toISOString().split('T')[0],
          timeSlot,
          sessionId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setReservationTimer(15 * 60) // 15 minutes in seconds
        startCountdown()
        return true
      }
    } catch (error) {
      console.error('Failed to reserve slot:', error)
    }
    return false
  }

  const startCountdown = () => {
    const interval = setInterval(() => {
      setReservationTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          setSelectedTime('')
          fetchTimeSlots() // Refresh availability
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleTimeSlotSelect = async (timeSlot: string) => {
    setSelectedTime(timeSlot)
    
    if (!user) {
      // For guests, reserve the slot temporarily
      const reserved = await reserveSlotTemporarily(timeSlot)
      if (!reserved) {
        alert('Unable to reserve this slot. It may have been taken by another user.')
        setSelectedTime('')
        fetchTimeSlots()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return

    // Validate form data
    if (!formData.name || !formData.email) {
      alert('Please fill in your name and email address')
      return
    }

    if (!user) {
      // Guest user - store form data and show auth prompt
      localStorage.setItem('pendingBooking', JSON.stringify({
        ...formData,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        sessionId
      }))
      setShowAuthPrompt(true)
      return
    }

    // Authenticated user - proceed with booking
    await createBooking()
  }

  const createBooking = async () => {
    setLoading(true)

    try {
      const bookingData = {
        userId: user?.id,
        tenantId: user?.tenant_id || 1,
        bookingDate: selectedDate?.toISOString().split('T')[0],
        bookingTime: selectedTime,
        eventNote: formData.eventNote || `${isRecurring ? 'Yearly ' : ''}Dhane offering ceremony - ${formData.name || user?.username}`,
        guestName: !user ? formData.name : undefined,
        guestEmail: !user ? formData.email : undefined,
        guestPhone: !user ? formData.phone : undefined,
        sessionId,
        isRecurring
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      if (response.ok) {
        // Release temporary reservation
        await fetch('/api/bookings/reserve-temp', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate?.toISOString().split('T')[0],
            timeSlot: selectedTime,
            sessionId
          })
        })
        
        localStorage.removeItem('pendingBooking')
        onBookingComplete()
        onClose()
      } else {
        alert(data.message || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Failed to create booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) % 12 || 12
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAuthRedirect = (type: 'login' | 'register') => {
    // Store current form data
    localStorage.setItem('pendingBooking', JSON.stringify({
      ...formData,
      date: selectedDate?.toISOString().split('T')[0],
      time: selectedTime,
      sessionId
    }))
    
    // Redirect to auth page
    window.location.href = `/${type}?redirect=/`
  }

  if (!selectedDate) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center border-b border-monastery-100">
          <div className="text-3xl mb-2">🙏</div>
          <CardTitle className="text-monastery-800">
            Book Dhane Offering
          </CardTitle>
          <p className="text-sm text-monastery-600">
            {formatDate(selectedDate)}
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          {fetchingSlots ? (
            <div className="text-center py-8">
              <div className="text-monastery-600">Loading available times...</div>
            </div>
          ) : showAuthPrompt ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-lg font-semibold text-monastery-800 mb-2">
                  Sign In to Complete Booking
                </h3>
                <p className="text-sm text-monastery-600 mb-4">
                  Your slot is temporarily reserved for {reservationTimer ? formatTimer(reservationTimer) : '15:00'}
                </p>
                <div className="bg-lotus-100 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-monastery-800 mb-2">Your Booking Details</h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {formatDate(selectedDate!)}</div>
                    <div><strong>Time:</strong> {formatTime(selectedTime)}</div>
                    <div><strong>Name:</strong> {formData.name}</div>
                    <div><strong>Email:</strong> {formData.email}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  type="button"
                  fullWidth
                  onClick={() => handleAuthRedirect('login')}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  Sign In to Existing Account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => handleAuthRedirect('register')}
                >
                  Create New Account
                </Button>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAuthPrompt(false)}
                  fullWidth
                >
                  Back to Form
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reservation Timer for Guests */}
              {!user && selectedTime && reservationTimer && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-warning-600">⏱️</div>
                    <div className="text-sm">
                      <span className="font-medium text-warning-800">Slot reserved for:</span>
                      <span className="ml-2 font-mono text-warning-700">{formatTimer(reservationTimer)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Guest Information Form */}
              {!user && (
                <div className="space-y-4">
                  <h4 className="font-medium text-monastery-800">Your Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-monastery-800 mb-2">
                      Full Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-monastery-800 mb-2">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-monastery-800 mb-2">
                      Phone Number (Optional)
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              )}
              
              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-3">
                  Select Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => {
                    const isPartiallyBooked = slot.status === 'partially_booked' || slot.isTemporarilyReserved
                    const isMyReservation = selectedTime === slot.time
                    
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available && !isMyReservation}
                        onClick={() => handleTimeSlotSelect(slot.time)}
                        className={`
                          relative p-3 rounded-lg text-sm font-medium border transition-colors
                          ${selectedTime === slot.time
                            ? 'bg-primary-500 text-white border-primary-500'
                            : slot.available
                              ? 'bg-white text-monastery-700 border-monastery-200 hover:border-primary-300 hover:bg-primary-50'
                              : isPartiallyBooked
                                ? 'bg-warning-100 text-warning-800 border-warning-300'
                                : 'bg-secondary-100 text-secondary-400 border-secondary-200 cursor-not-allowed'
                          }
                        `}
                      >
                        {formatTime(slot.time)}
                        {isPartiallyBooked && !isMyReservation && (
                          <div className="text-xs text-warning-600 mt-1">
                            Being Booked
                          </div>
                        )}
                        {!slot.available && !isPartiallyBooked && (
                          <div className="text-xs text-secondary-500 mt-1">
                            Booked
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {timeSlots.length === 0 && (
                  <div className="text-center py-4 text-monastery-600">
                    No time slots available for this date
                  </div>
                )}
              </div>

              {/* Event Note */}
              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-2">
                  Special Requests or Notes (Optional)
                </label>
                <textarea
                  value={formData.eventNote}
                  onChange={(e) => setFormData(prev => ({ ...prev, eventNote: e.target.value }))}
                  placeholder="Any special requirements or dedication message for the Dhane offering..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-monastery-200 rounded-lg text-monastery-900 placeholder-monastery-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                />
              </div>

              {/* Recurring Booking Option - Only for authenticated users */}
              {user && selectedTime && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-start space-x-3">
                    <input
                      id="recurring"
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-purple-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="recurring" className="block text-sm font-medium text-purple-800 mb-1">
                        📅 Book This Date Every Year
                      </label>
                      <p className="text-xs text-purple-700">
                        Make this a yearly recurring booking. This date and time will be automatically reserved for you every year. 
                        {isRecurring && (
                          <strong className="block mt-1">
                            This will reserve {formatDate(selectedDate!)} at {formatTime(selectedTime)} annually.
                          </strong>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              {selectedTime && (
                <div className="bg-lotus-100 rounded-lg p-4">
                  <h4 className="font-medium text-monastery-800 mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {formatDate(selectedDate)}</div>
                    <div><strong>Time:</strong> {formatTime(selectedTime)}</div>
                    <div><strong>Event:</strong> {isRecurring ? 'Yearly ' : ''}Dhane Offering Ceremony</div>
                    <div><strong>Devotee:</strong> {user?.username || formData.name || 'Guest'}</div>
                    {!user && formData.email && (
                      <div><strong>Email:</strong> {formData.email}</div>
                    )}
                    {isRecurring && (
                      <div className="text-purple-700 font-medium">
                        <strong>📅 Recurring:</strong> This booking will repeat annually on the same date and time
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  fullWidth
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={!selectedTime || timeSlots.length === 0 || (!user && (!formData.name || !formData.email))}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  {loading ? 'Processing...' : user ? 'Confirm Booking' : 'Continue to Sign In'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}