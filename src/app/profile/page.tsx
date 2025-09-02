'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthContext'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Container } from '@/components/ui'
import { User, Booking } from '@/types'

interface ProfileFormData {
  username: string
  email: string
  phone_number: string
  address: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, verifyToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profileData, setProfileData] = useState<ProfileFormData>({
    username: '',
    email: '',
    phone_number: '',
    address: ''
  })
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || ''
      })
    }
  }, [user])

  // Fetch user's bookings
  useEffect(() => {
    if (user) {
      fetchBookings()
    }
  }, [user])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings', {
        credentials: 'include', // Use cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify(profileData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Profile updated successfully!')
        // Refresh user data
        await verifyToken()
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (error) {
      setError('An error occurred while updating profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password changed successfully!')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setShowPasswordForm(false)
      } else {
        setError(data.message || 'Failed to change password')
      }
    } catch (error) {
      setError('An error occurred while changing password')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-error-100 text-error-700 border-error-200'
      case 'tenant_admin':
        return 'bg-monastery-100 text-monastery-700 border-monastery-200'
      case 'admin':
        return 'bg-primary-100 text-primary-700 border-primary-200'
      default:
        return 'bg-secondary-100 text-secondary-700 border-secondary-200'
    }
  }

  const formatBookingStatus = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="text-success-600 font-medium">Confirmed</span>
      case 'pending':
        return <span className="text-warning-600 font-medium">Pending</span>
      case 'cancelled':
        return <span className="text-error-600 font-medium">Cancelled</span>
      default:
        return <span className="text-secondary-600 font-medium capitalize">{status}</span>
    }
  }

  return (
    <ProtectedRoute>
      <Container className="py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-secondary-900">Profile Settings</h1>
            <p className="text-secondary-600">Manage your account information and preferences</p>
          </div>

          {/* Messages */}
          {message && (
            <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Profile Information */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <Input
                    label="Username"
                    value={profileData.username}
                    onChange={(e) => handleProfileChange('username', e.target.value)}
                    required
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    required
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    value={profileData.phone_number}
                    onChange={(e) => handleProfileChange('phone_number', e.target.value)}
                    placeholder="Optional"
                  />

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Address
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      rows={3}
                      value={profileData.address}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Information & Security */}
            <div className="space-y-6">
              {/* Account Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Account Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-600">Role</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user?.role || '')}`}>
                      {user?.role?.replace('_', ' ').toUpperCase() || 'User'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-secondary-600">Account Status</span>
                    <span className="text-success-600 font-medium">
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-secondary-600">Member Since</span>
                    <span className="text-secondary-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Password Change */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Password</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                    >
                      {showPasswordForm ? 'Cancel' : 'Change Password'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showPasswordForm && (
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <Input
                        label="Current Password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                        required
                      />

                      <Input
                        label="New Password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        required
                        minLength={8}
                      />

                      <Input
                        label="Confirm New Password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        required
                        minLength={8}
                      />

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Changing...' : 'Change Password'}
                      </Button>
                    </form>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>

          {/* Booking History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Recent Bookings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-secondary-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>No bookings found</p>
                  <p className="text-sm">Your future bookings will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary-200">
                        <th className="text-left py-3 font-medium text-secondary-900">Date</th>
                        <th className="text-left py-3 font-medium text-secondary-900">Time</th>
                        <th className="text-left py-3 font-medium text-secondary-900">Event</th>
                        <th className="text-left py-3 font-medium text-secondary-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 10).map((booking) => (
                        <tr key={booking.id} className="border-b border-secondary-100">
                          <td className="py-3 text-secondary-900">
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-secondary-700">{booking.booking_time}</td>
                          <td className="py-3 text-secondary-700">
                            {booking.event_note || 'Dhane Event'}
                          </td>
                          <td className="py-3">{formatBookingStatus(booking.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </ProtectedRoute>
  )
}