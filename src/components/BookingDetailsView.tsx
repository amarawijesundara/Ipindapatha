'use client'

import React, { useState, useEffect } from 'react'
import { formatDateForBooking } from '@/lib/utils/dateValidation'

interface BookingDetail {
  time: string
  customerName: string
  status: string
  isRecurring: boolean
  bookingType: string
}

interface BookingDetailsViewProps {
  selectedDate: Date
  onClose: () => void
  onSelectDifferentDate: () => void
}

export default function BookingDetailsView({ selectedDate, onClose, onSelectDifferentDate }: BookingDetailsViewProps) {
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [timeSlotBookings, setTimeSlotBookings] = useState<Record<string, BookingDetail[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDate) {
      fetchDateBookings()
    }
  }, [selectedDate])

  const fetchDateBookings = async () => {
    try {
      const dateStr = formatDateForBooking(selectedDate)
      const response = await fetch(`/api/bookings/date-bookings?date=${dateStr}`)
      
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
        setTimeSlotBookings(data.timeSlotBookings || {})
      } else {
        setError('Failed to load booking details')
      }
    } catch (error) {
      console.error('Error fetching date bookings:', error)
      setError('Failed to load booking details')
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

  const categorizeTimeSlots = (timeSlotBookings: Record<string, BookingDetail[]>) => {
    const morningSlots: [string, BookingDetail[]][] = []
    const afternoonSlots: [string, BookingDetail[]][] = []
    const eveningSlots: [string, BookingDetail[]][] = []

    Object.entries(timeSlotBookings).forEach(([time, bookings]) => {
      const hour = parseInt(time.split(':')[0])
      if (hour < 12) {
        morningSlots.push([time, bookings])
      } else if (hour < 17) {
        afternoonSlots.push([time, bookings])
      } else {
        eveningSlots.push([time, bookings])
      }
    })

    return { morningSlots, afternoonSlots, eveningSlots }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-monastery-600">Loading booking details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-error-600">{error}</div>
        <button 
          onClick={() => fetchDateBookings()}
          className="mt-2 text-primary-600 hover:text-primary-700 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-monastery-800 mb-2">
            Date Marked as Fully Booked
          </h3>
          <p className="text-monastery-600 mb-4">
            This date shows as fully booked in the system, but specific booking details are not currently available.
          </p>
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <p className="text-sm text-warning-700">
              <strong>All time slots for this date are currently unavailable.</strong><br/>
              This may be due to capacity limits, recurring bookings, or system maintenance. Please select a different date.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onSelectDifferentDate}
            className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Select Different Date
          </button>
        </div>
      </div>
    )
  }

  const { morningSlots, afternoonSlots, eveningSlots } = categorizeTimeSlots(timeSlotBookings)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-monastery-800 mb-2">
          Fully Booked Date
        </h3>
        <p className="text-monastery-600 mb-4">
          {formatDate(selectedDate)}
        </p>
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-error-700">
            <strong>All time slots for this date are currently booked.</strong><br/>
            You can view the booking details below or select a different date.
          </p>
        </div>
      </div>

      {/* Booking Details by Time Period */}
      <div className="space-y-6">
        {morningSlots.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-monastery-800 mb-3 flex items-center gap-2">
              🌅 Morning Sessions
            </h4>
            <div className="space-y-2">
              {morningSlots.map(([time, bookings]) => (
                <div key={time} className="bg-secondary-50 rounded-lg p-3 border border-secondary-200">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-monastery-800">
                      {formatTime(time)}
                    </div>
                    <div className="text-sm text-secondary-600">
                      {bookings.length} booking{bookings.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {bookings.map((booking, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                        <span className="text-monastery-700">{booking.customerName}</span>
                        {booking.isRecurring && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            Yearly
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {afternoonSlots.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-monastery-800 mb-3 flex items-center gap-2">
              ☀️ Afternoon Sessions
            </h4>
            <div className="space-y-2">
              {afternoonSlots.map(([time, bookings]) => (
                <div key={time} className="bg-secondary-50 rounded-lg p-3 border border-secondary-200">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-monastery-800">
                      {formatTime(time)}
                    </div>
                    <div className="text-sm text-secondary-600">
                      {bookings.length} booking{bookings.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {bookings.map((booking, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                        <span className="text-monastery-700">{booking.customerName}</span>
                        {booking.isRecurring && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            Yearly
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {eveningSlots.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-monastery-800 mb-3 flex items-center gap-2">
              🌆 Evening Sessions
            </h4>
            <div className="space-y-2">
              {eveningSlots.map(([time, bookings]) => (
                <div key={time} className="bg-secondary-50 rounded-lg p-3 border border-secondary-200">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-monastery-800">
                      {formatTime(time)}
                    </div>
                    <div className="text-sm text-secondary-600">
                      {bookings.length} booking{bookings.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {bookings.map((booking, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                        <span className="text-monastery-700">{booking.customerName}</span>
                        {booking.isRecurring && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            Yearly
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-monastery-50 rounded-lg p-4 border border-monastery-200">
        <div className="text-center">
          <div className="text-sm text-monastery-600">
            <strong>{bookings.length}</strong> total booking{bookings.length > 1 ? 's' : ''} for this date
          </div>
          <div className="text-xs text-monastery-500 mt-1">
            Names are displayed with privacy protection (first name + last initial)
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
        >
          Close
        </button>
        <button
          onClick={onSelectDifferentDate}
          className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Select Different Date
        </button>
      </div>
    </div>
  )
}