import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, role = 'user' } = body

    // Basic validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: 'Username, email, and password are required' 
        },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: 'Password must be at least 6 characters long' 
        },
        { status: 400 }
      )
    }

    // Check if user already exists (simplified)
    const existingUser = await UserService.findByEmailOrUsername(email)
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User already exists',
          message: 'A user with this email or username already exists'
        },
        { status: 409 }
      )
    }

    // Validate role assignment (simplified)
    const allowedRoles = ['user']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: 'Invalid role',
          message: 'You cannot assign this role during registration'
        },
        { status: 403 }
      )
    }

    // Create new user (simplified)
    const user = await UserService.create({ 
      username, 
      email, 
      password, 
      role
    })
    
    if (!user) {
      return NextResponse.json(
        {
          error: 'Registration failed',
          message: 'Failed to create user account'
        },
        { status: 500 }
      )
    }

    // Generate JWT token (simplified)
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })

    // Create response and set httpOnly cookie
    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: UserService.toJSON(user)
      },
      { status: 201 }
    )

    // Set httpOnly cookie for JWT token
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during registration'
      },
      { status: 500 }
    )
  }
}