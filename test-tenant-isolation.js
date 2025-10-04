#!/usr/bin/env node

/**
 * Test tenant isolation - verify users cannot cross-login between tenants
 */

async function testTenantIsolation() {
  console.log('🔐 Testing Tenant Isolation...\n')

  const testCases = [
    {
      name: 'Demo tenant user trying to access Niwandakimu',
      host: 'niwandakimu.localhost:3001',
      tenantHeader: 'niwandakimu',
      credentials: {
        identifier: 'amara@example.com', // Demo tenant user
        password: 'User123!'
      },
      expectedResult: 'forbidden',
      description: 'Demo tenant user should NOT be able to log into Niwandakimu'
    },
    {
      name: 'Niwandakimu user trying to access Demo',
      host: 'demo.localhost:3001',
      tenantHeader: 'demo',
      credentials: {
        identifier: 'amara@niwandakimu.com', // Niwandakimu tenant user
        password: 'User123!'
      },
      expectedResult: 'forbidden',
      description: 'Niwandakimu user should NOT be able to log into Demo'
    },
    {
      name: 'Super admin accessing any tenant (Niwandakimu)',
      host: 'niwandakimu.localhost:3001',
      tenantHeader: 'niwandakimu',
      credentials: {
        identifier: 'admin@example.com',
        password: 'SuperAdmin123!'
      },
      expectedResult: 'success',
      description: 'Super admin should be able to access any tenant'
    },
    {
      name: 'Super admin accessing any tenant (Demo)',
      host: 'demo.localhost:3001',
      tenantHeader: 'demo',
      credentials: {
        identifier: 'admin@example.com',
        password: 'SuperAdmin123!'
      },
      expectedResult: 'success',
      description: 'Super admin should be able to access any tenant'
    },
    {
      name: 'Valid Niwandakimu user login',
      host: 'niwandakimu.localhost:3001',
      tenantHeader: 'niwandakimu',
      credentials: {
        identifier: 'amara@niwandakimu.com',
        password: 'User123!'
      },
      expectedResult: 'success',
      description: 'Niwandakimu users should be able to log into their own tenant'
    },
    {
      name: 'Valid Demo user login',
      host: 'demo.localhost:3001',
      tenantHeader: 'demo',
      credentials: {
        identifier: 'amara@example.com',
        password: 'User123!'
      },
      expectedResult: 'success',
      description: 'Demo users should be able to log into their own tenant'
    }
  ]

  let passedTests = 0
  let totalTests = testCases.length

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`)
    console.log(`   Description: ${testCase.description}`)

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': testCase.host,
          'x-tenant-subdomain': testCase.tenantHeader
        },
        body: JSON.stringify(testCase.credentials)
      })

      const data = await response.json()

      if (testCase.expectedResult === 'success') {
        if (response.ok) {
          console.log('   ✅ PASSED - Login succeeded as expected')
          console.log(`   📄 User: ${data.user?.email} (${data.user?.role})`)
          passedTests++
        } else {
          console.log('   ❌ FAILED - Login should have succeeded')
          console.log(`   📄 Error: ${data.message}`)
        }
      } else if (testCase.expectedResult === 'forbidden') {
        if (!response.ok && (response.status === 403 || response.status === 401)) {
          console.log('   ✅ PASSED - Login correctly blocked')
          console.log(`   📄 Message: ${data.message}`)
          passedTests++
        } else if (response.ok) {
          console.log('   ❌ FAILED - Login should have been blocked!')
          console.log(`   📄 User: ${data.user?.email} (${data.user?.role})`)
        } else {
          console.log('   ⚠️  PARTIAL - Login failed but not with expected error')
          console.log(`   📄 Status: ${response.status}, Message: ${data.message}`)
        }
      }

    } catch (error) {
      console.log(`   ❌ FAILED - Test error: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`)

  if (passedTests === totalTests) {
    console.log('🎉 All tenant isolation tests PASSED!')
  } else {
    console.log('❌ Some tenant isolation tests FAILED!')
    console.log('🔧 Tenant isolation needs further fixes.')
  }

  return passedTests === totalTests
}

// Run the test
if (require.main === module) {
  testTenantIsolation()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test suite failed:', error)
      process.exit(1)
    })
}

module.exports = { testTenantIsolation }