import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { TenantService } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to view tenant information' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
        { status: 401 }
      )
    }

    // Get tenant ID from user context
    let tenantId: number
    if (payload.tenantId) {
      tenantId = payload.tenantId
    } else {
      tenantId = 1 // Default tenant
    }

    // Get full tenant configuration (currency and meal periods with costs)
    const configuration = await TenantService.getTenantConfiguration(tenantId)

    if (!configuration) {
      return NextResponse.json(
        { error: 'Configuration not found', message: 'Tenant configuration could not be retrieved' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Tenant information retrieved successfully',
      tenantInfo: {
        tenantId,
        currency: configuration.currency,
        mealPeriods: configuration.mealPeriods
      }
    })

  } catch (error) {
    console.error('Get tenant info error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve tenant information' },
      { status: 500 }
    )
  }
}