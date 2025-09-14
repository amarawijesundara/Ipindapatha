const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function migrateContent() {
  try {
    console.log('Starting content migration...')
    
    // Check if platform_settings has a platformName setting
    const platformNameResult = await pool.query(`
      SELECT setting_value, updated_by 
      FROM platform_settings 
      WHERE setting_key = 'platformName' AND is_active = true
      LIMIT 1
    `)
    
    let platformName = null
    let updatedBy = null
    
    if (platformNameResult.rows.length > 0) {
      platformName = platformNameResult.rows[0].setting_value
      updatedBy = platformNameResult.rows[0].updated_by
      console.log(`Found existing platformName: "${platformName}"`)
    }
    
    // Get super admin ID if no updatedBy
    if (!updatedBy) {
      const adminResult = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND role = $2',
        ['admin@example.com', 'super_admin']
      )
      if (adminResult.rows.length > 0) {
        updatedBy = adminResult.rows[0].id
      }
    }
    
    // Check if site_content already has site_name entries
    const existingSiteNameResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM site_content 
      WHERE content_key = 'site_name'
    `)
    
    const existingSiteNameCount = parseInt(existingSiteNameResult.rows[0].count)
    
    if (existingSiteNameCount === 0) {
      console.log('Migrating platformName to site_content...')
      
      // Insert site_name content for both languages
      const siteNameValue = platformName || 'Monastery Dhane Booking'
      const siteNameValueSi = platformName ? platformName : 'පන්සල් දානේ වෙන්කරවීම්'
      
      await pool.query(`
        INSERT INTO site_content (
          content_key, category, language, title, content, 
          content_type, display_order, updated_by
        ) VALUES 
          ('site_name', 'site_info', 'en', 'Site Name', $1, 'text', 1, $2),
          ('site_name', 'site_info', 'si', 'Site Name', $3, 'text', 1, $2)
        ON CONFLICT (content_key, language) DO NOTHING
      `, [siteNameValue, updatedBy, siteNameValueSi])
      
      console.log(`✓ Migrated platformName "${siteNameValue}" to site_content`)
    } else {
      console.log('Site name content already exists in site_content table')
    }
    
    // Optional: Deactivate the platformName setting if it exists
    if (platformNameResult.rows.length > 0) {
      await pool.query(`
        UPDATE platform_settings 
        SET is_active = false, 
            updated_at = CURRENT_TIMESTAMP,
            setting_value = CONCAT('[MIGRATED TO CONTENT] ', setting_value)
        WHERE setting_key = 'platformName'
      `)
      console.log('✓ Deactivated platformName setting in platform_settings')
    }
    
    // Verify the migration
    const verifyResult = await pool.query(`
      SELECT content_key, language, content 
      FROM site_content 
      WHERE content_key = 'site_name' AND is_active = true
      ORDER BY language
    `)
    
    console.log('✓ Migration completed successfully!')
    console.log('Site name entries in site_content:')
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.language}: "${row.content}"`)
    })
    
  } catch (error) {
    console.error('Content migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  migrateContent()
}

module.exports = { migrateContent }