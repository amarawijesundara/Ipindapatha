'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  initialized: boolean // Track if auth has been initialized
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_INITIALIZED'; payload: boolean }

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  verifyToken: () => Promise<void>
  getAuthToken: () => Promise<string | null>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const initialState: AuthState = {
  user: null,
  token: null,
  loading: true, // Start with loading true to prevent premature redirects
  error: null,
  initialized: false, // Track initialization state
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, initialized: true }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
        initialized: true,
      }
    case 'LOGOUT':
      return { ...initialState, loading: false, initialized: true }
    case 'UPDATE_USER':
      return { ...state, user: action.payload }
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload, loading: false }
    default:
      return state
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const verifyToken = async (retryCount = 0, maxRetries = 3): Promise<void> => {
    console.log(`🔍 AuthContext: Starting token verification (attempt ${retryCount + 1}/${maxRetries + 1})`)

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include', // Include cookies
        cache: 'no-cache', // Prevent caching issues
      })

      console.log('🔍 AuthContext: Token verification response status:', response.status)

      if (!response.ok) {
        // Only logout on 401/403 errors (token invalid/expired)
        if (response.status === 401 || response.status === 403) {
          console.log('🚫 AuthContext: Token invalid/expired, logging out')

          // Clear expired token by calling logout API to clean cookies
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            })
          } catch (logoutError) {
            console.debug('Logout API call failed during token cleanup:', logoutError)
          }

          dispatch({ type: 'LOGOUT' })
        } else if (retryCount < maxRetries && (response.status >= 500 || response.status === 0)) {
          // Retry on server errors or network issues
          console.log(`🔄 AuthContext: Retrying token verification in ${(retryCount + 1) * 1000}ms`)
          setTimeout(() => verifyToken(retryCount + 1, maxRetries), (retryCount + 1) * 1000)
          return
        } else {
          // For other errors or max retries reached, mark as initialized but unauthenticated
          console.error('❌ AuthContext: Token verification failed after retries:', response.status)
          dispatch({ type: 'SET_INITIALIZED', payload: true })
        }
        return
      }

      const data = await response.json()
      console.log('✅ AuthContext: Token verification successful, user:', data.user?.username)

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: 'authenticated' }, // Use clearer token state
      })
    } catch (error) {
      console.error('❌ AuthContext: Token verification network error:', error)

      if (retryCount < maxRetries) {
        // Retry on network errors
        console.log(`🔄 AuthContext: Retrying after network error in ${(retryCount + 1) * 1000}ms`)
        setTimeout(() => verifyToken(retryCount + 1, maxRetries), (retryCount + 1) * 1000)
      } else {
        // Max retries reached - mark as initialized but unauthenticated
        console.error('❌ AuthContext: Max retries reached, marking as initialized')
        dispatch({ type: 'SET_INITIALIZED', payload: true })
      }
    }
  }

  useEffect(() => {
    // Always try to verify token from cookies on app start
    verifyToken()
  }, [])

  const login = async (identifier: string, password: string): Promise<void> => {
    console.log('🔑 AuthContext: Starting login for:', identifier)
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ identifier, password }),
      })

      console.log('🔑 AuthContext: Login response status:', response.status)

      const data = await response.json()

      if (!response.ok) {
        console.log('❌ AuthContext: Login failed:', data.message)
        throw new Error(data.message || 'Login failed')
      }

      console.log('✅ AuthContext: Login successful for user:', data.user?.username)

      // No need to store token in localStorage - it's now in httpOnly cookie
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: 'authenticated' },
      })
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Login failed',
      })
      throw error
    }
  }

  const register = async (username: string, email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ username, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      // No need to store token in localStorage - it's now in httpOnly cookie
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: 'authenticated' },
      })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Registration failed',
      })
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    console.log('🚪 AuthContext: Starting logout')

    try {
      // Call logout API to clear httpOnly cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      console.log('✅ AuthContext: Logout API call successful')
    } catch (error) {
      console.error('❌ AuthContext: Logout API call failed:', error)
    }

    // Also clear localStorage token for backward compatibility
    localStorage.removeItem('token')
    dispatch({ type: 'LOGOUT' })
    console.log('✅ AuthContext: Logout complete')
  }

  // Get auth token for API calls (simplified for cookie-based auth)
  const getAuthToken = async (): Promise<string | null> => {
    // First check localStorage for backward compatibility
    const localToken = localStorage.getItem('token')
    if (localToken) {
      return localToken
    }

    // For cookie-based auth, verify the session exists
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          // Return a placeholder token indicating valid session
          return 'authenticated'
        }
      }
    } catch (error) {
      console.debug('Token retrieval failed:', error)
    }

    return null
  }

  // Refresh the authentication token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: data.user, token: data.token || 'authenticated' },
          })
          
          // Update localStorage token if provided
          if (data.token) {
            localStorage.setItem('token', data.token)
          }
          
          return true
        }
      }
    } catch (error) {
      console.debug('Token refresh failed:', error)
    }

    return false
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        verifyToken,
        getAuthToken,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}