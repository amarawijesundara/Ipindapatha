import { NextRequest, NextResponse } from 'next/server'
import { TenantService } from '@/lib/tenant'
import { UserService } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      // Tenant information
      tenantName,
      subdomain,
      domain,
      description,
      // Admin user information  
      username,
      email,
      password
    } = body

    // Basic validation
    if (!tenantName || !subdomain || !username || !email || !password) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: 'All tenant and admin user fields are required' 
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

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
    if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 30) {
      return NextResponse.json(
        {
          error: 'Invalid subdomain',
          message: 'Subdomain must be 3-30 characters, lowercase letters, numbers, and hyphens only'
        },
        { status: 400 }
      )
    }

    // Check if subdomain is available
    const isAvailable = await TenantService.isSubdomainAvailable(subdomain)
    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'Subdomain unavailable',
          message: 'This subdomain is already taken'
        },
        { status: 409 }
      )
    }

    // Check if admin email is unique globally (no tenant scoping for admin creation)
    const existingUser = await UserService.findByEmailOrUsername(email)
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Email already exists',
          message: 'A user with this email already exists'
        },
        { status: 409 }
      )
    }

    // Create tenant
    const tenant = await TenantService.create({
      name: tenantName,
      subdomain: subdomain.toLowerCase(),
      domain,
      description
    })

    if (!tenant) {
      return NextResponse.json(
        {
          error: 'Tenant creation failed',
          message: 'Failed to create tenant organization'
        },
        { status: 500 }
      )
    }

    // Create tenant admin user
    const adminUser = await UserService.create({
      username,
      email,
      password,
      role: 'tenant_admin',
      tenant_id: tenant.id
    })

    if (!adminUser) {
      // If user creation fails, we should clean up the tenant
      // In production, this should be wrapped in a database transaction
      return NextResponse.json(
        {
          error: 'Admin user creation failed',
          message: 'Failed to create admin user account'
        },
        { status: 500 }
      )
    }

    // Generate JWT token for the new tenant admin
    const token = generateToken({
      userId: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      tenantId: tenant.id,
      subdomain: tenant.subdomain
    })

    return NextResponse.json(
      {
        message: 'Tenant and admin user created successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          domain: tenant.domain,
          description: tenant.description
        },
        user: UserService.toJSON(adminUser),
        token,
        loginUrl: `https://${tenant.subdomain}.yourdomain.com`,
        dashboardUrl: `https://${tenant.subdomain}.yourdomain.com/dashboard`
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Tenant creation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during tenant creation'
      },
      { status: 500 }
    )
  }
}

// Get subdomain availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter required' },
        { status: 400 }
      )
    }

    const isAvailable = await TenantService.isSubdomainAvailable(subdomain)
    
    return NextResponse.json({
      subdomain,
      available: isAvailable
    })

  } catch (error) {
    console.error('Subdomain check error:', error)
    return NextResponse.json(
      { error: 'Failed to check subdomain availability' },
      { status: 500 }
    )
  }
}