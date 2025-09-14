import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

interface PlatformSettings {
  maintenanceMode: boolean
  allowRegistrations: boolean
  requireEmailVerification: boolean
  maxTenantsPerDay: number
  maxUsersPerTenant: number
  maxBookingsPerUser: number
  sessionTimeout: number
  enableAuditLog: boolean
  enableNotifications: boolean
}

// GET /api/admin/settings - Get current platform settings
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Get platform settings from database using Prisma
    const settingsFromDb = await prisma.platformSettings.findMany({
      where: { isActive: true }
    })

    // Convert database rows to settings object
    const settings: Partial<PlatformSettings> = {}
    const defaultSettings: PlatformSettings = {
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: false,
      maxTenantsPerDay: 5,
      maxUsersPerTenant: 100,
      maxBookingsPerUser: 10,
      sessionTimeout: 24,
      enableAuditLog: true,
      enableNotifications: true,
    }

    // Parse settings from database
    settingsFromDb.forEach((row) => {
      const key = row.settingKey as keyof PlatformSettings
      const value = row.settingValue
      const type = row.settingType

      if (type === 'boolean') {
        settings[key] = value === 'true' as any
      } else if (type === 'number') {
        settings[key] = parseInt(value) as any
      } else {
        settings[key] = value as any
      }
    })

    // Merge with defaults for any missing settings
    const finalSettings = { ...defaultSettings, ...settings }

    return NextResponse.json({
      message: 'Settings retrieved successfully',
      settings: finalSettings
    })

  } catch (error) {
    console.error('Error fetching admin settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/settings - Update platform settings
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload || payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const settings = body.settings as PlatformSettings

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings data required' },
        { status: 400 }
      )
    }

    // Validate settings
    const validationErrors = validateSettings(settings)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Use Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Update or insert each setting
      for (const [key, value] of Object.entries(settings)) {
        const settingType = typeof value
        const settingValue = value.toString()

        await tx.platformSettings.upsert({
          where: { settingKey: key },
          update: {
            settingValue: settingValue,
            settingType: settingType,
            updatedBy: payload.userId,
            updatedAt: new Date()
          },
          create: {
            settingKey: key,
            settingValue: settingValue,
            settingType: settingType,
            updatedBy: payload.userId
          }
        })
      }

      // Log admin action for audit
      if (settings.enableAuditLog) {
        await tx.adminAuditLog.create({
          data: {
            userId: payload.userId,
            action: 'UPDATE_SETTINGS',
            targetType: 'platform_settings',
            targetId: 0,
            details: { updated_settings: Object.keys(settings) }
          }
        })
      }
    })

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: settings
    })

  } catch (error) {
    console.error('Error updating admin settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function validateSettings(settings: PlatformSettings): string[] {
  const errors: string[] = []

  // Validate numeric limits
  if (settings.maxTenantsPerDay < 1 || settings.maxTenantsPerDay > 100) {
    errors.push('Max tenants per day must be between 1 and 100')
  }
  if (settings.maxUsersPerTenant < 1 || settings.maxUsersPerTenant > 10000) {
    errors.push('Max users per tenant must be between 1 and 10000')
  }
  if (settings.maxBookingsPerUser < 1 || settings.maxBookingsPerUser > 100) {
    errors.push('Max bookings per user must be between 1 and 100')
  }
  if (settings.sessionTimeout < 1 || settings.sessionTimeout > 168) {
    errors.push('Session timeout must be between 1 and 168 hours')
  }

  return errors
}