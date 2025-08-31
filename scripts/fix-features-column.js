const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function fixFeaturesColumn() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ipindapatha',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
  })

  try {
    console.log('Adding missing features column to tenant_subscriptions...')
    
    await pool.query(`
      ALTER TABLE tenant_subscriptions 
      ADD COLUMN IF NOT EXISTS features JSONB
    `)
    
    console.log('✓ Features column added successfully!')
    
  } catch (error) {
    console.error('❌ Failed to add features column:', error)
  } finally {
    await pool.end()
  }
}

fixFeaturesColumn()