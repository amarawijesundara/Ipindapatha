import { NextResponse } from 'next/server'

export async function POST() {
  // Create response
  const response = NextResponse.json({
    message: 'Logout successful'
  })

  // Clear the httpOnly cookie - simplified and more reliable
  console.log('Clearing auth cookie on logout')
  response.cookies.delete('token')

  return response
}