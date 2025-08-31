import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { TenantService } from '@/lib/tenant'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, role = 'user' } = body

    // Basic validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: 'Username, email, and password are required' 
        },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: 'Password must be at least 6 characters long' 
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

    // Check if user already exists within tenant scope
    const existingUser = await UserService.findByEmailOrUsername(email, tenantId)
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User already exists',
          message: 'A user with this email or username already exists'
        },
        { status: 409 }
      )
    }

    // Validate role assignment
    const allowedRoles = ['user']
    if (tenantId) {
      // For tenant users, allow tenant-specific roles
      allowedRoles.push('tenant_manager')
    }
    
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: 'Invalid role',
          message: 'You cannot assign this role during registration'
        },
        { status: 403 }
      )
    }

    // Create new user
    const user = await UserService.create({ 
      username, 
      email, 
      password, 
      role,
      tenant_id: tenantId
    })
    
    if (!user) {
      return NextResponse.json(
        {
          error: 'Registration failed',
          message: 'Failed to create user account'
        },
        { status: 500 }
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

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: UserService.toJSON(user),
        tenant,
        token
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during registration'
      },
      { status: 500 }
    )
  }
}