'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'

interface Template {
  id: number
  name: string
  description?: string
  daysOfWeek: number[]
  timeSlots: string[]
  maxBookings: number
  isActive: boolean
  priority: number
  validFrom?: string
  validUntil?: string
  createdAt: string
  updatedAt: string
}

interface Override {
  id: number
  date: string
  timeSlot?: string
  overrideType: 'disable' | 'enable' | 'modify_capacity'
  maxBookings?: number
  reason?: string
  isActive: boolean
  createdBy: {
    id: number
    username: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

const DAYS_OF_WEEK = {
  1: 'Monday',
  2: 'Tuesday', 
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

export default function AvailabilityManagement() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'templates' | 'overrides' | 'generate'>('templates')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    daysOfWeek: [] as number[],
    timeSlots: [] as string[],
    maxBookings: 1,
    priority: 0,
    validFrom: '',
    validUntil: ''
  })

  // Override form state
  const [overrideForm, setOverrideForm] = useState({
    date: '',
    timeSlot: '',
    overrideType: 'disable' as 'disable' | 'enable' | 'modify_capacity',
    maxBookings: 1,
    reason: ''
  })

  // Generation form state
  const [generateForm, setGenerateForm] = useState({
    startDate: '',
    endDate: ''
  })

  const [timeSlotInput, setTimeSlotInput] = useState('')

  useEffect(() => {
    fetchTemplates()
    fetchOverrides()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/availability/templates', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      } else {
        setError('Failed to fetch templates')
      }
    } catch (error) {
      setError('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchOverrides = async () => {
    try {
      const response = await fetch('/api/admin/availability/overrides', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setOverrides(data.overrides)
      } else {
        setError('Failed to fetch overrides')
      }
    } catch (error) {
      setError('Failed to fetch overrides')
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/availability/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(templateForm)
      })

      if (response.ok) {
        setSuccess('Template created successfully')
        setTemplateForm({
          name: '',
          description: '',
          daysOfWeek: [],
          timeSlots: [],
          maxBookings: 1,
          priority: 0,
          validFrom: '',
          validUntil: ''
        })
        fetchTemplates()
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to create template')
      }
    } catch (error) {
      setError('Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/availability/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(overrideForm)
      })

