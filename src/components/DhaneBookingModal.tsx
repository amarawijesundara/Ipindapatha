'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAuth } from '@/components/AuthContext'
import BookingDetailsView from '@/components/BookingDetailsView'
import UserSelector from '@/components/UserSelector'

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
  isMyReservation?: boolean
  reservationExpiresAt?: string
  reservationSessionId?: string
  status?: string
}

interface BookingFormData {
  name: string
  email: string
  phone: string
  eventNote: string
  offeringType: 'food_preparation' | 'monetary_donation'
  donationAmount: number
}

interface User {
  id: number
  username: string
  email: string
  phoneNumber?: string
  tenantId?: number
  role: string
}

export default function DhaneBookingModal({ selectedDate, onClose, onBookingComplete }: DhaneBookingModalProps) {
  const { user } = useAuth()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingSlots, setFetchingSlots] = useState(true)
  const [reservationTimer, setReservationTimer] = useState<number | null>(null)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substring(7))
  const [isRecurring, setIsRecurring] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    email: '',
    phone: '',
    eventNote: '',
    offeringType: 'food_preparation',
    donationAmount: 0
  })
  
  // Admin-specific state
  const isAdmin = user?.role === 'super_admin' || user?.role === 'tenant_admin'
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedTargetUser, setSelectedTargetUser] = useState<User | null>(null)
  const [adminOverride, setAdminOverride] = useState(false)

  // Calculate payment deadline (2 weeks before booking date)
  const calculatePaymentDeadline = (bookingDate: Date): Date => {
    const deadline = new Date(bookingDate)
    deadline.setDate(deadline.getDate() - 14) // 2 weeks before
    deadline.setHours(23, 59, 59, 999) // End of day
    return deadline
  }

  // Check if payment deadline has passed
  const isPaymentDeadlinePassed = (bookingDate: Date): boolean => {
    const deadline = calculatePaymentDeadline(bookingDate)
    return deadline < new Date()
  }

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots()
    }
  }, [selectedDate])

  // Check if all time slots are fully booked
  const hasAvailableSlots = timeSlots.some(slot => slot.available)
  const isFullyBooked = timeSlots.length > 0 && !hasAvailableSlots

  // Show booking details view for fully booked dates
  useEffect(() => {
    if (!fetchingSlots && isFullyBooked && !user) {
      setShowBookingDetails(true)
    } else {
      setShowBookingDetails(false)
    }
  }, [fetchingSlots, isFullyBooked, user])

  // Cleanup reservations when component unmounts or date changes
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      cleanupReservations()
    }
  }, [selectedDate])

  const handleModalClose = async () => {
    await cleanupReservations()
    onClose()
  }

  const handleContinueToSignIn = () => {
    // For guest users, allow proceeding to auth without form validation
    if (!user && selectedTimes.length > 0) {
      // Store booking data with minimal info - form completion can happen after auth
      localStorage.setItem('pendingBooking', JSON.stringify({
        ...formData, // Include any partial form data
        date: selectedDate?.toISOString().split('T')[0],
        times: selectedTimes,
        sessionId
      }))
      setShowAuthPrompt(true)
      return
    }
    
    // For authenticated users, use normal form submission
    if (user) {
      createBatchBooking()
    }
  }

  const fetchTimeSlots = async () => {
    if (!selectedDate) return
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(`/api/bookings/availability?date=${dateStr}&sessionId=${sessionId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const slots = data.availability.map((slot: any) => ({
          time: slot.timeSlot || slot.time_slot,
          available: slot.is_available,
          maxBookings: slot.max_bookings,
          isTemporarilyReserved: slot.isTemporarilyReserved,
          isMyReservation: slot.isMyReservation,
          reservationExpiresAt: slot.reservationExpiresAt,
          reservationSessionId: slot.reservationSessionId,
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

  const reserveSlotsTemporarily = async (timeSlots: string[]) => {
    try {
      const response = await fetch('/api/bookings/reserve-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate?.toISOString().split('T')[0],
          timeSlots, // Changed to array
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
      console.error('Failed to reserve slots:', error)
    }
    return false
  }

  const startCountdown = () => {
    const interval = setInterval(() => {
      setReservationTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          setSelectedTimes([])
          fetchTimeSlots() // Refresh availability
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleTimeSlotSelect = async (timeSlot: string) => {
    setValidationError(null) // Clear any existing errors when user selects a slot
    
    const isSelected = selectedTimes.includes(timeSlot)
    let newSelectedTimes: string[]
    
    if (isSelected) {
      // Remove from selection
      newSelectedTimes = selectedTimes.filter(time => time !== timeSlot)
    } else {
      // Add to selection
      newSelectedTimes = [...selectedTimes, timeSlot]
    }
    
    setSelectedTimes(newSelectedTimes)
    
    if (!user && newSelectedTimes.length > 0) {
      // For guests, reserve all selected slots temporarily
      const reserved = await reserveSlotsTemporarily(newSelectedTimes)
      if (!reserved) {
        setValidationError('Unable to reserve selected slots. Some may have been taken by other users.')
        setSelectedTimes([])
        fetchTimeSlots()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || selectedTimes.length === 0) return

    // Clear any existing validation errors
    setValidationError(null)
    
    // This form submit handler is for when users have filled out the form
    // The main "Continue to Sign In" button uses handleContinueToSignIn instead
    
    // Admin validation - must select a user
    if (isAdmin && !selectedUserId) {
      setValidationError('Please select a user to book for')
      return
    }

    // Validate payment deadline for monetary donations
    if (formData.offeringType === 'monetary_donation' && selectedDate && isPaymentDeadlinePassed(selectedDate)) {
      setValidationError('Payment deadline has passed for monetary donations. Please choose food preparation or select a different date.')
      return
    }

    // Validate donation amount
    if (formData.offeringType === 'monetary_donation' && (!formData.donationAmount || formData.donationAmount <= 0)) {
      setValidationError('Please enter a valid donation amount')
      return
    }

    if (!user) {
      // Guest user submitting with form data - validate required fields
      if (!formData.name || !formData.email) {
        setValidationError('Please fill in your name and email address')
        return
      }
      
      // Store complete form data and show auth prompt
      localStorage.setItem('pendingBooking', JSON.stringify({
        ...formData,
        date: selectedDate.toISOString().split('T')[0],
        times: selectedTimes,
        sessionId
      }))
      setShowAuthPrompt(true)
      return
    }

    // Authenticated user - proceed with batch booking
    await createBatchBooking()
  }

  const createBatchBooking = async () => {
    setLoading(true)

    try {
      const bookingPromises = selectedTimes.map(async (timeSlot) => {
        // Determine target user and booking data based on admin status
        const targetUserId = isAdmin && selectedUserId ? selectedUserId : user?.id
        
        const bookingData = {
          userId: targetUserId,
          tenantId: user?.tenant_id || 1,
          bookingDate: selectedDate?.toISOString().split('T')[0],
          bookingTime: timeSlot,
          eventNote: formData.eventNote || `${isRecurring ? 'Yearly ' : ''}Dhane offering ceremony - ${
            isAdmin && selectedTargetUser ? selectedTargetUser.username : 
            formData.name || user?.username
          } (${selectedTimes.length > 1 ? `${selectedTimes.indexOf(timeSlot) + 1} of ${selectedTimes.length}` : 'Single slot'})`,
          offeringType: formData.offeringType,
          donationAmount: formData.offeringType === 'monetary_donation' ? formData.donationAmount : undefined,
          guestName: isAdmin && selectedTargetUser ? selectedTargetUser.username : (!user ? formData.name : undefined),
          guestEmail: isAdmin && selectedTargetUser ? selectedTargetUser.email : (!user ? formData.email : undefined),
          guestPhone: isAdmin && selectedTargetUser ? selectedTargetUser.phoneNumber : (!user ? formData.phone : undefined),
          sessionId,
          isRecurring,
          overrideCapacity: adminOverride
        }

        // Use admin endpoint if user is admin
        const endpoint = isAdmin ? '/api/admin/bookings' : '/api/bookings'
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bookingData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Failed to book ${timeSlot}: ${errorData.message}`)
        }

        return await response.json()
      })

      // Execute all bookings
      const results = await Promise.allSettled(bookingPromises)
      
      // Check for failures
      const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
      const successes = results.filter(result => result.status === 'fulfilled').length
      
      if (failures.length > 0 && successes === 0) {
        // All bookings failed
        setValidationError(`Failed to create any bookings: ${failures[0].reason.message}`)
      } else if (failures.length > 0) {
        // Some bookings failed
        setValidationError(`Created ${successes} bookings successfully, but ${failures.length} failed. Please check your bookings and try again for the failed slots.`)
        // Still close modal on partial success
        setTimeout(() => {
          onBookingComplete()
          onClose()
        }, 3000)
      } else {
        // All bookings succeeded
        // Release temporary reservations
        if (!user) {
          await fetch('/api/bookings/reserve-temp', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: selectedDate?.toISOString().split('T')[0],
              timeSlots: selectedTimes,
              sessionId
            })
          })
        }
        
        localStorage.removeItem('pendingBooking')
        onBookingComplete()
        onClose()
      }
    } catch (error) {
      console.error('Failed to create bookings:', error)
      setValidationError('Failed to create bookings. Please try again.')
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
      times: selectedTimes, // Updated to array
      sessionId
    }))
    
    // Redirect to auth page
    window.location.href = `/${type}?redirect=/`
  }

  const handleSelectAllAvailable = async () => {
    const availableSlots = timeSlots.filter(slot => slot.available).map(slot => slot.time)
    setSelectedTimes(availableSlots)
    
    if (!user && availableSlots.length > 0) {
      const reserved = await reserveSlotsTemporarily(availableSlots)
      if (!reserved) {
        setValidationError('Unable to reserve all available slots. Some may have been taken by other users.')
        setSelectedTimes([])
        fetchTimeSlots()
      }
    }
  }

  const handleClearSelection = () => {
    setSelectedTimes([])
    setValidationError(null)
  }

  const cleanupReservations = async () => {
    // Clean up any temporary reservations when modal closes
    if (selectedTimes.length > 0) {
      try {
        await fetch('/api/bookings/reserve-temp', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate?.toISOString().split('T')[0],
            timeSlots: selectedTimes,
            sessionId
          })
        })
      } catch (error) {
        console.error('Failed to cleanup reservations:', error)
      }
    }
  }

  if (!selectedDate) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[95vh] flex flex-col">
        <CardHeader className="text-center border-b border-monastery-100">
          <div className="text-3xl mb-2">🙏</div>
          <CardTitle className="text-monastery-800">
            Book Dhane Offering
          </CardTitle>
          <p className="text-sm text-monastery-600">
            {formatDate(selectedDate)}
          </p>
        </CardHeader>
        
        <CardContent className="p-6 flex-1 overflow-y-auto">
          {fetchingSlots ? (
            <div className="text-center py-8">
              <div className="text-monastery-600">Loading available times...</div>
            </div>
          ) : showBookingDetails ? (
            <BookingDetailsView
              selectedDate={selectedDate!}
              onClose={handleModalClose}
              onSelectDifferentDate={handleModalClose}
            />
          ) : showAuthPrompt ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-lg font-semibold text-monastery-800 mb-2">
                  Sign In to Complete Booking
                </h3>
                <p className="text-sm text-monastery-600 mb-4">
                  Your {selectedTimes.length} slot{selectedTimes.length > 1 ? 's are' : ' is'} temporarily reserved for {reservationTimer ? formatTimer(reservationTimer) : '15:00'}
                </p>
                <div className="bg-lotus-100 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-monastery-800 mb-2">Your Booking Details</h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {formatDate(selectedDate!)}</div>
                    <div><strong>Time{selectedTimes.length > 1 ? 's' : ''}:</strong> {selectedTimes.sort().map(formatTime).join(', ')}</div>
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
                  onClick={handleModalClose}
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Validation Error Display */}
              {validationError && (
                <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-error-700">Booking Error</p>
                      <p className="text-sm text-error-600 mt-1">{validationError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValidationError(null)}
                      className="flex-shrink-0 ml-2 text-error-400 hover:text-error-600"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Reservation Timer for Guests */}
              {!user && selectedTimes.length > 0 && reservationTimer && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-warning-600">⏱️</div>
                    <div className="text-sm">
                      <span className="font-medium text-warning-800">{selectedTimes.length} slot{selectedTimes.length > 1 ? 's' : ''} reserved for:</span>
                      <span className="ml-2 font-mono text-warning-700">{formatTimer(reservationTimer)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Admin Controls */}
              {isAdmin && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 flex items-center">
                    👑 Admin Booking Controls
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Book for User *
                    </label>
                    <UserSelector
                      selectedUserId={selectedUserId}
                      onUserSelect={(userId, user) => {
                        setSelectedUserId(userId)
                        setSelectedTargetUser(user)
                      }}
                      placeholder="Select user to book for..."
                      allowGuest={false}
                    />
                    {!selectedUserId && (
                      <p className="text-xs text-red-600 mt-1">
                        Please select a user to book for
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="adminOverride"
                      checked={adminOverride}
                      onChange={(e) => setAdminOverride(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="adminOverride" className="text-sm text-blue-800">
                      Override capacity restrictions
                    </label>
                  </div>
                  
                  {adminOverride && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ Admin override will bypass normal booking restrictions and capacity limits
                    </div>
                  )}
                </div>
              )}

              {/* Guest Information Form */}
              {!user && !isAdmin && (
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
              
              {/* Offering Type Selection */}
              <div className="space-y-4">
                <h4 className="font-medium text-monastery-800">Offering Type</h4>
                <div className="space-y-3">
                  {/* Food Preparation Option */}
                  <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border border-monastery-200 hover:bg-monastery-50 transition-colors">
                    <input
                      type="radio"
                      name="offeringType"
                      value="food_preparation"
                      checked={formData.offeringType === 'food_preparation'}
                      onChange={(e) => setFormData(prev => ({ ...prev, offeringType: e.target.value as 'food_preparation' | 'monetary_donation' }))}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🍽️</span>
                        <span className="font-medium text-monastery-800">Prepare Food Personally</span>
                      </div>
                      <p className="text-sm text-monastery-600 mt-1">
                        I will personally prepare and bring food offerings for the ceremony (traditional approach)
                      </p>
                    </div>
                  </label>

                  {/* Monetary Donation Option */}
                  <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border border-monastery-200 hover:bg-monastery-50 transition-colors">
                    <input
                      type="radio"
                      name="offeringType"
                      value="monetary_donation"
                      checked={formData.offeringType === 'monetary_donation'}
                      onChange={(e) => setFormData(prev => ({ ...prev, offeringType: e.target.value as 'food_preparation' | 'monetary_donation' }))}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">💝</span>
                        <span className="font-medium text-monastery-800">Make Monetary Donation</span>
                      </div>
                      <p className="text-sm text-monastery-600 mt-1">
                        I will make a monetary donation for the monastery to arrange the offerings
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Donation Amount Selection */}
              {formData.offeringType === 'monetary_donation' && selectedDate && (
                <div className="space-y-4 p-4 bg-lotus-50 rounded-lg border border-monastery-200">
                  <h5 className="font-medium text-monastery-800">Donation Details</h5>
                  
                  {/* Payment Deadline Warning */}
                  {selectedDate && (
                    <div className={`p-3 rounded-lg border ${
                      isPaymentDeadlinePassed(selectedDate) 
                        ? 'bg-error-50 border-error-200'
                        : 'bg-warning-50 border-warning-200'
                    }`}>
                      <div className="flex items-start space-x-2">
                        <span className="text-lg">⏰</span>
                        <div>
                          <p className={`font-medium ${
                            isPaymentDeadlinePassed(selectedDate) 
                              ? 'text-error-800'
                              : 'text-warning-800'
                          }`}>
                            Payment Deadline: {calculatePaymentDeadline(selectedDate).toLocaleDateString()}
                          </p>
                          <p className={`text-sm mt-1 ${
                            isPaymentDeadlinePassed(selectedDate) 
                              ? 'text-error-600'
                              : 'text-warning-600'
                          }`}>
                            {isPaymentDeadlinePassed(selectedDate)
                              ? 'Payment deadline has passed. Please choose food preparation or select a different date.'
                              : 'Payment must be made at least 2 weeks before the ceremony date.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Donation Amount */}
                  {!isPaymentDeadlinePassed(selectedDate!) && (
                    <div>
                      <label className="block text-sm font-medium text-monastery-800 mb-2">
                        Donation Amount (USD)
                      </label>
                      
                      {/* Suggested Amounts */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[25, 50, 100].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, donationAmount: amount }))}
                            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                              formData.donationAmount === amount
                                ? 'bg-primary-500 text-white border-primary-500'
                                : 'bg-white text-monastery-700 border-monastery-200 hover:border-primary-300 hover:bg-primary-50'
                            }`}
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>

                      {/* Custom Amount */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-monastery-600">Custom:</span>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={formData.donationAmount || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, donationAmount: parseInt(e.target.value) || 0 }))}
                          placeholder="Enter amount"
                          className="w-32"
                        />
                      </div>

                      {formData.donationAmount > 0 && (
                        <div className="text-xs text-monastery-600 mt-2">
                          💡 After booking, you'll receive payment instructions and can upload your receipt for verification.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Time Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-monastery-800">
                    Select Time Slots ({selectedTimes.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAvailable}
                      disabled={timeSlots.filter(slot => slot.available).length === 0}
                      className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select All Available
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      disabled={selectedTimes.length === 0}
                      className="text-xs px-2 py-1 bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => {
                    const isPartiallyBooked = slot.status === 'partially_booked' || (slot.isTemporarilyReserved && !slot.isMyReservation)
                    const isMyReservation = slot.isMyReservation || slot.status === 'my_reservation'
                    const isSelected = selectedTimes.includes(slot.time)
                    
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available && !isSelected && !isMyReservation}
                        onClick={() => handleTimeSlotSelect(slot.time)}
                        className={`
                          relative p-3 rounded-lg text-sm font-medium border transition-colors
                          ${isSelected
                            ? 'bg-primary-500 text-white border-primary-500'
                            : isMyReservation
                              ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                              : slot.available
                                ? 'bg-white text-monastery-700 border-monastery-200 hover:border-primary-300 hover:bg-primary-50'
                                : isPartiallyBooked
                                  ? 'bg-warning-100 text-warning-800 border-warning-300'
                                  : 'bg-secondary-100 text-secondary-400 border-secondary-200 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span>{formatTime(slot.time)}</span>
                          {isSelected && (
                            <div className="text-xs bg-white bg-opacity-20 px-1 rounded">
                              ✓
                            </div>
                          )}
                        </div>
                        {isMyReservation && !isSelected && (
                          <div className="text-xs text-blue-600 mt-1">
                            My Reservation
                          </div>
                        )}
                        {isPartiallyBooked && !isSelected && !isMyReservation && (
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
                {timeSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-lg font-semibold text-monastery-800 mb-2">
                      No Time Slots Available
                    </h3>
                    <p className="text-monastery-600">
                      This date has no available time slots for booking.
                    </p>
                  </div>
                ) : !hasAvailableSlots && user && (
                  <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="text-error-600">🔒</div>
                      <div>
                        <p className="text-sm font-medium text-error-800">All Time Slots Booked</p>
                        <p className="text-xs text-error-600 mt-1">
                          All available time slots for this date are currently booked.
                        </p>
                      </div>
                    </div>
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
              {user && selectedTimes.length > 0 && (
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
                        Make this a yearly recurring booking for all selected time slots. These will be automatically reserved for you every year.
                        {isRecurring && selectedTimes.length > 0 && (
                          <strong className="block mt-1">
                            This will reserve {formatDate(selectedDate!)} at {selectedTimes.map(formatTime).join(', ')} annually.
                          </strong>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              {selectedTimes.length > 0 && (
                <div className="bg-lotus-100 rounded-lg p-4">
                  <h4 className="font-medium text-monastery-800 mb-2">
                    Booking Summary ({selectedTimes.length} time slot{selectedTimes.length > 1 ? 's' : ''})
                  </h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {formatDate(selectedDate)}</div>
                    <div><strong>Time{selectedTimes.length > 1 ? 's' : ''}:</strong>
                      <div className="mt-1 pl-4">
                        {selectedTimes.sort().map((time, index) => (
                          <div key={time} className="flex items-center gap-2">
                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                              {index + 1}
                            </span>
                            <span>{formatTime(time)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div><strong>Event:</strong> {isRecurring ? 'Yearly ' : ''}Dhane Offering Ceremony</div>
                    <div><strong>Devotee:</strong> {user?.username || formData.name || 'Guest'}</div>
                    {!user && formData.email && (
                      <div><strong>Email:</strong> {formData.email}</div>
                    )}
                    <div><strong>Total Duration:</strong> ~{selectedTimes.length} hour{selectedTimes.length > 1 ? 's' : ''}</div>
                    {isRecurring && (
                      <div className="text-purple-700 font-medium">
                        <strong>📅 Recurring:</strong> All selected time slots will repeat annually on the same date
                      </div>
                    )}
                  </div>
                </div>
              )}

            </form>
          )}
          
          {/* Action Buttons - Sticky positioned at bottom */}
          {!showAuthPrompt && !showBookingDetails && (
            <div className="flex gap-3 pt-4 border-t border-monastery-100 mt-6 bg-white sticky bottom-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                fullWidth
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinueToSignIn}
                fullWidth
                loading={loading}
                disabled={loading || selectedTimes.length === 0 || timeSlots.length === 0}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {loading ? `Processing ${selectedTimes.length} booking${selectedTimes.length > 1 ? 's' : ''}...` : user ? `Confirm ${selectedTimes.length} Booking${selectedTimes.length > 1 ? 's' : ''}` : 'Continue to Sign In'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}