'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthContext'
import { Container, Card, CardContent, CardHeader, CardTitle, Input, Button } from '@/components/ui'

// Password strength checker
const checkPasswordStrength = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  
  const score = Object.values(requirements).filter(Boolean).length
  const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : score <= 4 ? 'strong' : 'excellent'
  
  return { requirements, score, strength }
}

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [passwordStrength, setPasswordStrength] = useState(checkPasswordStrength(''))
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<any>(null)
  
  const { register, error } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Check for pending booking data and pre-fill form if available
    const bookingData = localStorage.getItem('pendingBooking')
    if (bookingData) {
      try {
        const parsed = JSON.parse(bookingData)
        setPendingBooking(parsed)
        // Pre-fill form with guest data
        setFormData(prev => ({
          ...prev,
          username: parsed.name || '',
          email: parsed.email || ''
        }))
      } catch (error) {
        console.error('Error parsing pending booking data:', error)
        localStorage.removeItem('pendingBooking')
      }
    }
  }, [])

  // Real-time validation
  useEffect(() => {
    const newErrors = { ...fieldErrors }

    // Username validation
    if (formData.username && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    } else {
      newErrors.username = ''
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    } else {
      newErrors.email = ''
    }

    // Password confirmation validation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    } else {
      newErrors.confirmPassword = ''
    }

    // Password strength validation
    if (formData.password) {
      setPasswordStrength(checkPasswordStrength(formData.password))
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      } else {
        newErrors.password = ''
      }
    } else {
      setPasswordStrength(checkPasswordStrength(''))
      newErrors.password = ''
    }

    setFieldErrors(newErrors)
  }, [formData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Final validation
    const hasErrors = Object.values(fieldErrors).some(error => error !== '')
    if (hasErrors) {
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setIsLoading(false)
      return
    }

    try {
      await register(formData.username, formData.email, formData.password)
      
      // If there's a pending booking, redirect to home with the date selected
      if (pendingBooking) {
        const redirectUrl = searchParams.get('redirect') || '/'
        router.push(redirectUrl)
        // The home page will handle the pending booking completion
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Registration failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = 
    formData.username.length >= 3 &&
    formData.email &&
    formData.password.length >= 8 &&
    formData.confirmPassword &&
    Object.values(fieldErrors).every(error => error === '') &&
    formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen bg-lotus-50 py-12 px-4 sm:px-6 lg:px-8">
      <Container size="sm">
        <div className="fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">🏛️</span>
            </div>
            <h1 className="text-3xl font-bold text-monastery-800 mb-2">
              {pendingBooking ? 'Create Account to Complete Booking' : 'Join Our Monastery'}
            </h1>
            <p className="text-monastery-600">
              {pendingBooking 
                ? `Complete your Dhane offering booking for ${pendingBooking.name}`
                : 'Create your account to book Dhane offerings'
              }
            </p>
          </div>

          {/* Registration Form */}
          <Card className="slide-up border-monastery-200 bg-white shadow-large">
            <CardHeader>
              <CardTitle className="text-center text-monastery-800">
                {pendingBooking ? 'Create Account to Complete Your Booking' : 'Create Account'}
              </CardTitle>
              {pendingBooking && (
                <div className="bg-lotus-100 rounded-lg p-3 mt-4">
                  <h4 className="font-medium text-monastery-800 mb-1">Your Booking Details</h4>
                  <div className="space-y-1 text-sm text-monastery-700">
                    <div><strong>Date:</strong> {new Date(pendingBooking.date).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {pendingBooking.time}</div>
                    <div><strong>Name:</strong> {pendingBooking.name}</div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Choose a unique username"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  error={fieldErrors.username}
                  success={formData.username.length >= 3 && !fieldErrors.username ? 'Username looks good!' : undefined}
                />

                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email address"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                  error={fieldErrors.email}
                  success={formData.email && !fieldErrors.email ? 'Email looks good!' : undefined}
                />

                <div>
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a strong password"
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    }
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-monastery-500 hover:text-monastery-700 focus:outline-none"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    }
                    error={fieldErrors.password}
                  />

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-3 p-3 bg-monastery-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-monastery-700">
                          Password Strength
                        </span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.strength === 'weak' ? 'text-error-600' :
                          passwordStrength.strength === 'medium' ? 'text-warning-600' :
                          passwordStrength.strength === 'strong' ? 'text-primary-600' :
                          'text-success-600'
                        }`}>
                          {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-secondary-200 rounded-full h-2 mb-3">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.strength === 'weak' ? 'bg-error-500 w-1/4' :
                            passwordStrength.strength === 'medium' ? 'bg-warning-500 w-2/4' :
                            passwordStrength.strength === 'strong' ? 'bg-primary-500 w-3/4' :
                            'bg-success-500 w-full'
                          }`}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`flex items-center ${passwordStrength.requirements.length ? 'text-success-600' : 'text-secondary-500'}`}>
                          <span className="mr-1">{passwordStrength.requirements.length ? '✓' : '○'}</span>
                          8+ characters
                        </div>
                        <div className={`flex items-center ${passwordStrength.requirements.lowercase ? 'text-success-600' : 'text-secondary-500'}`}>
                          <span className="mr-1">{passwordStrength.requirements.lowercase ? '✓' : '○'}</span>
                          Lowercase
                        </div>
                        <div className={`flex items-center ${passwordStrength.requirements.uppercase ? 'text-success-600' : 'text-secondary-500'}`}>
                          <span className="mr-1">{passwordStrength.requirements.uppercase ? '✓' : '○'}</span>
                          Uppercase
                        </div>
                        <div className={`flex items-center ${passwordStrength.requirements.number ? 'text-success-600' : 'text-secondary-500'}`}>
                          <span className="mr-1">{passwordStrength.requirements.number ? '✓' : '○'}</span>
                          Number
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-monastery-500 hover:text-monastery-700 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  }
                  error={fieldErrors.confirmPassword}
                  success={formData.confirmPassword && formData.password === formData.confirmPassword ? 'Passwords match!' : undefined}
                />

                {error && (
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

                <Button
                  type="submit"
                  fullWidth
                  loading={isLoading}
                  disabled={!isFormValid}
                  size="lg"
                  className="font-semibold bg-primary-500 hover:bg-primary-600"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-monastery-600">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>

              {/* Benefits Section */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-monastery-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-monastery-500">Benefits of joining</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="bg-monastery-50 rounded-lg p-4">
                  <div className="space-y-3 text-sm text-monastery-700">
                    <div className="flex items-center">
                      <span className="mr-2">🙏</span>
                      <span>Book Dhane offering ceremonies</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>Manage your booking schedule</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">✨</span>
                      <span>Earn spiritual merit through offerings</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🏛️</span>
                      <span>Connect with the monastery community</span>
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