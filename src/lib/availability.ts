import prisma from './db'
import { validateDateFilters, DateFilterOptions, safeCreateDate, formatDateForDatabase } from '@/lib/utils/dateValidation'
import { RecurringBookingService } from '@/lib/recurring-bookings'

export interface AvailabilityTemplate {
  id: number
  tenantId: number
  name: string
  description?: string
  daysOfWeek: number[] // 1=Monday, 7=Sunday
  timeSlots: string[]  // ['09:00', '10:00', '11:00']
  maxBookings: number
  isActive: boolean
  priority: number
  validFrom?: Date
  validUntil?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AvailabilityOverride {
  id: number
  tenantId: number
  date: Date
  timeSlot?: string
  overrideType: 'disable' | 'enable' | 'modify_capacity'
  maxBookings?: number
  reason?: string
  isActive: boolean
  createdBy: number
  createdAt: Date
  updatedAt: Date
}

export interface GeneratedAvailabilitySlot {
  tenantId: number
  date: Date
  timeSlot: string
  isAvailable: boolean
  maxBookings: number
  source: 'template' | 'override' | 'default'
  templateId?: number
  overrideId?: number
}

export class AvailabilityService {
  
  /**
   * Generate dynamic availability for a date range based on templates and overrides
   */
  static async generateAvailability(
    tenantId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<GeneratedAvailabilitySlot[]> {
    try {
      // Get active templates for the tenant
      const templates = await this.getActiveTemplates(tenantId, startDate, endDate)
      
      // Get overrides for the date range
      const overrides = await this.getActiveOverrides(tenantId, startDate, endDate)
      
      const availabilitySlots: GeneratedAvailabilitySlot[] = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay() || 7 // Convert Sunday (0) to 7
        const dateStr = formatDateForDatabase(currentDate)
        
        // Find applicable templates for this day of week
        const applicableTemplates = templates.filter(template => 
          template.daysOfWeek.includes(dayOfWeek)
        ).sort((a, b) => b.priority - a.priority) // Higher priority first
        
        // Generate slots from templates
        const templateSlots = this.generateSlotsFromTemplates(
          applicableTemplates, 
          currentDate, 
          tenantId
        )
        
        // Apply overrides
        const slotsAfterOverrides = this.applyOverrides(templateSlots, overrides, currentDate)
        
        // Filter out slots blocked by recurring bookings
        const finalSlots = await this.filterRecurringBookings(slotsAfterOverrides, currentDate, tenantId)
        
        availabilitySlots.push(...finalSlots)
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      return availabilitySlots
      
    } catch (error) {
      console.error('Error generating availability:', error)
      throw error
    }
  }
  
  /**
   * Get dynamic availability for API responses
   */
  static async getDynamicAvailability(
    tenantId: number, 
    options: DateFilterOptions = {}
  ): Promise<any[]> {
    try {
      // Validate date filters
      const validation = validateDateFilters(options)
      if (!validation.isValid) {
        throw new Error(`Invalid date filters: ${validation.errors.join(', ')}`)
      }
      
      const { validatedOptions } = validation
      
      // Determine date range
      let startDate: Date
      let endDate: Date
      
      if (validatedOptions.date) {
        startDate = endDate = validatedOptions.date
      } else {
        const currentYear = new Date().getFullYear()
        
        // Default to full calendar year range (current year through next year)
        startDate = validatedOptions.startDate || new Date(currentYear, 0, 1) // Jan 1 current year
        endDate = validatedOptions.endDate || new Date(currentYear + 1, 11, 31) // Dec 31 next year
        
        // Allow up to 2 years of data for year-round booking
        const maxDays = 731 // ~2 years
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays > maxDays) {
          endDate = new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000)
        }
      }
      
      // Generate availability
      const generatedSlots = await this.generateAvailability(tenantId, startDate, endDate)
      
      // Apply limit
      const limitedSlots = validatedOptions.limit 
        ? generatedSlots.slice(0, validatedOptions.limit)
        : generatedSlots
      
      // Convert to API format
      return limitedSlots.map(slot => ({
        id: `${slot.tenantId}-${formatDateForDatabase(slot.date)}-${slot.timeSlot}`,
        tenant_id: slot.tenantId,
        date: slot.date,
        time_slot: slot.timeSlot,
        timeSlot: slot.timeSlot,
        is_available: slot.isAvailable,
        max_bookings: slot.maxBookings,
        source: slot.source,
        template_id: slot.templateId,
        override_id: slot.overrideId,
        created_at: new Date(),
        updated_at: new Date()
      }))
      
    } catch (error) {
      console.error('Error getting dynamic availability:', error)
      throw error
    }
  }
  
