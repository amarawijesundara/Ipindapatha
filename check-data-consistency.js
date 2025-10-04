#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDataConsistency() {
  console.log('🔍 Checking tenant-user data consistency...\n')

  try {
    // Get all users and tenants
    const [users, tenants] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        include: { tenant: true },
        orderBy: { email: 'asc' }
      }),
      prisma.tenant.findMany({
        where: { isActive: true },
        orderBy: { subdomain: 'asc' }
      })
    ])

    console.log('🏢 Available Tenants:')
    tenants.forEach(t => console.log(`  - ${t.subdomain}: ID ${t.id} (${t.name})`))

    console.log('\n🚨 Data Consistency Issues:\n')

    let issuesFound = 0

    // Check for users with domain-tenant mismatches
    users.forEach(user => {
      const emailDomain = user.email.split('@')[1]
      let expectedTenant = null

      // Map email domains to expected tenants
      switch (emailDomain) {
        case 'niwandakimu.com':
          expectedTenant = tenants.find(t => t.subdomain === 'niwandakimu')
          break
        case 'ipindapatha.com':
          expectedTenant = tenants.find(t => t.subdomain === 'ipindapatha')
          break
        case 'demo.com':
        case 'example.com':
          // example.com could be demo tenant for demo users
          if (user.email.includes('amara@example.com')) {
            expectedTenant = tenants.find(t => t.subdomain === 'demo')
          }
          break
      }

      // Check if user belongs to wrong tenant or no tenant when they should
      if (expectedTenant && user.tenantId !== expectedTenant.id) {
        issuesFound++
        console.log(`❌ MISMATCH: User ${user.email}`)
        console.log(`   Current tenant: ${user.tenant?.subdomain || 'Global (no tenant)'} (ID: ${user.tenantId || 'null'})`)
        console.log(`   Expected tenant: ${expectedTenant.subdomain} (ID: ${expectedTenant.id})`)
        console.log(`   Fix needed: Assign user to tenant ${expectedTenant.id}`)
        console.log()
      }
    })

    // Check for global users that might need tenant assignment
    const globalUsers = users.filter(u => !u.tenantId && u.role !== 'super_admin')
    if (globalUsers.length > 0) {
      console.log('⚠️  GLOBAL USERS (non-super-admin):')
      globalUsers.forEach(user => {
        issuesFound++
        console.log(`   - ${user.email} (${user.role})`)
        console.log(`     Should this user be assigned to a tenant based on their email domain?`)
      })
      console.log()
    }

    // Summary
    console.log('📊 SUMMARY:')
    if (issuesFound === 0) {
      console.log('✅ All tenant-user assignments are consistent!')
    } else {
      console.log(`❌ Found ${issuesFound} data consistency issues`)
      console.log('🔧 These issues should be fixed to prevent access problems')
    }

  } catch (error) {
    console.error('Error checking data consistency:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkDataConsistency()
}

module.exports = { checkDataConsistency }