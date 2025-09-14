'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

export default function SettingsPage() {
  const { getAuthToken, refreshToken } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: false,
    maxTenantsPerDay: 5,
    maxUsersPerTenant: 100,
    maxBookingsPerUser: 10,
    sessionTimeout: 24,
    enableAuditLog: true,
    enableNotifications: true,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let token = await getAuthToken()
      if (!token) {
        setError('Authentication required. Please log in.')
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings })
      })

      if (response.status === 401 || response.status === 403) {
        // Try to refresh token
        const refreshed = await refreshToken()
        if (refreshed) {
          // Retry with fresh token
          token = await getAuthToken()
          if (token) {
            const retryResponse = await fetch('/api/admin/settings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ settings })
            })
            
            if (retryResponse.ok) {
              alert('Settings saved successfully!')
              return
            } else {
              const errorData = await retryResponse.json()
              setError(`Failed to save settings: ${errorData.error || errorData.message}`)
              return
            }
          }
        }
        
        // If refresh failed, redirect to login
        setError('Session expired. Please log in again.')
        router.push('/login')
        return
      }

      if (response.ok) {
        alert('Settings saved successfully!')
      } else {
        const errorData = await response.json()
        setError(`Failed to save settings: ${errorData.error || errorData.message}`)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setError('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSettings({
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: false,
      maxTenantsPerDay: 5,
      maxUsersPerTenant: 100,
      maxBookingsPerUser: 10,
      sessionTimeout: 24,
      enableAuditLog: true,
      enableNotifications: true,
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">Platform Settings</h1>
          <p className="text-monastery-600">Configure global platform settings and preferences</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-monastery-50 border border-monastery-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-monastery-700">
                <strong>Note:</strong> Site name and branding can be managed through the 
                <strong> Content Management</strong> section. This settings page is for system configuration only.
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-monastery-800">Maintenance Mode</div>
                <div className="text-sm text-monastery-600">Prevent new user access to the platform</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-monastery-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-monastery-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-monastery-800">Allow Registrations</div>
                <div className="text-sm text-monastery-600">Allow new users to register</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowRegistrations}
                  onChange={(e) => setSettings({ ...settings, allowRegistrations: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-monastery-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-monastery-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-monastery-800">Email Verification</div>
                <div className="text-sm text-monastery-600">Require email verification for new accounts</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireEmailVerification}
                  onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-monastery-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-monastery-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Limits & Quotas */}
        <Card>
          <CardHeader>
            <CardTitle>Limits & Quotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-monastery-800 mb-2">
                Max Tenants Per Day
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxTenantsPerDay}
                onChange={(e) => setSettings({ ...settings, maxTenantsPerDay: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-monastery-800 mb-2">
                Max Users Per Tenant
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.maxUsersPerTenant}
                onChange={(e) => setSettings({ ...settings, maxUsersPerTenant: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-monastery-800 mb-2">
                Max Bookings Per User
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.maxBookingsPerUser}
                onChange={(e) => setSettings({ ...settings, maxBookingsPerUser: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-monastery-800 mb-2">
                Session Timeout (hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-monastery-800">Audit Logging</div>
                <div className="text-sm text-monastery-600">Track admin actions and changes</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAuditLog}
                  onChange={(e) => setSettings({ ...settings, enableAuditLog: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-monastery-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-monastery-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-monastery-800">Email Notifications</div>
                <div className="text-sm text-monastery-600">Send email notifications for important events</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-monastery-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-monastery-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-monastery-600">Platform Version</span>
              <span className="font-mono text-monastery-800">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-monastery-600">Database Status</span>
              <span className="text-success-600">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-monastery-600">API Status</span>
              <span className="text-success-600">Healthy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-monastery-600">Last Backup</span>
              <span className="text-monastery-800">2 hours ago</span>
            </div>
            <div className="flex justify-between">
              <span className="text-monastery-600">Uptime</span>
              <span className="text-monastery-800">7 days, 14 hours</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-error-200">
        <CardHeader>
          <CardTitle className="text-error-800">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-error-50 rounded-lg">
            <div>
              <div className="font-medium text-error-800">Clear All Cache</div>
              <div className="text-sm text-error-600">Clear all cached data across the platform</div>
            </div>
            <Button variant="error" size="sm">
              Clear Cache
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-error-50 rounded-lg">
            <div>
              <div className="font-medium text-error-800">Export Platform Data</div>
              <div className="text-sm text-error-600">Download complete platform data backup</div>
            </div>
            <Button variant="outline" size="sm">
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}