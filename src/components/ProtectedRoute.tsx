'use client'

import { useAuth } from './AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, useState } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, token, initialized } = useAuth()
  const router = useRouter()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    console.log('🛡️ ProtectedRoute: Auth state changed', {
      user: user?.username,
      loading,
      token: !!token,
      initialized
    })

    // Wait for auth to be initialized before making any decisions
    if (!initialized) {
      console.log('🛡️ ProtectedRoute: Auth not initialized yet, waiting...')
      return
    }

    // Only attempt redirect after auth is initialized and we're sure there's no user
    if (initialized && !user && !token) {
      console.log('🛡️ ProtectedRoute: Auth initialized, no user found, redirecting to login')
      setShouldRedirect(true)
      // Small delay to prevent race conditions
      const timer = setTimeout(() => {
        router.push('/login')
      }, 100)

      return () => clearTimeout(timer)
    } else if (user && token) {
      console.log('🛡️ ProtectedRoute: User authenticated, allowing access')
      setShouldRedirect(false)
    }
  }, [user, loading, token, initialized, router])

  // Show loading while authentication is being verified or not initialized
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while redirect is happening
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}