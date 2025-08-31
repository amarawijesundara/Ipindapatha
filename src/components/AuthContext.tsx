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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
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
      return { ...initialState }
    case 'UPDATE_USER':
      return { ...state, user: action.payload }
    default:
      return state
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      verifyToken()
    }
  }, [])

  const login = async (identifier: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('token', data.token)
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.token },
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
        body: JSON.stringify({ username, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      localStorage.setItem('token', data.token)
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.token },
      })
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Registration failed',
      })
      throw error
    }
  }

  const logout = (): void => {
    localStorage.removeItem('token')
    dispatch({ type: 'LOGOUT' })
  }

  const verifyToken = async (): Promise<void> => {
    const token = localStorage.getItem('token')
    if (!token) {
      dispatch({ type: 'LOGOUT' })
      return
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Token verification failed')
      }

      const data = await response.json()
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token },
      })
    } catch (error) {
      localStorage.removeItem('token')
      dispatch({ type: 'LOGOUT' })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        verifyToken,
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