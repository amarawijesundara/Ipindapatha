'use client'

import { useState, useEffect } from 'react'
import { Button, Loading } from '@/components/ui'
import AdminTable from '@/components/ui/AdminTable'
import { TenantMealPeriodConfig, SupportedCurrency, TenantConfigurationSettings } from '@/types'

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
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    subdomain: '',
    domain: '',
    description: '',
    plan: 'basic',
    maxUsers: 10,
    maxBookings: 1000
  })

  // Configuration management state
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [tenantConfig, setTenantConfig] = useState<TenantConfigurationSettings | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      // First try to get a token for API calls
      let token = localStorage.getItem('token')
      
      // If no localStorage token, try to get one from cookie-based auth
      if (!token) {
        try {
          const tokenResponse = await fetch('/api/auth/token', {
            credentials: 'include'
          })
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            token = tokenData.token
          }
        } catch (error) {
          console.error('Failed to get token:', error)
          return
        }
      }
      
      if (!token) return

      const response = await fetch('/api/admin/tenants', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
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
      // Get token using the same method as fetchTenants
      let token = localStorage.getItem('token')
      
      if (!token) {
        try {
          const tokenResponse = await fetch('/api/auth/token', {
            credentials: 'include'
          })
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            token = tokenData.token
          }
        } catch (error) {
          console.error('Failed to get token:', error)
          return
        }
      }
      
      if (!token) return

      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
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

  const handleCreateTenant = async () => {
    setCreateLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm)
      })

      if (response.ok) {
        const data = await response.json()
        // Add new tenant to list
        setTenants(prev => [data.tenant, ...prev])
        setShowCreateModal(false)
        // Reset form
        setCreateForm({
          name: '',
          subdomain: '',
          domain: '',
          description: '',
          plan: 'basic',
          maxUsers: 10,
          maxBookings: 1000
        })
      } else {
        const error = await response.json()
        alert(`Failed to create tenant: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to create tenant:', error)
      alert('Failed to create tenant')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditTenant = async () => {
    if (!selectedTenant) return
    
    setEditLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: selectedTenant.name,
          domain: selectedTenant.domain,
          description: selectedTenant.description
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update tenant in list
        setTenants(prev => 
          prev.map(t => 
            t.id === selectedTenant.id 
              ? { ...t, ...data.tenant }
              : t
          )
        )
        setShowEditModal(false)
        setSelectedTenant(null)
      } else {
        const error = await response.json()
        alert(`Failed to update tenant: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to update tenant:', error)
      alert('Failed to update tenant')
    } finally {
      setEditLoading(false)
    }
  }

  // Configuration management functions
  const fetchTenantConfiguration = async (tenantId: number) => {
    setConfigLoading(true)
    try {
      let token = localStorage.getItem('token')

      if (!token) {
        const tokenResponse = await fetch('/api/auth/token', {
          credentials: 'include'
        })
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          token = tokenData.token
        }
      }

      if (!token) return

      const response = await fetch(`/api/admin/tenants/${tenantId}/configuration`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setTenantConfig(data.configuration)
      } else {
        console.error('Failed to fetch tenant configuration')
      }
    } catch (error) {
      console.error('Failed to fetch tenant configuration:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  const handleConfigureTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setShowConfigModal(true)
    fetchTenantConfiguration(tenant.id)
  }

  const saveTenantConfiguration = async () => {
    if (!selectedTenant || !tenantConfig) return

    setSavingConfig(true)
    try {
      let token = localStorage.getItem('token')

      if (!token) {
        const tokenResponse = await fetch('/api/auth/token', {
          credentials: 'include'
        })
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          token = tokenData.token
        }
      }

      if (!token) return

      const response = await fetch(`/api/admin/tenants/${selectedTenant.id}/configuration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(tenantConfig)
      })

      if (response.ok) {
        setShowConfigModal(false)
        setSelectedTenant(null)
        setTenantConfig(null)
      } else {
        const error = await response.json()
        alert(`Failed to save configuration: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to save tenant configuration:', error)
      alert('Failed to save configuration')
    } finally {
      setSavingConfig(false)
    }
  }

  const updateMealPeriodCost = (mealPeriodId: string, cost: number) => {
    if (!tenantConfig) return

    const updatedMealPeriods = tenantConfig.mealPeriods.map(period =>
      period.id === mealPeriodId ? { ...period, cost } : period
    )

    setTenantConfig({
      ...tenantConfig,
      mealPeriods: updatedMealPeriods
    })
  }

  const toggleMealPeriodEnabled = (mealPeriodId: string) => {
    if (!tenantConfig) return

    const updatedMealPeriods = tenantConfig.mealPeriods.map(period =>
      period.id === mealPeriodId ? { ...period, isEnabled: !period.isEnabled } : period
    )

    setTenantConfig({
      ...tenantConfig,
      mealPeriods: updatedMealPeriods
    })
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
              setSelectedTenant(tenant)
              setShowEditModal(true)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleConfigureTenant(tenant)}
            title="Configure meal periods and currency"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedTenant(tenant)}
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
            onClick={() => setShowCreateModal(true)}
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
        onRowClick={(tenant) => setSelectedTenant(tenant)}
      />

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-monastery-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-monastery-800">Create New Tenant</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-monastery-500 hover:text-monastery-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter tenant name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Subdomain *
                </label>
                <input
                  type="text"
                  value={createForm.subdomain}
                  onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="tenant-subdomain"
                />
                <p className="text-xs text-monastery-600 mt-1">Only lowercase letters, numbers, and hyphens allowed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Custom Domain (optional)
                </label>
                <input
                  type="text"
                  value={createForm.domain}
                  onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="custom-domain.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Brief description of the tenant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-monastery-800 mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-monastery-800 mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={createForm.maxUsers}
                    onChange={(e) => setCreateForm({ ...createForm, maxUsers: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-monastery-200 bg-monastery-50 rounded-b-xl">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTenant}
                  loading={createLoading}
                  disabled={!createForm.name || !createForm.subdomain}
                >
                  Create Tenant
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-monastery-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-monastery-800">Edit Tenant</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedTenant(null)
                  }}
                  className="text-monastery-500 hover:text-monastery-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={selectedTenant.name}
                  onChange={(e) => setSelectedTenant({ ...selectedTenant, name: e.target.value })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Subdomain (readonly)
                </label>
                <input
                  type="text"
                  value={selectedTenant.subdomain}
                  readOnly
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg bg-monastery-50 text-monastery-600"
                />
                <p className="text-xs text-monastery-600 mt-1">Subdomain cannot be changed after creation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={selectedTenant.domain || ''}
                  onChange={(e) => setSelectedTenant({ ...selectedTenant, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-monastery-800 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedTenant.description || ''}
                  onChange={(e) => setSelectedTenant({ ...selectedTenant, description: e.target.value })}
                  className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t border-monastery-200 bg-monastery-50 rounded-b-xl">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedTenant(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditTenant}
                  loading={editLoading}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Details Modal */}
      {selectedTenant && !showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-monastery-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-monastery-800">Tenant Details</h2>
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="text-monastery-500 hover:text-monastery-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Tenant Name</label>
                  <div className="text-monastery-800 font-medium">{selectedTenant.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Subdomain</label>
                  <div className="font-mono text-sm text-monastery-800">{selectedTenant.subdomain}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Custom Domain</label>
                  <div className="text-monastery-800">{selectedTenant.domain || 'Not set'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTenant.is_active 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {selectedTenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedTenant.description && (
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Description</label>
                  <div className="text-monastery-800 bg-monastery-50 rounded-lg p-3">
                    {selectedTenant.description}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <label className="block text-sm font-medium text-monastery-600 mb-2">Statistics</label>
                <div className="bg-monastery-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600">{selectedTenant.stats.total_users}</div>
                      <div className="text-sm text-monastery-600">Total Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-600">{selectedTenant.stats.total_bookings}</div>
                      <div className="text-sm text-monastery-600">Total Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-monastery-800">
                        {Math.floor((new Date().getTime() - new Date(selectedTenant.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                      </div>
                      <div className="text-sm text-monastery-600">Days Active</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Information */}
              {selectedTenant.subscription && (
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-2">Subscription</label>
                  <div className="bg-monastery-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-monastery-600">Plan</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedTenant.subscription.plan === 'enterprise' ? 'bg-primary-100 text-primary-800' :
                          selectedTenant.subscription.plan === 'professional' ? 'bg-success-100 text-success-800' :
                          'bg-monastery-100 text-monastery-800'
                        }`}>
                          {selectedTenant.subscription.plan}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-monastery-600">Status</div>
                        <div className="font-medium text-monastery-800">{selectedTenant.subscription.status}</div>
                      </div>
                      <div>
                        <div className="text-sm text-monastery-600">Limits</div>
                        <div className="text-sm text-monastery-800">
                          {selectedTenant.subscription.max_users} users, {selectedTenant.subscription.max_bookings} bookings
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Created</label>
                  <div className="text-monastery-800">{new Date(selectedTenant.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Last Updated</label>
                  <div className="text-monastery-800">{new Date(selectedTenant.updated_at).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-monastery-200 bg-monastery-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-monastery-600">
                  Tenant ID: #{selectedTenant.id}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowEditModal(true)
                    }}
                  >
                    Edit Tenant
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTenant(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-monastery-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-monastery-800">
                  Configure {selectedTenant.name}
                </h2>
                <button
                  onClick={() => {
                    setShowConfigModal(false)
                    setSelectedTenant(null)
                    setTenantConfig(null)
                  }}
                  className="text-monastery-500 hover:text-monastery-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loading size="lg" />
                  <span className="ml-2 text-monastery-600">Loading configuration...</span>
                </div>
              ) : tenantConfig ? (
                <div className="space-y-6">
                  {/* Currency Configuration */}
                  <div>
                    <h3 className="text-lg font-semibold text-monastery-800 mb-4">Currency Settings</h3>
                    <div className="bg-monastery-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-monastery-700 mb-2">
                        Base Currency
                      </label>
                      <select
                        value={tenantConfig.currency}
                        onChange={(e) => setTenantConfig({
                          ...tenantConfig,
                          currency: e.target.value as SupportedCurrency
                        })}
                        className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="LKR">LKR - Sri Lankan Rupee</option>
                      </select>
                      <p className="text-xs text-monastery-600 mt-1">
                        This currency will be used for all payments and pricing in this tenant.
                      </p>
                    </div>
                  </div>

                  {/* Meal Periods Configuration */}
                  <div>
                    <h3 className="text-lg font-semibold text-monastery-800 mb-4">Meal Period Settings</h3>
                    <div className="space-y-4">
                      {tenantConfig.mealPeriods.map((period) => (
                        <div key={period.id} className="bg-monastery-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{period.icon}</span>
                              <div>
                                <h4 className="font-medium text-monastery-800">{period.name}</h4>
                                <p className="text-sm text-monastery-600">{period.timeRange}</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={period.isEnabled}
                                onChange={() => toggleMealPeriodEnabled(period.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-monastery-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-monastery-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-monastery-700 mb-1">
                                Cost ({tenantConfig.currency})
                              </label>
                              <input
                                type="number"
                                value={period.cost}
                                onChange={(e) => updateMealPeriodCost(period.id, parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                min="0"
                                step="0.01"
                                disabled={!period.isEnabled}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-monastery-700 mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                value={period.description}
                                className="w-full px-3 py-2 border border-monastery-200 rounded-lg bg-monastery-100 text-monastery-600"
                                disabled
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-monastery-600">Failed to load configuration</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-monastery-200 bg-monastery-50 rounded-b-xl">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfigModal(false)
                    setSelectedTenant(null)
                    setTenantConfig(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveTenantConfiguration}
                  loading={savingConfig}
                  disabled={!tenantConfig}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}