'use client'

import React, { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import { Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@/components/ui'
import { BookingAvailability } from '@/types'
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
  const [availability, setAvailability] = useState<BookingAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [dayAvailability, setDayAvailability] = useState<Map<string, DayAvailability>>(new Map())

  useEffect(() => {
    fetchAvailability()
  }, [])

  const fetchAvailability = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/bookings/availability', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setAvailability(data.availability)
        processAvailabilityData(data.availability)
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
      const dateStr = slot.date.toString().split('T')[0]
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
    return dayAvailability.get(formatDate(date)) || null
  }

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const dayInfo = getDayAvailability(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    
    const classes = []
    
    // Past dates
    if (date < today) {
      classes.push('past-date')
    }
    
    // Availability status
    if (dayInfo) {
      if (dayInfo.availableSlots > 0) {
        if (dayInfo.availableSlots === dayInfo.totalSlots) {
          classes.push('fully-available')
        } else {
          classes.push('partially-available')
        }
      } else {
        classes.push('fully-booked')
      }
    }
    
    // Selected date
    if (selectedDate && formatDate(date) === formatDate(selectedDate)) {
      classes.push('selected-date')
    }
    
    return classes.join(' ')
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const dayInfo = getDayAvailability(date)
    
    if (!dayInfo) return null
    
    const availabilityRatio = dayInfo.availableSlots / dayInfo.totalSlots
    
    return (
      <div className="calendar-tile-content">
        {dayInfo.availableSlots > 0 ? (
          <div className={`availability-indicator ${
            availabilityRatio === 1 ? 'full' : 
            availabilityRatio > 0.5 ? 'medium' : 'low'
          }`}>
            <div className="availability-dot"></div>
          </div>
        ) : (
          <div className="availability-indicator booked">
            <div className="availability-dot"></div>
          </div>
        )}
      </div>
    )
  }

  const handleDateClick = (value: Date | Date[] | null) => {
    if (!value || Array.isArray(value)) return
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    value.setHours(0, 0, 0, 0)
    
    // Don't allow selecting past dates
    if (value < today) return
    
    const dayInfo = getDayAvailability(value)
    if (dayInfo?.availableSlots > 0) {
      onDateSelect?.(value)
    }
  }

  if (loading) {
    return (
      <Card className="monastery-calendar-card">
        <CardHeader>
          <CardTitle className="text-center text-monastery-800">
            Dhane Events Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loading size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="monastery-calendar">
      <Card className="monastery-calendar-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-monastery-800 mb-2">
            🏛️ Dhane Events Calendar
          </CardTitle>
          <p className="text-monastery-600 text-sm">
            Select a date to book your Dhane offering ceremony
          </p>
        </CardHeader>
        <CardContent>
          <div className="calendar-wrapper">
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              tileClassName={tileClassName}
              tileContent={tileContent}
              minDate={new Date()}
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 3 months ahead
              className="monastery-calendar-widget"
              locale="en-US"
              showNavigation={true}
              showNeighboringMonth={false}
              prev2Label={null}
              next2Label={null}
              prevLabel="‹"
              nextLabel="›"
            />
          </div>
          
          <div className="calendar-legend mt-6">
            <h4 className="text-sm font-semibold text-monastery-800 mb-3">Legend</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="availability-dot bg-success-500"></div>
                <span className="text-monastery-700">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="availability-dot bg-warning-500"></div>
                <span className="text-monastery-700">Limited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="availability-dot bg-error-500"></div>
                <span className="text-monastery-700">Fully Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="availability-dot bg-secondary-300"></div>
                <span className="text-monastery-700">Past/Unavailable</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}