  /**
   * Get active templates for a tenant within date range
   */
  private static async getActiveTemplates(
    tenantId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<AvailabilityTemplate[]> {
    const templates = await prisma.availabilityTemplate.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          // Templates with no date restrictions
          { validFrom: null, validUntil: null },
          // Templates that overlap with our date range
          {
            AND: [
              { OR: [{ validFrom: null }, { validFrom: { lte: endDate } }] },
              { OR: [{ validUntil: null }, { validUntil: { gte: startDate } }] }
            ]
          }
        ]
      },
      orderBy: { priority: 'desc' }
    })
    
    return templates.map(template => ({
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description || undefined,
      daysOfWeek: template.daysOfWeek,
      timeSlots: template.timeSlots,
      maxBookings: template.maxBookings,
      isActive: template.isActive,
      priority: template.priority,
      validFrom: template.validFrom || undefined,
      validUntil: template.validUntil || undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }))
  }
  
  /**
   * Get active overrides for a tenant within date range
   */
  private static async getActiveOverrides(
    tenantId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<AvailabilityOverride[]> {
    const overrides = await prisma.availabilityOverride.findMany({
      where: {
        tenantId,
        isActive: true,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    })
    
    return overrides.map(override => ({
      id: override.id,
      tenantId: override.tenantId,
      date: override.date,
      timeSlot: override.timeSlot || undefined,
      overrideType: override.overrideType as 'disable' | 'enable' | 'modify_capacity',
      maxBookings: override.maxBookings || undefined,
      reason: override.reason || undefined,
      isActive: override.isActive,
      createdBy: override.createdBy,
      createdAt: override.createdAt,
      updatedAt: override.updatedAt
    }))
  }
  
  /**
   * Generate slots from templates for a specific date
   */
  private static generateSlotsFromTemplates(
    templates: AvailabilityTemplate[], 
    date: Date, 
    tenantId: number
  ): GeneratedAvailabilitySlot[] {
    const slots: GeneratedAvailabilitySlot[] = []
    const processedTimeSlots = new Set<string>()
    
    // Process templates in priority order (highest first)
    for (const template of templates) {
      for (const timeSlot of template.timeSlots) {
        // Skip if this time slot was already processed by higher priority template
        if (processedTimeSlots.has(timeSlot)) continue
        
        slots.push({
          tenantId,
          date: new Date(date),
          timeSlot,
          isAvailable: true,
          maxBookings: template.maxBookings,
          source: 'template',
          templateId: template.id
        })
        
        processedTimeSlots.add(timeSlot)
      }
    }
    
    // If no templates matched, generate default availability for all days
    if (slots.length === 0) {
      const dayOfWeek = date.getDay()
      let defaultTimeSlots: string[]
      
      // Generate slots for all days of the week throughout the year
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekday slots (Monday-Friday): Full business hours
        defaultTimeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
      } else if (dayOfWeek === 6 || dayOfWeek === 0) {
        // Weekend slots (Saturday-Sunday): Limited hours  
        defaultTimeSlots = ['10:00', '11:00', '14:00', '15:00', '16:00']
      } else {
        // Fallback for any edge cases
        defaultTimeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
      }
      
      // Ensure we always generate slots for every date throughout the year
      for (const timeSlot of defaultTimeSlots) {
        slots.push({
          tenantId,
          date: new Date(date),
          timeSlot,
          isAvailable: true,
          maxBookings: 1,
          source: 'default'
        })
      }
    }
    
    return slots
  }
  
  /**
   * Apply overrides to generated slots
   */
  private static applyOverrides(
    slots: GeneratedAvailabilitySlot[], 
    overrides: AvailabilityOverride[], 
    date: Date
  ): GeneratedAvailabilitySlot[] {
    const dateStr = formatDateForDatabase(date)
    const applicableOverrides = overrides.filter(
      override => formatDateForDatabase(override.date) === dateStr
    )
    
    if (applicableOverrides.length === 0) return slots
    
    const modifiedSlots = [...slots]
    const slotsMap = new Map(modifiedSlots.map(slot => [slot.timeSlot, slot]))
    
    for (const override of applicableOverrides) {
      if (override.timeSlot) {
        // Time-specific override
        const existingSlot = slotsMap.get(override.timeSlot)
        
        switch (override.overrideType) {
          case 'disable':
            if (existingSlot) {
              existingSlot.isAvailable = false
              existingSlot.source = 'override'
              existingSlot.overrideId = override.id
            }
            break
            
          case 'enable':
            if (existingSlot) {
              existingSlot.isAvailable = true
              existingSlot.source = 'override'
              existingSlot.overrideId = override.id
            } else {
              // Create new slot
              modifiedSlots.push({
                tenantId: override.tenantId,
                date: new Date(date),
                timeSlot: override.timeSlot,
                isAvailable: true,
                maxBookings: override.maxBookings || 1,
                source: 'override',
                overrideId: override.id
              })
            }
            break
            
          case 'modify_capacity':
            if (existingSlot && override.maxBookings) {
              existingSlot.maxBookings = override.maxBookings
              existingSlot.source = 'override'
              existingSlot.overrideId = override.id
            }
            break
        }
      } else {
        // Full-day override
        switch (override.overrideType) {
          case 'disable':
            modifiedSlots.forEach(slot => {
              slot.isAvailable = false
              slot.source = 'override'
              slot.overrideId = override.id
            })
            break
            
          case 'modify_capacity':
            if (override.maxBookings) {
              modifiedSlots.forEach(slot => {
                slot.maxBookings = override.maxBookings!
                slot.source = 'override'
                slot.overrideId = override.id
              })
            }
            break
        }
      }
    }
    
    return modifiedSlots.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
  }
  
  /**
   * Filter out time slots that are blocked by recurring bookings
   */
  private static async filterRecurringBookings(
    slots: GeneratedAvailabilitySlot[], 
    date: Date, 
    tenantId: number
  ): Promise<GeneratedAvailabilitySlot[]> {
    try {
      const filteredSlots = []
      
      for (const slot of slots) {
        const isBlocked = await RecurringBookingService.isDateTimeBlockedByRecurring(
          tenantId,
          date,
          slot.timeSlot
        )
        
        
        if (isBlocked) {
          // Mark slot as unavailable due to recurring booking
          filteredSlots.push({
            ...slot,
            isAvailable: false,
            source: 'recurring_blocked' as any
          })
        } else {
          filteredSlots.push(slot)
        }
      }
      
      return filteredSlots
    } catch (error) {
      console.error('Error filtering recurring bookings:', error)
      return slots // Return original slots if filtering fails
    }
  }
  
  /**
   * Create a new availability template
   */
  static async createTemplate(templateData: {
    tenantId: number
    name: string
    description?: string
    daysOfWeek: number[]
    timeSlots: string[]
    maxBookings?: number
    priority?: number
    validFrom?: string
    validUntil?: string
  }): Promise<AvailabilityTemplate> {
    const template = await prisma.availabilityTemplate.create({
      data: {
        tenantId: templateData.tenantId,
        name: templateData.name,
        description: templateData.description,
        daysOfWeek: templateData.daysOfWeek,
        timeSlots: templateData.timeSlots,
        maxBookings: templateData.maxBookings || 1,
        priority: templateData.priority || 0,
        validFrom: templateData.validFrom ? safeCreateDate(templateData.validFrom) : null,
        validUntil: templateData.validUntil ? safeCreateDate(templateData.validUntil) : null
      }
    })
    
    return {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description || undefined,
      daysOfWeek: template.daysOfWeek,
      timeSlots: template.timeSlots,
      maxBookings: template.maxBookings,
      isActive: template.isActive,
      priority: template.priority,
      validFrom: template.validFrom || undefined,
      validUntil: template.validUntil || undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }
  }
  
  /**
   * Create a new availability override
   */
  static async createOverride(overrideData: {
    tenantId: number
    date: string
    timeSlot?: string
    overrideType: 'disable' | 'enable' | 'modify_capacity'
    maxBookings?: number
    reason?: string
    createdBy: number
  }): Promise<AvailabilityOverride> {
    const date = safeCreateDate(overrideData.date)
    if (!date) {
      throw new Error(`Invalid date: ${overrideData.date}`)
    }
    
    const override = await prisma.availabilityOverride.create({
      data: {
        tenantId: overrideData.tenantId,
        date,
        timeSlot: overrideData.timeSlot,
        overrideType: overrideData.overrideType,
        maxBookings: overrideData.maxBookings,
        reason: overrideData.reason,
        createdBy: overrideData.createdBy
      }
    })
    
    return {
      id: override.id,
      tenantId: override.tenantId,
      date: override.date,
      timeSlot: override.timeSlot || undefined,
      overrideType: override.overrideType as 'disable' | 'enable' | 'modify_capacity',
      maxBookings: override.maxBookings || undefined,
      reason: override.reason || undefined,
      isActive: override.isActive,
      createdBy: override.createdBy,
      createdAt: override.createdAt,
      updatedAt: override.updatedAt
    }
  }
}