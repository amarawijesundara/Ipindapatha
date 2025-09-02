const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
require('dotenv').config()

const prisma = new PrismaClient()

async function seed() {
  try {
    console.log('Starting database seeding...')
    
    // Check if our specific seeded super admin exists (super admin has tenantId: null)
    const existingAdmin = await prisma.user.findFirst({
      where: { 
        email: 'admin@example.com',
        role: 'super_admin',
        tenantId: null
      }
    })

    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          tenantId: null, // Super admin is not associated with any tenant
          username: 'super_admin',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'super_admin'
        }
      })
      
      console.log('Default super admin created: admin@example.com / SuperAdmin123!')
    } else {
      // Update existing super admin password to ensure it's correct
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      })
      
      console.log('Super admin password updated: admin@example.com / SuperAdmin123!')
    }

    // Create a default demo tenant for testing
    let demoTenant = await prisma.tenant.findFirst({
      where: { subdomain: 'demo' }
    })

    if (!demoTenant) {
      demoTenant = await prisma.tenant.create({
        data: {
          name: 'Demo Company',
          subdomain: 'demo',
          description: 'Demo tenant for testing',
          isActive: true
        }
      })
      console.log('Demo tenant created: demo.localhost')
    } else {
      console.log('Demo tenant already exists, skipping creation')
    }

    // Check if availability data exists for demo tenant
    const existingAvailability = await prisma.bookingAvailability.count({
      where: { tenantId: demoTenant.id }
    })

    if (existingAvailability === 0) {
      const timeSlots = ['09:00:00', '10:00:00', '11:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00']
      const today = new Date()
      
      const availabilityData = []
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue
        
        for (const timeSlot of timeSlots) {
          const timeSlotDate = new Date(`1970-01-01T${timeSlot}`)
          availabilityData.push({
            tenantId: demoTenant.id, // Associate with demo tenant
            date: date,
            timeSlot: timeSlotDate,
            isAvailable: true,
            maxBookings: 1
          })
        }
      }
      
      await prisma.bookingAvailability.createMany({
        data: availabilityData
      })
      
      console.log('Default availability seeded for demo tenant (next 30 days, weekdays only)')
    } else {
      console.log('Availability data already exists for demo tenant, skipping seeding')
    }
    
    console.log('Database seeding completed successfully!')
    
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seed()
}

module.exports = { seed }