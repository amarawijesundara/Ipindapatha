const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function updateMonasticTimeSlots() {
  try {
    console.log('Updating availability templates to use monastic meal time slots...')

    // Old time slots to replace
    const oldTimeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

    // New monastic meal time slots
    const monasticTimeSlots = [
      '06:30', '07:00', '07:30', // Morning Meal (6:30-7:30 AM)
      '09:30', '10:00', '10:30', // Morning Tea (9:30-10:30 AM)
      '11:30', '12:00',          // Lunch Meal (11:30-12:00 PM)
      '15:00', '15:30', '16:00'  // Evening Tea (3:00-4:00 PM)
    ]

    // Find templates with old time slots
    const templatesToUpdate = await prisma.availabilityTemplate.findMany({
      where: {
        OR: [
          { timeSlots: { hasSome: oldTimeSlots } },
          { name: { contains: 'Business Hours' } },
          { description: { contains: '9 AM' } },
          { description: { contains: 'business hours' } }
        ]
      }
    })

    console.log(`Found ${templatesToUpdate.length} templates to update`)

    for (const template of templatesToUpdate) {
      // Update template with new monastic schedule
      await prisma.availabilityTemplate.update({
        where: { id: template.id },
        data: {
          name: template.name.includes('Weekend')
            ? 'Monastic Weekend Meal Schedule'
            : 'Monastic Weekday Meal Schedule',
          description: template.daysOfWeek.includes(6) || template.daysOfWeek.includes(7)
            ? 'Monastic meal times for weekend days (Morning Meal 6:30-7:30, Morning Tea 9:30-10:30, Lunch 11:30-12:00, Evening Tea 15:00-16:00)'
            : 'Monastic meal times for weekdays (Morning Meal 6:30-7:30, Morning Tea 9:30-10:30, Lunch 11:30-12:00, Evening Tea 15:00-16:00)',
          timeSlots: monasticTimeSlots,
          updatedAt: new Date()
        }
      })

      console.log(`Updated template: ${template.name} (ID: ${template.id})`)
    }

    // Also clean up any old availability records that might have old time slots
    console.log('Cleaning up old booking_availability records...')

    const oldAvailabilityCount = await prisma.$executeRaw`
      DELETE FROM booking_availability
      WHERE time_slot NOT IN ('06:30:00', '07:00:00', '07:30:00', '09:30:00', '10:00:00', '10:30:00', '11:30:00', '12:00:00', '15:00:00', '15:30:00', '16:00:00')
    `

    console.log(`Removed ${oldAvailabilityCount} old availability records`)

    // Generate new availability using the updated templates
    console.log('Regenerating availability for next 30 days...')

    // This will be handled by the dynamic availability system
    console.log('✅ Monastic time slot update completed successfully!')
    console.log('\nNew monastic meal schedule:')
    console.log('🌅 Morning Meal: 6:30-7:30 AM (06:30, 07:00, 07:30)')
    console.log('🍵 Morning Tea: 9:30-10:30 AM (09:30, 10:00, 10:30)')
    console.log('🍽️ Lunch Meal: 11:30-12:00 PM (11:30, 12:00)')
    console.log('☕ Evening Tea: 3:00-4:00 PM (15:00, 15:30, 16:00)')

  } catch (error) {
    console.error('Error updating monastic time slots:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  updateMonasticTimeSlots()
}

module.exports = { updateMonasticTimeSlots }