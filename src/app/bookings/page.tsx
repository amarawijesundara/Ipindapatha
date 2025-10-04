'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthContext'
import { Container, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import PaymentReceiptUpload from '@/components/PaymentReceiptUpload'
import { parseBookingDate } from '@/lib/utils/dateValidation'

interface Booking {
  id: number | string // Can be number or "recurring-{id}"
  booking_date: string | Date
  meal_period?: 'morning_meal' | 'morning_tea' | 'lunch_meal' | 'evening_tea'
  event_note?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'recurring'
  offering_type?: 'food_preparation' | 'monetary_donation'
  created_at: string
  updated_at: string
  is_recurring?: boolean
  booking_type?: 'regular' | 'recurring'
  recurring_pattern?: string
  payment?: {
    id: number
    amount: number
    currency: string
    payment_deadline: string
    status: 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled'
    paid_at?: string
    verified_at?: string
  }
}

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentUpload, setShowPaymentUpload] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<{
    paymentId: number
    bookingId: number
    amount: number
    currency: string
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const itemsPerPage = 10

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setError(null)

      const response = await fetch('/api/bookings', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      } else {
        throw new Error('Failed to fetch bookings')
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      setError('Unable to load your bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setLoading(true)
    fetchBookings()
  }

  const getStatusColor = (status: 'pending' | 'confirmed' | 'cancelled' | 'recurring') => {
    switch (status) {
      case 'confirmed': return 'bg-success-50 text-success-700 border-success-200'
      case 'pending': return 'bg-warning-50 text-warning-700 border-warning-200'
      case 'cancelled': return 'bg-error-50 text-error-700 border-error-200'
      case 'recurring': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-secondary-50 text-secondary-700 border-secondary-200'
    }
  }

  const formatDate = (dateString: string | Date) => {
    let date: Date | null

    if (dateString instanceof Date) {
      date = dateString
    } else if (typeof dateString === 'string') {
      date = parseBookingDate(dateString)
      if (!date) {
        date = new Date(dateString)
        if (isNaN(date.getTime())) {
          return 'Invalid Date'
        }
      }
    } else {
      return 'Invalid Date'
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatMealPeriod = (mealPeriod?: string) => {
    if (!mealPeriod) {
      return {
        name: 'Time not specified',
        timeRange: ''
      }
    }

    const mealPeriodInfo: Record<string, { name: string; timeRange: string }> = {
      morning_meal: { name: 'Morning Meal', timeRange: '6:30 AM - 7:30 AM' },
      morning_tea: { name: 'Morning Tea', timeRange: '9:30 AM - 10:30 AM' },
      lunch_meal: { name: 'Lunch Meal', timeRange: '11:30 AM - 12:00 PM' },
      evening_tea: { name: 'Evening Tea', timeRange: '3:00 PM - 4:00 PM' }
    }

    return mealPeriodInfo[mealPeriod] || { name: mealPeriod, timeRange: 'Time not specified' }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-success-50 text-success-700 border-success-200'
      case 'paid': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'pending': return 'bg-warning-50 text-warning-700 border-warning-200'
      case 'overdue': return 'bg-error-50 text-error-700 border-error-200'
      case 'cancelled': return 'bg-secondary-50 text-secondary-700 border-secondary-200'
      default: return 'bg-secondary-50 text-secondary-700 border-secondary-200'
    }
  }

  const getOfferingTypeIcon = (offeringType?: string) => {
    return offeringType === 'monetary_donation' ? '💝' : '🍽️'
  }

  const getOfferingTypeLabel = (offeringType?: string) => {
    return offeringType === 'monetary_donation' ? 'Monetary Donation' : 'Food Preparation'
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const isPaymentOverdue = (paymentDeadline: string) => {
    return new Date(paymentDeadline) < new Date()
  }

  const handleOpenPaymentUpload = (booking: Booking) => {
    if (booking.payment) {
      setSelectedPayment({
        paymentId: booking.payment.id,
        bookingId: booking.id,
        amount: booking.payment.amount,
        currency: booking.payment.currency
      })
      setShowPaymentUpload(true)
    }
  }

  const handlePaymentUploadSuccess = (receiptData: any) => {
    fetchBookings()
    setShowPaymentUpload(false)
    setSelectedPayment(null)
  }

  // Filter bookings based on status and type filters
  const filteredBookings = bookings.filter(booking => {
    const statusMatch = statusFilter === 'all' || booking.status === statusFilter
    const typeMatch = typeFilter === 'all' ||
      (typeFilter === 'regular' && !booking.is_recurring) ||
      (typeFilter === 'recurring' && booking.is_recurring) ||
      (typeFilter === 'food_preparation' && booking.offering_type === 'food_preparation') ||
      (typeFilter === 'monetary_donation' && booking.offering_type === 'monetary_donation')

    return statusMatch && typeMatch
  })

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBookings = filteredBookings.slice(startIndex, endIndex)

  // Sort bookings by date (newest first)
  const sortedBookings = currentBookings.sort((a, b) => {
    const dateA = typeof a.booking_date === 'string'
      ? parseBookingDate(a.booking_date) || new Date(a.booking_date)
      : a.booking_date
    const dateB = typeof b.booking_date === 'string'
      ? parseBookingDate(b.booking_date) || new Date(b.booking_date)
      : b.booking_date

    return dateB.getTime() - dateA.getTime()
  })

  if (loading) {
    return (
      <ProtectedRoute>
        <Container size="lg" className="py-8">
          <div className="mb-8">
            <div className="h-8 bg-monastery-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-monastery-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-monastery-200 rounded animate-pulse"></div>
            ))}
          </div>
        </Container>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Container size="lg" className="py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">⚠️</div>
              <h2 className="text-2xl font-bold text-monastery-800 mb-2">
                Unable to Load Bookings
              </h2>
              <p className="text-monastery-600 mb-6">
                {error}. Please check your connection and try again.
              </p>
              <Button onClick={handleRetry} className="mr-4">
                Retry
              </Button>
              <Link href="/my-account">
                <Button variant="outline">
                  Back to My Account
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-lotus-50">
        <Container size="lg" className="py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-monastery-800 mb-2">
                  My Bookings 📅
                </h1>
                <p className="text-monastery-600 text-lg">
                  View and manage all your Dhane ceremony bookings
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/my-account">
                  <Button variant="outline">
                    Back to My Account
                  </Button>
                </Link>
                <Link href="/">
                  <Button>
                    Book New Ceremony
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-monastery-200 p-4 text-center">
              <div className="text-2xl font-bold text-monastery-800">{bookings.length}</div>
              <div className="text-sm text-monastery-600">Total Bookings</div>
            </div>
            <div className="bg-white rounded-lg border border-monastery-200 p-4 text-center">
              <div className="text-2xl font-bold text-warning-600">
                {bookings.filter(b => b.status === 'pending').length}
              </div>
              <div className="text-sm text-monastery-600">Pending</div>
            </div>
            <div className="bg-white rounded-lg border border-monastery-200 p-4 text-center">
              <div className="text-2xl font-bold text-success-600">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-sm text-monastery-600">Confirmed</div>
            </div>
            <div className="bg-white rounded-lg border border-monastery-200 p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {bookings.filter(b => b.is_recurring).length}
              </div>
              <div className="text-sm text-monastery-600">Recurring</div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-monastery-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-monastery-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-700 mb-2">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-monastery-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Types</option>
                    <option value="regular">Regular Bookings</option>
                    <option value="recurring">Recurring Bookings</option>
                    <option value="food_preparation">Food Preparation</option>
                    <option value="monetary_donation">Monetary Donation</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Bookings ({filteredBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedBookings.length > 0 ? (
                <div className="space-y-4">
                  {sortedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-6 bg-lotus-50 rounded-lg border border-monastery-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">{getOfferingTypeIcon(booking.offering_type)}</span>
                            <div>
                              <p className="font-bold text-lg text-monastery-900">
                                {formatDate(booking.booking_date)}
                              </p>
                              <p className="text-monastery-700 font-medium">
                                {formatMealPeriod(booking.meal_period).name}
                              </p>
                              {formatMealPeriod(booking.meal_period).timeRange && (
                                <p className="text-sm text-monastery-500">
                                  {formatMealPeriod(booking.meal_period).timeRange}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-monastery-600 mb-1">
                                <strong>Offering Type:</strong> {getOfferingTypeLabel(booking.offering_type)}
                              </p>
                              {booking.is_recurring && (
                                <div className="text-sm text-blue-600 font-medium flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Yearly Recurring
                                </div>
                              )}
                              {booking.event_note && (
                                <p className="text-sm text-monastery-600 mt-2">
                                  <strong>Note:</strong> {booking.event_note}
                                </p>
                              )}
                            </div>

                            <div className="text-sm text-monastery-600">
                              <p><strong>Created:</strong> {formatDate(booking.created_at)}</p>
                              <p><strong>Updated:</strong> {formatDate(booking.updated_at)}</p>
                            </div>
                          </div>

                          {/* Payment Information */}
                          {booking.offering_type === 'monetary_donation' && booking.payment && (
                            <div className="mt-4 p-3 bg-white rounded border border-monastery-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-monastery-700">
                                  Payment: {formatCurrency(booking.payment.amount, booking.payment.currency)}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                  getPaymentStatusColor(booking.payment.status)
                                }`}>
                                  {booking.payment.status.charAt(0).toUpperCase() + booking.payment.status.slice(1)}
                                </span>
                              </div>

                              {booking.payment.status === 'pending' && (
                                <div className="text-sm text-monastery-600">
                                  Deadline: {formatDate(booking.payment.payment_deadline)}
                                  {isPaymentOverdue(booking.payment.payment_deadline) && (
                                    <span className="text-error-600 font-medium"> (Overdue)</span>
                                  )}
                                </div>
                              )}

                              {booking.payment.verified_at && (
                                <div className="text-sm text-success-600">
                                  ✅ Verified on {formatDate(booking.payment.verified_at)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-3 ml-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            getStatusColor(booking.status)
                          }`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>

                          {/* Payment Action Button */}
                          {booking.offering_type === 'monetary_donation' && booking.payment &&
                           (booking.payment.status === 'pending' || booking.payment.status === 'paid') && (
                            <button
                              onClick={() => handleOpenPaymentUpload(booking)}
                              className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                            >
                              {booking.payment.status === 'pending' ? 'Upload Receipt' : 'Update Receipt'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-monastery-600 text-lg">
                    {statusFilter === 'all' && typeFilter === 'all'
                      ? 'No bookings found'
                      : 'No bookings match your current filters'
                    }
                  </p>
                  <p className="text-sm text-monastery-500 mt-2">
                    {statusFilter === 'all' && typeFilter === 'all'
                      ? 'Start by booking your first Dhane ceremony'
                      : 'Try adjusting your filters or clearing them to see more results'
                    }
                  </p>
                  <div className="mt-6 space-x-4">
                    {(statusFilter !== 'all' || typeFilter !== 'all') && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStatusFilter('all')
                          setTypeFilter('all')
                          setCurrentPage(1)
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                    <Link href="/">
                      <Button>Book New Ceremony</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-monastery-700 hover:bg-monastery-100 border border-monastery-300'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Payment Receipt Upload Modal */}
          {showPaymentUpload && selectedPayment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-lg">
                <PaymentReceiptUpload
                  paymentId={selectedPayment.paymentId}
                  bookingId={selectedPayment.bookingId}
                  onUploadSuccess={handlePaymentUploadSuccess}
                  onCancel={() => {
                    setShowPaymentUpload(false)
                    setSelectedPayment(null)
                  }}
                />
              </div>
            </div>
          )}
        </Container>
      </div>
    </ProtectedRoute>
  )
}