const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function migrateAvailabilityData() {
  try {
    console.log('Starting availability data migration...')
    
    // Get the default tenant (usually ID 1)
    const defaultTenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    })
    
    if (!defaultTenant) {
      console.log('No active tenant found, cannot migrate data')
      return
    }
    
    console.log(`Using default tenant: ${defaultTenant.name} (ID: ${defaultTenant.id})`)
    
    // Update all booking_availability records with NULL tenant_id to use default tenant
    const updateResult = await prisma.bookingAvailability.updateMany({
      where: {
        tenantId: null
      },
      data: {
        tenantId: defaultTenant.id
      }
    })
    
    console.log(`Updated ${updateResult.count} availability records with tenant_id`)
    
    // Clean up any invalid data (dates in the past)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const cleanupResult = await prisma.bookingAvailability.deleteMany({
      where: {
        date: {
          lt: today
        }
      }
    })
    
    console.log(`Cleaned up ${cleanupResult.count} past availability records`)
    
    console.log('Data migration completed successfully!')
    
  } catch (error) {
    console.error('Error migrating availability data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  migrateAvailabilityData()
}

module.exports = { migrateAvailabilityData }