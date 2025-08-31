'use client'

import React, { useState, useEffect } from 'react'
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
}

export default function DhaneBookingModal({ selectedDate, onClose, onBookingComplete }: DhaneBookingModalProps) {
  const { user } = useAuth()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [eventNote, setEventNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingSlots, setFetchingSlots] = useState(true)

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots()
    }
  }, [selectedDate])

  const fetchTimeSlots = async () => {
    if (!selectedDate) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(`/api/bookings/availability?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        const slots = data.availability.map((slot: any) => ({
          time: slot.time_slot,
          available: slot.is_available,
          maxBookings: slot.max_bookings
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime || !user) return

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const bookingData = {
        userId: user.id,
        tenantId: user.tenant_id || 1,
        bookingDate: selectedDate.toISOString().split('T')[0],
        bookingTime: selectedTime,
        eventNote: eventNote || `Dhane offering ceremony - ${user.username}`
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      if (response.ok) {
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-3">
                  Select Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`
                        p-3 rounded-lg text-sm font-medium border transition-colors
                        ${selectedTime === slot.time
                          ? 'bg-primary-500 text-white border-primary-500'
                          : slot.available
                            ? 'bg-white text-monastery-700 border-monastery-200 hover:border-primary-300 hover:bg-primary-50'
                            : 'bg-secondary-100 text-secondary-400 border-secondary-200 cursor-not-allowed'
                        }
                      `}
                    >
                      {formatTime(slot.time)}
                      {!slot.available && (
                        <div className="text-xs text-secondary-500 mt-1">
                          Booked
                        </div>
                      )}
                    </button>
                  ))}
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
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  placeholder="Any special requirements or dedication message for the Dhane offering..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-monastery-200 rounded-lg text-monastery-900 placeholder-monastery-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-lotus-100 rounded-lg p-4">
                <h4 className="font-medium text-monastery-800 mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm text-monastery-700">
                  <div><strong>Date:</strong> {formatDate(selectedDate)}</div>
                  {selectedTime && (
                    <div><strong>Time:</strong> {formatTime(selectedTime)}</div>
                  )}
                  <div><strong>Event:</strong> Dhane Offering Ceremony</div>
                  <div><strong>Devotee:</strong> {user?.username}</div>
                </div>
              </div>

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
                  disabled={!selectedTime || timeSlots.length === 0}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}