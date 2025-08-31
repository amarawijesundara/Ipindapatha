const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
require('dotenv').config()

const prisma = new PrismaClient()

async function seed() {
  try {
    console.log('Starting database seeding...')
    
    // Check if super admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'super_admin' }
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)
      
      await prisma.user.create({
        data: {
          username: 'super_admin',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'super_admin'
        }
      })
      
      console.log('Default super admin created: admin@example.com / SuperAdmin123!')
    } else {
      console.log('Super admin already exists, skipping creation')
    }

    // Check if availability data exists
    const existingAvailability = await prisma.bookingAvailability.count()

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
      
      console.log('Default availability seeded for next 30 days (weekdays only)')
    } else {
      console.log('Availability data already exists, skipping seeding')
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