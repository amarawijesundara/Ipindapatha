import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { UserService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'No valid authentication token provided'
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired'
        },
        { status: 401 }
      )
    }

    // Get fresh user data
    const user = await UserService.findById(payload.userId)
    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'User account no longer exists'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Profile retrieved successfully',
      user: UserService.toJSON(user)
    })

  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while retrieving profile'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'No valid authentication token provided'
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired'
        },
        { status: 401 }
      )
    }

    // Parse request body
    const updateData = await request.json()
    
    // Validate input data
    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Invalid profile data provided'
        },
        { status: 400 }
      )
    }

    const { username, email, phone_number, address } = updateData

    // Basic validation
    if (username && (typeof username !== 'string' || username.trim().length < 3)) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Username must be at least 3 characters long'
        },
        { status: 400 }
      )
    }

    if (email && (typeof email !== 'string' || !email.includes('@'))) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Please provide a valid email address'
        },
        { status: 400 }
      )
    }

    // Update user profile
    const updatedUser = await UserService.updateProfile(
      payload.userId,
      {
        username: username?.trim(),
        email: email?.trim(),
        phone_number: phone_number?.trim(),
        address: address?.trim()
      },
      payload.tenantId
    )

    if (!updatedUser) {
      return NextResponse.json(
        {
          error: 'Update failed',
          message: 'Failed to update profile. Username or email may already be taken.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: UserService.toJSON(updatedUser)
    })

  } catch (error) {
    console.error('Profile update error:', error)
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('already taken')) {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: error.message
          },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while updating profile'
      },
      { status: 500 }
    )
  }
}