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
        // Create weekday business hours template
        const weekdayTemplate = await prisma.availabilityTemplate.create({
          data: {
            tenantId: tenant.id,
            name: 'Weekday Business Hours',
            description: 'Monday to Friday business hours (9 AM - 5 PM)',
            daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
            timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
            maxBookings: 1,
            isActive: true,
            priority: 10 // Higher priority
          }
        })
        
        // Create weekend availability template
        const weekendTemplate = await prisma.availabilityTemplate.create({
          data: {
            tenantId: tenant.id,
            name: 'Weekend Hours',
            description: 'Saturday and Sunday availability (10 AM - 4 PM)',
            daysOfWeek: [6, 7], // Saturday and Sunday
            timeSlots: ['10:00', '11:00', '14:00', '15:00', '16:00'],
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