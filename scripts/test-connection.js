const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function testConnection() {
  console.log('Testing database connection...')
  console.log('Environment variables:')
  console.log(`DB_HOST: ${process.env.DB_HOST || 'localhost'}`)
  console.log(`DB_PORT: ${process.env.DB_PORT || '5432'}`)
  console.log(`DB_NAME: ${process.env.DB_NAME || 'auth_app'}`)
  console.log(`DB_USER: ${process.env.DB_USER || 'postgres'}`)
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`)

  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'auth_app',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
  })

  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW() as current_time')
    console.log('✅ Database connection successful!')
    console.log(`Current time: ${result.rows[0].current_time}`)
    client.release()
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('\n🔧 Troubleshooting tips:')
    console.log('1. Ensure PostgreSQL is running')
    console.log('2. Check your .env.local file exists and has correct credentials')
    console.log('3. Ensure the database exists: createdb auth_app')
    console.log('4. Try: psql -U postgres -d auth_app -c "SELECT 1"')
  } finally {
    await pool.end()
  }
}

testConnection()