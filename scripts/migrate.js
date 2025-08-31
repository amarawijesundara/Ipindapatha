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