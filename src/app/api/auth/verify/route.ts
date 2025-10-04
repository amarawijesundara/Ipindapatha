import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { UserService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  console.log('🔍 Auth Verify API: Starting token verification')

  try {
    // Read token from httpOnly cookie (matching login/middleware pattern)
    const token = request.cookies.get('token')?.value

    console.log('🔍 Auth Verify API: Token present in cookies:', !!token)

    if (!token) {
      console.log('🔍 Auth Verify API: No token found in cookies')
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'No valid authentication token provided'
        },
        { status: 401 }
      )
    }

    console.log('🔍 Auth Verify API: Verifying token with JWT library')
    const payload = await verifyToken(token)

    if (!payload) {
      console.log('🔍 Auth Verify API: Token verification failed')
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired'
        },
        { status: 401 }
      )
    }

    console.log('🔍 Auth Verify API: Token verified, checking user exists for ID:', payload.userId)

    // Verify user still exists and is active
    // For super admins, we don't need tenant context (they have tenantId: null)
    // For tenant users, we should pass the tenant context from the token
    const tenantId = payload.tenantId !== null && payload.tenantId !== undefined ? payload.tenantId : undefined
    const user = await UserService.findById(payload.userId, tenantId)

    if (!user) {
      console.log('🔍 Auth Verify API: User not found for ID:', payload.userId)
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'User account no longer exists or is not accessible'
        },
        { status: 404 }
      )
    }

    console.log('🔍 Auth Verify API: Verification successful for user:', user.username)

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