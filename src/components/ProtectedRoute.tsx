'use client'

import { useAuth } from './AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, useState } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth()
  const router = useRouter()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    // Only attempt redirect after loading is complete and we're sure there's no user
    if (!loading && !user && !token) {
      setShouldRedirect(true)
      // Small delay to prevent race conditions
      const timer = setTimeout(() => {
        router.push('/login')
      }, 100)
      
      return () => clearTimeout(timer)
    } else if (user && token) {
      setShouldRedirect(false)
    }
  }, [user, loading, token, router])

  // Show loading while authentication is being verified
  if (loading) {
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
  if (shouldRedirect || (!user && !token)) {
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