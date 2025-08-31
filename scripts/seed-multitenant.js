const { Pool } = require('pg')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function seedMultiTenant() {
  try {
    console.log('Starting multi-tenant database seeding...')

    // 1. Create super admin user (no tenant)
    const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12)
    const superAdminResult = await pool.query(`
      INSERT INTO users (username, email, password, role, is_active, phone_number, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      'superadmin',
      'admin@yourdomain.com',
      superAdminPassword,
      'super_admin',
      true,
      '+1-555-0100',
      'Platform Headquarters'
    ])

    const superAdminId = superAdminResult.rows[0].id
    console.log('✓ Super admin created/updated')

    // 2. Create sample tenants
    const tenants = [
      {
        name: 'Acme Corporation',
        subdomain: 'acme',
        domain: 'acmecorp.com',
        description: 'A leading corporation in innovative solutions'
      },
      {
        name: 'TechStart Inc',
        subdomain: 'techstart',
        domain: 'techstart.io', 
        description: 'Cutting-edge technology startup'
      },
      {
        name: 'Healthcare Plus',
        subdomain: 'healthplus',
        domain: 'healthcareplus.com',
        description: 'Comprehensive healthcare services'
      }
    ]

    const createdTenants = []

    for (const tenant of tenants) {
      const tenantResult = await pool.query(`
        INSERT INTO tenants (name, subdomain, domain, description, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (subdomain) DO UPDATE SET
          name = EXCLUDED.name,
          domain = EXCLUDED.domain,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, subdomain
      `, [tenant.name, tenant.subdomain, tenant.domain, tenant.description, true])

      createdTenants.push(tenantResult.rows[0])
      console.log(`✓ Tenant created: ${tenant.name} (${tenant.subdomain})`)
    }

    // 3. Create tenant subscriptions
    for (const tenant of createdTenants) {
      await pool.query(`
        INSERT INTO tenant_subscriptions (tenant_id, plan, status, start_date, end_date, max_users, max_bookings)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id) DO UPDATE SET
          plan = EXCLUDED.plan,
          status = EXCLUDED.status,
          max_users = EXCLUDED.max_users,
          max_bookings = EXCLUDED.max_bookings,
          updated_at = CURRENT_TIMESTAMP
      `, [
        tenant.id,
        tenant.subdomain === 'acme' ? 'enterprise' : tenant.subdomain === 'techstart' ? 'professional' : 'starter',
        'active',
        new Date(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        tenant.subdomain === 'acme' ? 100 : tenant.subdomain === 'techstart' ? 50 : 10,
        tenant.subdomain === 'acme' ? 10000 : tenant.subdomain === 'techstart' ? 5000 : 1000
      ])

      console.log(`✓ Subscription created for ${tenant.name}`)
    }

    // 4. Create tenant settings (using defaults from table definition)
    for (const tenant of createdTenants) {
      await pool.query(`
        INSERT INTO tenant_settings (tenant_id)
        VALUES ($1)
        ON CONFLICT (tenant_id) DO NOTHING
      `, [tenant.id])

      console.log(`✓ Settings created for ${tenant.name}`)
    }

    // 5. Create tenant admin users
    const tenantAdmins = [
      {
        tenantId: createdTenants[0].id, // Acme
        username: 'acme_admin',
        email: 'admin@acmecorp.com',
        password: 'AcmeAdmin123!',
        phone: '+1-555-0101'
      },
      {
        tenantId: createdTenants[1].id, // TechStart
        username: 'tech_admin', 
        email: 'admin@techstart.io',
        password: 'TechAdmin123!',
        phone: '+1-555-0102'
      },
      {
        tenantId: createdTenants[2].id, // Healthcare Plus
        username: 'health_admin',
        email: 'admin@healthcareplus.com', 
        password: 'HealthAdmin123!',
        phone: '+1-555-0103'
      }
    ]

    for (const admin of tenantAdmins) {
      const hashedPassword = await bcrypt.hash(admin.password, 12)
      await pool.query(`
        INSERT INTO users (username, email, password, role, tenant_id, is_active, phone_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          tenant_id = EXCLUDED.tenant_id,
          updated_at = CURRENT_TIMESTAMP
      `, [
        admin.username,
        admin.email,
        hashedPassword,
        'tenant_admin',
        admin.tenantId,
        true,
        admin.phone
      ])

      console.log(`✓ Tenant admin created: ${admin.email}`)
    }

    // 6. Create sample tenant users
    const sampleUsers = [
      // Acme users
      { tenantId: createdTenants[0].id, username: 'john_doe', email: 'john@acmecorp.com', role: 'tenant_manager', phone: '+1-555-1001' },
      { tenantId: createdTenants[0].id, username: 'jane_smith', email: 'jane@acmecorp.com', role: 'user', phone: '+1-555-1002' },
      { tenantId: createdTenants[0].id, username: 'bob_wilson', email: 'bob@acmecorp.com', role: 'user', phone: '+1-555-1003' },
      
      // TechStart users
      { tenantId: createdTenants[1].id, username: 'alice_tech', email: 'alice@techstart.io', role: 'tenant_manager', phone: '+1-555-2001' },
      { tenantId: createdTenants[1].id, username: 'charlie_dev', email: 'charlie@techstart.io', role: 'user', phone: '+1-555-2002' },
      
      // Healthcare Plus users
      { tenantId: createdTenants[2].id, username: 'dr_sarah', email: 'sarah@healthcareplus.com', role: 'user', phone: '+1-555-3001' },
      { tenantId: createdTenants[2].id, username: 'nurse_mike', email: 'mike@healthcareplus.com', role: 'user', phone: '+1-555-3002' }
    ]

    for (const user of sampleUsers) {
      const defaultPassword = await bcrypt.hash('Password123!', 12)
      await pool.query(`
        INSERT INTO users (username, email, password, role, tenant_id, is_active, phone_number, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          tenant_id = EXCLUDED.tenant_id,
          updated_at = CURRENT_TIMESTAMP
      `, [
        user.username,
        user.email,
        defaultPassword,
        user.role,
        user.tenantId,
        true,
        user.phone,
        `${createdTenants.find(t => t.id === user.tenantId).name} Office`
      ])

      console.log(`✓ Sample user created: ${user.email}`)
    }

    // 7. Create availability slots for each tenant (next 30 days, weekdays only)
    const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
    const startDate = new Date()
    
    for (const tenant of createdTenants) {
      let slotsCreated = 0
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue
        
        for (const timeSlot of timeSlots) {
          try {
            await pool.query(`
              INSERT INTO booking_availability (tenant_id, date, time_slot, is_available, max_bookings)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (tenant_id, date, time_slot) DO UPDATE SET
                is_available = EXCLUDED.is_available,
                max_bookings = EXCLUDED.max_bookings
            `, [tenant.id, date.toISOString().split('T')[0], timeSlot, true, 3])
            
            slotsCreated++
          } catch (error) {
            // Skip conflicts
          }
        }
      }
      
      console.log(`✓ Created ${slotsCreated} availability slots for ${tenant.name}`)
    }

    // 8. Create some sample bookings
    const sampleBookings = [
      // Acme bookings
      { tenantId: createdTenants[0].id, userEmail: 'jane@acmecorp.com', date: '2024-02-01', time: '10:00', note: 'Team meeting' },
      { tenantId: createdTenants[0].id, userEmail: 'bob@acmecorp.com', date: '2024-02-02', time: '14:00', note: 'Project review' },
      
      // TechStart bookings
      { tenantId: createdTenants[1].id, userEmail: 'charlie@techstart.io', date: '2024-02-01', time: '15:00', note: 'Code review session' },
      
      // Healthcare Plus bookings
      { tenantId: createdTenants[2].id, userEmail: 'sarah@healthcareplus.com', date: '2024-02-03', time: '09:00', note: 'Patient consultation' }
    ]

    for (const booking of sampleBookings) {
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [booking.userEmail])
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id
        
        // Only create booking if date is in the future
        const bookingDate = new Date(booking.date)
        if (bookingDate > new Date()) {
          await pool.query(`
            INSERT INTO bookings (user_id, tenant_id, booking_date, booking_time, event_note, status)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [userId, booking.tenantId, booking.date, booking.time, booking.note, 'confirmed'])
          
          console.log(`✓ Sample booking created for ${booking.userEmail}`)
        }
      }
    }

    console.log('\n🎉 Multi-tenant database seeding completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`- 1 Super Admin: admin@yourdomain.com / SuperAdmin123!`)
    console.log(`- 3 Tenants: ${createdTenants.map(t => `${t.name} (${t.subdomain})`).join(', ')}`)
    console.log(`- ${tenantAdmins.length} Tenant Admins (password: [TenantName]Admin123!)`)
    console.log(`- ${sampleUsers.length} Sample Users (password: Password123!)`)
    console.log(`- Availability slots for next 30 weekdays`)
    console.log(`- Sample bookings for demonstration`)
    
    console.log('\n🌐 Tenant Access URLs:')
    for (const tenant of createdTenants) {
      console.log(`- ${tenant.name}: https://${tenant.subdomain}.yourdomain.com`)
    }
    
    console.log('\n🔑 Default Credentials:')
    console.log('Super Admin: admin@yourdomain.com / SuperAdmin123!')
    console.log('Acme Admin: admin@acmecorp.com / AcmeAdmin123!')
    console.log('TechStart Admin: admin@techstart.io / TechAdmin123!')
    console.log('Healthcare Admin: admin@healthcareplus.com / HealthAdmin123!')
    console.log('Sample Users: [any sample email] / Password123!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  seedMultiTenant()
}

module.exports = { seedMultiTenant }