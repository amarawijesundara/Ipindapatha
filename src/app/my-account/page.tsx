'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthContext'
import { Container, StatsCard, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import PaymentReceiptUpload from '@/components/PaymentReceiptUpload'

interface Booking {
  id: number
  booking_date: string | Date
  booking_time: string
  event_note?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  offering_type?: 'food_preparation' | 'monetary_donation'
  created_at: string
  updated_at: string
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
    paymentId: number
    bookingId: number
    amount: number
    currency: string
  } | null>(null)

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
        
        // Calculate stats from bookings data
        const stats = {
          totalBookings: bookingsWithPayments.length,
          pendingBookings: bookingsWithPayments.filter((b: Booking) => b.status === 'pending').length,
          confirmedBookings: bookingsWithPayments.filter((b: Booking) => b.status === 'confirmed').length,
          cancelledBookings: bookingsWithPayments.filter((b: Booking) => b.status === 'cancelled').length,
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

  const getStatusColor = (status: 'pending' | 'confirmed' | 'cancelled') => {
    switch (status) {
      case 'confirmed': return 'bg-success-50 text-success-700 border-success-200'
      case 'pending': return 'bg-warning-50 text-warning-700 border-warning-200'
      case 'cancelled': return 'bg-error-50 text-error-700 border-error-200'
      default: return 'bg-secondary-50 text-secondary-700 border-secondary-200'
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.length > 5 ? timeString.substring(0, 5) : timeString
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
    // Refresh bookings data to show updated payment status
    fetchUserData()
    setShowPaymentUpload(false)
    setSelectedPayment(null)
  }

  // Get recent bookings (last 5)
  const recentBookings = bookings
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Get upcoming bookings (confirmed, future dates)
  const upcomingBookings = bookings
    .filter(booking => {
      const bookingDate = new Date(booking.booking_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return booking.status === 'confirmed' && bookingDate >= today
    })
    .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
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
                                    {formatDate(booking.booking_date)} at {formatTime(booking.booking_time)}
                                  </p>
                                  <p className="text-xs text-monastery-600">
                                    {getOfferingTypeLabel(booking.offering_type)}
                                  </p>
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
                              {booking.offering_type === 'monetary_donation' && booking.payment && 
                               (booking.payment.status === 'pending' || booking.payment.status === 'paid') && (
                                <button
                                  onClick={() => handleOpenPaymentUpload(booking)}
                                  className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
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

                  {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                    <Link href="/admin" className="block">
                      <Button variant="outline" className="w-full">
                        Admin Panel
                      </Button>
                    </Link>
                  )}
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
                          {formatTime(booking.booking_time)}
                        </p>
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