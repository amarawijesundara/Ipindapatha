'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthContext'
import { Container, StatsCard, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
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

interface UserBookingStats {
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  cancelledBookings: number
}

export default function MyAccount() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<UserBookingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentUpload, setShowPaymentUpload] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<{
    paymentId?: number
    bookingId: number
    amount: number
    currency: string
  } | null>(null)
  const [selectedBulkPayments, setSelectedBulkPayments] = useState<{
    date: string
    payments: Array<{
      paymentId: number
      bookingId: number
      amount: number
      currency: string
      mealPeriod: string
    }>
    totalAmount: number
    currency: string
  } | null>(null)
  const [groupedPayments, setGroupedPayments] = useState<Record<string, Booking[]>>({})

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setError(null)
      
      // Fetch user's bookings
      const bookingsResponse = await fetch('/api/bookings', {
        credentials: 'include',
      })

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        let userBookings = bookingsData.bookings || []
        
        // Fetch payment information for bookings with monetary donations
        const bookingsWithPayments = await Promise.all(
          userBookings.map(async (booking: Booking) => {
            if (booking.offering_type === 'monetary_donation') {
              // Skip payment fetching for recurring booking templates
              if (typeof booking.id === 'string' && booking.id.startsWith('recurring-')) {
                return booking // Return booking without payment data
              }

              try {
                const paymentResponse = await fetch(`/api/bookings/payments?bookingId=${booking.id}`, {
                  credentials: 'include',
                })
                if (paymentResponse.ok) {
                  const paymentData = await paymentResponse.json()
                  return { ...booking, payment: paymentData.payment }
                }
              } catch (error) {
                console.error('Failed to fetch payment for booking', booking.id, error)
              }
            }
            return booking
          })
        )

        setBookings(bookingsWithPayments)

        // Group payments by date for bulk upload functionality
        const paymentsGrouped: Record<string, Booking[]> = {}
        bookingsWithPayments.forEach((booking: Booking) => {
          if (booking.offering_type === 'monetary_donation') {
            const dateKey = typeof booking.booking_date === 'string'
              ? booking.booking_date.split('T')[0]
              : booking.booking_date.toISOString().split('T')[0]

            if (!paymentsGrouped[dateKey]) {
              paymentsGrouped[dateKey] = []
            }
            paymentsGrouped[dateKey].push(booking)
          }
        })
        setGroupedPayments(paymentsGrouped)

        // Calculate stats from bookings data
        const stats = {
          totalBookings: userBookings.length,
          pendingBookings: userBookings.filter((b: Booking) => b.status === 'pending').length,
          confirmedBookings: userBookings.filter((b: Booking) => b.status === 'confirmed').length,
          cancelledBookings: userBookings.filter((b: Booking) => b.status === 'cancelled').length,
        }
        setStats(stats)
      } else {
        throw new Error('Failed to fetch booking data')
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      setError('Unable to load your account information')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setLoading(true)
    fetchUserData()
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator'
      case 'tenant_admin': return 'Administrator'
      case 'user': return 'Member'
      default: return role
    }
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
      // Try to parse as booking date first (YYYY-MM-DD format)
      date = parseBookingDate(dateString)
      if (!date) {
        // Fallback to regular Date parsing for other formats
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

  const handleOpenPaymentUpload = async (booking: Booking) => {
    if (booking.payment) {
      // Regular booking with existing payment record
      setSelectedPayment({
        paymentId: booking.payment.id,
        bookingId: booking.id,
        amount: booking.payment.amount,
        currency: booking.payment.currency
      })
      setShowPaymentUpload(true)
    } else {
      // Booking without payment record (recurring bookings, etc.)
      // For now, we'll create a placeholder payment upload without paymentId
      // The upload component will need to handle creating the payment record
      setSelectedPayment({
        paymentId: undefined, // No payment record yet
        bookingId: booking.id,
        amount: 0, // Will be handled in upload component
        currency: 'USD' // Default, will be determined by tenant
      })
      setShowPaymentUpload(true)
    }
  }

  const handlePaymentUploadSuccess = (receiptData: any) => {
    // Refresh bookings data to show updated payment status
    fetchUserData()
    setShowPaymentUpload(false)
    setSelectedPayment(null)
    setSelectedBulkPayments(null)
  }

  const handleOpenBulkPaymentUpload = async (date: string, bookings: Booking[]) => {
    // For bulk uploads with mixed scenarios, we'll handle it differently
    // For now, let's ensure all bookings have payment records by creating them if needed
    const bookingsWithPayments = []
    const defaultAmount = 50.00 // This could be made configurable

    for (const booking of bookings) {
      if (booking.payment) {
        // Booking already has payment record
        if (booking.payment.status === 'pending' || booking.payment.status === 'paid') {
          bookingsWithPayments.push({
            paymentId: booking.payment.id,
            bookingId: typeof booking.id === 'string' ? parseInt(booking.id) : booking.id,
            amount: booking.payment.amount,
            currency: booking.payment.currency,
            mealPeriod: booking.meal_period || 'unknown'
          })
        }
      } else {
        // For bookings without payment records, we'll create placeholder entries
        // The actual payment creation will happen during upload
        bookingsWithPayments.push({
          paymentId: 0, // Placeholder, will be created during upload
          bookingId: typeof booking.id === 'string' ? parseInt(booking.id) : booking.id,
          amount: defaultAmount,
          currency: 'USD', // Default, will be determined by tenant
          mealPeriod: booking.meal_period || 'unknown'
        })
      }
    }

    if (bookingsWithPayments.length > 0) {
      const totalAmount = bookingsWithPayments.reduce((sum, payment) => sum + payment.amount, 0)
      setSelectedBulkPayments({
        date,
        payments: bookingsWithPayments,
        totalAmount,
        currency: bookingsWithPayments.find(p => p.paymentId > 0)?.currency || 'USD'
      })
      setShowPaymentUpload(true)
    }
  }

  // Get recent bookings (last 5)
  const recentBookings = bookings
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Get upcoming bookings (confirmed, future dates)
  const upcomingBookings = bookings
    .filter(booking => {
      const bookingDate = typeof booking.booking_date === 'string' 
        ? parseBookingDate(booking.booking_date) || new Date(booking.booking_date)
        : booking.booking_date
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (bookingDate instanceof Date && !isNaN(bookingDate.getTime())) {
        const compareDate = new Date(bookingDate)
        compareDate.setHours(0, 0, 0, 0)
        return booking.status === 'confirmed' && compareDate >= today
      }
      
      return false
    })
    .sort((a, b) => {
      const dateA = typeof a.booking_date === 'string' 
        ? parseBookingDate(a.booking_date) || new Date(a.booking_date)
        : a.booking_date
      const dateB = typeof b.booking_date === 'string' 
        ? parseBookingDate(b.booking_date) || new Date(b.booking_date)
        : b.booking_date
      
      return dateA.getTime() - dateB.getTime()
    })
    .slice(0, 3)

  if (loading) {
    return (
      <ProtectedRoute>
        <Container size="lg" className="py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-monastery-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-monastery-200 rounded w-96 animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <StatsCard
                key={i}
                title="Loading..."
                value={0}
                loading={true}
              />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-monastery-200 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-monastery-200 rounded w-32"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-monastery-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-monastery-200 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-monastery-200 rounded w-32"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-monastery-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
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
                Unable to Load Account
              </h2>
              <p className="text-monastery-600 mb-6">
                {error}. Please check your connection and try again.
              </p>
              <Button onClick={handleRetry} className="mr-4">
                Retry
              </Button>
              <Link href="/">
                <Button variant="outline">
                  Go Home
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
                  My Account 🕉️
                </h1>
                <p className="text-monastery-600 text-lg">
                  Your personal booking history and account information
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-monastery-600">Role:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user?.role === 'super_admin' ? 'bg-primary-100 text-primary-800' :
                  user?.role === 'tenant_admin' ? 'bg-success-100 text-success-800' :
                  'bg-monastery-100 text-monastery-800'
                }`}>
                  {getRoleDisplayName(user?.role || 'user')}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Booking Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="My Total Bookings"
              value={stats?.totalBookings || 0}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              description="All your ceremony bookings"
              onClick={() => window.location.href = '/bookings'}
            />

            <StatsCard
              title="Pending Bookings"
              value={stats?.pendingBookings || 0}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              description="Awaiting confirmation"
            />

            <StatsCard
              title="Confirmed Bookings"
              value={stats?.confirmedBookings || 0}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              description="Ready for ceremony"
            />

            <StatsCard
              title="Upcoming Ceremonies"
              value={upcomingBookings.length}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              description="Next confirmed events"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Bookings */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Bookings</CardTitle>
                  <Link href="/bookings">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {recentBookings.length > 0 ? (
                    <div className="space-y-4">
                      {recentBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="p-4 bg-lotus-50 rounded-lg border border-monastery-100"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">{getOfferingTypeIcon(booking.offering_type)}</span>
                                <div>
                                  <p className="font-semibold text-monastery-900">
                                    {formatDate(booking.booking_date)}
                                  </p>
                                  <p className="text-sm text-monastery-700">
                                    {formatMealPeriod(booking.meal_period).name}
                                  </p>
                                  {formatMealPeriod(booking.meal_period).timeRange && (
                                    <p className="text-xs text-monastery-500">
                                      {formatMealPeriod(booking.meal_period).timeRange}
                                    </p>
                                  )}
                                  <p className="text-xs text-monastery-600">
                                    {getOfferingTypeLabel(booking.offering_type)}
                                  </p>
                                  {booking.is_recurring && (
                                    <div className="text-xs text-blue-600 font-medium flex items-center mt-1">
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Yearly Recurring
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {booking.event_note && (
                                <p className="text-sm text-monastery-600 mt-1">
                                  {booking.event_note}
                                </p>
                              )}
                              
                              {/* Payment Information */}
                              {booking.offering_type === 'monetary_donation' && booking.payment && (
                                <div className="mt-3 p-2 bg-white rounded border border-monastery-200">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-monastery-600">
                                      Payment: {formatCurrency(booking.payment.amount, booking.payment.currency)}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                      getPaymentStatusColor(booking.payment.status)
                                    }`}>
                                      {booking.payment.status.charAt(0).toUpperCase() + booking.payment.status.slice(1)}
                                    </span>
                                  </div>
                                  
                                  {booking.payment.status === 'pending' && (
                                    <div className="mt-1 text-xs text-monastery-600">
                                      Deadline: {formatDate(booking.payment.payment_deadline)}
                                      {isPaymentOverdue(booking.payment.payment_deadline) && (
                                        <span className="text-error-600 font-medium"> (Overdue)</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {booking.payment.verified_at && (
                                    <div className="mt-1 text-xs text-success-600">
                                      ✅ Verified on {formatDate(booking.payment.verified_at)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end space-y-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                getStatusColor(booking.status)
                              }`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                              
                              {/* Payment Action Button */}
                              {booking.offering_type === 'monetary_donation' && (
                                <button
                                  onClick={() => handleOpenPaymentUpload(booking)}
                                  className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                                >
                                  {booking.payment?.status === 'paid' ? 'Update Receipt' : 'Upload Receipt'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📅</div>
                      <p className="text-monastery-600">No bookings yet</p>
                      <p className="text-sm text-monastery-500 mt-1">
                        Start by booking your first Dhane ceremony
                      </p>
                      <Link href="/" className="mt-4 inline-block">
                        <Button size="sm">Book Now</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Account Info & Quick Actions */}
            <div className="space-y-8">
              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-monastery-600 uppercase tracking-wide">
                      Name
                    </label>
                    <p className="mt-1 text-monastery-900 font-semibold">
                      {user?.username}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-monastery-600 uppercase tracking-wide">
                      Email
                    </label>
                    <p className="mt-1 text-monastery-900 font-semibold">
                      {user?.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-monastery-600 uppercase tracking-wide">
                      Member Since
                    </label>
                    <p className="mt-1 text-monastery-900 font-semibold">
                      {user?.created_at 
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Dashboard - Only show for admin users */}
              {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-monastery-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>
                        {user?.role === 'super_admin' ? 'Platform Administration' : 'Monastery Administration'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Link href="/admin/dashboard" className="block">
                        <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center space-y-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-sm font-medium">Dashboard</span>
                        </Button>
                      </Link>

                      <Link href="/admin/bookings" className="block">
                        <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center space-y-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium">Bookings</span>
                        </Button>
                      </Link>

                      <Link href="/admin/users" className="block">
                        <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center space-y-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span className="text-sm font-medium">Users</span>
                        </Button>
                      </Link>

                      <Link href="/admin/availability" className="block">
                        <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center space-y-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">Availability</span>
                        </Button>
                      </Link>
                    </div>

                    {user?.role === 'super_admin' && (
                      <div className="pt-3 border-t border-monastery-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Link href="/admin/tenants" className="block">
                            <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center space-y-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="text-sm font-medium">Tenants</span>
                            </Button>
                          </Link>

                          <Link href="/admin/settings" className="block">
                            <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center space-y-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-sm font-medium">Settings</span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/" className="block">
                    <Button className="w-full">
                      Book New Ceremony
                    </Button>
                  </Link>

                  <Link href="/bookings" className="block">
                    <Button variant="outline" className="w-full">
                      View All Bookings
                    </Button>
                  </Link>

                  <Link href="/profile" className="block">
                    <Button variant="outline" className="w-full">
                      Edit Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Upcoming Ceremonies */}
              {upcomingBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Ceremonies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 bg-success-50 rounded-lg border border-success-200"
                      >
                        <p className="font-semibold text-success-800">
                          {formatDate(booking.booking_date)}
                        </p>
                        <p className="text-sm text-success-700">
                          {formatMealPeriod(booking.meal_period).name}
                        </p>
                        {formatMealPeriod(booking.meal_period).timeRange && (
                          <p className="text-xs text-success-600">
                            {formatMealPeriod(booking.meal_period).timeRange}
                          </p>
                        )}
                        {booking.event_note && (
                          <p className="text-xs text-success-600 mt-1">
                            {booking.event_note}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Payment Management Section */}
          {Object.keys(groupedPayments).length > 0 && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💰 Payment Management
                    <span className="text-sm font-normal text-monastery-600">
                      Upload receipts for multiple meals at once
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(groupedPayments).map(([date, bookingsForDate]) => {
                      // Include bookings that either:
                      // 1. Have payment records needing receipts (pending/paid status)
                      // 2. Don't have payment records yet (for recurring bookings, etc.)
                      const bookingsNeedingReceipts = bookingsForDate.filter(
                        booking => {
                          // Include if no payment record (will create on upload)
                          if (!booking.payment) return true
                          // Include if payment exists and needs receipt
                          return booking.payment.status === 'pending' || booking.payment.status === 'paid'
                        }
                      )

                      if (bookingsNeedingReceipts.length === 0) return null

                      // Calculate total for bookings with payment records
                      const bookingsWithPayments = bookingsNeedingReceipts.filter(b => b.payment)
                      const totalAmount = bookingsWithPayments.reduce(
                        (sum, booking) => sum + (booking.payment?.amount || 0), 0
                      )
                      const currency = bookingsWithPayments[0]?.payment?.currency || 'USD'
                      const bookingsWithoutPayments = bookingsNeedingReceipts.filter(b => !b.payment)

                      return (
                        <div key={date} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-monastery-800">
                                📅 {new Date(date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h4>
                              <p className="text-sm text-monastery-600">
                                {bookingsNeedingReceipts.length} meal{bookingsNeedingReceipts.length > 1 ? 's' : ''} •
                                {bookingsWithPayments.length > 0 && ` Total: ${currency} ${totalAmount}`}
                                {bookingsWithoutPayments.length > 0 && ` (${bookingsWithoutPayments.length} pending payment creation)`}
                              </p>
                            </div>
                            {bookingsNeedingReceipts.length > 1 ? (
                              <Button
                                onClick={() => handleOpenBulkPaymentUpload(date, bookingsNeedingReceipts)}
                                size="sm"
                                className="bg-primary-500 hover:bg-primary-600 text-white"
                              >
                                📄 Upload One Receipt for All
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleOpenPaymentUpload(bookingsNeedingReceipts[0])}
                                size="sm"
                                variant="outline"
                              >
                                Upload Receipt
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {bookingsNeedingReceipts.map((booking, index) => (
                              <div key={index} className="flex justify-between bg-white p-2 rounded border">
                                <span className="text-monastery-700">
                                  {booking.meal_period?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
                                </span>
                                <span className="font-medium text-monastery-800">
                                  {currency} {booking.payment?.amount || 0}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payment Receipt Upload Modal */}
          {showPaymentUpload && (selectedPayment || selectedBulkPayments) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-lg">
                <PaymentReceiptUpload
                  paymentId={selectedPayment?.paymentId}
                  bookingId={selectedPayment?.bookingId}
                  bulkPayments={selectedBulkPayments?.payments}
                  bulkDate={selectedBulkPayments?.date}
                  onUploadSuccess={handlePaymentUploadSuccess}
                  onCancel={() => {
                    setShowPaymentUpload(false)
                    setSelectedPayment(null)
                    setSelectedBulkPayments(null)
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