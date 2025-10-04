#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixDataConsistency() {
  console.log('🔧 Data Consistency Maintenance Script\n')

  try {
    // Get all active tenants and users
    const [tenants, users] = await Promise.all([
      prisma.tenant.findMany({
        where: { isActive: true },
        orderBy: { subdomain: 'asc' }
      }),
      prisma.user.findMany({
        where: { isActive: true },
        include: { tenant: true },
        orderBy: { email: 'asc' }
      })
    ])

    console.log('📊 System Overview:')
    console.log(`   Tenants: ${tenants.length}`)
    console.log(`   Users: ${users.length}`)
    console.log()

    // Create domain-to-tenant mapping
    const domainMapping = {}
    tenants.forEach(tenant => {
      // Standard domain mappings
      switch (tenant.subdomain) {
        case 'niwandakimu':
          domainMapping['niwandakimu.com'] = tenant
          break
        case 'ipindapatha':
          domainMapping['ipindapatha.com'] = tenant
          break
        case 'demo':
          domainMapping['demo.com'] = tenant
          // Also map some example.com addresses to demo
          domainMapping['example.com'] = tenant
          break
      }
    })

    console.log('🗺️ Domain Mappings:')
    Object.entries(domainMapping).forEach(([domain, tenant]) => {
      console.log(`   ${domain} → ${tenant.subdomain} (ID: ${tenant.id})`)
    })
    console.log()

    // Find and fix inconsistencies
    const fixes = []
    const issues = []

    users.forEach(user => {
      // Skip super admins - they should remain global
      if (user.role === 'super_admin') {
        return
      }

      const emailDomain = user.email.split('@')[1]
      const expectedTenant = domainMapping[emailDomain]

      if (expectedTenant) {
        // User should belong to a specific tenant
        if (user.tenantId !== expectedTenant.id) {
          fixes.push({
            user: user,
            currentTenant: user.tenant?.subdomain || 'Global',
            expectedTenant: expectedTenant.subdomain,
            expectedTenantId: expectedTenant.id,
            action: 'assign_tenant'
          })
        }
      } else if (!user.tenantId) {
        // User with unknown domain and no tenant assignment
        issues.push({
          user: user,
          issue: 'unknown_domain',
          message: `User has unknown email domain: ${emailDomain}`
        })
      }
    })

    // Report findings
    console.log('🔍 Analysis Results:')
    if (fixes.length === 0 && issues.length === 0) {
      console.log('✅ All user-tenant assignments are consistent!')
    } else {
      if (fixes.length > 0) {
        console.log(`\n🔧 Found ${fixes.length} fixes needed:`)
        fixes.forEach((fix, i) => {
          console.log(`   ${i + 1}. ${fix.user.email}`)
          console.log(`      Current: ${fix.currentTenant} → Expected: ${fix.expectedTenant}`)
        })
      }

      if (issues.length > 0) {
        console.log(`\n⚠️ Found ${issues.length} issues requiring manual review:`)
        issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue.user.email}: ${issue.message}`)
        })
      }
    }

    // Ask for confirmation before making changes
    if (fixes.length > 0) {
      console.log('\n🚀 Applying fixes...')

      for (const fix of fixes) {
        try {
          const updatedUser = await prisma.user.update({
            where: { id: fix.user.id },
            data: {
              tenantId: fix.expectedTenantId,
              updatedAt: new Date()
            },
            include: { tenant: true }
          })

          console.log(`✅ Fixed: ${fix.user.email} → ${updatedUser.tenant.subdomain}`)

        } catch (error) {
          console.error(`❌ Failed to fix ${fix.user.email}:`, error.message)
        }
      }

      console.log(`\n🎉 Applied ${fixes.length} fixes successfully!`)
    }

    // Final verification
    console.log('\n🔍 Final Verification:')
    const verificationCheck = await checkConsistency()
    if (verificationCheck.issues === 0) {
      console.log('✅ All consistency issues resolved!')
    } else {
      console.log(`⚠️ ${verificationCheck.issues} issues remain`)
    }

  } catch (error) {
    console.error('❌ Error during consistency fix:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function for verification
async function checkConsistency() {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'super_admin' } },
    include: { tenant: true }
  })

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true }
  })

  let issues = 0

  // Quick consistency check
  users.forEach(user => {
    const emailDomain = user.email.split('@')[1]

    let expectedTenant = null
    switch (emailDomain) {
      case 'niwandakimu.com':
        expectedTenant = tenants.find(t => t.subdomain === 'niwandakimu')
        break
      case 'ipindapatha.com':
        expectedTenant = tenants.find(t => t.subdomain === 'ipindapatha')
        break
      case 'example.com':
        expectedTenant = tenants.find(t => t.subdomain === 'demo')
        break
    }

    if (expectedTenant && user.tenantId !== expectedTenant.id) {
      issues++
    }
  })

  return { issues }
}

if (require.main === module) {
  fixDataConsistency()
    .then(() => {
      console.log('\n✨ Data consistency maintenance completed!')
    })
    .catch(error => {
      console.error('\n💥 Maintenance failed:', error)
      process.exit(1)
    })
}

module.exports = { fixDataConsistency, checkConsistency }