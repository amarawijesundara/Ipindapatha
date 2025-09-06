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
  refreshKey?: number
}

interface DayAvailability {
  date: string
  hasAvailability: boolean
  totalSlots: number
  availableSlots: number
}

// Default availability configuration
const DEFAULT_WEEKDAY_SLOTS = 7
const DEFAULT_WEEKEND_SLOTS = 5
const API_LIMIT = 1000

export default function MonasteryCalendar({ onDateSelect, selectedDate, refreshKey }: MonasteryCalendarProps) {
  const { user, loading: authLoading } = useAuth()
  const [availability, setAvailability] = useState<BookingAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [dayAvailability, setDayAvailability] = useState<Map<string, DayAvailability>>(new Map())
  
  // Calendar navigation state
  const [viewDate, setViewDate] = useState<Date>(new Date()) // Currently viewed month/year
  const [dataCache, setDataCache] = useState<Map<string, BookingAvailability[]>>(new Map()) // Cache for loaded months

  // Calculate date range for the viewed month (3-month window for better UX)
  const getDateRange = (viewDate: Date) => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    
    // Get start of previous month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    // Get end of next month
    const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0]
    
    return { startDate, endDate, cacheKey: `${year}-${month}` }
  }

  useEffect(() => {
    // Fetch availability when auth status changes or view date changes
    if (!authLoading) {
      fetchAvailability(viewDate)
    }
  }, [authLoading, viewDate])

  // Handle manual refresh requests
  useEffect(() => {
    if (!authLoading && refreshKey && refreshKey > 0) {
      // Clear cache and refetch when refresh is requested
      setDataCache(new Map())
      fetchAvailability(viewDate)
    }
  }, [refreshKey, authLoading])

  const fetchAvailability = async (targetDate: Date = new Date()) => {
    try {
      const { startDate, endDate, cacheKey } = getDateRange(targetDate)
      
      // Check if we already have this data cached
      if (dataCache.has(cacheKey)) {
        const cachedData = dataCache.get(cacheKey)!
        setAvailability(cachedData)
        processAvailabilityData(cachedData)
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/bookings/availability?start_date=${startDate}&end_date=${endDate}&limit=${API_LIMIT}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const availabilityData = data.availability || []
        
        // Cache the data for this month
        setDataCache(prev => new Map(prev).set(cacheKey, availabilityData))
        
        setAvailability(availabilityData)
        processAvailabilityData(availabilityData)
      } else {
        console.error('Failed to fetch availability:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const processAvailabilityData = (availabilityData: BookingAvailability[]) => {
    const dayMap = new Map<string, DayAvailability>()
    
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
    
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Create a new Date object instead of mutating the original
    const dateComparison = new Date(date)
    dateComparison.setHours(0, 0, 0, 0)
    
    const classes = []
    const dateStr = formatDate(date)
    
    // Past dates - highest priority
    if (dateComparison < today) {
      classes.push('past-date')
      return classes.join(' ')
    }
    
    // Selected date - add but don't return early
    if (selectedDate && dateStr === formatDate(selectedDate)) {
      classes.push('selected-date')
    }
    
    // Get slots for this specific date with robust date matching
    const daySlots = availability.filter(slot => {
      try {
        // Handle different date formats more robustly
        let slotDateStr: string
        
        if (!slot || !slot.date) {
          return false
        }
        
        if (slot.date instanceof Date) {
          slotDateStr = slot.date.toISOString().split('T')[0]
        } else if (typeof slot.date === 'string') {
          // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:MM:SS.sssZ' formats
          if (slot.date.includes('T')) {
            slotDateStr = slot.date.split('T')[0]
          } else {
            slotDateStr = slot.date
          }
        } else {
          // Try to parse as date
          const parsedDate = new Date(slot.date)
          if (isNaN(parsedDate.getTime())) {
            return false
          }
          slotDateStr = parsedDate.toISOString().split('T')[0]
        }
        
        // Ensure both strings are properly formatted
        const normalizedSlotDate = slotDateStr.trim()
        const normalizedDateStr = dateStr.trim()
        
        return normalizedSlotDate === normalizedDateStr
      } catch (error) {
        console.warn('Error parsing slot date:', slot.date, error)
        return false
      }
    })
    
    
    // If we have slot data, use detailed status analysis
    if (daySlots.length > 0) {
      // Count different slot types more accurately
      const recurringBookedSlots = daySlots.filter(slot => slot.status === 'recurring_booked' || slot.source === 'recurring_blocked')
      const fullyBookedSlots = daySlots.filter(slot => slot.status === 'fully_booked')
      const partiallyBookedSlots = daySlots.filter(slot => slot.status === 'partially_booked' || slot.isTemporarilyReserved)
      const availableSlots = daySlots.filter(slot => slot.is_available && !slot.isTemporarilyReserved)
      const partiallyAvailableSlots = daySlots.filter(slot => slot.status === 'partially_available')
      
      // Count actual bookings for this date to determine if it's partially booked
      const slotsWithBookings = daySlots.filter(slot => {
        const bookingCount = slot.booking_count || 0
        const maxBookings = slot.max_bookings || 1
        return bookingCount > 0 && bookingCount < maxBookings
      })
      
      const slotsFullyBooked = daySlots.filter(slot => {
        const bookingCount = slot.booking_count || 0
        const maxBookings = slot.max_bookings || 1
        return bookingCount >= maxBookings
      })
      
      
      // Simplified priority-based classification
      if (recurringBookedSlots.length > 0 && availableSlots.length === 0) {
        // All slots are blocked by recurring bookings
        classes.push('recurring-booked')
      } else if (slotsFullyBooked.length === daySlots.length) {
        // All slots are fully booked
        classes.push('fully-booked')
      } else if (slotsWithBookings.length > 0 || slotsFullyBooked.length > 0) {
        // Some slots have bookings (partially booked day)
        classes.push('partially-booked')
      } else if (partiallyBookedSlots.length > 0) {
        // Temporarily reserved slots
        classes.push('partially-booked')
      } else if (availableSlots.length === daySlots.length) {
        // All slots are available
        classes.push('fully-available')
      } else {
        // Mixed state, default to partially available
        classes.push('partially-available')
      }
    } else {
      // No slot data found for this date - use fallback availability
      
      // Use default availability logic - don't assume unavailable just because no specific data exists
      const dayOfWeek = date.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekday - assume available
        classes.push('fully-available')
      } else {
        // Weekend - assume available (same as weekday)
        classes.push('fully-available')
      }
    }
    
    return classes.join(' ')
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateComparison = new Date(date)
    dateComparison.setHours(0, 0, 0, 0)
    
    // Don't show content for past dates
    if (dateComparison < today) return null
    
    const dateStr = formatDate(date)
    const daySlots = availability.filter(slot => {
      const slotDate = new Date(slot.date).toISOString().split('T')[0]
      return slotDate === dateStr
    })
    
    let availableCount = 0
    let totalSlots = 0
    
    if (daySlots.length > 0) {
      // Use actual slot data
      totalSlots = daySlots.length
      availableCount = daySlots.filter(slot => slot.is_available && !slot.isTemporarilyReserved).length
    } else {
      // Fallback to legacy dayInfo or default values
      const dayInfo = getDayAvailability(date)
      if (dayInfo) {
        availableCount = dayInfo.availableSlots
        totalSlots = dayInfo.totalSlots
      } else {
        // Default for future dates with no data
        const dayOfWeek = date.getDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          availableCount = totalSlots = DEFAULT_WEEKDAY_SLOTS
        } else {
          availableCount = totalSlots = DEFAULT_WEEKEND_SLOTS
        }
      }
    }
    
    // Don't show badge if no slots
    if (totalSlots === 0) return null
    
    const availabilityRatio = totalSlots > 0 ? availableCount / totalSlots : 0
    
    return (
      <div className="calendar-tile-content">
        <div className={`availability-indicator ${
          availableCount === 0 ? 'booked' :
          availabilityRatio === 1 ? 'full' : 
          availabilityRatio > 0.5 ? 'medium' : 'low'
        }`}>
          <div className={`availability-badge ${availableCount === 0 ? 'booked-badge' : ''}`}>
            <span className="availability-count">{availableCount}</span>
          </div>
        </div>
      </div>
    )
  }

  // Navigation functions
  const navigateToMonth = (direction: 'prev' | 'next') => {
    setViewDate(prevDate => {
      const newDate = new Date(prevDate)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateToToday = () => {
    setViewDate(new Date())
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

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      setViewDate(activeStartDate)
    }
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
          {/* Custom Navigation Controls */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-monastery-50 to-lotus-100 rounded-xl">
            <button 
              onClick={() => navigateToMonth('prev')}
              className="flex items-center gap-2 px-4 py-2 bg-monastery-100 hover:bg-monastery-200 text-monastery-800 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-lg">‹</span>
              <span className="hidden sm:inline">Previous</span>
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-monastery-800">
                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={navigateToToday}
                className="text-sm text-primary-600 hover:text-primary-700 underline mt-1"
              >
                Today
              </button>
            </div>
            
            <button 
              onClick={() => navigateToMonth('next')}
              className="flex items-center gap-2 px-4 py-2 bg-monastery-100 hover:bg-monastery-200 text-monastery-800 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="text-lg">›</span>
            </button>
          </div>

          <div className="calendar-wrapper mb-8">
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              activeStartDate={viewDate}
              onActiveStartDateChange={handleActiveStartDateChange}
              tileClassName={tileClassName}
              tileContent={tileContent}
              className="monastery-calendar-widget"
              locale="en-US"
              showNavigation={false} // We use custom navigation
              showNeighboringMonth={true}
              prev2Label={null}
              next2Label={null}
              prevLabel={null}
              nextLabel={null}
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
              <div className="flex items-center gap-3 p-3 bg-amber-100 rounded-lg border border-orange-300">
                <div className="availability-dot bg-orange-500 w-4 h-4"></div>
                <div>
                  <div className="text-sm font-medium text-orange-800">Partially Booked</div>
                  <div className="text-xs text-orange-600">Some slots taken</div>
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