const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ipindapatha',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function migrateContentToMultiTenant() {
  try {
    console.log('Starting multi-tenant content migration...')
    
    // 1. Add tenant_id column to site_content table
    console.log('Adding tenant_id column to site_content table...')
    await pool.query(`
      ALTER TABLE site_content 
      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE
    `)
    
    // 2. Create new indexes for multi-tenant queries
    console.log('Creating multi-tenant indexes...')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_tenant_id ON site_content(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_site_content_tenant_category ON site_content(tenant_id, category)')
    
    // 3. Drop old unique constraint and create new one
    console.log('Updating unique constraints...')
    await pool.query('ALTER TABLE site_content DROP CONSTRAINT IF EXISTS site_content_content_key_language_key')
    await pool.query(`
      ALTER TABLE site_content 
      ADD CONSTRAINT site_content_tenant_content_key_language_unique 
      UNIQUE (tenant_id, content_key, language)
    `)
    
    console.log('✓ Multi-tenant content migration completed successfully!')
    
  } catch (error) {
    console.error('Content migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  migrateContentToMultiTenant()
}

module.exports = { migrateContentToMultiTenant }