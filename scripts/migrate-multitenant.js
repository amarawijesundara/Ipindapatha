const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function migrateMultiTenant() {
  try {
    console.log('Starting multi-tenant database migration...')
    
    // 1. Create tenants table first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        subdomain VARCHAR(50) UNIQUE NOT NULL,
        domain VARCHAR(100),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for tenants table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at)')

    console.log('✓ Tenants table created')

    // 2. Add tenant_id to users table (if not exists)
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE
    `)
    
    // Update users role enum to include tenant roles
    await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'tenant_manager', 'tenant_admin', 'super_admin'))
    `)

    // Create composite index for tenant-scoped user lookups
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email) WHERE tenant_id IS NOT NULL')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_tenant_username ON users(tenant_id, username) WHERE tenant_id IS NOT NULL')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)')

    console.log('✓ Users table updated for multi-tenancy')

    // 3. Add tenant_id to bookings table (if not exists)
    await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE
    `)

    // Create indexes for tenant-scoped booking lookups
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_tenant_user ON bookings(tenant_id, user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date ON bookings(tenant_id, booking_date)')

    console.log('✓ Bookings table updated for multi-tenancy')

    // 4. Add tenant_id to booking_availability table (if not exists)
    await pool.query(`
      ALTER TABLE booking_availability 
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE
    `)

    // Update unique constraint to include tenant_id
    await pool.query('DROP INDEX IF EXISTS booking_availability_date_time_slot_key')
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_tenant_date_time 
      ON booking_availability(tenant_id, date, time_slot)
    `)

    // Create index for tenant-scoped availability lookups
    await pool.query('CREATE INDEX IF NOT EXISTS idx_availability_tenant_date ON booking_availability(tenant_id, date)')

    console.log('✓ Booking availability table updated for multi-tenancy')

    // 5. Create tenant_subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'cancelled')),
        start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        max_users INTEGER NOT NULL DEFAULT 10,
        max_bookings INTEGER NOT NULL DEFAULT 1000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for tenant subscriptions
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_end_date ON tenant_subscriptions(end_date)')

    console.log('✓ Tenant subscriptions table created')

    // 6. Create tenant_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        business_hours JSONB DEFAULT '{
          "monday": {"open": "09:00", "close": "17:00", "enabled": true},
          "tuesday": {"open": "09:00", "close": "17:00", "enabled": true},
          "wednesday": {"open": "09:00", "close": "17:00", "enabled": true},
          "thursday": {"open": "09:00", "close": "17:00", "enabled": true},
          "friday": {"open": "09:00", "close": "17:00", "enabled": true},
          "saturday": {"open": "09:00", "close": "17:00", "enabled": false},
          "sunday": {"open": "09:00", "close": "17:00", "enabled": false}
        }',
        booking_settings JSONB DEFAULT '{
          "advance_booking_days": 30,
          "max_bookings_per_user": 10,
          "cancellation_hours": 24,
          "confirmation_required": true
        }',
        notification_settings JSONB DEFAULT '{
          "email_notifications": true,
          "booking_confirmations": true,
          "booking_reminders": true,
          "admin_notifications": true
        }',
        customization JSONB DEFAULT '{
          "brand_colors": {"primary": "#3B82F6", "secondary": "#6B7280"},
          "logo_url": null,
          "custom_css": null
        }',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create index for tenant settings
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id)')

    console.log('✓ Tenant settings table created')

    // 7. Update triggers for new tables
    await pool.query(`
      DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
      CREATE TRIGGER update_tenants_updated_at
        BEFORE UPDATE ON tenants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS update_tenant_subscriptions_updated_at ON tenant_subscriptions;
      CREATE TRIGGER update_tenant_subscriptions_updated_at
        BEFORE UPDATE ON tenant_subscriptions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings;
      CREATE TRIGGER update_tenant_settings_updated_at
        BEFORE UPDATE ON tenant_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)

    console.log('✓ Triggers updated for new tables')

    // 8. Create constraint to ensure tenant users belong to correct tenant
    await pool.query(`
      CREATE OR REPLACE FUNCTION check_user_tenant_consistency()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.tenant_id IS NOT NULL AND TG_OP = 'INSERT' THEN
          -- Check if tenant exists and is active
          IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = NEW.tenant_id AND is_active = true) THEN
            RAISE EXCEPTION 'Cannot assign user to inactive or non-existent tenant';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS check_user_tenant_consistency_trigger ON users;
      CREATE TRIGGER check_user_tenant_consistency_trigger
        BEFORE INSERT OR UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION check_user_tenant_consistency()
    `)

    console.log('✓ Tenant consistency constraints created')

    // 9. Create function to ensure booking tenant consistency
    await pool.query(`
      CREATE OR REPLACE FUNCTION check_booking_tenant_consistency()
      RETURNS TRIGGER AS $$
      DECLARE
        user_tenant_id INTEGER;
      BEGIN
        -- Get the tenant_id from the user
        SELECT tenant_id INTO user_tenant_id FROM users WHERE id = NEW.user_id;
        
        -- If user has tenant_id, booking must have same tenant_id
        IF user_tenant_id IS NOT NULL AND NEW.tenant_id != user_tenant_id THEN
          RAISE EXCEPTION 'Booking tenant_id must match user tenant_id';
        END IF;
        
        -- If user has no tenant (super admin), allow any tenant_id
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS check_booking_tenant_consistency_trigger ON bookings;
      CREATE TRIGGER check_booking_tenant_consistency_trigger
        BEFORE INSERT OR UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION check_booking_tenant_consistency()
    `)

    console.log('✓ Booking tenant consistency constraints created')

    console.log('\n🎉 Multi-tenant database migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run seed script to create default tenants and super admin')
    console.log('2. Update your environment variables if needed')
    console.log('3. Test the multi-tenant functionality')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  migrateMultiTenant()
}

module.exports = { migrateMultiTenant }