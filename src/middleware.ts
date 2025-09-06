import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

const protectedRoutes = ['/my-account', '/profile']
const adminRoutes = ['/admin']
const authRoutes = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  // Check if user is trying to access admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      // Clear invalid token and redirect
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }

    // Check if user has admin role
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/my-account', request.url))
    }
  }

  // Check if user is trying to access protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      // Clear invalid token and redirect
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        return NextResponse.redirect(new URL('/my-account', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/my-account/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
    '/register'
  ]
}