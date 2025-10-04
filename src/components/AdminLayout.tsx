'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import { Button } from '@/components/ui'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  description?: string
}

interface NavigationConfig {
  allItems: NavItem[]
  superAdminItems: NavItem[]
  tenantAdminItems: NavItem[]
}

const navigationConfig: NavigationConfig = {
  allItems: [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Overview and metrics'
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      description: 'Manage users'
    },
    {
      href: '/admin/bookings',
      label: 'Bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Booking management'
    },
    {
      href: '/admin/content',
      label: 'Content',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      description: 'Manage site content and text'
    },
  ],
  superAdminItems: [
    {
      href: '/admin/tenants',
      label: 'Tenants',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      description: 'Manage monastery tenants'
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Platform configuration'
    },
  ],
  tenantAdminItems: [
    {
      href: '/admin/organization/settings',
      label: 'Organization',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      description: 'Currency and meal settings'
    },
  ],
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Get navigation items based on user role
  const getNavigationItems = (): NavItem[] => {
    const baseItems = [...navigationConfig.allItems]

    if (user?.role === 'super_admin') {
      return [...baseItems, ...navigationConfig.superAdminItems]
    } else if (user?.role === 'tenant_admin') {
      return [...baseItems, ...navigationConfig.tenantAdminItems]
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  // Handle responsive breakpoint
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Handle escape key for mobile sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [sidebarOpen])

  // Check if user is admin or tenant admin
  if (user?.role !== 'super_admin' && user?.role !== 'tenant_admin') {
    return (
      <div className="min-h-screen bg-error-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl sm:text-6xl mb-4">🚫</div>
          <h1 className="text-xl sm:text-2xl font-bold text-error-800 mb-2">Access Denied</h1>
          <p className="text-error-600 mb-4 text-sm sm:text-base">Admin privileges required</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/my-account">Back to My Account</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="admin-layout-grid min-h-screen bg-lotus-50"
      style={{
        display: 'grid',
        gridTemplateColumns: isDesktop 
          ? sidebarCollapsed 
            ? '4rem 1fr' 
            : '16rem 1fr'
          : '1fr',
        gridTemplateRows: 'auto 1fr',
        gridTemplateAreas: isDesktop 
          ? `"sidebar header" "sidebar main"`
          : `"header" "main"`,
        transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-white border-r border-monastery-200 
          transform transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
        `}
        style={{
          gridArea: 'sidebar',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`
            flex items-center justify-between border-b border-monastery-200
            ${sidebarCollapsed ? 'p-2' : 'p-4'}
          `}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'space-x-3'}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">🏛️</span>
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-monastery-800 text-sm truncate">
                    {user?.role === 'super_admin' ? 'Admin Panel' : 'Tenant Admin'}
                  </h2>
                  <p className="text-xs text-monastery-600 truncate">
                    {user?.role === 'super_admin' ? 'Platform Management' : 'Ipindapatha Monastery'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Mobile close button */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-monastery-500 hover:text-monastery-700 p-1 rounded-md hover:bg-monastery-50 transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <div className="hidden lg:block px-2 py-2 border-b border-monastery-100">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 text-monastery-500 hover:text-monastery-700 hover:bg-monastery-50 rounded-md transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M21 12H3" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center rounded-lg transition-all duration-200
                    ${sidebarCollapsed ? 'p-3 justify-center' : 'p-3 space-x-3'}
                    ${isActive 
                      ? 'bg-primary-100 text-primary-800 shadow-sm ring-1 ring-primary-200' 
                      : 'text-monastery-700 hover:bg-monastery-50 hover:text-monastery-800'
                    }
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className={`
                    shrink-0 transition-colors duration-200
                    ${isActive ? 'text-primary-600' : 'text-monastery-500 group-hover:text-monastery-600'}
                  `}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-monastery-500 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User info and logout */}
          <div className={`border-t border-monastery-200 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-3 min-w-0 flex-1'}`}>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-primary-600 font-semibold text-sm">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-monastery-800 text-sm truncate">
                      {user?.username}
                    </div>
                    <div className="text-xs text-primary-600 truncate">
                      {user?.role === 'super_admin' ? 'Super Admin' : 'Tenant Admin'}
                    </div>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  onClick={logout}
                  className="text-monastery-500 hover:text-monastery-700 p-1 rounded-md hover:bg-monastery-50 transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header 
        className="bg-white border-b border-monastery-200 px-3 sm:px-4 py-2 sm:py-3 lg:px-6"
        style={{
          gridArea: 'header',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-monastery-500 hover:text-monastery-700 p-2 rounded-md hover:bg-monastery-50 transition-colors"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm min-w-0">
              <Link 
                href="/admin" 
                className="text-monastery-500 hover:text-monastery-700 transition-colors whitespace-nowrap"
              >
                Admin
              </Link>
              {pathname !== '/admin' && (
                <>
                  <span className="text-monastery-400" aria-hidden="true">/</span>
                  <span className="text-monastery-800 font-medium truncate">
                    {navigationItems.find(item => item.href === pathname)?.label || 'Page'}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
              <Link href="/my-account">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Back to App</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="overflow-auto p-3 sm:p-4 lg:p-6"
        style={{
          gridArea: 'main',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}