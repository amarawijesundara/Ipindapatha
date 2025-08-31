'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthContext'

interface DashboardStats {
  totalUsers: number
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  cancelledBookings: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.username}!</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3>Total Users</h3>
                <div className="stat-value">{stats?.totalUsers || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Total Bookings</h3>
                <div className="stat-value">{stats?.totalBookings || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Pending Bookings</h3>
                <div className="stat-value">{stats?.pendingBookings || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Confirmed Bookings</h3>
                <div className="stat-value">{stats?.confirmedBookings || 0}</div>
              </div>
            </div>

            <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h2 style={{ marginBottom: '1rem' }}>User Information</h2>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <p><strong>Username:</strong> {user?.username}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>Status:</strong> {user?.is_active ? 'Active' : 'Inactive'}</p>
                <p><strong>Member Since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <h3>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button className="btn btn-primary">
                  Create Booking
                </button>
                <button className="btn btn-secondary">
                  View Profile
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}