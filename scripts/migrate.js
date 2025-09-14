const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function migrate() {
  try {
    console.log('Starting database migration...')
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
        phone_number VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for users table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)')
    
    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        booking_time TIME NOT NULL,
        event_note TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for bookings table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(booking_date, booking_time)')
    
    // Create booking_availability table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booking_availability (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        time_slot TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        max_bookings INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, time_slot)
      )
    `)
    
    // Create indexes for booking_availability table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_availability_date ON booking_availability(date)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_availability_available ON booking_availability(is_available)')
    
    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for refresh_tokens table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)')
    
    // Create platform_settings table for admin settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean')),
        is_active BOOLEAN DEFAULT true,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create site_content table for editable content
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_content (
        id SERIAL PRIMARY KEY,
        content_key VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        language VARCHAR(5) NOT NULL DEFAULT 'en',
        title VARCHAR(255),
        content TEXT,
        content_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'markdown', 'json')),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(content_key, language)
      )
    `)
    
    // Create indexes for platform_settings table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_platform_settings_active ON platform_settings(is_active)')
    
    // Create indexes for site_content table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(content_key)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_category ON site_content(category)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_language ON site_content(language)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_active ON site_content(is_active)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_order ON site_content(category, display_order)')
    
    // Create admin_audit_log table for tracking admin actions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id INTEGER,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for admin_audit_log table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON admin_audit_log(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_type, target_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at)')
    
    // Create trigger for updated_at columns
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `)
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
      CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_availability_updated_at ON booking_availability;
      CREATE TRIGGER update_availability_updated_at
        BEFORE UPDATE ON booking_availability
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
      CREATE TRIGGER update_platform_settings_updated_at
        BEFORE UPDATE ON platform_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    
    await pool.query(`
      DROP TRIGGER IF EXISTS update_site_content_updated_at ON site_content;
      CREATE TRIGGER update_site_content_updated_at
        BEFORE UPDATE ON site_content
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    
    // Create recurring_bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_bookings (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_month INTEGER NOT NULL CHECK (booking_month >= 1 AND booking_month <= 12),
        booking_day INTEGER NOT NULL CHECK (booking_day >= 1 AND booking_day <= 31),
        booking_time TIME NOT NULL,
        event_note TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, booking_month, booking_day, booking_time)
      )
    `)
    
    // Create indexes for recurring_bookings table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recurring_bookings_tenant_id ON recurring_bookings(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recurring_bookings_user_id ON recurring_bookings(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recurring_bookings_date ON recurring_bookings(booking_month, booking_day)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active ON recurring_bookings(is_active)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recurring_bookings_datetime ON recurring_bookings(booking_month, booking_day, booking_time)')
    
    // Add columns to existing bookings table for recurring support
    await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS recurring_booking_id INTEGER REFERENCES recurring_bookings(id) ON DELETE SET NULL
    `)
    
    // Create indexes for new booking columns
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_is_recurring ON bookings(is_recurring)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_recurring_id ON bookings(recurring_booking_id)')
    
    // Create trigger for recurring_bookings updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS update_recurring_bookings_updated_at ON recurring_bookings;
      CREATE TRIGGER update_recurring_bookings_updated_at
        BEFORE UPDATE ON recurring_bookings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    
    console.log('Database migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  migrate()
}

module.exports = { migrate }