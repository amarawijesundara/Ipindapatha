'use client'

import React, { useState, useEffect } from 'react'
import { Input, Card, CardContent } from '@/components/ui'
import { useAuth } from '@/components/AuthContext'

interface User {
  id: number
  username: string
  email: string
  phoneNumber?: string
  tenantId?: number
  role: string
}

interface UserSelectorProps {
  selectedUserId: number | null
  onUserSelect: (userId: number | null, user: User | null) => void
  placeholder?: string
  allowGuest?: boolean
}

export default function UserSelector({ 
  selectedUserId, 
  onUserSelect, 
  placeholder = "Select user to book for...",
  allowGuest = false 
}: UserSelectorProps) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId)
      setSelectedUser(user || null)
      if (user) {
        setSearchTerm(user.username)
      }
    }
  }, [selectedUserId, users])

  const fetchUsers = async () => {
    try {
      let endpoint = '/api/admin/users'
      
      // Add tenant filter for tenant_admin
      if (currentUser?.role === 'tenant_admin') {
        endpoint += `?tenantId=${currentUser.tenant_id}`
      }

      const response = await fetch(endpoint, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setSearchTerm(user.username)
    setIsOpen(false)
    onUserSelect(user.id, user)
  }

  const handleGuestSelect = () => {
    setSelectedUser(null)
    setSearchTerm('Guest Booking')
    setIsOpen(false)
    onUserSelect(null, null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    
    // Clear selection if input is cleared
    if (!e.target.value) {
      setSelectedUser(null)
      onUserSelect(null, null)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputBlur = () => {
    // Delay closing to allow clicking on options
    setTimeout(() => {
      if (!searchTerm && selectedUser) {
        setSearchTerm(selectedUser.username)
      }
      setIsOpen(false)
    }, 200)
  }

  if (loading) {
    return (
      <div className="relative">
        <Input
          value="Loading users..."
          disabled
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="w-full"
      />
      
      {isOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border shadow-lg">
          <CardContent className="p-0">
            {allowGuest && (
              <div
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                onClick={handleGuestSelect}
              >
                <div className="font-medium text-blue-600">Guest Booking</div>
                <div className="text-sm text-gray-500">Create booking without user account</div>
              </div>
            )}
            
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  {user.phoneNumber && (
                    <div className="text-sm text-gray-400">{user.phoneNumber}</div>
                  )}
                  <div className="text-xs text-gray-400">
                    Role: {user.role} {user.tenantId && `| Tenant: ${user.tenantId}`}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
      
      {selectedUser && (
        <div className="mt-2 p-2 bg-blue-50 rounded border">
          <div className="text-sm font-medium">Selected: {selectedUser.username}</div>
          <div className="text-xs text-gray-600">{selectedUser.email}</div>
        </div>
      )}
    </div>
  )
}