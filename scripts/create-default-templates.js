const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function createDefaultTemplates() {
  try {
    console.log('Creating default availability templates...')
    
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true }
    })
    
    console.log(`Found ${tenants.length} active tenants`)
    
    for (const tenant of tenants) {
      // Check if tenant already has templates
      const existingTemplates = await prisma.availabilityTemplate.count({
        where: { tenantId: tenant.id }
      })
      
      if (existingTemplates === 0) {
        // Create monastic weekday meal schedule template
        const weekdayTemplate = await prisma.availabilityTemplate.create({
          data: {
            tenantId: tenant.id,
            name: 'Monastic Weekday Meal Schedule',
            description: 'Monday to Friday monastic meal times (Morning Meal, Tea, Lunch, Evening Tea)',
            daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
            timeSlots: ['06:30', '07:00', '07:30', '09:30', '10:00', '10:30', '11:30', '12:00', '15:00', '15:30', '16:00'],
            maxBookings: 1,
            isActive: true,
            priority: 10 // Higher priority
          }
        })

        // Create weekend monastic meal schedule template
        const weekendTemplate = await prisma.availabilityTemplate.create({
          data: {
            tenantId: tenant.id,
            name: 'Monastic Weekend Meal Schedule',
            description: 'Saturday and Sunday monastic meal times (Same schedule as weekdays)',
            daysOfWeek: [6, 7], // Saturday and Sunday
            timeSlots: ['06:30', '07:00', '07:30', '09:30', '10:00', '10:30', '11:30', '12:00', '15:00', '15:30', '16:00'],
            maxBookings: 1,
            isActive: true,
            priority: 5 // Lower priority than weekdays
          }
        })
        
        console.log(`Created weekday and weekend templates for tenant ${tenant.name} (ID: ${tenant.id})`)
      } else {
        console.log(`Tenant ${tenant.name} already has ${existingTemplates} templates, skipping`)
      }
    }
    
    console.log('Default template creation completed!')
    
  } catch (error) {
    console.error('Error creating default templates:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createDefaultTemplates()
}

module.exports = { createDefaultTemplates }