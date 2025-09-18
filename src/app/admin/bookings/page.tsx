'use client'

import { useState, useEffect } from 'react'
import { Button, Loading, BookingDetailModal, ConfirmationModal } from '@/components/ui'
import AdminTable from '@/components/ui/AdminTable'

interface Booking {
  id: number
  user_id: number
  booking_date: string
  meal_period?: string
  meal_display?: string
  meal_time_range?: string
  offering_type?: string
  event_note?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  is_recurring?: boolean
  created_at: string
  updated_at: string
  username?: string
  email?: string
  phone_number?: string
  tenant?: {
    id: number
    name: string
    subdomain: string
    is_active: boolean
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [updatingBookings, setUpdatingBookings] = useState<Set<number>>(new Set())
  
  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'confirm' | 'cancel'
    bookingId: number
  } | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      // Use cookie-based authentication for admin API
      const response = await fetch('/api/admin/bookings', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      } else {
        console.error('Failed to fetch bookings:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success-100 text-success-800'
      case 'pending':
        return 'bg-warning-100 text-warning-800'
      case 'cancelled':
        return 'bg-error-100 text-error-800'
      default:
        return 'bg-monastery-100 text-monastery-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  const formatMealPeriod = (booking: Booking) => {
    // If we have the new meal period display info, use it
    if (booking.meal_display && booking.meal_time_range) {
      return {
        name: booking.meal_display,
        time: booking.meal_time_range
      }
    }

    // Fallback for bookings without meal period info
    if (booking.meal_period) {
      // Convert meal period ID to display name
      const mealPeriodNames: Record<string, string> = {
        morning_meal: 'Morning Meal',
        morning_tea: 'Morning Tea',
        lunch_meal: 'Lunch Meal',
        evening_tea: 'Evening Tea'
      }
      return {
        name: mealPeriodNames[booking.meal_period] || booking.meal_period,
        time: 'Time not specified'
      }
    }

    // Final fallback for very old bookings
    return {
      name: 'Meal period not specified',
      time: ''
    }
  }

  const updateBookingStatus = async (bookingId: number, newStatus: 'confirmed' | 'cancelled') => {
    // Add booking to updating state
    setUpdatingBookings(prev => new Set(prev.add(bookingId)))
    
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          bookingId,
          status: newStatus,
          notes: `Status updated by admin to ${newStatus}`
        })
      })

      if (response.ok) {
        // Update the booking in local state (optimistic update)
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus, updated_at: new Date().toISOString() }
            : booking
        ))
      } else {
        const error = await response.json()
        console.error(`Failed to update booking: ${error.message || 'Unknown error'}`)
        // Don't show alert, error will be handled by confirmation modal
      }
    } catch (error) {
      console.error('Failed to update booking status:', error)
      // Don't show alert, error will be handled by confirmation modal
    } finally {
      // Remove booking from updating state
      setUpdatingBookings(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    
    try {
      await updateBookingStatus(confirmAction.bookingId, confirmAction.type === 'confirm' ? 'confirmed' : 'cancelled')
      setShowConfirmModal(false)
      setConfirmAction(null)
    } catch (error) {
      // Keep modal open on error so user can retry
      console.error('Failed to update booking status:', error)
    }
  }

  const confirmBooking = (bookingId: number) => {
    setConfirmAction({ type: 'confirm', bookingId })
    setShowConfirmModal(true)
  }

  const cancelBooking = (bookingId: number) => {
    setConfirmAction({ type: 'cancel', bookingId })
    setShowConfirmModal(true)
  }

  const showBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowDetailModal(true)
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    return booking.status === filter
  })

  const columns = [
    {
      key: 'username',
      label: 'User',
      render: (booking: Booking) => (
        <div>
          <div className="font-medium text-monastery-800">{booking.username}</div>
          <div className="text-sm text-monastery-600">{booking.email}</div>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'tenant.name',
      label: 'Tenant',
      render: (booking: Booking) => (
        booking.tenant ? (
          <div>
            <div className="font-medium text-monastery-800">{booking.tenant.name}</div>
            <div className="text-sm font-mono text-monastery-600">{booking.tenant.subdomain}</div>
          </div>
        ) : (
          <span className="text-monastery-500 italic">No tenant</span>
        )
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'booking_date',
      label: 'Date & Meal Period',
      render: (booking: Booking) => {
        const mealInfo = formatMealPeriod(booking)
        return (
          <div>
            <div className="font-medium text-monastery-800">{formatDate(booking.booking_date)}</div>
            <div className="text-sm text-monastery-600">{mealInfo.name}</div>
            {mealInfo.time && <div className="text-xs text-monastery-500">{mealInfo.time}</div>}
          </div>
        )
      },
      sortable: true,
    },
    {
      key: 'event_note',
      label: 'Event Details',
      render: (booking: Booking) => (
        <div className="max-w-xs">
          {booking.event_note ? (
            <div className="text-sm text-monastery-700 truncate" title={booking.event_note}>
              {booking.event_note}
            </div>
          ) : (
            <span className="text-monastery-500 italic">No details</span>
          )}
        </div>
      ),
      searchable: true,
    },
    {
      key: 'offering_type',
      label: 'Type',
      render: (booking: Booking) => (
        <div className="text-sm">
          <div className="text-monastery-700">
            {booking.offering_type === 'monetary_donation' ? 'Donation' : 'Food Prep'}
          </div>
          {booking.is_recurring && (
            <div className="text-xs text-blue-600 font-medium">Yearly Recurring</div>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (booking: Booking) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Booked',
      render: (booking: Booking) => (
        <span className="text-monastery-600">
          {formatDate(booking.created_at)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (booking: Booking) => {
        const isUpdating = updatingBookings.has(booking.id)
        return (
          <div className="flex items-center space-x-2">
            {booking.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  disabled={isUpdating}
                  onClick={() => confirmBooking(booking.id)}
                >
                  {isUpdating ? 'Updating...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="error" 
                  disabled={isUpdating}
                  onClick={() => cancelBooking(booking.id)}
                >
                  {isUpdating ? 'Updating...' : 'Cancel'}
                </Button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <Button
                size="sm"
                variant="error"
                disabled={isUpdating}
                onClick={() => cancelBooking(booking.id)}
              >
                {isUpdating ? 'Updating...' : 'Cancel'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => showBookingDetails(booking)}
              title="View Details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Button>
          </div>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-monastery-800">Booking Management</h1>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  // Calculate stats
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">Booking Management</h1>
          <p className="text-monastery-600">Manage Dhane ceremony bookings across all tenants</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-monastery-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="text-sm text-monastery-600">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Total Bookings</div>
          <div className="text-2xl font-bold text-monastery-800">{bookings.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Pending</div>
          <div className="text-2xl font-bold text-warning-600">{pendingBookings}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Confirmed</div>
          <div className="text-2xl font-bold text-success-600">{confirmedBookings}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Cancelled</div>
          <div className="text-2xl font-bold text-error-600">{cancelledBookings}</div>
        </div>
      </div>

      {/* Bookings Table */}
      <AdminTable
        data={filteredBookings}
        columns={columns}
        searchPlaceholder="Search bookings by user, tenant, or event details..."
        emptyMessage="No bookings found."
        onRowClick={(booking) => showBookingDetails(booking)}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        booking={selectedBooking}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'confirm' ? 'Confirm Booking' : 'Cancel Booking'}
        message={
          confirmAction?.type === 'confirm' 
            ? 'Are you sure you want to confirm this booking? The user will be notified of the confirmation.'
            : 'Are you sure you want to cancel this booking? This action cannot be undone and the user will be notified.'
        }
        confirmText={confirmAction?.type === 'confirm' ? 'Confirm' : 'Cancel Booking'}
        confirmVariant={confirmAction?.type === 'confirm' ? 'success' : 'error'}
        isLoading={confirmAction ? updatingBookings.has(confirmAction.bookingId) : false}
      />
    </div>
  )
}