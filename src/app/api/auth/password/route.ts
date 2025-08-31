import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { UserService } from '@/lib/auth'

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
    const { currentPassword, newPassword } = await request.json()
    
    // Validate input data
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Both current password and new password are required'
        },
        { status: 400 }
      )
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'Passwords must be strings'
        },
        { status: 400 }
      )
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'New password must be at least 8 characters long'
        },
        { status: 400 }
      )
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'New password must be different from current password'
        },
        { status: 400 }
      )
    }

    try {
      // Change password using UserService
      const success = await UserService.changePassword(payload.userId, currentPassword, newPassword)
      
      if (success) {
        return NextResponse.json({
          message: 'Password changed successfully'
        })
      } else {
        return NextResponse.json(
          {
            error: 'Password change failed',
            message: 'Failed to change password'
          },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Password change error:', error)
      
      // Handle specific errors from UserService
      if (error instanceof Error) {
        if (error.message === 'Current password is incorrect') {
          return NextResponse.json(
            {
              error: 'Invalid password',
              message: 'Current password is incorrect'
            },
            { status: 400 }
          )
        } else if (error.message === 'User not found') {
          return NextResponse.json(
            {
              error: 'User not found',
              message: 'User account no longer exists'
            },
            { status: 404 }
          )
        }
      }
      
      throw error // Re-throw unexpected errors
    }

  } catch (error) {
    console.error('Password change API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while changing password'
      },
      { status: 500 }
    )
  }
}