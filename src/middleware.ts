import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

const protectedRoutes = ['/my-account', '/profile']
const adminRoutes = ['/admin']
const authRoutes = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  console.log(`🛡️ Middleware: Checking route ${pathname}, token present: ${!!token}`)

  // Check if user is trying to access admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    console.log('🛡️ Middleware: Admin route detected')

    if (!token) {
      console.log('🛡️ Middleware: No token, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      console.log('🛡️ Middleware: Invalid token, clearing and redirecting to login')
      // Clear invalid token and redirect
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }

    console.log(`🛡️ Middleware: Valid token for user ${payload.username} with role ${payload.role}`)

    // Check if user has admin role
    if (payload.role !== 'super_admin' && payload.role !== 'admin' && payload.role !== 'tenant_admin') {
      console.log('🛡️ Middleware: User lacks admin privileges, redirecting to my-account')
      return NextResponse.redirect(new URL('/my-account', request.url))
    }

    console.log('🛡️ Middleware: Admin access granted')
  }

  // Check if user is trying to access protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    console.log('🛡️ Middleware: Protected route detected')

    if (!token) {
      console.log('🛡️ Middleware: No token for protected route, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      console.log('🛡️ Middleware: Invalid token for protected route, clearing and redirecting to login')
      // Clear invalid token and redirect
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }

    console.log(`🛡️ Middleware: Protected route access granted for user ${payload.username}`)
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route))) {
    console.log('🛡️ Middleware: Auth route detected')

    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        console.log(`🛡️ Middleware: User ${payload.username} already authenticated, redirecting to my-account`)
        return NextResponse.redirect(new URL('/my-account', request.url))
      }
    }
  }

  console.log('🛡️ Middleware: Route check complete, allowing access')
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