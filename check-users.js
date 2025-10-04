#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('📊 Checking existing users and tenants...\n')

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { subdomain: 'asc' }
    })

    console.log('🏢 Available Tenants:')
    tenants.forEach((tenant, i) => {
      console.log(`  ${i + 1}. ${tenant.name} (${tenant.subdomain}) - ID: ${tenant.id}`)
    })

    // Get all users with tenant info
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        tenant: true
      },
      orderBy: [
        { tenantId: 'asc' },
        { email: 'asc' }
      ]
    })

    console.log('\n👥 Available Users:')
    users.forEach((user, i) => {
      const tenantInfo = user.tenant ? `${user.tenant.subdomain} (${user.tenant.name})` : 'Global (no tenant)'
      console.log(`  ${i + 1}. ${user.email} - ${user.role} - Tenant: ${tenantInfo}`)
      console.log(`     Username: ${user.username}, Active: ${user.isActive}`)
    })

    console.log('\n🔐 Suggested Test Credentials:')

    // Super admin
    const superAdmin = users.find(u => u.role === 'super_admin')
    if (superAdmin) {
      console.log(`  Super Admin: ${superAdmin.email} / SuperAdmin123!`)
    }

    // Regular users by tenant
    const tenantUsers = users.filter(u => u.role !== 'super_admin' && u.tenantId)
    tenantUsers.forEach(user => {
      if (user.tenant) {
        console.log(`  ${user.tenant.subdomain} user: ${user.email} / [password needed]`)
      }
    })

  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  checkUsers()
}

module.exports = { checkUsers }