import { NextRequest } from 'next/server'
import prisma from './db'
import { Tenant, TenantContext, TenantMealPeriodConfig, SupportedCurrency, TenantConfigurationSettings } from '@/types'
import { MEAL_PERIODS, DEFAULT_MEAL_COSTS } from '@/lib/utils/mealCategories'

export class TenantService {
  // Extract tenant from subdomain or header
  static extractTenantIdentifier(request: NextRequest): string | null {
    // Try header first (for API calls)
    const tenantHeader = request.headers.get('x-tenant-subdomain')
    if (tenantHeader) {
      return tenantHeader
    }

    // Extract from subdomain
    const host = request.headers.get('host') || ''
    const subdomain = this.extractSubdomain(host)
    
    return subdomain
  }

  // Extract subdomain from host
  static extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0]

    // Skip bare localhost and IP addresses first
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null
    }

    // Extract subdomain (everything before first dot)
    const parts = hostname.split('.')

    // Handle localhost development URLs (e.g., niwandakimu.localhost)
    if (parts.length === 2 && parts[1] === 'localhost') {
      const subdomain = parts[0]
      // Ignore common subdomains
      if (['www', 'api', 'admin'].includes(subdomain)) {
        return null
      }
      return subdomain
    }

    // Handle production URLs (e.g., niwandakimu.example.com)
    if (parts.length >= 3) {
      const subdomain = parts[0]
      // Ignore common subdomains
      if (['www', 'api', 'admin'].includes(subdomain)) {
        return null
      }
      return subdomain
    }

    return null // No subdomain found
  }

  // Find tenant by subdomain
  static async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          subdomain: subdomain.toLowerCase(),
          isActive: true
        }
      })

      if (!tenant) return null

      return {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        domain: tenant.domain || undefined,
        description: tenant.description || undefined,
        is_active: tenant.isActive,
        created_at: tenant.createdAt,
        updated_at: tenant.updatedAt
      }
    } catch (error) {
      console.error('Error finding tenant by subdomain:', error)
      return null
    }
  }

  // Resolve tenant context from request
  static async resolveTenantContext(request: NextRequest): Promise<TenantContext | null> {
    const subdomain = this.extractTenantIdentifier(request)
    
    if (!subdomain) {
      return null
    }

    const tenant = await this.findBySubdomain(subdomain)
    
    if (!tenant) {
      return null
    }

    return {
      tenant,
      tenantId: tenant.id
    }
  }

  // Create new tenant
  static async create(tenantData: {
    name: string
    subdomain: string
    domain?: string
    description?: string
  }): Promise<Tenant | null> {
    try {
      // Validate subdomain format
      const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
      if (!subdomainRegex.test(tenantData.subdomain)) {
        throw new Error('Invalid subdomain format')
      }

      // Reserved subdomains
      const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost']
      if (reservedSubdomains.includes(tenantData.subdomain.toLowerCase())) {
        throw new Error('Subdomain is reserved')
      }

      const tenant = await prisma.tenant.create({
        data: {
          name: tenantData.name,
          subdomain: tenantData.subdomain.toLowerCase(),
          domain: tenantData.domain,
          description: tenantData.description
        }
      })

      // Create default tenant settings with meal periods and currency
      const defaultMealPeriods = this.getDefaultMealPeriods()

      await prisma.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          businessHours: {
            monday: { open: '09:00', close: '17:00', enabled: true },
            tuesday: { open: '09:00', close: '17:00', enabled: true },
            wednesday: { open: '09:00', close: '17:00', enabled: true },
            thursday: { open: '09:00', close: '17:00', enabled: true },
            friday: { open: '09:00', close: '17:00', enabled: true },
            saturday: { open: '09:00', close: '17:00', enabled: false },
            sunday: { open: '09:00', close: '17:00', enabled: false }
          },
          bookingRules: {
            maxAdvanceBookingDays: 30,
            minAdvanceBookingHours: 2,
            maxBookingsPerUser: 5,
            allowCancellation: true,
            cancellationHours: 24
          },
          features: {
            emailNotifications: true,
            smsNotifications: false,
            customFields: false,
            multipleBookings: true,
            waitingList: false
          },
          mealPeriods: defaultMealPeriods,
          currency: 'USD'
        }
      })

      // Create default subscription
      const startDate = new Date()
      const endDate = new Date()
      endDate.setFullYear(endDate.getFullYear() + 1) // 1 year from now

      await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'starter',
          status: 'active',
          startDate: startDate,
          endDate: endDate,
          maxUsers: 10,
          maxBookings: 1000,
          features: {
            customBranding: false,
            advancedReporting: false,
            apiAccess: false,
            integrations: []
          }
        }
      })

      return {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        domain: tenant.domain || undefined,
        description: tenant.description || undefined,
        is_active: tenant.isActive,
        created_at: tenant.createdAt,
        updated_at: tenant.updatedAt
      }
    } catch (error) {
      console.error('Error creating tenant:', error)
      throw error
    }
  }

  // Get tenant settings
  static async getSettings(tenantId: number) {
    try {
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      })

      if (!settings) return null

      return {
        id: settings.id,
        tenant_id: settings.tenantId,
        business_hours: settings.businessHours,
        booking_rules: settings.bookingRules,
        custom_fields: settings.customFields,
        branding: settings.branding,
        notifications: settings.notifications,
        features: settings.features,
        created_at: settings.createdAt,
        updated_at: settings.updatedAt
      }
    } catch (error) {
      console.error('Error getting tenant settings:', error)
      return null
    }
  }

  // Update tenant settings
  static async updateSettings(tenantId: number, settingsData: any) {
    try {
      const settings = await prisma.tenantSettings.upsert({
        where: { tenantId },
        update: settingsData,
        create: {
          tenantId,
          ...settingsData
        }
      })

      return settings
    } catch (error) {
      console.error('Error updating tenant settings:', error)
      throw error
    }
  }

  // Get tenant subscription
  static async getSubscription(tenantId: number) {
    try {
      const subscription = await prisma.tenantSubscription.findUnique({
        where: { tenantId }
      })

      if (!subscription) return null

      return {
        id: subscription.id,
        tenant_id: subscription.tenantId,
        plan: subscription.plan,
        status: subscription.status as 'active' | 'inactive' | 'suspended' | 'cancelled',
        start_date: subscription.startDate,
        end_date: subscription.endDate || undefined,
        max_users: subscription.maxUsers,
        max_bookings: subscription.maxBookings,
        features: subscription.features,
        created_at: subscription.createdAt,
        updated_at: subscription.updatedAt
      }
    } catch (error) {
      console.error('Error getting tenant subscription:', error)
      return null
    }
  }

  // Check if subdomain is available
  static async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    try {
      const existing = await prisma.tenant.findFirst({
        where: {
          subdomain: subdomain.toLowerCase()
        }
      })

      return !existing
    } catch (error) {
      console.error('Error checking subdomain availability:', error)
      return false
    }
  }

  // Get tenant meal period configuration
  static async getTenantConfiguration(tenantId: number): Promise<TenantConfigurationSettings | null> {
    try {
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      })

      if (!settings) {
        // Return default configuration
        return this.getDefaultConfiguration()
      }

      // Parse stored configuration or use defaults
      const mealPeriods = settings.mealPeriods as TenantMealPeriodConfig[] || this.getDefaultMealPeriods()
      const currency = (settings.currency as SupportedCurrency) || 'USD'

      return {
        mealPeriods,
        currency
      }
    } catch (error) {
      console.error('Error getting tenant configuration:', error)
      return this.getDefaultConfiguration()
    }
  }

  // Update tenant meal period and currency configuration
  static async updateTenantConfiguration(
    tenantId: number,
    configuration: Partial<TenantConfigurationSettings>
  ): Promise<boolean> {
    try {
      console.log('🔧 TenantService: Updating configuration for tenant:', tenantId, 'with data:', configuration)

      const updateData: any = {}

      if (configuration.mealPeriods) {
        updateData.mealPeriods = configuration.mealPeriods
        console.log('🔧 TenantService: Setting mealPeriods:', updateData.mealPeriods)
      }

      if (configuration.currency) {
        updateData.currency = configuration.currency
        console.log('🔧 TenantService: Setting currency:', updateData.currency)
      }

      console.log('🔧 TenantService: Final updateData:', updateData)

      const result = await prisma.tenantSettings.upsert({
        where: { tenantId },
        update: updateData,
        create: {
          tenantId,
          ...updateData
        }
      })

      console.log('🔧 TenantService: Upsert successful, result:', result)
      return true
    } catch (error) {
      console.error('❌ TenantService: Error updating tenant configuration:', error)
      console.error('❌ TenantService: Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        meta: error.meta
      })
      return false
    }
  }

  // Get default meal periods configuration
  static getDefaultMealPeriods(): TenantMealPeriodConfig[] {
    return Object.values(MEAL_PERIODS).map((period, index) => ({
      id: period.id,
      name: period.name,
      icon: period.icon,
      timeRange: period.timeRange,
      description: period.description,
      color: period.color,
      cost: DEFAULT_MEAL_COSTS[period.id] || 0,
      isEnabled: true,
      order: index + 1
    }))
  }

  // Get default configuration
  static getDefaultConfiguration(): TenantConfigurationSettings {
    return {
      mealPeriods: this.getDefaultMealPeriods(),
      currency: 'USD'
    }
  }

  // Get tenant currency
  static async getTenantCurrency(tenantId: number): Promise<SupportedCurrency> {
    try {
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { currency: true }
      })

      return (settings?.currency as SupportedCurrency) || 'USD'
    } catch (error) {
      console.error('Error getting tenant currency:', error)
      return 'USD'
    }
  }

  // Get tenant meal periods
  static async getTenantMealPeriods(tenantId: number): Promise<TenantMealPeriodConfig[]> {
    try {
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { mealPeriods: true }
      })

      if (!settings?.mealPeriods) {
        return this.getDefaultMealPeriods()
      }

      return settings.mealPeriods as TenantMealPeriodConfig[]
    } catch (error) {
      console.error('Error getting tenant meal periods:', error)
      return this.getDefaultMealPeriods()
    }
  }
}