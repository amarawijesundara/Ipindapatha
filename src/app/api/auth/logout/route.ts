import { NextResponse } from 'next/server'

export async function POST() {
  // Create response
  const response = NextResponse.json({
    message: 'Logout successful'
  })

  // Clear the httpOnly cookie by setting it with maxAge: 0
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  return response
}