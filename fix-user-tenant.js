#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixUserTenantAssignment() {
  console.log('🔧 Fixing user tenant assignments...\n')

  try {
    // Get the niwandakimu tenant
    const niwandakimuTenant = await prisma.tenant.findFirst({
      where: { subdomain: 'niwandakimu', isActive: true }
    })

    if (!niwandakimuTenant) {
      console.error('❌ Niwandakimu tenant not found!')
      return
    }

    console.log(`✅ Found niwandakimu tenant: ID ${niwandakimuTenant.id}`)

    // Find the amaras user
    const amarasUser = await prisma.user.findFirst({
      where: {
        email: 'amaras@niwandakimu.com',
        isActive: true
      }
    })

    if (!amarasUser) {
      console.error('❌ User amaras@niwandakimu.com not found!')
      return
    }

    console.log(`✅ Found user: ${amarasUser.email} (ID: ${amarasUser.id})`)
    console.log(`   Current tenant: ${amarasUser.tenantId || 'null (Global)'}`)

    // Update the user's tenant assignment
    if (amarasUser.tenantId !== niwandakimuTenant.id) {
      console.log('\n🔄 Updating user tenant assignment...')

      const updatedUser = await prisma.user.update({
        where: { id: amarasUser.id },
        data: {
          tenantId: niwandakimuTenant.id,
          updatedAt: new Date()
        },
        include: { tenant: true }
      })

      console.log('✅ User updated successfully!')
      console.log(`   New tenant: ${updatedUser.tenant.subdomain} (ID: ${updatedUser.tenantId})`)

      // Verify the update
      const verification = await prisma.user.findUnique({
        where: { id: amarasUser.id },
        include: { tenant: true }
      })

      if (verification && verification.tenantId === niwandakimuTenant.id) {
        console.log('✅ Verification: Update confirmed in database')
      } else {
        console.error('❌ Verification: Update not confirmed!')
      }
    } else {
      console.log('✅ User is already assigned to the correct tenant')
    }

  } catch (error) {
    console.error('❌ Error fixing user tenant assignment:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixUserTenantAssignment()
    .then(() => {
      console.log('\n🎉 User tenant assignment fix completed!')
    })
    .catch(error => {
      console.error('\n💥 Fix failed:', error)
      process.exit(1)
    })
}

module.exports = { fixUserTenantAssignment }