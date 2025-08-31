'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to admin dashboard
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className="text-4xl mb-4">🏛️</div>
        <p className="text-monastery-600">Redirecting to admin dashboard...</p>
      </div>
    </div>
  )
}