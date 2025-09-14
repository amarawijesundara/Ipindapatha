const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ipindapatha',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function setupTenantAdmin() {
  try {
    console.log('Setting up tenant and tenant admin...')
    
    // 1. Create or get the ipindapatha tenant
    console.log('Creating/checking ipindapatha tenant...')
    let tenantResult = await pool.query(`
      SELECT id FROM tenants WHERE subdomain = 'ipindapatha'
    `)
    
    let tenantId
    if (tenantResult.rows.length === 0) {
      // Create the tenant
      const createTenantResult = await pool.query(`
        INSERT INTO tenants (name, subdomain, domain, description, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'Ipindapatha Monastery',
        'ipindapatha',
        'ipindapatha.com',
        'Buddhist monastery offering Dhane booking services',
        true
      ])
      tenantId = createTenantResult.rows[0].id
      console.log(`✓ Created ipindapatha tenant with ID: ${tenantId}`)
      
      // Create default tenant settings
      await pool.query(`
        INSERT INTO tenant_settings (tenant_id, business_hours, booking_rules, features)
        VALUES ($1, $2, $3, $4)
      `, [
        tenantId,
        JSON.stringify({
          monday: { open: '09:00', close: '17:00', enabled: true },
          tuesday: { open: '09:00', close: '17:00', enabled: true },
          wednesday: { open: '09:00', close: '17:00', enabled: true },
          thursday: { open: '09:00', close: '17:00', enabled: true },
          friday: { open: '09:00', close: '17:00', enabled: true },
          saturday: { open: '09:00', close: '17:00', enabled: false },
          sunday: { open: '09:00', close: '17:00', enabled: false }
        }),
        JSON.stringify({
          maxAdvanceBookingDays: 30,
          minAdvanceBookingHours: 2,
          maxBookingsPerUser: 5,
          allowCancellation: true,
          cancellationHours: 24
        }),
        JSON.stringify({
          emailNotifications: true,
          smsNotifications: false,
          customFields: false,
          multipleBookings: true,
          waitingList: false
        })
      ])
      
      // Create default subscription
      const startDate = new Date()
      const endDate = new Date()
      endDate.setFullYear(endDate.getFullYear() + 1)
      
      await pool.query(`
        INSERT INTO tenant_subscriptions (tenant_id, plan, status, start_date, end_date, max_users, max_bookings, features)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        tenantId,
        'starter',
        'active',
        startDate,
        endDate,
        10,
        1000,
        JSON.stringify({
          customBranding: false,
          advancedReporting: false,
          apiAccess: false,
          integrations: []
        })
      ])
      
      console.log('✓ Created tenant settings and subscription')
    } else {
      tenantId = tenantResult.rows[0].id
      console.log(`✓ Found existing ipindapatha tenant with ID: ${tenantId}`)
    }
    
    // 2. Update tenant admin user to have tenant_id
    console.log('Updating tenant admin user...')
    const updateUserResult = await pool.query(`
      UPDATE users 
      SET tenant_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = 'admin@ipindapatha.com' AND role = 'tenant_admin'
      RETURNING id
    `, [tenantId])
    
    if (updateUserResult.rows.length > 0) {
      console.log(`✓ Updated tenant admin user (ID: ${updateUserResult.rows[0].id}) with tenant_id: ${tenantId}`)
    } else {
      console.log('⚠ Tenant admin user not found or already updated')
    }
    
    // 3. Create tenant-specific content by copying existing content
    console.log('Creating tenant-specific content...')
    
    // First, check if tenant already has content
    const existingContentResult = await pool.query(`
      SELECT COUNT(*) as count FROM site_content WHERE tenant_id = $1
    `, [tenantId])
    
    const existingContentCount = parseInt(existingContentResult.rows[0].count)
    
    if (existingContentCount === 0) {
      // Copy existing platform content to this tenant
      await pool.query(`
        INSERT INTO site_content (tenant_id, content_key, category, language, title, content, content_type, display_order, updated_by, created_at, updated_at)
        SELECT $1, content_key, category, language, title, content, content_type, display_order, updated_by, created_at, updated_at
        FROM site_content 
        WHERE tenant_id IS NULL
      `, [tenantId])
      
      // Update the site name for this tenant
      await pool.query(`
        UPDATE site_content 
        SET content = 'Ipindapatha Monastery Dhane Booking', updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND content_key = 'site_name' AND language = 'en'
      `, [tenantId])
      
      await pool.query(`
        UPDATE site_content 
        SET content = 'ඉපින්දපාත පන්සල් දානේ වෙන්කරවීම්', updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND content_key = 'site_name' AND language = 'si'
      `, [tenantId])
      
      console.log('✓ Created tenant-specific content with custom site names')
    } else {
      console.log(`✓ Tenant already has ${existingContentCount} content items`)
    }
    
    // 4. Verify the setup
    console.log('Verifying setup...')
    
    const verifyUserResult = await pool.query(`
      SELECT u.id, u.email, u.role, u.tenant_id, t.name as tenant_name, t.subdomain
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = 'admin@ipindapatha.com'
    `)
    
    if (verifyUserResult.rows.length > 0) {
      const user = verifyUserResult.rows[0]
      console.log('✓ Verification:')
      console.log(`  - User ID: ${user.id}`)
      console.log(`  - Email: ${user.email}`)
      console.log(`  - Role: ${user.role}`)
      console.log(`  - Tenant ID: ${user.tenant_id}`)
      console.log(`  - Tenant Name: ${user.tenant_name}`)
      console.log(`  - Subdomain: ${user.subdomain}`)
    }
    
    const verifyContentResult = await pool.query(`
      SELECT COUNT(*) as count, category
      FROM site_content 
      WHERE tenant_id = $1 
      GROUP BY category
      ORDER BY category
    `, [tenantId])
    
    console.log('✓ Content per category:')
    verifyContentResult.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count} items`)
    })
    
    console.log('\n🎉 Tenant admin setup completed successfully!')
    console.log('📝 Credentials: admin@ipindapatha.com / TenantAdmin123')
    
  } catch (error) {
    console.error('Tenant admin setup failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  setupTenantAdmin()
}

module.exports = { setupTenantAdmin }