'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLanguage } from '@/components/LanguageContext'
import { fetchSiteContent, clearContentCache, DEFAULT_CONTENT, getContentItem } from '@/lib/content'

interface ContentData {
  [category: string]: {
    [key: string]: {
      title?: string
      content: string
      type: 'text' | 'html' | 'markdown' | 'json'
    }
  }
}

interface ContentContextType {
  content: ContentData
  loading: boolean
  refreshContent: () => Promise<void>
  getContent: (category: string, key: string, fallback?: string) => string
}

const ContentContext = createContext<ContentContextType | undefined>(undefined)

export const useContent = () => {
  const context = useContext(ContentContext)
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider')
  }
  return context
}

interface ContentProviderProps {
  children: React.ReactNode
}

export const ContentProvider: React.FC<ContentProviderProps> = ({ children }) => {
  const [content, setContent] = useState<ContentData>(DEFAULT_CONTENT)
  const [loading, setLoading] = useState(true)
  const { currentLanguage } = useLanguage()

  const loadContent = async () => {
    try {
      setLoading(true)
      const dynamicContent = await fetchSiteContent(currentLanguage)
      
      // Merge with default content as fallback
      const mergedContent = { ...DEFAULT_CONTENT }
      
      Object.keys(dynamicContent).forEach(category => {
        if (!mergedContent[category]) {
          mergedContent[category] = {}
        }
        Object.keys(dynamicContent[category]).forEach(key => {
          mergedContent[category][key] = dynamicContent[category][key]
        })
      })
      
      setContent(mergedContent)
    } catch (error) {
      console.error('Error loading content:', error)
      // Use default content as fallback
      setContent(DEFAULT_CONTENT)
    } finally {
      setLoading(false)
    }
  }

  const refreshContent = async () => {
    clearContentCache(currentLanguage)
    await loadContent()
  }

  const getContent = (category: string, key: string, fallback?: string): string => {
    return getContentItem(content, category, key, fallback)
  }

  useEffect(() => {
    loadContent()
  }, [currentLanguage])

  const contextValue: ContentContextType = {
    content,
    loading,
    refreshContent,
    getContent
  }

  return (
    <ContentContext.Provider value={contextValue}>
      {children}
    </ContentContext.Provider>
  )
}