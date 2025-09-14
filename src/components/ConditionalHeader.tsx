'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

export default function ConditionalHeader() {
  const pathname = usePathname()
  
  // Don't render the main site header for admin routes
  const isAdminRoute = pathname?.startsWith('/admin')
  
  if (isAdminRoute) {
    return null
  }
  
  // For all other routes, render the main site header
  return <Header />
}