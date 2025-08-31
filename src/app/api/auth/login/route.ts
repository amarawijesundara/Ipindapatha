import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { TenantService } from '@/lib/tenant'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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

    // Get tenant context from middleware headers
    const tenantIdHeader = request.headers.get('x-tenant-id')
    const tenantSubdomain = request.headers.get('x-tenant-subdomain')
    
    let tenantId: number | undefined
    let tenant = null

    if (tenantIdHeader) {
      tenantId = parseInt(tenantIdHeader)
      tenant = await TenantService.findBySubdomain(tenantSubdomain!)
      
      if (!tenant || !tenant.is_active) {
        return NextResponse.json(
          {
            error: 'Invalid tenant',
            message: 'The tenant is not found or inactive'
          },
          { status: 404 }
        )
      }
    }

    // Find user by email or username within tenant context
    const user = await UserService.findByEmailOrUsername(identifier, tenantId)
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        { status: 401 }
      )
    }

    // Additional tenant validation for tenant users
    if (tenantId && user.tenant_id !== tenantId) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        { status: 401 }
      )
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

    // Generate JWT token with tenant context
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      subdomain: tenantSubdomain || undefined
    })

    return NextResponse.json({
      message: 'Login successful',
      user: UserService.toJSON(user),
      tenant,
      token
    })

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