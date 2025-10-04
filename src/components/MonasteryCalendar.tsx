'use client'

import React, { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import { Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@/components/ui'
import { MealAvailability } from '@/types'
import { useAuth } from '@/components/AuthContext'
import { formatDateForDatabase, normalizeToLocalMidnight, areSameDay } from '@/lib/utils/dateValidation'
import 'react-calendar/dist/Calendar.css'

// Client-side tenant context extraction utility
const extractClientTenantContext = () => {
  if (typeof window === 'undefined') return null

  const hostname = window.location.hostname

  // Extract subdomain from hostname
  const parts = hostname.split('.')

  // Handle localhost development URLs (e.g., niwandakimu.localhost)
  if (parts.length === 2 && parts[1] === 'localhost') {
    const subdomain = parts[0]
    // Filter out reserved subdomains
    if (['www', 'api', 'admin'].includes(subdomain)) {
      return null
    }
    console.log('Calendar: Extracted localhost subdomain:', subdomain)
    return subdomain
  }

  // Handle production URLs (e.g., niwandakimu.example.com)
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // Filter out reserved subdomains
    if (['www', 'api', 'admin'].includes(subdomain)) {
      return null
    }
    console.log('Calendar: Extracted production subdomain:', subdomain)
    return subdomain
  }

  // No subdomain found (just "localhost" or "domain.com")
  console.log('Calendar: No subdomain found for hostname:', hostname)
  return null
}

interface MonasteryCalendarProps {
  onDateSelect?: (date: Date) => void
  selectedDate?: Date
  refreshKey?: number
}

interface DayAvailability {
  date: string
  totalMeals: number
  availableMeals: number
  mealStatuses: Array<{
    mealPeriod: string
    isAvailable: boolean
    isBooked: boolean
    bookedBy?: { username: string; email: string }
  }>
}

// Meal period configuration
const TOTAL_MEAL_PERIODS = 4 // morning_meal, morning_tea, lunch_meal, evening_tea
const API_LIMIT = 1000

export default function MonasteryCalendar({ onDateSelect, selectedDate, refreshKey }: MonasteryCalendarProps) {
  const { user, loading: authLoading } = useAuth()
  const [availability, setAvailability] = useState<MealAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [dayAvailability, setDayAvailability] = useState<Map<string, DayAvailability>>(new Map())

  // Calendar navigation state
  const [viewDate, setViewDate] = useState<Date>(new Date()) // Currently viewed month/year
  const [dataCache, setDataCache] = useState<Map<string, MealAvailability[]>>(new Map()) // Cache for loaded months

  // Track current tenant to detect changes
  const [currentTenant, setCurrentTenant] = useState<string | null>(null)

  // Calculate date range for the viewed month (3-month window for better UX)
  const getDateRange = (viewDate: Date) => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    // Get start of previous month
    const startDate = formatDateForDatabase(new Date(year, month - 1, 1))
    // Get end of next month
    const endDate = formatDateForDatabase(new Date(year, month + 2, 0))

    // Include tenant context in cache key to prevent cross-tenant cache pollution
    const subdomain = extractClientTenantContext()
    const tenantKey = subdomain || 'default'

    return { startDate, endDate, cacheKey: `${year}-${month}-${tenantKey}` }
  }

  useEffect(() => {
    // Fetch availability when auth status changes or view date changes
    if (!authLoading) {
      // Force fresh data when auth status changes to ensure correct tenant data
      fetchAvailability(viewDate, true)
    }
  }, [authLoading, viewDate])

  // Handle manual refresh requests
  useEffect(() => {
    if (!authLoading && refreshKey && refreshKey > 0) {
      // Clear cache and refetch when refresh is requested
      console.log('Calendar: Manual refresh requested, clearing all cache')
      setDataCache(new Map())
      setDayAvailability(new Map()) // Also clear processed data
      fetchAvailability(viewDate, true) // Force fresh data
    }
  }, [refreshKey, authLoading])

  // Initialize tenant on component mount and force cache clear
  useEffect(() => {
    const initialTenant = extractClientTenantContext()
    console.log('Calendar: Initial tenant detected:', initialTenant || 'default')

    // Force clear all cache on component mount to ensure fresh start
    setDataCache(new Map())
    setDayAvailability(new Map())
    setAvailability([])
    console.log('Calendar: Cleared all cache and data on mount for fresh start')

    setCurrentTenant(initialTenant)
  }, [])

  // Detect tenant changes and clear cache when switching subdomains
  useEffect(() => {
    const currentSubdomain = extractClientTenantContext()

    if (currentTenant !== null && currentTenant !== currentSubdomain) {
      // Tenant context has changed - clear cache and refetch
      console.log('Calendar: Tenant changed from', currentTenant, 'to', currentSubdomain, '- clearing all cache')
      setDataCache(new Map())
      setDayAvailability(new Map()) // Also clear processed data
      setAvailability([]) // Clear raw availability data
      setCurrentTenant(currentSubdomain)

      if (!authLoading) {
        fetchAvailability(viewDate, true) // Force fresh data after tenant change
      }
    }
  }, [authLoading, viewDate]) // Removed currentTenant from dependencies to prevent infinite loop

  // Add URL change detection for browser navigation between subdomains
  useEffect(() => {
    const handleFocus = () => {
      // When window regains focus, check if URL changed (covers browser navigation)
      const currentSubdomain = extractClientTenantContext()
      if (currentTenant !== currentSubdomain) {
        console.log('URL changed detected - tenant changed from', currentTenant, 'to', currentSubdomain)
        setDataCache(new Map())
        setCurrentTenant(currentSubdomain)
        if (!authLoading) {
          fetchAvailability(viewDate, true) // Force fresh data after URL change
        }
      }
    }

    const handleVisibilityChange = () => {
      // When page becomes visible, check for URL changes
      if (!document.hidden) {
        handleFocus()
      }
    }

    // Listen for window focus and visibility changes
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentTenant, authLoading, viewDate])

  const fetchAvailability = async (targetDate: Date = new Date(), forceFresh: boolean = false) => {
    try {
      const { startDate, endDate, cacheKey } = getDateRange(targetDate)

      // Check if we already have this data cached (unless forcing fresh data)
      if (!forceFresh && dataCache.has(cacheKey)) {
        const cachedData = dataCache.get(cacheKey)!
        console.log('Calendar: Using cached data for', cacheKey)
        setAvailability(cachedData)
        processAvailabilityData(cachedData)
        setLoading(false)
        return
      }

      console.log('Calendar: Fetching fresh data for', cacheKey, forceFresh ? '(forced refresh)' : '(no cache)')

      // Extract tenant context from current URL
      const subdomain = extractClientTenantContext()

      // Debug logging to verify tenant resolution
      console.log('Calendar: Fetching availability for subdomain:', subdomain || 'none (default tenant)')

      // Build API URL with tenant context and aggressive cache busting
      let apiUrl = `/api/bookings/availability?start_date=${startDate}&end_date=${endDate}&limit=${API_LIMIT}`

      // Always add cache busting parameters to ensure fresh data
      const timestamp = Date.now()
      apiUrl += `&_t=${timestamp}&_r=${Math.random()}`

      if (subdomain) {
        apiUrl += `&tenant=${subdomain}`
      }

      // For super admin users, we can optionally specify tenant via query param
      // For regular users, the API will use their JWT token's tenant context
      // For guest users on subdomains, we include the subdomain in headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // If we have a subdomain context, pass it to the API
      if (subdomain) {
        headers['x-tenant-subdomain'] = subdomain
        console.log('Calendar: Sending x-tenant-subdomain header:', subdomain)
      }

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        const availabilityData = data.availability || []

        // Enhanced debug logging
        console.log('Calendar: API Response received')
        console.log('Calendar: Availability data count:', availabilityData.length)
        console.log('Calendar: First few items:', availabilityData.slice(0, 3))
        console.log('Calendar: Cache key:', cacheKey)
        console.log('Calendar: Current tenant context:', subdomain || 'default')
        console.log('Calendar: API URL used:', apiUrl)

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

  const processAvailabilityData = (availabilityData: MealAvailability[]) => {
    const dayMap = new Map<string, DayAvailability>()
    
    // Group meal periods by date
    availabilityData.forEach(meal => {
      // Ensure we get the date string correctly
      let dateStr: string
      if (typeof meal.date === 'string') {
        dateStr = meal.date.split('T')[0]
      } else {
        dateStr = formatDateForDatabase(new Date(meal.date))
      }

      const existing = dayMap.get(dateStr)

      const mealStatus = {
        mealPeriod: meal.mealPeriod,
        isAvailable: meal.isAvailable,
        isBooked: meal.isBooked,
        bookedBy: meal.bookedBy
      }

      if (existing) {
        existing.mealStatuses.push(mealStatus)
        existing.totalMeals = existing.mealStatuses.length
        existing.availableMeals = existing.mealStatuses.filter(m => m.isAvailable).length
      } else {
        dayMap.set(dateStr, {
          date: dateStr,
          totalMeals: 1,
          availableMeals: meal.isAvailable ? 1 : 0,
          mealStatuses: [mealStatus]
        })
      }
    })
    
    setDayAvailability(dayMap)
  }

  const formatDate = (date: Date): string => {
    return formatDateForDatabase(date)
  }

  const getDayAvailability = (date: Date): DayAvailability | null => {
    const dateStr = formatDate(date)
    const availability = dayAvailability.get(dateStr)
    
    return availability || null
  }

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''

    // Use timezone-safe date normalization
    const today = normalizeToLocalMidnight(new Date())
    const normalizedDate = normalizeToLocalMidnight(date)

    const classes = []
    // Use the normalized date for formatting to ensure consistency
    const dateStr = formatDate(normalizedDate)

    // Past dates - highest priority, but use safer comparison
    // Add a small buffer to prevent edge cases near midnight
    const todayTime = today.getTime()
    const dateTime = normalizedDate.getTime()

    // Debug logging for date comparison issues
    if (dateStr === '2024-09-30' || dateStr === '2024-10-01') {
      console.log(`Calendar tile debug - ${dateStr}:`, {
        originalDate: date,
        normalizedDate: normalizedDate,
        today: today,
        isPast: normalizedDate < today,
        isPastNew: dateTime < todayTime,
        dateStr: dateStr,
        dateTime: dateTime,
        todayTime: todayTime,
        timeDiff: dateTime - todayTime
      })
    }

    if (dateTime < todayTime) {
      classes.push('past-date')
      return classes.join(' ')
    }

    // Selected date - add but don't return early
    if (selectedDate) {
      const normalizedSelectedDate = normalizeToLocalMidnight(selectedDate)
      if (areSameDay(normalizedDate, normalizedSelectedDate)) {
        classes.push('selected-date')
      }
    }
    
    // Get meal periods for this specific date
    const dayMeals = availability.filter(meal => {
      try {
        let mealDateStr: string

        if (!meal || !meal.date) {
          return false
        }

        if (typeof meal.date === 'string') {
          mealDateStr = meal.date.split('T')[0]
        } else {
          mealDateStr = formatDateForDatabase(new Date(meal.date))
        }

        return mealDateStr.trim() === dateStr.trim()
      } catch (error) {
        console.warn('Error parsing meal date:', meal.date, error)
        return false
      }
    })
    
    
    // If we have meal data, use meal-based status analysis
    if (dayMeals.length > 0) {
      // Count different meal statuses
      const recurringBookedMeals = dayMeals.filter(meal => meal.status === 'recurring_booked')
      const bookedMeals = dayMeals.filter(meal => meal.isBooked || meal.status === 'booked')
      const availableMeals = dayMeals.filter(meal => meal.isAvailable)
      const disabledMeals = dayMeals.filter(meal => meal.status === 'disabled')

      // Simple classification based on meal availability
      if (recurringBookedMeals.length === dayMeals.length) {
        // ALL meals are blocked by recurring bookings
        classes.push('recurring-booked')
      } else if (availableMeals.length === 0) {
        // No available meals
        classes.push('fully-booked')
      } else if (availableMeals.length === dayMeals.length) {
        // All meals are available
        classes.push('fully-available')
      } else {
        // Mixed state: some available, some booked
        classes.push('partially-booked')
      }
    } else {
      // No meal data found for this date - assume all meals available
      // The API generates meal availability dynamically, so if no data exists,
      // it means the date hasn't been specifically configured yet
      classes.push('fully-available')
    }
    
    return classes.join(' ')
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null

    // Use timezone-safe date normalization consistent with tileClassName
    const today = normalizeToLocalMidnight(new Date())
    const normalizedDate = normalizeToLocalMidnight(date)

    // Don't show content for past dates - use same logic as tileClassName
    const todayTime = today.getTime()
    const dateTime = normalizedDate.getTime()

    if (dateTime < todayTime) return null

    const dateStr = formatDate(normalizedDate)
    const dayMeals = availability.filter(meal => {
      const mealDateStr = typeof meal.date === 'string' ? meal.date.split('T')[0] : formatDateForDatabase(new Date(meal.date))
      return mealDateStr === dateStr
    })

    let availableCount = 0
    let totalMeals = TOTAL_MEAL_PERIODS

    if (dayMeals.length > 0) {
      // Use actual meal data
      totalMeals = Math.max(dayMeals.length, TOTAL_MEAL_PERIODS) // At least 4 meals expected
      availableCount = dayMeals.filter(meal => meal.isAvailable).length
    } else {
      // Fallback: assume all meals available if no specific data
      const dayInfo = getDayAvailability(date)
      if (dayInfo) {
        availableCount = dayInfo.availableMeals
        totalMeals = dayInfo.totalMeals
      } else {
        // Default: all 4 meal periods available
        availableCount = totalMeals = TOTAL_MEAL_PERIODS
      }
    }

    // Don't show badge if no meals
    if (totalMeals === 0) return null

    const availabilityRatio = totalMeals > 0 ? availableCount / totalMeals : 0
    
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

    // Use timezone-safe date normalization consistent with other functions
    const today = normalizeToLocalMidnight(new Date())
    const normalizedDate = normalizeToLocalMidnight(value)

    // Don't allow selecting past dates - use same logic as other functions
    const todayTime = today.getTime()
    const dateTime = normalizedDate.getTime()

    if (dateTime < todayTime) return

    // Pass the normalized date to ensure consistency with display logic
    // The booking modal will handle availability validation and show appropriate slots
    onDateSelect?.(normalizedDate)
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
          {/* Tenant indicator for debugging */}
          <div className="mt-3 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 inline-block">
            Viewing: {extractClientTenantContext() || 'Main'} tenant
          </div>
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
                // Use timezone-safe date normalization consistent with other functions
                const today = normalizeToLocalMidnight(new Date())
                const normalizedDate = normalizeToLocalMidnight(date)

                // Only disable past dates - use same logic as other functions
                const todayTime = today.getTime()
                const dateTime = normalizedDate.getTime()

                return dateTime < todayTime
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