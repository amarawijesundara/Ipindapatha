'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import { Container, Card, CardContent, CardHeader, CardTitle, Input, Button } from '@/components/ui'

export default function Login() {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const { login, error } = useAuth()
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(formData.identifier, formData.password)
      router.push('/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <div className="fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">JA</span>
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              Welcome back
            </h1>
            <p className="text-secondary-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <Card className="slide-up">
            <CardHeader>
              <CardTitle className="text-center">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email or Username"
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email or username"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  error={error && error.includes('credentials') ? 'Invalid credentials' : undefined}
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />

                {error && !error.includes('credentials') && (
                  <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-error-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link 
                      href="/forgot-password" 
                      className="text-primary-600 hover:text-primary-500 font-medium"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={isLoading}
                  size="lg"
                  className="font-semibold"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-secondary-600">
                  Don't have an account?{' '}
                  <Link 
                    href="/register" 
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Create one here
                  </Link>
                </p>
              </div>

              {/* Divider */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-secondary-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-secondary-500">or</span>
                  </div>
                </div>
              </div>

              {/* Demo Accounts */}
              <div className="mt-6">
                <div className="bg-secondary-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-secondary-900 mb-2">Demo Accounts</h4>
                  <div className="space-y-2 text-xs text-secondary-600">
                    <div>
                      <span className="font-medium">Super Admin:</span> admin@yourdomain.com
                    </div>
                    <div>
                      <span className="font-medium">Tenant Admin:</span> admin@acmecorp.com
                    </div>
                    <div>
                      <span className="font-medium">User:</span> jane@acmecorp.com
                    </div>
                    <div className="text-secondary-500 italic">
                      All demo passwords: Use the seeded passwords from setup
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  )
}