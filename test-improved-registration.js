#!/usr/bin/env node

/**
 * Test the improved tenant-based registration system
 */

async function testImprovedRegistration() {
  console.log('🔧 Testing Improved Tenant-Based Registration...\n')

  const testCases = [
    {
      name: 'Registration on demo tenant with Gmail address',
      host: 'demo.localhost:3003',
      tenantHeader: 'demo',
      userData: {
        username: 'testuser1',
        email: 'testuser1@gmail.com', // Gmail - not domain-based
        password: 'TestPass123!'
      },
      expectedResult: 'success',
      description: 'User with Gmail should be able to register on demo tenant'
    },
    {
      name: 'Registration on niwandakimu tenant with Yahoo address',
      host: 'niwandakimu.localhost:3003',
      tenantHeader: 'niwandakimu',
      userData: {
        username: 'testuser2',
        email: 'testuser2@yahoo.com', // Yahoo - not domain-based
        password: 'TestPass123!'
      },
      expectedResult: 'success',
      description: 'User with Yahoo should be able to register on niwandakimu tenant'
    },
    {
      name: 'Registration without tenant context (localhost)',
      host: 'localhost:3003',
      tenantHeader: null,
      userData: {
        username: 'testuser3',
        email: 'testuser3@example.com',
        password: 'TestPass123!'
      },
      expectedResult: 'error',
      expectedMessage: 'register through your organization\'s portal',
      description: 'Registration without subdomain should be blocked'
    },
    {
      name: 'Duplicate registration in same tenant',
      host: 'demo.localhost:3003',
      tenantHeader: 'demo',
      userData: {
        username: 'testuser1duplicate',
        email: 'testuser1@gmail.com', // Same email as first test
        password: 'TestPass123!'
      },
      expectedResult: 'error',
      expectedMessage: 'already exists in Demo Company',
      description: 'Duplicate email in same tenant should be rejected with specific message'
    },
    {
      name: 'Cross-tenant email conflict',
      host: 'niwandakimu.localhost:3003',
      tenantHeader: 'niwandakimu',
      userData: {
        username: 'testuser1cross',
        email: 'testuser1@gmail.com', // Same email as demo tenant user
        password: 'TestPass123!'
      },
      expectedResult: 'error',
      expectedMessage: 'already registered with',
      description: 'Email from another tenant should be rejected with helpful message'
    }
  ]

  let passedTests = 0
  let totalTests = testCases.length

  for (const [index, testCase] of testCases.entries()) {
    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`)
    console.log(`   Description: ${testCase.description}`)

    try {
      const headers = {
        'Content-Type': 'application/json'
      }

      if (testCase.host !== 'localhost:3003') {
        headers['Host'] = testCase.host
      }

      if (testCase.tenantHeader) {
        headers['x-tenant-subdomain'] = testCase.tenantHeader
      }

      const response = await fetch('http://localhost:3003/api/auth/register', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testCase.userData)
      })

      const data = await response.json()

      if (testCase.expectedResult === 'success') {
        if (response.ok) {
          console.log('   ✅ PASSED - Registration succeeded as expected')
          console.log(`   📄 User: ${data.user?.email} created in tenant: ${data.user?.tenant_id || 'Global'}`)
          passedTests++
        } else {
          console.log('   ❌ FAILED - Registration should have succeeded')
          console.log(`   📄 Error: ${data.message}`)
        }
      } else if (testCase.expectedResult === 'error') {
        if (!response.ok) {
          const messageMatches = testCase.expectedMessage
            ? data.message.toLowerCase().includes(testCase.expectedMessage.toLowerCase())
            : true

          if (messageMatches) {
            console.log('   ✅ PASSED - Registration correctly blocked')
            console.log(`   📄 Message: ${data.message}`)
            passedTests++
          } else {
            console.log('   ⚠️  PARTIAL - Registration blocked but wrong message')
            console.log(`   📄 Expected: ${testCase.expectedMessage}`)
            console.log(`   📄 Got: ${data.message}`)
          }
        } else {
          console.log('   ❌ FAILED - Registration should have been blocked')
          console.log(`   📄 User: ${data.user?.email}`)
        }
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.log(`   ❌ FAILED - Test error: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`)

  if (passedTests === totalTests) {
    console.log('🎉 All improved registration tests PASSED!')
    console.log('✅ Tenant-based registration is working correctly')
    console.log('✅ Email domain independence verified')
    console.log('✅ Proper error messages confirmed')
  } else {
    console.log('❌ Some registration tests FAILED!')
    console.log('🔧 Registration system needs further fixes.')
  }

  return passedTests === totalTests
}

// Run the test
if (require.main === module) {
  testImprovedRegistration()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test suite failed:', error)
      process.exit(1)
    })
}

module.exports = { testImprovedRegistration }