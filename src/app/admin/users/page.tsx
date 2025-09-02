'use client'

import { useState, useEffect } from 'react'
import { AdminTable, Button, Loading } from '@/components/ui'

interface User {
  id: number
  username: string
  email: string
  role: string
  phone_number?: string
  is_active: boolean
  created_at: string
  updated_at: string
  tenant?: {
    id: number
    name: string
    subdomain: string
    is_active: boolean
  }
  stats: {
    total_bookings: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    setActionLoading(user.id)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          isActive: !user.is_active
        })
      })

      if (response.ok) {
        // Update the user in the list
        setUsers(prev => 
          prev.map(u => 
            u.id === user.id 
              ? { ...u, is_active: !u.is_active }
              : u
          )
        )
      }
    } catch (error) {
      console.error('Failed to update user status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeUserRole = async (user: User, newRole: string) => {
    setActionLoading(user.id)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          role: newRole
        })
      })

      if (response.ok) {
        // Update the user in the list
        setUsers(prev => 
          prev.map(u => 
            u.id === user.id 
              ? { ...u, role: newRole }
              : u
          )
        )
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-error-100 text-error-800'
      case 'tenant_admin':
        return 'bg-primary-100 text-primary-800'
      case 'tenant_manager':
        return 'bg-warning-100 text-warning-800'
      case 'user':
        return 'bg-success-100 text-success-800'
      default:
        return 'bg-monastery-100 text-monastery-800'
    }
  }

  const columns = [
    {
      key: 'username',
      label: 'User',
      render: (user: User) => (
        <div>
          <div className="font-medium text-monastery-800">{user.username}</div>
          <div className="text-sm text-monastery-600">{user.email}</div>
          {user.phone_number && (
            <div className="text-sm text-monastery-500">{user.phone_number}</div>
          )}
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'tenant.name',
      label: 'Tenant',
      render: (user: User) => (
        user.tenant ? (
          <div>
            <div className="font-medium text-monastery-800">{user.tenant.name}</div>
            <div className="text-sm font-mono text-monastery-600">{user.tenant.subdomain}</div>
          </div>
        ) : (
          <span className="text-monastery-500 italic">No tenant</span>
        )
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'role',
      label: 'Role',
      render: (user: User) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
          {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'stats.total_bookings',
      label: 'Bookings',
      render: (user: User) => (
        <span className="font-semibold text-success-600">
          {user.stats.total_bookings}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (user: User) => (
        <div className="flex flex-col space-y-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.is_active 
              ? 'bg-success-100 text-success-800' 
              : 'bg-error-100 text-error-800'
          }`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
          {user.tenant && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user.tenant.is_active 
                ? 'bg-monastery-100 text-monastery-800' 
                : 'bg-warning-100 text-warning-800'
            }`}>
              Tenant: {user.tenant.is_active ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (user: User) => (
        <span className="text-monastery-600">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <div className="flex items-center space-x-2">
          <select
            value={user.role}
            onChange={(e) => handleChangeUserRole(user, e.target.value)}
            disabled={actionLoading === user.id}
            className="text-xs px-2 py-1 border border-monastery-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="user">User</option>
            <option value="tenant_manager">Tenant Manager</option>
            <option value="tenant_admin">Tenant Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <Button
            size="sm"
            variant={user.is_active ? 'error' : 'success'}
            onClick={() => handleToggleUserStatus(user)}
            disabled={actionLoading === user.id}
            loading={actionLoading === user.id}
          >
            {user.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedUser(user)}
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
          <h1 className="text-2xl font-bold text-monastery-800">User Management</h1>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  // Calculate stats
  const activeUsers = users.filter(u => u.is_active).length
  const usersByRole = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">User Management</h1>
          <p className="text-monastery-600">Manage users across all monastery tenants</p>
        </div>
        
        <div className="text-sm text-monastery-600">
          {users.length} user{users.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Total Users</div>
          <div className="text-2xl font-bold text-monastery-800">{users.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Active Users</div>
          <div className="text-2xl font-bold text-success-600">{activeUsers}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Super Admins</div>
          <div className="text-2xl font-bold text-error-600">{usersByRole['super_admin'] || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Tenant Admins</div>
          <div className="text-2xl font-bold text-primary-600">{usersByRole['tenant_admin'] || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-monastery-200 p-4">
          <div className="text-sm text-monastery-600">Regular Users</div>
          <div className="text-2xl font-bold text-monastery-800">{usersByRole['user'] || 0}</div>
        </div>
      </div>

      {/* Users Table */}
      <AdminTable
        data={users}
        columns={columns}
        searchPlaceholder="Search users by name, email, or tenant..."
        emptyMessage="No users found."
        onRowClick={(user) => setSelectedUser(user)}
      />

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-monastery-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-monastery-800">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
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
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Username</label>
                  <div className="text-monastery-800 font-medium">{selectedUser.username}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Email</label>
                  <div className="text-monastery-800">{selectedUser.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Phone Number</label>
                  <div className="text-monastery-800">{selectedUser.phone_number || 'Not provided'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Role</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              </div>

              {/* Tenant Information */}
              {selectedUser.tenant && (
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-2">Tenant</label>
                  <div className="bg-monastery-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-monastery-600">Name</div>
                        <div className="font-medium text-monastery-800">{selectedUser.tenant.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-monastery-600">Subdomain</div>
                        <div className="font-mono text-sm text-monastery-800">{selectedUser.tenant.subdomain}</div>
                      </div>
                      <div>
                        <div className="text-sm text-monastery-600">Tenant Status</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.tenant.is_active 
                            ? 'bg-success-100 text-success-800' 
                            : 'bg-error-100 text-error-800'
                        }`}>
                          {selectedUser.tenant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Address */}
              {selectedUser.address && (
                <div>
                  <label className="block text-sm font-medium text-monastery-600 mb-1">Address</label>
                  <div className="text-monastery-800 bg-monastery-50 rounded-lg p-3">
                    {selectedUser.address}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <label className="block text-sm font-medium text-monastery-600 mb-2">Statistics</label>
                <div className="bg-monastery-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-600">{selectedUser.stats.total_bookings}</div>
                      <div className="text-sm text-monastery-600">Total Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-monastery-800">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-monastery-600">Member Since</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-monastery-800">
                        {Math.floor((new Date().getTime() - new Date(selectedUser.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                      </div>
                      <div className="text-sm text-monastery-600">Days Active</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-sm font-medium text-monastery-600 mb-2">Account Status</label>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-2 rounded-full text-sm font-medium ${
                    selectedUser.is_active 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {selectedUser.is_active ? 'Active Account' : 'Inactive Account'}
                  </span>
                  <div className="text-sm text-monastery-600">
                    Last Updated: {new Date(selectedUser.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-monastery-200 bg-monastery-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-monastery-600">
                  User ID: #{selectedUser.id}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement edit user functionality
                      console.log('Edit user:', selectedUser.id)
                    }}
                  >
                    Edit User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}