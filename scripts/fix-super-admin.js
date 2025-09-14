#!/usr/bin/env node

/**
 * Fix Super Admin and Tenant Setup
 * This script fixes authentication issues and sets up proper multi-tenant structure
 */

const { Pool } = require('pg')
const bcrypt = require('bcrypt')

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ipindapatha',
})

async function setupSuperAdmin() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Setting up Super Admin user...')
    
    // First check if super admin exists
    const existingSuper = await client.query(
      'SELECT id, username, email, role FROM users WHERE role = $1 LIMIT 1',
      ['super_admin']
    )
    
    if (existingSuper.rows.length > 0) {
      console.log('✅ Super admin already exists:', existingSuper.rows[0].email)
      
      // Update password with proper special character support
      const password = 'SuperAdmin123!'
      const hashedPassword = await bcrypt.hash(password, 12)
      
      await client.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, existingSuper.rows[0].id]
      )
      
      console.log('✅ Super admin password updated successfully')
      return existingSuper.rows[0]
    } else {
      // Create super admin
      console.log('📝 Creating new super admin user...')
      
      const password = 'SuperAdmin123!'
      const hashedPassword = await bcrypt.hash(password, 12)
      
      const result = await client.query(`
        INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, username, email, role
      `, ['superadmin', 'admin@ipindapatha.com', hashedPassword, 'super_admin', true])
      
      console.log('✅ Super admin created:', result.rows[0].email)
      return result.rows[0]
    }
  } finally {
    client.release()
  }
}

async function setupTenants() {
  const client = await pool.connect()
  
  try {
    console.log('🏢 Setting up tenants...')
    
    // Check existing tenants
    const existingTenants = await client.query('SELECT id, name, subdomain FROM tenants ORDER BY id')
    console.log('📋 Existing tenants:', existingTenants.rows)
    
    const tenantsToCreate = [
      {
        name: 'Ipindapatha Monastery',
        subdomain: 'ipindapatha',
        domain: 'ipindapatha.com',
        description: 'Main monastery booking system'
      },
      {
        name: 'Niwandakimu Center',
        subdomain: 'niwandakimu', 
        domain: 'niwandakimu.com',
        description: 'Niwandakimu meditation center'
      }
    ]
    
    for (const tenantData of tenantsToCreate) {
      // Check if tenant already exists
      const existing = await client.query(
        'SELECT id FROM tenants WHERE subdomain = $1',
        [tenantData.subdomain]
      )
      
      if (existing.rows.length === 0) {
        // Create tenant
        const tenant = await client.query(`
          INSERT INTO tenants (name, subdomain, domain, description, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, name, subdomain
        `, [tenantData.name, tenantData.subdomain, tenantData.domain, tenantData.description, true])
        
        console.log('✅ Created tenant:', tenant.rows[0])
        
        // Create tenant settings
        await client.query(`
          INSERT INTO tenant_settings (tenant_id, business_hours, booking_rules, features, created_at, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          tenant.rows[0].id,
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
        
        // Create tenant subscription
        const startDate = new Date()
        const endDate = new Date()
        endDate.setFullYear(endDate.getFullYear() + 1)
        
        await client.query(`
          INSERT INTO tenant_subscriptions (tenant_id, plan, status, start_date, end_date, max_users, max_bookings, features, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          tenant.rows[0].id,
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
        
        // Create site content for this tenant
        const siteContent = [
          {
            contentKey: 'site_name',
            category: 'branding',
            title: 'Site Name',
            content: tenantData.name + ' Booking System',
            contentType: 'text'
          },
          {
            contentKey: 'welcome_message',
            category: 'homepage',
            title: 'Welcome Message',
            content: `Welcome to ${tenantData.name}`,
            contentType: 'text'
          }
        ]
        
        for (const content of siteContent) {
          await client.query(`
            INSERT INTO site_content 
            (tenant_id, content_key, category, language, title, content, content_type, display_order, is_active, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
          `, [
            tenant.rows[0].id,
            content.contentKey,
            content.category,
            'en',
            content.title,
            content.content,
            content.contentType,
            1,
            true
          ])
        }
        
        console.log(`📄 Created site content for ${tenant.rows[0].name}`)
        
      } else {
        console.log('⏭️  Tenant already exists:', tenantData.subdomain)
      }
    }
  } finally {
    client.release()
  }
}

async function verifySetup() {
  const client = await pool.connect()
  
  try {
    console.log('\n🔍 Verifying setup...')
    
    // Check super admin
    const superAdmin = await client.query(
      'SELECT username, email, role FROM users WHERE role = $1',
      ['super_admin']
    )
    
    // Check tenants
    const tenants = await client.query('SELECT name, subdomain, is_active FROM tenants ORDER BY id')
    
    // Check site content
    const content = await client.query(`
      SELECT t.name as tenant_name, sc.content_key, sc.content 
      FROM site_content sc
      LEFT JOIN tenants t ON sc.tenant_id = t.id
      WHERE sc.content_key = 'site_name'
      ORDER BY t.name
    `)
    
    console.log('\n📊 Setup Summary:')
    console.log('Super Admin:', superAdmin.rows)
    console.log('Tenants:', tenants.rows)
    console.log('Site Content:', content.rows)
    
  } finally {
    client.release()
  }
}

async function main() {
  try {
    console.log('🚀 Starting Super Admin and Tenant Setup...\n')
    
    await setupSuperAdmin()
    await setupTenants()
    await verifySetup()
    
    console.log('\n✅ Setup completed successfully!')
    console.log('\n📋 Login Information:')
    console.log('  Super Admin: admin@ipindapatha.com / SuperAdmin123!')
    console.log('  Access: http://localhost:3001/admin/tenants')
    console.log('\n🏢 Tenants Available:')
    console.log('  - Ipindapatha: http://ipindapatha.localhost:3001')
    console.log('  - Niwandakimu: http://niwandakimu.localhost:3001')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { setupSuperAdmin, setupTenants, verifySetup }