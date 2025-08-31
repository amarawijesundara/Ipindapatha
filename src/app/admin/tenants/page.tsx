'use client'

import { useState, useEffect } from 'react'
import { AdminTable, Button, Loading } from '@/components/ui'

interface Tenant {
  id: number
  name: string
  subdomain: string
  domain?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  subscription?: {
    plan: string
    status: string
    max_users: number
    max_bookings: number
  }
  stats: {
    total_users: number
    total_bookings: number
  }
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/admin/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants)
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (tenant: Tenant) => {
    setActionLoading(tenant.id)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !tenant.is_active
        })
      })

      if (response.ok) {
        // Update the tenant in the list
        setTenants(prev => 
          prev.map(t => 
            t.id === tenant.id 
              ? { ...t, is_active: !t.is_active }
              : t
          )
        )
      }
    } catch (error) {
      console.error('Failed to update tenant status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Tenant Name',
      render: (tenant: Tenant) => (
        <div>
          <div className="font-medium text-monastery-800">{tenant.name}</div>
          {tenant.description && (
            <div className="text-sm text-monastery-600">{tenant.description}</div>
          )}
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'subdomain',
      label: 'Subdomain',
      render: (tenant: Tenant) => (
        <span className="font-mono text-sm bg-monastery-100 px-2 py-1 rounded">
          {tenant.subdomain}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'subscription.plan',
      label: 'Plan',
      render: (tenant: Tenant) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          tenant.subscription?.plan === 'enterprise' ? 'bg-primary-100 text-primary-800' :
          tenant.subscription?.plan === 'professional' ? 'bg-success-100 text-success-800' :
          'bg-monastery-100 text-monastery-800'
        }`}>
          {tenant.subscription?.plan || 'None'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'stats.total_users',
      label: 'Users',
      render: (tenant: Tenant) => (
        <span className="font-semibold text-primary-600">
          {tenant.stats.total_users}
          {tenant.subscription?.max_users && (
            <span className="text-monastery-500 text-xs ml-1">
              / {tenant.subscription.max_users}
            </span>
          )}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'stats.total_bookings',
      label: 'Bookings',
      render: (tenant: Tenant) => (
        <span className="font-semibold text-success-600">
          {tenant.stats.total_bookings}
          {tenant.subscription?.max_bookings && (
            <span className="text-monastery-500 text-xs ml-1">
              / {tenant.subscription.max_bookings}
            </span>
          )}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (tenant: Tenant) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          tenant.is_active 
            ? 'bg-success-100 text-success-800' 
            : 'bg-error-100 text-error-800'
        }`}>
          {tenant.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (tenant: Tenant) => (
        <span className="text-monastery-600">
          {new Date(tenant.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (tenant: Tenant) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={tenant.is_active ? 'error' : 'success'}
            onClick={() => handleToggleStatus(tenant)}
            disabled={actionLoading === tenant.id}
            loading={actionLoading === tenant.id}
          >
            {tenant.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // TODO: Implement edit functionality
              console.log('Edit tenant:', tenant.id)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // TODO: Implement view details functionality
              console.log('View tenant details:', tenant.id)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-monastery-800">Tenant Management</h1>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">Tenant Management</h1>
          <p className="text-monastery-600">Manage monastery tenants and their subscriptions</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-monastery-600">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} total
          </div>
          <Button
            onClick={() => {
              // TODO: Implement create tenant functionality
              console.log('Create new tenant')
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Total Tenants</div>
          <div className="text-2xl font-bold text-monastery-800">{tenants.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Active Tenants</div>
          <div className="text-2xl font-bold text-success-600">
            {tenants.filter(t => t.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Total Users</div>
          <div className="text-2xl font-bold text-primary-600">
            {tenants.reduce((sum, t) => sum + t.stats.total_users, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Total Bookings</div>
          <div className="text-2xl font-bold text-monastery-800">
            {tenants.reduce((sum, t) => sum + t.stats.total_bookings, 0)}
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <AdminTable
        data={tenants}
        columns={columns}
        searchPlaceholder="Search tenants by name or subdomain..."
        emptyMessage="No tenants found. Create your first tenant to get started."
        onRowClick={(tenant) => {
          // TODO: Implement tenant details view
          console.log('View tenant:', tenant.name)
        }}
      />
    </div>
  )
}