      if (response.ok) {
        setSuccess('Override created successfully')
        setOverrideForm({
          date: '',
          timeSlot: '',
          overrideType: 'disable',
          maxBookings: 1,
          reason: ''
        })
        fetchOverrides()
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to create override')
      }
    } catch (error) {
      setError('Failed to create override')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/availability/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(generateForm)
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Generated ${data.generatedSlots} availability slots for ${data.startDate} to ${data.endDate}`)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to generate availability')
      }
    } catch (error) {
      setError('Failed to generate availability')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      const response = await fetch(`/api/admin/availability/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setSuccess('Template deleted successfully')
        fetchTemplates()
      } else {
        setError('Failed to delete template')
      }
    } catch (error) {
      setError('Failed to delete template')
    }
  }

  const handleDeleteOverride = async (overrideId: number) => {
    if (!confirm('Are you sure you want to delete this override?')) return
    
    try {
      const response = await fetch(`/api/admin/availability/overrides/${overrideId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setSuccess('Override deleted successfully')
        fetchOverrides()
      } else {
        setError('Failed to delete override')
      }
    } catch (error) {
      setError('Failed to delete override')
    }
  }

  const addTimeSlot = () => {
    if (timeSlotInput && !templateForm.timeSlots.includes(timeSlotInput)) {
      setTemplateForm(prev => ({
        ...prev,
        timeSlots: [...prev.timeSlots, timeSlotInput].sort()
      }))
      setTimeSlotInput('')
    }
  }

  const removeTimeSlot = (timeSlot: string) => {
    setTemplateForm(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(ts => ts !== timeSlot)
    }))
  }

  const toggleDayOfWeek = (day: number) => {
    setTemplateForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) 
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }))
  }

  return (
    <div className="min-h-screen bg-secondary-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900">Availability Management</h1>
          <p className="text-secondary-600 mt-2">Manage availability templates and overrides</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
            {success}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-4 border-b border-secondary-200">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('overrides')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'overrides'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              Overrides ({overrides.length})
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'generate'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              Generate
            </button>
          </div>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Template Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Template</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Template Name *
                    </label>
                    <Input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Business Hours"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={2}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Days of Week *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(DAYS_OF_WEEK).map(([day, name]) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDayOfWeek(parseInt(day))}
                          className={`px-3 py-1 rounded text-sm ${
                            templateForm.daysOfWeek.includes(parseInt(day))
                              ? 'bg-primary-500 text-white'
                              : 'bg-secondary-200 text-secondary-700'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Time Slots *
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        type="time"
                        value={timeSlotInput}
                        onChange={(e) => setTimeSlotInput(e.target.value)}
                        placeholder="HH:MM"
                      />
                      <Button type="button" onClick={addTimeSlot}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {templateForm.timeSlots.map(timeSlot => (
                        <span
                          key={timeSlot}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm"
                        >
                          {timeSlot}
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(timeSlot)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Max Bookings
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={templateForm.maxBookings}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, maxBookings: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Priority
                      </label>
                      <Input
                        type="number"
                        value={templateForm.priority}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    fullWidth 
                    loading={loading}
                    disabled={!templateForm.name || templateForm.daysOfWeek.length === 0 || templateForm.timeSlots.length === 0}
                  >
                    Create Template
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Templates List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-secondary-900">Existing Templates</h3>
              {templates.map(template => (
                <Card key={template.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-secondary-900">{template.name}</h4>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          template.isActive ? 'bg-success-100 text-success-800' : 'bg-secondary-200 text-secondary-600'
                        }`}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-secondary-600 mb-2">{template.description}</p>
                    )}
                    <div className="text-sm text-secondary-700">
                      <p><strong>Days:</strong> {template.daysOfWeek.map(d => DAYS_OF_WEEK[d]).join(', ')}</p>
                      <p><strong>Times:</strong> {template.timeSlots.join(', ')}</p>
                      <p><strong>Max Bookings:</strong> {template.maxBookings} | <strong>Priority:</strong> {template.priority}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Overrides Tab */}
        {activeTab === 'overrides' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Override Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Override</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateOverride} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Date *
                    </label>
                    <Input
                      type="date"
                      value={overrideForm.date}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Time Slot (optional - leave empty for full day)
                    </label>
                    <Input
                      type="time"
                      value={overrideForm.timeSlot}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, timeSlot: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Override Type *
                    </label>
                    <select
                      value={overrideForm.overrideType}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, overrideType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg"
                      required
                    >
                      <option value="disable">Disable</option>
                      <option value="enable">Enable</option>
                      <option value="modify_capacity">Modify Capacity</option>
                    </select>
                  </div>

                  {overrideForm.overrideType === 'modify_capacity' && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Max Bookings *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={overrideForm.maxBookings}
                        onChange={(e) => setOverrideForm(prev => ({ ...prev, maxBookings: parseInt(e.target.value) }))}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Reason (optional)
                    </label>
                    <textarea
                      value={overrideForm.reason}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Reason for this override"
                      rows={2}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    fullWidth 
                    loading={loading}
                    disabled={!overrideForm.date || !overrideForm.overrideType}
                  >
                    Create Override
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Overrides List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-secondary-900">Existing Overrides</h3>
              {overrides.slice(0, 10).map(override => (
                <Card key={override.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-secondary-900">
                          {override.date} {override.timeSlot && `at ${override.timeSlot}`}
                        </h4>
                        <p className="text-sm text-secondary-600">
                          {override.overrideType} by {override.createdBy.username}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          override.isActive ? 'bg-warning-100 text-warning-800' : 'bg-secondary-200 text-secondary-600'
                        }`}>
                          {override.overrideType}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteOverride(override.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {override.reason && (
                      <p className="text-sm text-secondary-700 mt-2">
                        <strong>Reason:</strong> {override.reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="max-w-lg mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Generate Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateAvailability} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      value={generateForm.startDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      End Date *
                    </label>
                    <Input
                      type="date"
                      value={generateForm.endDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-primary-800">
                      This will generate availability slots based on your active templates and apply any overrides for the selected date range.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    fullWidth 
                    loading={loading}
                    disabled={!generateForm.startDate || !generateForm.endDate}
                  >
                    Generate Availability
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}