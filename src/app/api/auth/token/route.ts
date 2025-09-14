import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, generateToken } from '@/lib/jwt'

// GET /api/auth/token - Get a fresh token for API calls
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get('token')?.value
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const token = headerToken || cookieToken

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }

    // Verify the current token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Generate a fresh token with the same payload
    const freshToken = await generateToken({
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      subdomain: payload.subdomain
    })

    return NextResponse.json({
      success: true,
      token: freshToken,
      expiresIn: '24h'
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token', message: error.message },
      { status: 500 }
    )
  }
}