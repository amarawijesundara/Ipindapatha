'use client'

import { useAuth } from './AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !token) {
      router.push('/login')
    }
  }, [user, loading, token, router])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user || !token) {
    return null
  }

  return <>{children}</>
}