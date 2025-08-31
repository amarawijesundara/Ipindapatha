const { migrate } = require('./migrate')
const { migrateMultiTenant } = require('./migrate-multitenant')
const { seedMultiTenant } = require('./seed-multitenant')

async function setupMultiTenant() {
  try {
    console.log('🚀 Setting up multi-tenant application...\n')

    // 1. Run original migration first (creates base tables)
    console.log('Step 1: Running base migration...')
    await migrate()
    console.log('✓ Base migration completed\n')

    // 2. Run multi-tenant migration (adds tenant support)
    console.log('Step 2: Running multi-tenant migration...')
    await migrateMultiTenant()
    console.log('✓ Multi-tenant migration completed\n')

    // 3. Seed with multi-tenant data
    console.log('Step 3: Seeding multi-tenant data...')
    await seedMultiTenant()
    console.log('✓ Multi-tenant seeding completed\n')

    console.log('🎉 Multi-tenant application setup completed successfully!')
    console.log('\n📝 Next Steps:')
    console.log('1. Update your .env.local file with the correct database configuration')
    console.log('2. Start your development server: npm run dev')
    console.log('3. Test the multi-tenant functionality:')
    console.log('   - Super admin: http://localhost:3000 (admin@yourdomain.com)')
    console.log('   - Tenant admin: http://acme.localhost:3000 (admin@acmecorp.com)')
    console.log('   - Regular user: http://acme.localhost:3000 (jane@acmecorp.com)')
    console.log('4. Configure your DNS/hosts file for subdomain testing')
    console.log('\n💡 For subdomain testing on localhost, add to /etc/hosts:')
    console.log('127.0.0.1 acme.localhost')
    console.log('127.0.0.1 techstart.localhost') 
    console.log('127.0.0.1 healthplus.localhost')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Ensure PostgreSQL is running')
    console.error('2. Check your database credentials in .env.local')
    console.error('3. Ensure the database exists: createdb auth_app')
    console.error('4. Check database permissions')
    process.exit(1)
  }
}

if (require.main === module) {
  setupMultiTenant()
}

module.exports = { setupMultiTenant }