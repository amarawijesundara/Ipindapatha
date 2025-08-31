import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { TenantService } from '@/lib/tenant'

const protectedRoutes = ['/dashboard', '/profile']
const authRoutes = ['/login', '/register']
const publicRoutes = ['/api/health', '/api/tenants/create']
const adminRoutes = ['/api/admin'] // Platform-wide admin routes don't require tenant context

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')

  // Skip tenant detection for public routes and admin routes
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  
  // Detect tenant context for API routes (except public and admin ones)
  if (pathname.startsWith('/api/') && !isPublicRoute && !isAdminRoute) {
    try {
      const tenantContext = await TenantService.resolveTenantContext(request)
      
      // If no tenant found but tenant is required
      if (!tenantContext && !pathname.startsWith('/api/auth')) {
        return NextResponse.json(
          { error: 'Tenant not found', message: 'Invalid or missing tenant' },
          { status: 404 }
        )
      }

      // Add tenant context to headers for API routes
      const response = NextResponse.next()
      
      if (tenantContext) {
        response.headers.set('x-tenant-id', tenantContext.tenantId.toString())
        response.headers.set('x-tenant-subdomain', tenantContext.tenant.subdomain)
      }

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', 
        process.env.NODE_ENV === 'production' 
          ? 'https://yourdomain.com' 
          : 'http://localhost:3000'
      )
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Subdomain')
      response.headers.set('Access-Control-Allow-Credentials', 'true')

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return response
      }

      return response
    } catch (error) {
      console.error('Middleware tenant resolution error:', error)
      
      // Continue without tenant context for auth routes
      if (pathname.startsWith('/api/auth')) {
        return NextResponse.next()
      }
      
      return NextResponse.json(
        { error: 'Server error', message: 'Unable to resolve tenant' },
        { status: 500 }
      )
    }
  }

  // Handle admin routes - no tenant context required
  if (pathname.startsWith('/api/') && isAdminRoute) {
    const response = NextResponse.next()
    
    // Add CORS headers for admin routes
    response.headers.set('Access-Control-Allow-Origin', 
      process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com' 
        : 'http://localhost:3000'
    )
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return response
    }

    return response
  }

  // Handle non-API routes - tenant detection for web pages
  if (!pathname.startsWith('/api/')) {
    try {
      const tenantContext = await TenantService.resolveTenantContext(request)
      
      // If tenant found, add to response headers for frontend
      if (tenantContext) {
        const response = NextResponse.next()
        response.headers.set('x-tenant-id', tenantContext.tenantId.toString())
        response.headers.set('x-tenant-subdomain', tenantContext.tenant.subdomain)
        
        // Continue with auth checks below
        return await handleAuthRoutes(request, response, token, pathname)
      }
    } catch (error) {
      console.error('Web tenant resolution error:', error)
    }
  }

  // Default auth handling for routes without tenant context
  return handleAuthRoutes(request, NextResponse.next(), token, pathname)
}

// Helper function to handle authentication routes
async function handleAuthRoutes(
  request: NextRequest, 
  response: NextResponse, 
  token: string | undefined, 
  pathname: string
): Promise<NextResponse> {
  // Check if user is trying to access protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/login',
    '/register',
    '/api/:path*'
  ]
}