'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthContext'
import { useLanguage } from './LanguageContext'
import { useContent } from './ContentContext'
import { useRouter } from 'next/navigation'
import { Button, Container } from './ui'

export default function Header() {
  const { user, logout } = useAuth()
  const { t, currentLanguage, changeLanguage } = useLanguage()
  const { getContent } = useContent()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'si' : 'en'
    changeLanguage(newLanguage)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-secondary-200 shadow-soft">
      <Container size="xl">
        <nav className="flex items-center justify-between py-4" role="navigation" aria-label="Main navigation">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-2 text-xl font-bold text-primary-700 hover:text-primary-800 transition-colors"
            onClick={closeMobileMenu}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{getContent('site_info', 'site_logo_text', 'JA')}</span>
            </div>
            <span className="hidden sm:block">{getContent('site_info', 'site_name', 'JWT Auth')}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  href="/my-account" 
                  className="text-secondary-700 hover:text-primary-600 font-medium transition-colors"
                >
                  {getContent('navigation', 'my_account', t('navigation.myAccount'))}
                </Link>
                {(user.role === 'super_admin' || user.role === 'tenant_admin') && (
                  <Link
                    href="/admin"
                    className="text-monastery-700 hover:text-primary-600 font-medium transition-colors flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{getContent('navigation', 'admin', t('navigation.admin'))}</span>
                  </Link>
                )}
                <Link 
                  href="/profile" 
                  className="text-secondary-700 hover:text-primary-600 font-medium transition-colors"
                >
                  Profile
                </Link>
                <div className="flex items-center space-x-4">
                  {/* Language Selector */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLanguageToggle}
                    className="text-xs font-medium px-2 py-1"
                    aria-label={t('language.switch')}
                  >
                    {currentLanguage === 'en' ? 'සිං' : 'EN'}
                  </Button>
                  <div className="text-right">
                    <div className="text-sm font-medium text-secondary-900">{user.username}</div>
                    {user.role === 'super_admin' && (
                      <div className="text-xs text-primary-600 font-medium">Super Admin</div>
                    )}
                    {user.role === 'tenant_admin' && (
                      <div className="text-xs text-monastery-600 font-medium">Tenant Admin</div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    {getContent('navigation', 'logout', t('navigation.logout'))}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Language Selector */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLanguageToggle}
                  className="text-xs font-medium px-2 py-1"
                  aria-label={t('language.switch')}
                >
                  {currentLanguage === 'en' ? 'සිං' : 'EN'}
                </Button>
                <Link 
                  href="/login" 
                  className="text-secondary-700 hover:text-primary-600 font-medium transition-colors"
                >
                  {getContent('navigation', 'sign_in', t('navigation.signIn'))}
                </Link>
                <Button asChild size="sm">
                  <Link href="/register">
                    {getContent('navigation', 'sign_up', t('navigation.signUp'))}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-secondary-700 hover:text-primary-600 hover:bg-secondary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden border-t border-secondary-200 bg-white shadow-large"
            id="mobile-menu"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-secondary-200 mb-2">
                    <p className="text-sm text-secondary-600">
                      Signed in as
                    </p>
                    <p className="font-medium text-secondary-900">
                      {user.username}
                    </p>
                    <p className="text-xs text-secondary-500 capitalize">
                      {user.role}
                    </p>
                  </div>
                  <Link
                    href="/my-account"
                    className="block px-3 py-2 text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-lg font-medium transition-colors"
                    onClick={closeMobileMenu}
                  >
                    {getContent('navigation', 'my_account', t('navigation.myAccount'))}
                  </Link>
                  {(user.role === 'super_admin' || user.role === 'tenant_admin') && (
                    <Link
                      href="/admin"
                      className="block px-3 py-2 text-monastery-700 hover:text-primary-600 hover:bg-monastery-50 rounded-lg font-medium transition-colors"
                      onClick={closeMobileMenu}
                    >
                      🏛️ {getContent('navigation', 'admin', t('navigation.admin'))}
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-lg font-medium transition-colors"
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </Link>
                  {/* Language Selector for Mobile */}
                  <button
                    onClick={handleLanguageToggle}
                    className="block w-full text-left px-3 py-2 text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-lg font-medium transition-colors"
                  >
                    🌐 {currentLanguage === 'en' ? 'සිංහල' : 'English'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-error-600 hover:text-error-700 hover:bg-error-50 rounded-lg font-medium transition-colors"
                  >
                    {getContent('navigation', 'logout', t('navigation.logout'))}
                  </button>
                </>
              ) : (
                <>
                  {/* Language Selector for Mobile */}
                  <button
                    onClick={handleLanguageToggle}
                    className="block w-full text-left px-3 py-2 text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-lg font-medium transition-colors"
                  >
                    🌐 {currentLanguage === 'en' ? 'සිංහල' : 'English'}
                  </button>
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-lg font-medium transition-colors"
                    onClick={closeMobileMenu}
                  >
                    {getContent('navigation', 'sign_in', t('navigation.signIn'))}
                  </Link>
                  <Link
                    href="/register"
                    className="block px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium transition-colors text-center"
                    onClick={closeMobileMenu}
                  >
                    {getContent('navigation', 'sign_up', t('navigation.signUp'))}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </Container>
    </header>
  )
}