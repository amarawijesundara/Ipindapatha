import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import { TenantService } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  try {
    // Add better error handling for JSON parsing
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError)
      return NextResponse.json(
        { 
          error: 'Invalid JSON', 
          message: 'Request body must be valid JSON' 
        },
        { status: 400 }
      )
    }
    
    const { identifier, password } = body

    // Basic validation
    if (!identifier || !password) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Email/username and password are required'
        },
        { status: 400 }
      )
    }

    // Extract tenant context from subdomain for tenant-based authentication
    let tenantContext = null
    let tenantId: number | undefined = undefined

    try {
      tenantContext = await TenantService.resolveTenantContext(request)
      if (tenantContext) {
        tenantId = tenantContext.tenantId
        console.log('Login: Resolved tenant context for subdomain:', tenantContext.tenant.subdomain, 'tenant ID:', tenantId)
      } else {
        console.log('Login: No tenant context found (localhost or no subdomain)')
      }
    } catch (error) {
      console.error('Login: Error resolving tenant context:', error)
      // Continue without tenant context for localhost/development
    }

    // Find user by email or username with tenant scoping
    let user = null

    if (tenantContext && tenantId) {
      // We have a specific tenant - only allow users from this tenant OR super admins
      // First try to find user in the specific tenant
      user = await UserService.findByEmailOrUsername(identifier, tenantId)

      // If not found, try to find super admin (no tenant restriction)
      if (!user) {
        const globalUser = await UserService.findByEmailOrUsername(identifier)
        // Only accept if user is super admin (has no tenant_id or tenant_id is null)
        if (globalUser && globalUser.role === 'super_admin' && !globalUser.tenant_id) {
          user = globalUser
        }
      }
    } else {
      // No tenant context (localhost) - allow global search but will validate access later
      user = await UserService.findByEmailOrUsername(identifier)
    }
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        { status: 401 }
      )
    }

    // Enhanced tenant-based access validation
    if (tenantContext && tenantId) {
      // We have a specific tenant subdomain - validate user access strictly
      if (user.role === 'super_admin') {
        // Super admins can access any tenant, but must have no tenant_id (global access)
        if (user.tenant_id) {
          console.log(`Login: Access denied - Super admin ${user.username} has tenant restriction (${user.tenant_id})`)
          return NextResponse.json(
            {
              error: 'Authentication failed',
              message: 'Invalid access configuration for super admin'
            },
            { status: 403 }
          )
        }
        console.log(`Login: Super admin ${user.username} granted access to tenant ${tenantId}`)
      } else {
        // Regular users must belong exactly to the subdomain's tenant
        if (user.tenant_id !== tenantId) {
          console.log(`Login: Access denied - User ${user.username} (tenant: ${user.tenant_id}) cannot access tenant ${tenantId}`)
          return NextResponse.json(
            {
              error: 'Authentication failed',
              message: 'You are not authorized to access this organization'
            },
            { status: 403 }
          )
        }
        console.log(`Login: Access granted - User ${user.username} belongs to tenant ${tenantId}`)
      }
    } else if (user.tenant_id) {
      // No tenant context (localhost) but user belongs to a tenant
      // This should only be allowed for super admins or during development
      if (user.role !== 'super_admin') {
        console.log(`Login: Localhost access denied - Tenant user ${user.username} (tenant: ${user.tenant_id}) tried to access via localhost`)
        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: 'Please access your organization through the correct subdomain'
          },
          { status: 403 }
        )
      }
      console.log(`Login: Super admin ${user.username} accessing via localhost`)
    } else {
      // No tenant context and user has no tenant - allowed for localhost development
      console.log(`Login: Global user ${user.username} accessing via localhost`)
    }

    // Verify password
    const isPasswordValid = await UserService.verifyPassword(user, password)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        { status: 401 }
      )
    }

    // Generate JWT token (simplified)
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    })

    // Create response and set httpOnly cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: UserService.toJSON(user)
    })

    // Cookie configuration - simplified and more reliable
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    }

    // Debug logging for cookie setting
    console.log('Setting auth cookie with options:', cookieOptions)

    // Clear any existing token and set new one
    response.cookies.delete('token')
    response.cookies.set('token', token, cookieOptions)

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during login'
      },
      { status: 500 }
    )
  }
}