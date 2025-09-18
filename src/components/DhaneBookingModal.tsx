'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAuth } from '@/components/AuthContext'
import BookingDetailsView from '@/components/BookingDetailsView'
import UserSelector from '@/components/UserSelector'
import { formatDateForBooking } from '@/lib/utils/dateValidation'
import { MealPeriodId, MealAvailability } from '@/types'

interface DhaneBookingModalProps {
  selectedDate: Date | null
  onClose: () => void
  onBookingComplete: () => void
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
  const [mealAvailability, setMealAvailability] = useState<MealAvailability[]>([])
  const [selectedMealPeriods, setSelectedMealPeriods] = useState<MealPeriodId[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingAvailability, setFetchingAvailability] = useState(true)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [mealCosts, setMealCosts] = useState<Record<string, number>>({})

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
      fetchMealAvailability()
    }
  }, [selectedDate])

  // Check if all meal periods are fully booked
  const hasAvailableMeals = mealAvailability.some(meal => meal.isAvailable)
  const isFullyBooked = mealAvailability.length > 0 && !hasAvailableMeals

  // Show booking details view for fully booked dates
  useEffect(() => {
    if (!fetchingAvailability && isFullyBooked && !user) {
      setShowBookingDetails(true)
    } else {
      setShowBookingDetails(false)
    }
  }, [fetchingAvailability, isFullyBooked, user])

  // Automatically calculate donation amount based on selected meal periods
  useEffect(() => {
    if (formData.offeringType === 'monetary_donation') {
      const totalCost = selectedMealPeriods.reduce((total, periodId) => {
        const meal = mealAvailability.find(m => m.mealPeriod === periodId)
        return total + (meal?.cost || 0)
      }, 0)

      setFormData(prev => ({ ...prev, donationAmount: totalCost }))
    }
  }, [selectedMealPeriods, formData.offeringType, mealAvailability])

  const handleModalClose = () => {
    onClose()
  }

  const handleContinueToSignIn = () => {
    // For guest users, allow proceeding to auth without form validation
    if (!user && selectedMealPeriods.length > 0) {
      // Store booking data with minimal info - form completion can happen after auth
      localStorage.setItem('pendingBooking', JSON.stringify({
        ...formData, // Include any partial form data
        date: selectedDate ? formatDateForBooking(selectedDate) : '',
        mealPeriods: selectedMealPeriods
      }))
      setShowAuthPrompt(true)
      return
    }

    // For authenticated users, use normal form submission
    if (user) {
      createBookings()
    }
  }

  const fetchMealAvailability = async () => {
    if (!selectedDate) return

    try {
      const dateStr = formatDateForBooking(selectedDate)
      const response = await fetch(`/api/bookings/availability?date=${dateStr}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMealAvailability(data.availability || [])
        setMealCosts(data.mealCosts || {})
      }
    } catch (error) {
      console.error('Failed to fetch meal availability:', error)
    } finally {
      setFetchingAvailability(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || selectedMealPeriods.length === 0) return

    // Clear any existing validation errors
    setValidationError(null)

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
        date: formatDateForBooking(selectedDate),
        mealPeriods: selectedMealPeriods
      }))
      setShowAuthPrompt(true)
      return
    }

    // Authenticated user - proceed with bookings
    await createBookings()
  }

  const createBookings = async () => {
    setLoading(true)

    try {
      const bookingPromises = selectedMealPeriods.map(async (mealPeriod) => {
        // Determine target user and booking data based on admin status
        const targetUserId = isAdmin && selectedUserId ? selectedUserId : user?.id

        const bookingData = {
          userId: targetUserId,
          tenantId: user?.tenant_id || 1,
          bookingDate: selectedDate ? formatDateForBooking(selectedDate) : '',
          mealPeriod: mealPeriod,
          eventNote: formData.eventNote || `${isRecurring ? 'Yearly ' : ''}Dhane offering ceremony - ${
            isAdmin && selectedTargetUser ? selectedTargetUser.username :
            formData.name || user?.username
          } (${mealPeriod.replace('_', ' ')})`,
          offeringType: formData.offeringType,
          donationAmount: formData.offeringType === 'monetary_donation' ? formData.donationAmount : undefined,
          guestName: isAdmin && selectedTargetUser ? selectedTargetUser.username : (!user ? formData.name : undefined),
          guestEmail: isAdmin && selectedTargetUser ? selectedTargetUser.email : (!user ? formData.email : undefined),
          guestPhone: isAdmin && selectedTargetUser ? selectedTargetUser.phoneNumber : (!user ? formData.phone : undefined),
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
          throw new Error(`Failed to book ${mealPeriod}: ${errorData.message}`)
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
        setValidationError(`Created ${successes} bookings successfully, but ${failures.length} failed. Please check your bookings and try again for the failed meal periods.`)
        // Still close modal on partial success
        setTimeout(() => {
          onBookingComplete()
          onClose()
        }, 3000)
      } else {
        // All bookings succeeded
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

  const handleAuthRedirect = (type: 'login' | 'register') => {
    // Store current form data
    localStorage.setItem('pendingBooking', JSON.stringify({
      ...formData,
      date: selectedDate ? formatDateForBooking(selectedDate) : '',
      mealPeriods: selectedMealPeriods
    }))

    // Redirect to auth page
    window.location.href = `/${type}?redirect=/`
  }

  const handleMealPeriodToggle = (mealPeriodId: MealPeriodId) => {
    setValidationError(null)

    if (selectedMealPeriods.includes(mealPeriodId)) {
      setSelectedMealPeriods(prev => prev.filter(id => id !== mealPeriodId))
    } else {
      setSelectedMealPeriods(prev => [...prev, mealPeriodId])
    }
  }

  const handleSelectAll = () => {
    const availableMealPeriods = mealAvailability
      .filter(meal => meal.isAvailable)
      .map(meal => meal.mealPeriod)
    setSelectedMealPeriods(availableMealPeriods)
  }

  const handleClearSelection = () => {
    setSelectedMealPeriods([])
    setValidationError(null)
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
          {fetchingAvailability ? (
            <div className="text-center py-8">
              <div className="text-monastery-600">Loading meal availability...</div>
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
                  Your {selectedMealPeriods.length} meal period{selectedMealPeriods.length > 1 ? 's are' : ' is'} selected
                </p>
                <div className="bg-lotus-100 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-monastery-800 mb-2">Your Booking Details</h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {formatDate(selectedDate!)}</div>
                    <div><strong>Meal Periods:</strong> {selectedMealPeriods.map(period =>
                      period.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ).join(', ')}</div>
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
                      ⚠️ Admin override will bypass normal booking restrictions
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

                  {/* Total Cost Display */}
                  {selectedMealPeriods.length > 0 && (
                    <div className="bg-primary-50 p-3 rounded-lg">
                      <h6 className="font-medium text-primary-800 mb-2">Total Cost Breakdown</h6>
                      <div className="space-y-1 text-sm">
                        {selectedMealPeriods.map(periodId => {
                          const meal = mealAvailability.find(m => m.mealPeriod === periodId)
                          return meal ? (
                            <div key={periodId} className="flex justify-between">
                              <span className="text-primary-700">{meal.mealName}:</span>
                              <span className="font-medium text-primary-800">${meal.cost}</span>
                            </div>
                          ) : null
                        })}
                        <div className="border-t border-primary-200 pt-1 mt-2 flex justify-between font-semibold">
                          <span className="text-primary-800">Total:</span>
                          <span className="text-primary-800">
                            ${selectedMealPeriods.reduce((total, periodId) => {
                              const meal = mealAvailability.find(m => m.mealPeriod === periodId)
                              return total + (meal?.cost || 0)
                            }, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Meal Period Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-monastery-800">
                    Select Meal Periods ({selectedMealPeriods.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      disabled={!mealAvailability.some(meal => meal.isAvailable)}
                      className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      disabled={selectedMealPeriods.length === 0}
                      className="text-xs px-2 py-1 bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Meal Period Cards */}
                <div className="space-y-3">
                  {mealAvailability.map((meal) => {
                    const isSelected = selectedMealPeriods.includes(meal.mealPeriod)

                    return (
                      <button
                        key={meal.mealPeriod}
                        type="button"
                        disabled={!meal.isAvailable && !isSelected}
                        onClick={() => handleMealPeriodToggle(meal.mealPeriod)}
                        className={`
                          w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                          ${isSelected
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : meal.isAvailable
                              ? `${meal.color} hover:shadow-md hover:border-primary-300`
                              : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{meal.icon}</span>
                            <div>
                              <h3 className="font-semibold text-base text-monastery-800">
                                {meal.mealName}
                              </h3>
                              <p className="text-sm text-monastery-600">
                                {meal.timeRange}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-bold text-monastery-800">
                              ${meal.cost}
                            </div>
                            {isSelected && (
                              <div className="bg-primary-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                Selected ✓
                              </div>
                            )}
                            {!meal.isAvailable && meal.bookedBy && (
                              <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                Booked by {meal.bookedBy.username}
                              </div>
                            )}
                            {!meal.isAvailable && !meal.bookedBy && (
                              <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                                Unavailable
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-monastery-600">
                          {meal.description}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {mealAvailability.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-lg font-semibold text-monastery-800 mb-2">
                      No Meal Periods Available
                    </h3>
                    <p className="text-monastery-600">
                      This date has no available meal periods for booking.
                    </p>
                  </div>
                ) : !hasAvailableMeals && user && (
                  <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="text-error-600">🔒</div>
                      <div>
                        <p className="text-sm font-medium text-error-800">All Meal Periods Booked</p>
                        <p className="text-xs text-error-600 mt-1">
                          All available meal periods for this date are currently booked.
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
              {user && selectedMealPeriods.length > 0 && (
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
                        Make this a yearly recurring booking for all selected meal periods. These will be automatically reserved for you every year.
                        {isRecurring && selectedMealPeriods.length > 0 && (
                          <strong className="block mt-1">
                            This will reserve {formatDate(selectedDate!)} for {selectedMealPeriods.map(period =>
                              period.replace('_', ' ')).join(', ')} annually.
                          </strong>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              {selectedMealPeriods.length > 0 && (
                <div className="bg-lotus-100 rounded-lg p-4">
                  <h4 className="font-medium text-monastery-800 mb-2">
                    Booking Summary ({selectedMealPeriods.length} meal period{selectedMealPeriods.length > 1 ? 's' : ''})
                  </h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {formatDate(selectedDate)}</div>
                    <div><strong>Meal Periods:</strong>
                      <div className="mt-1 pl-4">
                        {selectedMealPeriods.map((periodId, index) => {
                          const meal = mealAvailability.find(m => m.mealPeriod === periodId)
                          return meal ? (
                            <div key={periodId} className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                {index + 1}
                              </span>
                              <span>{meal.icon} {meal.mealName} ({meal.timeRange}) - ${meal.cost}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                    <div><strong>Event:</strong> {isRecurring ? 'Yearly ' : ''}Dhane Offering Ceremony</div>
                    <div><strong>Devotee:</strong> {user?.username || formData.name || 'Guest'}</div>
                    {!user && formData.email && (
                      <div><strong>Email:</strong> {formData.email}</div>
                    )}
                    <div><strong>Total Cost:</strong> ${selectedMealPeriods.reduce((total, periodId) => {
                      const meal = mealAvailability.find(m => m.mealPeriod === periodId)
                      return total + (meal?.cost || 0)
                    }, 0)}</div>
                    {isRecurring && (
                      <div className="text-purple-700 font-medium">
                        <strong>📅 Recurring:</strong> All selected meal periods will repeat annually on the same date
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
                disabled={loading || selectedMealPeriods.length === 0 || mealAvailability.length === 0}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {loading ? `Processing ${selectedMealPeriods.length} booking${selectedMealPeriods.length > 1 ? 's' : ''}...` : user ? `Confirm ${selectedMealPeriods.length} Booking${selectedMealPeriods.length > 1 ? 's' : ''}` : 'Continue to Sign In'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}