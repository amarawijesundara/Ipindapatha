'use client'

import { useState, useEffect } from 'react'
import { Button, Loading } from '@/components/ui'
import { TenantMealPeriodConfig, SupportedCurrency, TenantConfigurationSettings } from '@/types'
import { useAuth } from '@/components/AuthContext'

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<TenantConfigurationSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchConfiguration()
  }, [])

  const fetchConfiguration = async () => {
    try {
      // Get current user's tenant ID (fallback to tenant 1 for super admins)
      const tenantId = user?.tenant_id || (user?.role === 'super_admin' ? 1 : null)

      if (!tenantId) {
        setError('No tenant information found. Please contact support.')
        return
      }

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
          setError('Authentication failed. Please refresh and try again.')
          return
        }
      }

      if (!token) {
        setError('Authentication required. Please log in again.')
        return
      }

      const response = await fetch(`/api/admin/tenants/${tenantId}/configuration`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.configuration)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to load organization settings')
      }
    } catch (error) {
      console.error('Failed to fetch configuration:', error)
      setError('Failed to load organization settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    if (!config) return

    const tenantId = user?.tenant_id || (user?.role === 'super_admin' ? 1 : null)
    if (!tenantId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
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
          setError('Authentication failed. Please refresh and try again.')
          return
        }
      }

      if (!token) {
        setError('Authentication required. Please log in again.')
        return
      }

      const response = await fetch(`/api/admin/tenants/${tenantId}/configuration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(config)
      })

      if (response.ok) {
        setSuccess('Organization settings saved successfully!')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save configuration:', error)
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateMealPeriodCost = (mealPeriodId: string, cost: number) => {
    if (!config) return

    const updatedMealPeriods = config.mealPeriods.map(period =>
      period.id === mealPeriodId ? { ...period, cost } : period
    )

    setConfig({
      ...config,
      mealPeriods: updatedMealPeriods
    })
  }

  const toggleMealPeriodEnabled = (mealPeriodId: string) => {
    if (!config) return

    const updatedMealPeriods = config.mealPeriods.map(period =>
      period.id === mealPeriodId ? { ...period, isEnabled: !period.isEnabled } : period
    )

    setConfig({
      ...config,
      mealPeriods: updatedMealPeriods
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-monastery-800">Organization Settings</h1>
        </div>
        <div className="flex items-center justify-center min-h-64">
          <Loading size="lg" />
          <span className="ml-2 text-monastery-600">Loading settings...</span>
        </div>
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-monastery-800">Organization Settings</h1>
        </div>
        <div className="bg-error-50 border border-error-200 rounded-lg p-6 text-center">
          <div className="text-error-800 font-medium mb-2">Failed to Load Settings</div>
          <div className="text-error-600 mb-4">{error}</div>
          <Button onClick={fetchConfiguration} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">Organization Settings</h1>
          <p className="text-monastery-600">Configure your organization&apos;s currency and meal periods</p>
        </div>
        <Button
          onClick={saveConfiguration}
          loading={saving}
          disabled={!config}
        >
          Save Changes
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-success-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-success-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {config && (
        <div className="space-y-8">
          {/* Currency Configuration */}
          <div className="bg-white rounded-lg border border-monastery-200 p-6">
            <h2 className="text-lg font-semibold text-monastery-800 mb-4">Currency Settings</h2>
            <div className="bg-monastery-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-monastery-700 mb-2">
                Base Currency
              </label>
              <select
                value={config.currency}
                onChange={(e) => setConfig({
                  ...config,
                  currency: e.target.value as SupportedCurrency
                })}
                className="w-full max-w-xs px-3 py-2 border border-monastery-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="LKR">LKR - Sri Lankan Rupee (Rs.)</option>
              </select>
              <p className="text-xs text-monastery-600 mt-2">
                This currency will be used for all payments and pricing in your organization.
                Changes will apply to new bookings only.
              </p>
            </div>
          </div>

          {/* Meal Periods Configuration */}
          <div className="bg-white rounded-lg border border-monastery-200 p-6">
            <h2 className="text-lg font-semibold text-monastery-800 mb-4">Meal Period Settings</h2>
            <p className="text-monastery-600 mb-6">
              Configure the meal periods available for booking and their costs.
            </p>
            <div className="space-y-4">
              {config.mealPeriods.map((period) => (
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
                        Cost ({config.currency === 'USD' ? '$' : 'Rs.'})
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

          {/* Information Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Important Notes</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Currency changes will only affect new bookings</li>
                    <li>Disabled meal periods will not be available for booking</li>
                    <li>Cost changes take effect immediately</li>
                    <li>Users will see prices in the selected currency</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}