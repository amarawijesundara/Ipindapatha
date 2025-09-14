#!/usr/bin/env node

/**
 * Test super admin login and user retrieval
 */

async function testSuperAdminLogin() {
  console.log('🔐 Testing Super Admin Login and User Display...\n')
  
  try {
    // Step 1: Login
    console.log('1. Testing login...')
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'SuperAdmin123!'
      })
    })
    
    const loginData = await loginResponse.json()
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData)
      return
    }
    
    console.log('✅ Login successful')
    console.log('Super Admin:', loginData.user.email)
    
    // Step 2: Get token from cookie-based auth
    console.log('\n2. Getting API token...')
    const tokenResponse = await fetch('http://localhost:3001/api/auth/token', {
      credentials: 'include'
    })
    
    if (!tokenResponse.ok) {
      console.error('❌ Token retrieval failed')
      return
    }
    
    const tokenData = await tokenResponse.json()
    console.log('✅ Token retrieved successfully')
    
    // Step 3: Test admin users endpoint
    console.log('\n3. Testing admin users endpoint...')
    const usersResponse = await fetch('http://localhost:3001/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
    
    const usersData = await usersResponse.json()
    
    if (!usersResponse.ok) {
      console.error('❌ Users endpoint failed:', usersData)
      return
    }
    
    console.log('✅ Users retrieved successfully')
    console.log(`📊 Found ${usersData.users.length} users:`)
    
    usersData.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.email}) - ${user.role}`)
      if (user.tenant) {
        console.log(`     Tenant: ${user.tenant.name}`)
      }
      console.log(`     Active: ${user.is_active}, Bookings: ${user.stats.total_bookings}`)
    })
    
    // Step 4: Test admin tenants endpoint
    console.log('\n4. Testing admin tenants endpoint...')
    const tenantsResponse = await fetch('http://localhost:3001/api/admin/tenants', {
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
    
    const tenantsData = await tenantsResponse.json()
    
    if (!tenantsResponse.ok) {
      console.error('❌ Tenants endpoint failed:', tenantsData)
      return
    }
    
    console.log('✅ Tenants retrieved successfully')
    console.log(`🏢 Found ${tenantsData.tenants.length} tenants:`)
    
    tenantsData.tenants.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} (${tenant.subdomain})`)
      console.log(`     Active: ${tenant.is_active}, Users: ${tenant.stats.total_users}`)
    })
    
    console.log('\n🎉 All tests passed! Super admin can access users and tenants.')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testSuperAdminLogin()