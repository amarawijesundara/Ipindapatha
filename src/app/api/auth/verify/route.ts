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

    // Verify user still exists and is active
    // For super admins, we don't need tenant context (they have tenantId: null)
    // For tenant users, we should pass the tenant context from the token
    const tenantId = payload.tenantId !== null && payload.tenantId !== undefined ? payload.tenantId : undefined
    const user = await UserService.findById(payload.userId, tenantId)
    
    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'User account no longer exists or is not accessible'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Token is valid',
      user: UserService.toJSON(user)
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during token verification'
      },
      { status: 500 }
    )
  }
}