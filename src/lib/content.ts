interface ContentItem {
  title?: string
  content: string
  type: 'text' | 'html' | 'markdown' | 'json'
}

interface ContentData {
  [category: string]: {
    [key: string]: ContentItem
  }
}

// Cache for content data
let contentCache: Map<string, { data: ContentData; timestamp: number }> = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch site content from API with caching
 */
export async function fetchSiteContent(
  language: string = 'en',
  category?: string,
  forceRefresh: boolean = false
): Promise<ContentData> {
  const cacheKey = `${language}-${category || 'all'}`
  
  // Check cache first
  if (!forceRefresh) {
    const cached = contentCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
  }

  try {
    const params = new URLSearchParams({ language })
    if (category) {
      params.append('category', category)
    }

    const response = await fetch(`/api/content?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch content')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch content')
    }

    // Update cache
    contentCache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now()
    })

    return result.data

  } catch (error) {
    console.error('Error fetching site content:', error)
    // Return empty object on error
    return {}
  }
}

/**
 * Get specific content item with fallback
 */
export function getContentItem(
  content: ContentData,
  category: string,
  key: string,
  fallback?: string
): string {
  const item = content[category]?.[key]
  return item?.content || fallback || ''
}

/**
 * Get content with title
 */
export function getContentWithTitle(
  content: ContentData,
  category: string,
  key: string
): { title?: string; content: string } {
  const item = content[category]?.[key]
  return {
    title: item?.title,
    content: item?.content || ''
  }
}

/**
 * Clear content cache
 */
export function clearContentCache(language?: string, category?: string) {
  if (language || category) {
    const cacheKey = `${language || 'en'}-${category || 'all'}`
    contentCache.delete(cacheKey)
  } else {
    contentCache.clear()
  }
}

/**
 * Default content structure for fallback
 */
export const DEFAULT_CONTENT = {
  site_info: {
    site_name: { content: 'Monastery Dhane Booking', type: 'text' as const },
    site_subtitle: { content: 'Book your offering ceremony with devotion', type: 'text' as const },
    site_logo_text: { content: 'JA', type: 'text' as const }
  },
  navigation: {
    home: { content: 'Home', type: 'text' as const },
    my_account: { content: 'My Account', type: 'text' as const },
    admin: { content: 'Admin', type: 'text' as const },
    sign_in: { content: 'Sign In', type: 'text' as const },
    sign_up: { content: 'Sign Up', type: 'text' as const },
    logout: { content: 'Logout', type: 'text' as const }
  },
  home_content: {
    welcome_message: { 
      content: 'Welcome, {{username}}', 
      type: 'text' as const 
    },
    select_date_prompt: { 
      content: 'Select a date below to book your Dhane offering ceremony', 
      type: 'text' as const 
    },
    sign_in_prompt: { 
      content: 'Please sign in to book your Dhane offering ceremony', 
      type: 'text' as const 
    },
    about_title: { 
      content: 'About Dhane Offerings', 
      type: 'text' as const 
    },
    about_description: { 
      content: 'Dhane is a Buddhist practice of offering food and necessities to monks. It\'s a meritorious act that brings spiritual benefits to the devotee and supports the monastic community.', 
      type: 'text' as const 
    }
  },
  features: {
    book_ceremony_title: { content: 'Book Your Ceremony', type: 'text' as const },
    book_ceremony_desc: { content: 'Select an available date and time for your offering ceremony', type: 'text' as const },
    prepare_offerings_title: { content: 'Prepare Offerings', type: 'text' as const },
    prepare_offerings_desc: { content: 'Bring rice, curry, fruits, and other necessities for the monks', type: 'text' as const },
    earn_merit_title: { content: 'Earn Merit', type: 'text' as const },
    earn_merit_desc: { content: 'Gain spiritual merit through your generous offering to the Sangha', type: 'text' as const }
  }
}