'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }

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
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      }
    case 'LOGOUT':
      return { ...initialState, loading: false }
    case 'UPDATE_USER':
      return { ...state, user: action.payload }
    default:
      return state
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const verifyToken = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include', // Include cookies
      })

      if (!response.ok) {
        // Only logout on 401/403 errors (token invalid/expired)
        if (response.status === 401 || response.status === 403) {
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
        } else {
          // For other errors (500, network issues), just stop loading but keep user logged in
          console.error('Token verification error (non-auth):', response.status)
          dispatch({ type: 'SET_LOADING', payload: false })
        }
        return
      }

      const data = await response.json()
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: 'cookie-based' },
      })
    } catch (error) {
      // Network errors are common during development - reduce noise
      console.debug('Token verification network error:', error)
      // For network errors, don't logout - just stop loading
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  useEffect(() => {
    // Always try to verify token from cookies on app start
    verifyToken()
  }, [])

  const login = async (identifier: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ identifier, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      // No need to store token in localStorage - it's now in httpOnly cookie
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: 'cookie-based' },
      })
    } catch (error) {
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
        payload: { user: data.user, token: 'cookie-based' },
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
    try {
      // Call logout API to clear httpOnly cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout API call failed:', error)
    }
    
    // Also clear localStorage token for backward compatibility
    localStorage.removeItem('token')
    dispatch({ type: 'LOGOUT' })
  }

  // Get auth token for API calls (checks both localStorage and cookies)
  const getAuthToken = async (): Promise<string | null> => {
    // First check localStorage for backward compatibility
    const localToken = localStorage.getItem('token')
    if (localToken) {
      return localToken
    }

    // If no localStorage token, try to get one from cookie-based auth
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        // For cookie-based auth, we'll need to get a temporary token for API calls
        if (data.user) {
          // Try to get a token specifically for API calls
          const tokenResponse = await fetch('/api/auth/token', {
            method: 'GET',
            credentials: 'include',
          })
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            return tokenData.token
          }
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
            payload: { user: data.user, token: data.token || 'cookie-based' },
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