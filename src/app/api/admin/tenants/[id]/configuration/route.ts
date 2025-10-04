import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { TenantService } from '@/lib/tenant'
import { TenantConfigurationUpdateInput, SupportedCurrency } from '@/types'

// GET /api/admin/tenants/[id]/configuration - Get tenant configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (!['super_admin', 'tenant_admin'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const tenantId = parseInt(params.id)
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      )
    }

    // For tenant admins, ensure they can only access their own tenant
    if (payload.role === 'tenant_admin' && payload.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const configuration = await TenantService.getTenantConfiguration(tenantId)

    if (!configuration) {
      return NextResponse.json(
        { error: 'Tenant configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Configuration retrieved successfully',
      configuration
    })

  } catch (error) {
    console.error('Error fetching tenant configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/tenants/[id]/configuration - Update tenant configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (!['super_admin', 'tenant_admin'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const tenantId = parseInt(params.id)
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      )
    }

    // For tenant admins, ensure they can only access their own tenant
    if (payload.role === 'tenant_admin' && payload.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updateData: TenantConfigurationUpdateInput = body

    // Validate currency if provided
    if (updateData.currency && !['USD', 'LKR'].includes(updateData.currency)) {
      return NextResponse.json(
        { error: 'Invalid currency. Supported currencies are USD and LKR' },
        { status: 400 }
      )
    }

    // Validate meal periods if provided
    if (updateData.mealPeriods) {
      const validMealPeriodIds = ['morning_meal', 'morning_tea', 'lunch_meal', 'evening_tea']

      for (const period of updateData.mealPeriods) {
        if (!validMealPeriodIds.includes(period.id)) {
          return NextResponse.json(
            { error: `Invalid meal period ID: ${period.id}` },
            { status: 400 }
          )
        }

        if (typeof period.cost !== 'number' || period.cost < 0) {
          return NextResponse.json(
            { error: 'Meal period cost must be a non-negative number' },
            { status: 400 }
          )
        }
      }
    }

    console.log('🔧 Config API: Attempting to update tenant configuration:', { tenantId, updateData })
    const success = await TenantService.updateTenantConfiguration(tenantId, updateData)

    if (!success) {
      console.error('❌ Config API: TenantService.updateTenantConfiguration returned false')
      return NextResponse.json(
        { error: 'Failed to update tenant configuration' },
        { status: 500 }
      )
    }

    console.log('✅ Config API: Configuration update successful')

    // Return the updated configuration
    const updatedConfiguration = await TenantService.getTenantConfiguration(tenantId)

    return NextResponse.json({
      message: 'Configuration updated successfully',
      configuration: updatedConfiguration
    })

  } catch (error) {
    console.error('Error updating tenant configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}