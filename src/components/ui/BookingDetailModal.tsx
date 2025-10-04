'use client'

import Modal from './Modal'

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

interface BookingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking | null
}

export default function BookingDetailModal({ isOpen, onClose, booking }: BookingDetailModalProps) {
  if (!booking) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const formatDateTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getOfferingTypeIcon = (offeringType?: string) => {
    return offeringType === 'monetary_donation' ? '💝' : '🍽️'
  }

  const getOfferingTypeLabel = (offeringType?: string) => {
    return offeringType === 'monetary_donation' ? 'Monetary Donation' : 'Food Preparation'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'pending':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'cancelled':
        return 'bg-error-100 text-error-800 border-error-200'
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Details"
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-secondary-900">
              Booking #{booking.id}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Event Details */}
          <div className="space-y-4">
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <h4 className="text-sm font-medium text-primary-900 mb-3">Event Information</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-primary-600 uppercase tracking-wide">Date</div>
                  <div className="text-sm font-medium text-primary-900">{formatDate(booking.booking_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-primary-600 uppercase tracking-wide">Meal Period</div>
                  <div className="text-sm font-medium text-primary-900">{formatMealPeriod(booking).name}</div>
                  {formatMealPeriod(booking).time && (
                    <div className="text-xs text-primary-600">{formatMealPeriod(booking).time}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-primary-600 uppercase tracking-wide">Offering Type</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getOfferingTypeIcon(booking.offering_type)}</span>
                    <span className="text-sm font-medium text-primary-900">{getOfferingTypeLabel(booking.offering_type)}</span>
                    {booking.is_recurring && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        Yearly Recurring
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-primary-600 uppercase tracking-wide">Event Details</div>
                  <div className="text-sm text-primary-800">
                    {booking.event_note || (
                      <span className="italic text-primary-500">No additional details provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - User Details */}
          <div className="space-y-4">
            <div className="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
              <h4 className="text-sm font-medium text-secondary-900 mb-3">User Information</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-secondary-600 uppercase tracking-wide">Name</div>
                  <div className="text-sm font-medium text-secondary-900">{booking.username || 'Unknown User'}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary-600 uppercase tracking-wide">Email</div>
                  <div className="text-sm text-secondary-800">{booking.email || 'No email provided'}</div>
                </div>
                {booking.phone_number && (
                  <div>
                    <div className="text-xs text-secondary-600 uppercase tracking-wide">Phone</div>
                    <div className="text-sm text-secondary-800">{booking.phone_number}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Information */}
        {booking.tenant && (
          <div className="bg-monastery-50 rounded-lg p-4 border border-monastery-200">
            <h4 className="text-sm font-medium text-monastery-900 mb-3">Tenant Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-monastery-600 uppercase tracking-wide">Organization</div>
                <div className="text-sm font-medium text-monastery-900">{booking.tenant.name}</div>
              </div>
              <div>
                <div className="text-xs text-monastery-600 uppercase tracking-wide">Subdomain</div>
                <div className="text-sm font-mono text-monastery-800">{booking.tenant.subdomain}</div>
              </div>
              <div>
                <div className="text-xs text-monastery-600 uppercase tracking-wide">Status</div>
                <div className="text-sm text-monastery-800">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    booking.tenant.is_active 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {booking.tenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-secondary-200 p-4">
          <h4 className="text-sm font-medium text-secondary-900 mb-3">Timeline</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-600">Booking Created:</span>
              <span className="font-medium text-secondary-900">{formatDateTime(booking.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-600">Last Updated:</span>
              <span className="font-medium text-secondary-900">{formatDateTime(booking.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-secondary-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}