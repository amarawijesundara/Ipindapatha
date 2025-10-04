import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import { TenantService } from '@/lib/tenant'
import prisma from '@/lib/db'

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

    // Determine tenant context from request (subdomain)
    const tenantContext = await TenantService.resolveTenantContext(request)

    if (!tenantContext) {
      return NextResponse.json(
        {
          error: 'Registration not available',
          message: 'Please register through your organization\'s portal. Use the correct subdomain (e.g., demo.localhost, niwandakimu.localhost).'
        },
        { status: 400 }
      )
    }

    const tenantId = tenantContext.tenantId
    console.log('Registration: Processing registration for tenant:', tenantContext.tenant.subdomain, 'ID:', tenantId)

    // Check if user already exists in THIS tenant
    const existingUserInTenant = await UserService.findByEmailOrUsername(email, tenantId)
    if (existingUserInTenant) {
      return NextResponse.json(
        {
          error: 'User already exists',
          message: `A user with this email already exists in ${tenantContext.tenant.name}. Please sign in instead.`
        },
        { status: 409 }
      )
    }

    // Allow the same email to register across different tenants (monasteries)
    // This enables users to book meals at multiple monasteries with the same personal email
    console.log('Registration: Allowing cross-tenant email registration for monastery app')

    // Validate role assignment (simplified)
    const allowedRoles = ['user']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: 'Invalid role',
          message: 'You cannot assign this role during registration'
        },
        { status: 403 }
      )
    }

    // Create new user with tenant assignment (tenant context already determined above)
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

    // Generate JWT token with tenant information
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    })

    // Create response and set httpOnly cookie
    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: UserService.toJSON(user)
      },
      { status: 201 }
    )

    // Set httpOnly cookie for JWT token
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      // In development, set domain to allow subdomain sharing
      ...(process.env.NODE_ENV === 'development' && {
        domain: '.localhost'
      })
    })

    return response

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