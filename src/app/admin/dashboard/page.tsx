'use client'

import { useState, useEffect } from 'react'
import { StatsCard, AdminTable, Loading, Button } from '@/components/ui'

interface PlatformStats {
  overview: {
    total_tenants: number
    active_tenants: number
    inactive_tenants: number
    total_users: number
    active_users: number
    inactive_users: number
    total_bookings: number
    recent_bookings: number
  }
  growth: {
    tenants: {
      current_period: number
      previous_period: number
      growth_percentage: number
    }
    users: {
      current_period: number
      previous_period: number
      growth_percentage: number
    }
    bookings: {
      current_period: number
      previous_period: number
      growth_percentage: number
    }
  }
  distribution: {
    tenants_by_plan: Array<{ plan: string; count: number }>
    users_by_role: Array<{ role: string; count: number }>
  }
  recent_activity: {
    new_tenants: Array<{
      id: number
      name: string
      subdomain: string
      created_at: string
      user_count: number
      booking_count: number
    }>
  }
  top_tenants: Array<{
    id: number
    name: string
    subdomain: string
    user_count: number
    booking_count: number
    subscription_plan: string
    subscription_status: string
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/admin/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const recentTenantsColumns = [
    {
      key: 'name',
      label: 'Tenant Name',
      sortable: true,
      searchable: true,
    },
    {
      key: 'subdomain',
      label: 'Subdomain',
      render: (tenant: any) => (
        <span className="font-mono text-sm bg-monastery-100 px-2 py-1 rounded">
          {tenant.subdomain}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'user_count',
      label: 'Users',
      render: (tenant: any) => (
        <span className="font-semibold text-primary-600">
          {tenant.user_count}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'booking_count',
      label: 'Bookings',
      render: (tenant: any) => (
        <span className="font-semibold text-success-600">
          {tenant.booking_count}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (tenant: any) => (
        <span className="text-monastery-600">
          {new Date(tenant.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
  ]

  const topTenantsColumns = [
    {
      key: 'name',
      label: 'Tenant Name',
      sortable: true,
      searchable: true,
    },
    {
      key: 'subdomain',
      label: 'Subdomain',
      render: (tenant: any) => (
        <span className="font-mono text-sm bg-monastery-100 px-2 py-1 rounded">
          {tenant.subdomain}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'user_count',
      label: 'Users',
      render: (tenant: any) => (
        <span className="font-semibold text-primary-600">
          {tenant.user_count}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'booking_count',
      label: 'Bookings',
      render: (tenant: any) => (
        <span className="font-semibold text-success-600">
          {tenant.booking_count}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'subscription_plan',
      label: 'Plan',
      render: (tenant: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          tenant.subscription_plan === 'enterprise' ? 'bg-primary-100 text-primary-800' :
          tenant.subscription_plan === 'professional' ? 'bg-success-100 text-success-800' :
          'bg-monastery-100 text-monastery-800'
        }`}>
          {tenant.subscription_plan || 'None'}
        </span>
      ),
      sortable: true,
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-monastery-800">Admin Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <StatsCard
              key={i}
              title="Loading..."
              value={0}
              loading={true}
            />
          ))}
        </div>
        <Loading size="lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-monastery-800 mb-2">Failed to Load</h2>
          <p className="text-monastery-600 mb-4">Unable to fetch dashboard statistics</p>
          <Button onClick={fetchStats}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">Admin Dashboard</h1>
          <p className="text-monastery-600">Platform overview and key metrics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-monastery-700">Period:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1 border border-monastery-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Tenants"
          value={stats.overview.total_tenants}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          change={stats.growth.tenants.growth_percentage !== 0 ? {
            value: stats.growth.tenants.growth_percentage,
            type: stats.growth.tenants.growth_percentage > 0 ? 'increase' : 'decrease',
            period: `vs last ${period} days`
          } : undefined}
          description={`${stats.overview.active_tenants} active`}
        />

        <StatsCard
          title="Total Users"
          value={stats.overview.total_users}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          }
          change={stats.growth.users.growth_percentage !== 0 ? {
            value: stats.growth.users.growth_percentage,
            type: stats.growth.users.growth_percentage > 0 ? 'increase' : 'decrease',
            period: `vs last ${period} days`
          } : undefined}
          description={`${stats.overview.active_users} active`}
        />

        <StatsCard
          title="Total Bookings"
          value={stats.overview.total_bookings}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          change={stats.growth.bookings.growth_percentage !== 0 ? {
            value: stats.growth.bookings.growth_percentage,
            type: stats.growth.bookings.growth_percentage > 0 ? 'increase' : 'decrease',
            period: `vs last ${period} days`
          } : undefined}
          description={`${stats.overview.recent_bookings} recent`}
        />

        <StatsCard
          title="Active Tenants"
          value={stats.overview.active_tenants}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          description={`${((stats.overview.active_tenants / stats.overview.total_tenants) * 100).toFixed(1)}% of total`}
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-monastery-200 p-6">
          <h3 className="text-lg font-semibold text-monastery-800 mb-4">Users by Role</h3>
          <div className="space-y-3">
            {stats.distribution.users_by_role.map((item) => (
              <div key={item.role} className="flex items-center justify-between">
                <span className="capitalize text-monastery-700">{item.role.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-monastery-100 rounded-full">
                    <div 
                      className="h-2 bg-primary-500 rounded-full"
                      style={{ 
                        width: `${(item.count / stats.overview.total_users) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="font-semibold text-monastery-800 w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-monastery-200 p-6">
          <h3 className="text-lg font-semibold text-monastery-800 mb-4">Tenants by Plan</h3>
          <div className="space-y-3">
            {stats.distribution.tenants_by_plan.map((item) => (
              <div key={item.plan} className="flex items-center justify-between">
                <span className="capitalize text-monastery-700">{item.plan}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-monastery-100 rounded-full">
                    <div 
                      className="h-2 bg-success-500 rounded-full"
                      style={{ 
                        width: `${(item.count / stats.overview.total_tenants) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="font-semibold text-monastery-800 w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-monastery-800 mb-4">Recent Tenants</h3>
          <AdminTable
            data={stats.recent_activity.new_tenants}
            columns={recentTenantsColumns}
            searchPlaceholder="Search recent tenants..."
            emptyMessage="No recent tenants found"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-monastery-800 mb-4">Top Tenants</h3>
          <AdminTable
            data={stats.top_tenants}
            columns={topTenantsColumns}
            searchPlaceholder="Search top tenants..."
            emptyMessage="No tenants found"
          />
        </div>
      </div>
    </div>
  )
}