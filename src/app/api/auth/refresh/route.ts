import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, generateToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

// POST /api/auth/refresh - Refresh authentication token
export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      )
    }

    // Verify the current token (even if expired, we might still refresh)
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Generate a new token
    const newToken = await generateToken({
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      subdomain: payload.subdomain
    })

    // Set the new token as httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        email: payload.email,
        role: payload.role
      },
      token: newToken // Also return token for localStorage compatibility
    })

    // Set httpOnly cookie with new token
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token', message: error.message },
      { status: 500 }
    )
  }
}