'use client'

import React, { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import { Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@/components/ui'
import { BookingAvailability } from '@/types'
import { useAuth } from '@/components/AuthContext'
import 'react-calendar/dist/Calendar.css'

interface MonasteryCalendarProps {
  onDateSelect?: (date: Date) => void
  selectedDate?: Date
}

interface DayAvailability {
  date: string
  hasAvailability: boolean
  totalSlots: number
  availableSlots: number
}

export default function MonasteryCalendar({ onDateSelect, selectedDate }: MonasteryCalendarProps) {
  const { user, loading: authLoading } = useAuth()
  const [availability, setAvailability] = useState<BookingAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [dayAvailability, setDayAvailability] = useState<Map<string, DayAvailability>>(new Map())

  useEffect(() => {
    // Fetch availability for all users (both authenticated and guests)
    if (!authLoading) {
      fetchAvailability()
    }
  }, [authLoading])

  const fetchAvailability = async () => {
    try {
      // Fetch availability for current year through next year
      const currentYear = new Date().getFullYear()
      const startDate = new Date(currentYear, 0, 1).toISOString().split('T')[0] // Jan 1 current year
      const endDate = new Date(currentYear + 1, 11, 31).toISOString().split('T')[0] // Dec 31 next year
      
      const response = await fetch(`/api/bookings/availability?start_date=${startDate}&end_date=${endDate}&limit=5000`, {
        credentials: 'include', // Include cookies if available
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Availability API response:', data.availability?.length || 0, 'slots received')
        setAvailability(data.availability)
        processAvailabilityData(data.availability)
      } else {
        console.error('Failed to fetch availability:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const processAvailabilityData = (availabilityData: BookingAvailability[]) => {
    const dayMap = new Map<string, DayAvailability>()
    
    console.log('Processing availability data:', availabilityData?.length || 0, 'slots')
    
    availabilityData.forEach(slot => {
      // Ensure we get the date string correctly regardless of format
      let dateStr: string
      if (slot.date instanceof Date) {
        dateStr = slot.date.toISOString().split('T')[0]
      } else if (typeof slot.date === 'string') {
        dateStr = slot.date.split('T')[0]
      } else {
        dateStr = new Date(slot.date).toISOString().split('T')[0]
      }
      
      const existing = dayMap.get(dateStr)
      
      if (existing) {
        existing.totalSlots++
        if (slot.is_available) {
          existing.availableSlots++
        }
      } else {
        dayMap.set(dateStr, {
          date: dateStr,
          hasAvailability: slot.is_available,
          totalSlots: 1,
          availableSlots: slot.is_available ? 1 : 0
        })
      }
    })
    
    console.log('Processed availability for', dayMap.size, 'days')
    console.log('Sample days with availability:', Array.from(dayMap.keys()).slice(0, 5))
    
    setDayAvailability(dayMap)
  }

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const getDayAvailability = (date: Date): DayAvailability | null => {
    const dateStr = formatDate(date)
    const availability = dayAvailability.get(dateStr)
    
    return availability || null
  }

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const dayInfo = getDayAvailability(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Create a new Date object instead of mutating the original
    const dateComparison = new Date(date)
    dateComparison.setHours(0, 0, 0, 0)
    
    const classes = []
    
    // Past dates
    if (dateComparison < today) {
      classes.push('past-date')
    }
    
    // Availability status
    if (dayInfo) {
      // Check if any slots for this day are partially booked
      const hasPartiallyBookedSlots = availability.some(slot => {
        const slotDate = new Date(slot.date).toISOString().split('T')[0]
        return slotDate === formatDate(date) && (slot.status === 'partially_booked' || slot.isTemporarilyReserved)
      })
      
      // Check if any slots are blocked by recurring bookings
      const hasRecurringBookedSlots = availability.some(slot => {
        const slotDate = new Date(slot.date).toISOString().split('T')[0]
        return slotDate === formatDate(date) && slot.source === 'recurring_blocked'
      })
      
      if (hasRecurringBookedSlots && dayInfo.availableSlots === 0) {
        classes.push('recurring-booked')
      } else if (hasPartiallyBookedSlots) {
        classes.push('partially-booked')
      } else if (dayInfo.availableSlots > 0) {
        if (dayInfo.availableSlots === dayInfo.totalSlots) {
          classes.push('fully-available')
        } else {
          classes.push('partially-available')
        }
      } else {
        classes.push('fully-booked')
      }
    } else {
      // No pre-existing availability data
      // For future dates, assume available since backend generates default slots
      if (dateComparison >= today) {
        classes.push('fully-available')
      }
    }
    
    // Selected date
    if (selectedDate && formatDate(date) === formatDate(selectedDate)) {
      classes.push('selected-date')
    }
    
    // Debug log for first few dates to verify color classes
    if (date.getDate() <= 3) {
      console.log(`Date ${formatDate(date)}: classes=[${classes.join(', ')}], dayInfo:`, !!dayInfo)
    }
    
    return classes.join(' ')
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const dayInfo = getDayAvailability(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateComparison = new Date(date)
    dateComparison.setHours(0, 0, 0, 0)
    
    // If no dayInfo but it's a future date, show default availability count
    if (!dayInfo) {
      if (dateComparison >= today) {
        return (
          <div className="calendar-tile-content">
            <div className="availability-indicator full">
              <div className="availability-badge">
                <span className="availability-count">7</span>
              </div>
            </div>
          </div>
        )
      }
      return null
    }
    
    const availabilityRatio = dayInfo.availableSlots / dayInfo.totalSlots
    
    return (
      <div className="calendar-tile-content">
        {dayInfo.availableSlots > 0 ? (
          <div className={`availability-indicator ${
            availabilityRatio === 1 ? 'full' : 
            availabilityRatio > 0.5 ? 'medium' : 'low'
          }`}>
            <div className="availability-badge">
              <span className="availability-count">{dayInfo.availableSlots}</span>
            </div>
          </div>
        ) : (
          <div className="availability-indicator booked">
            <div className="availability-badge booked-badge">
              <span className="availability-count">0</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleDateClick = (value: Date | Date[] | null) => {
    if (!value || Array.isArray(value)) return
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Create a new Date object instead of mutating the original
    const selectedDate = new Date(value)
    selectedDate.setHours(0, 0, 0, 0)
    
    // Don't allow selecting past dates
    if (selectedDate < today) return
    
    // Allow clicking on any future date - backend will generate availability dynamically
    // The booking modal will handle availability validation and show appropriate slots
    onDateSelect?.(value)
  }

  if (loading) {
    return (
      <div className="monastery-calendar">
        <Card className="monastery-calendar-card">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl md:text-3xl text-monastery-800 mb-3">
              🏛️ Dhane Events Calendar
            </CardTitle>
            <p className="text-monastery-600 text-sm md:text-base">
              Loading available dates for your Dhane offering ceremony...
            </p>
          </CardHeader>
          <CardContent className="px-4 md:px-8">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">📅</div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-monastery-800 mb-2">Loading Calendar</p>
                <p className="text-sm text-monastery-600">
                  Fetching availability for upcoming ceremonies...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="monastery-calendar">
      <Card className="monastery-calendar-card">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl md:text-3xl text-monastery-800 mb-3">
            🏛️ Dhane Events Calendar
          </CardTitle>
          <p className="text-monastery-600 text-sm md:text-base max-w-2xl mx-auto">
            Select a date to book your Dhane offering ceremony. Available dates are highlighted with status indicators.
          </p>
        </CardHeader>
        <CardContent className="px-4 md:px-8">
          <div className="calendar-wrapper mb-8">
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              tileClassName={tileClassName}
              tileContent={tileContent}
              minDate={new Date()}
              maxDate={new Date(new Date().getFullYear() + 1, 11, 31)} // End of next year (Dec 31)
              className="monastery-calendar-widget"
              locale="en-US"
              showNavigation={true}
              showNeighboringMonth={false}
              prev2Label={null}
              next2Label={null}
              prevLabel="‹"
              nextLabel="›"
              tileDisabled={({ date }) => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                
                // Create a new Date object instead of mutating the original
                const dateComparison = new Date(date)
                dateComparison.setHours(0, 0, 0, 0)
                
                // Only disable past dates - let all future dates be clickable
                // The handleDateClick function will handle availability checking
                return dateComparison < today
              }}
              formatShortWeekday={(locale, date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                return days[date.getDay()]
              }}
            />
          </div>
          
          <div className="calendar-legend">
            <h4 className="text-base font-semibold text-monastery-800 mb-4 text-center">
              Availability Legend
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 max-w-5xl mx-auto">
              <div className="flex items-center gap-3 p-3 bg-success-50 rounded-lg border border-success-200">
                <div className="availability-dot bg-success-500 w-4 h-4"></div>
                <div>
                  <div className="text-sm font-medium text-success-800">Available</div>
                  <div className="text-xs text-success-600">Full capacity</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-warning-50 rounded-lg border border-warning-200">
                <div className="availability-dot bg-warning-500 w-4 h-4"></div>
                <div>
                  <div className="text-sm font-medium text-warning-800">Limited</div>
                  <div className="text-xs text-warning-600">Few slots left</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-warning-100 rounded-lg border border-warning-300">
                <div className="availability-dot bg-warning-600 w-4 h-4 animate-pulse"></div>
                <div>
                  <div className="text-sm font-medium text-warning-800">Being Booked</div>
                  <div className="text-xs text-warning-600">Temporarily reserved</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-error-50 rounded-lg border border-error-200">
                <div className="availability-dot bg-error-500 w-4 h-4"></div>
                <div>
                  <div className="text-sm font-medium text-error-800">Booked</div>
                  <div className="text-xs text-error-600">No availability</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="availability-dot bg-purple-500 w-4 h-4"></div>
                <div>
                  <div className="text-sm font-medium text-purple-800">Yearly Reserved</div>
                  <div className="text-xs text-purple-600">Reserved annually</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg border border-secondary-200">
                <div className="availability-dot bg-secondary-400 w-4 h-4"></div>
                <div>
                  <div className="text-sm font-medium text-secondary-700">Unavailable</div>
                  <div className="text-xs text-secondary-500">Past/Inactive</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}