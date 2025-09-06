import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, password } = body

    // Basic validation
    if (!identifier || !password) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: 'Email/username and password are required' 
        },
        { status: 400 }
      )
    }

    // Find user by email or username (simplified, no tenant context)
    const user = await UserService.findByEmailOrUsername(identifier)
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await UserService.verifyPassword(user, password)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        { status: 401 }
      )
    }

    // Generate JWT token (simplified)
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })

    // Create response and set httpOnly cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: UserService.toJSON(user)
    })

    // First clear any existing token (especially expired ones)
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Clear immediately
      path: '/'
    })

    // Then set the new token
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during login'
      },
      { status: 500 }
    )
  }
}