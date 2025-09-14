'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

interface ContentItem {
  id?: number
  content_key: string
  category: string
  language: string
  title?: string
  content: string
  content_type: 'text' | 'html' | 'markdown' | 'json'
  display_order: number
  is_active: boolean
}

interface ContentFormData {
  [key: string]: string
}

export default function AdminContentPage() {
  const { user, getAuthToken, refreshToken } = useAuth()
  const { t, currentLanguage } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<ContentItem[]>([])
  const [formData, setFormData] = useState<ContentFormData>({})
  const [activeTab, setActiveTab] = useState('site_info')
  const [message, setMessage] = useState({ type: '', text: '' })

  const contentCategories = [
    { id: 'site_info', label: 'Site Information', icon: '🏛️' },
    { id: 'navigation', label: 'Navigation', icon: '🧭' },
    { id: 'home_content', label: 'Home Page', icon: '🏠' },
    { id: 'features', label: 'Features', icon: '⭐' }
  ]

  // Default content structure
  const defaultContent: Partial<Record<string, ContentItem[]>> = {
    site_info: [
      { content_key: 'site_name', category: 'site_info', language: currentLanguage, title: 'Site Name', content: '', content_type: 'text', display_order: 1, is_active: true },
      { content_key: 'site_subtitle', category: 'site_info', language: currentLanguage, title: 'Site Subtitle', content: '', content_type: 'text', display_order: 2, is_active: true },
      { content_key: 'site_logo_text', category: 'site_info', language: currentLanguage, title: 'Logo Text', content: '', content_type: 'text', display_order: 3, is_active: true }
    ],
    navigation: [
      { content_key: 'home', category: 'navigation', language: currentLanguage, title: 'Home', content: '', content_type: 'text', display_order: 1, is_active: true },
      { content_key: 'my_account', category: 'navigation', language: currentLanguage, title: 'My Account', content: '', content_type: 'text', display_order: 2, is_active: true },
      { content_key: 'admin', category: 'navigation', language: currentLanguage, title: 'Admin', content: '', content_type: 'text', display_order: 3, is_active: true },
      { content_key: 'sign_in', category: 'navigation', language: currentLanguage, title: 'Sign In', content: '', content_type: 'text', display_order: 4, is_active: true },
      { content_key: 'sign_up', category: 'navigation', language: currentLanguage, title: 'Sign Up', content: '', content_type: 'text', display_order: 5, is_active: true },
      { content_key: 'logout', category: 'navigation', language: currentLanguage, title: 'Logout', content: '', content_type: 'text', display_order: 6, is_active: true }
    ],
    home_content: [
      { content_key: 'welcome_message', category: 'home_content', language: currentLanguage, title: 'Welcome Message', content: '', content_type: 'text', display_order: 1, is_active: true },
      { content_key: 'select_date_prompt', category: 'home_content', language: currentLanguage, title: 'Select Date Prompt', content: '', content_type: 'text', display_order: 2, is_active: true },
      { content_key: 'sign_in_prompt', category: 'home_content', language: currentLanguage, title: 'Sign In Prompt', content: '', content_type: 'text', display_order: 3, is_active: true },
      { content_key: 'about_title', category: 'home_content', language: currentLanguage, title: 'About Title', content: '', content_type: 'text', display_order: 4, is_active: true },
      { content_key: 'about_description', category: 'home_content', language: currentLanguage, title: 'About Description', content: '', content_type: 'text', display_order: 5, is_active: true }
    ],
    features: [
      { content_key: 'book_ceremony_title', category: 'features', language: currentLanguage, title: 'Book Ceremony - Title', content: '', content_type: 'text', display_order: 1, is_active: true },
      { content_key: 'book_ceremony_desc', category: 'features', language: currentLanguage, title: 'Book Ceremony - Description', content: '', content_type: 'text', display_order: 2, is_active: true },
      { content_key: 'prepare_offerings_title', category: 'features', language: currentLanguage, title: 'Prepare Offerings - Title', content: '', content_type: 'text', display_order: 3, is_active: true },
      { content_key: 'prepare_offerings_desc', category: 'features', language: currentLanguage, title: 'Prepare Offerings - Description', content: '', content_type: 'text', display_order: 4, is_active: true },
      { content_key: 'earn_merit_title', category: 'features', language: currentLanguage, title: 'Earn Merit - Title', content: '', content_type: 'text', display_order: 5, is_active: true },
      { content_key: 'earn_merit_desc', category: 'features', language: currentLanguage, title: 'Earn Merit - Description', content: '', content_type: 'text', display_order: 6, is_active: true }
    ]
  }

  useEffect(() => {
    if (user?.role === 'super_admin' || user?.role === 'tenant_admin') {
      fetchContent()
    }
  }, [user, currentLanguage])

  const fetchContent = async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' })
        router.push('/login')
        return
      }

      const response = await fetch(`/api/admin/content?language=${currentLanguage}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (result.success) {
        const contentItems = result.data || []
        setContent(contentItems)
        
        // Initialize form data
        const newFormData: ContentFormData = {}
        
        // For each category, ensure we have all default items
        Object.entries(defaultContent).forEach(([category, items]) => {
          items.forEach(defaultItem => {
            const existingItem = contentItems.find(
              (item: ContentItem) => item.content_key === defaultItem.content_key && item.language === currentLanguage
            )
            newFormData[defaultItem.content_key] = existingItem?.content || defaultItem.content
          })
        })
        
        setFormData(newFormData)
      } else {
        console.error('Failed to fetch content:', result.error)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      let token = await getAuthToken()
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' })
        router.push('/login')
        return
      }

      const contentToSave: ContentItem[] = []

      // Prepare content items for all categories
      Object.entries(defaultContent).forEach(([category, items]) => {
        items.forEach(defaultItem => {
          contentToSave.push({
            ...defaultItem,
            content: formData[defaultItem.content_key] || defaultItem.content
          })
        })
      })

      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: contentToSave })
      })

      if (response.status === 401 || response.status === 403) {
        // Try to refresh token
        const refreshed = await refreshToken()
        if (refreshed) {
          // Retry with fresh token
          token = await getAuthToken()
          if (token) {
            const retryResponse = await fetch('/api/admin/content', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ content: contentToSave })
            })
            
            const retryResult = await retryResponse.json()
            if (retryResult.success) {
              setMessage({ type: 'success', text: 'Content updated successfully!' })
              await fetchContent() // Refresh data
              return
            } else {
              setMessage({ type: 'error', text: retryResult.error || 'Failed to update content' })
              return
            }
          }
        }
        
        // If refresh failed, redirect to login
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' })
        router.push('/login')
        return
      }

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Content updated successfully!' })
        await fetchContent() // Refresh data
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update content' })
      }
    } catch (error) {
      console.error('Error saving content:', error)
      setMessage({ type: 'error', text: 'Failed to save content. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'super_admin' && user?.role !== 'tenant_admin') {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You need admin privileges to access content management.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-monastery-600">Loading content...</p>
      </div>
    )
  }

  const activeCategory = contentCategories.find(cat => cat.id === activeTab)
  const activeCategoryContent = defaultContent[activeTab] || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-monastery-800">Content Management</h1>
          <p className="text-monastery-600">Edit site content that will be displayed to users. Changes are applied immediately.</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-monastery-200">
        {/* Category Tabs */}
        <div className="border-b border-monastery-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {contentCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === category.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-monastery-500 hover:text-monastery-700 hover:border-monastery-300'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Form */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-monastery-800 mb-2 flex items-center space-x-2">
              <span>{activeCategory?.icon}</span>
              <span>{activeCategory?.label}</span>
            </h2>
            <p className="text-sm text-monastery-600">
              Language: <span className="font-medium">{currentLanguage === 'en' ? 'English' : 'සිංහල'}</span>
            </p>
          </div>

          <div className="space-y-6">
            {activeCategoryContent.map((item) => (
              <div key={item.content_key} className="space-y-2">
                <label className="block text-sm font-medium text-monastery-700">
                  {item.title}
                </label>
                  {item.content_type === 'text' ? (
                    <div>
                    <input
                      type="text"
                      value={formData[item.content_key] || ''}
                      onChange={(e) => handleInputChange(item.content_key, e.target.value)}
                      className="w-full px-3 py-2 border border-monastery-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder={`Enter ${item.title?.toLowerCase()}`}
                    />
                    </div>
                  ) : (
                    <div>
                    <textarea
                      value={formData[item.content_key] || ''}
                      onChange={(e) => handleInputChange(item.content_key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-monastery-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder={`Enter ${item.title?.toLowerCase()}`}
                    />
                    </div>
                  )}
                <p className="text-xs text-monastery-500">
                  Key: {item.content_key}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 border-t border-monastery-200 bg-monastery-50 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}