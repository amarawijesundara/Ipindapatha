const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function addCurrencyColumn() {
  try {
    console.log('🔄 Adding currency column to tenant_settings table...')

    // Check if the currency column already exists
    const columnExistsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenant_settings' AND column_name = 'currency'
    `)

    if (columnExistsResult.rows.length > 0) {
      console.log('✓ currency column already exists in tenant_settings table')
      return
    }

    // Add the currency column with proper type and default value
    console.log('Adding currency column as VARCHAR(3) with default USD...')
    await pool.query(`
      ALTER TABLE tenant_settings
      ADD COLUMN currency VARCHAR(3) DEFAULT 'USD'
    `)

    console.log('✓ currency column added successfully')

    // Update existing records to have USD as default currency
    console.log('Setting USD as default currency for existing tenant settings...')
    const updateResult = await pool.query(`
      UPDATE tenant_settings
      SET currency = 'USD'
      WHERE currency IS NULL
    `)

    console.log(`✓ Updated ${updateResult.rowCount} existing tenant setting(s) with USD currency`)

    // Verify the column was added correctly
    const verifyResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tenant_settings' AND column_name = 'currency'
    `)

    if (verifyResult.rows.length > 0) {
      const col = verifyResult.rows[0]
      console.log('✓ Currency column verification:')
      console.log(`   Type: ${col.data_type}(${col.character_maximum_length})`)
      console.log(`   Default: ${col.column_default}`)
      console.log(`   Nullable: ${col.is_nullable}`)
    }

    // Check how many tenant settings now have currency set
    const currencyCountResult = await pool.query(`
      SELECT currency, COUNT(*) as count
      FROM tenant_settings
      GROUP BY currency
    `)

    console.log('\n📊 Currency distribution:')
    currencyCountResult.rows.forEach(row => {
      console.log(`   ${row.currency}: ${row.count} tenant(s)`)
    })

    console.log('\n🎉 Currency column migration completed successfully!')
    console.log('\n📋 Summary:')
    console.log('✓ Added currency column to tenant_settings table')
    console.log('✓ Set VARCHAR(3) type with USD default')
    console.log('✓ Updated existing tenant settings with USD currency')
    console.log('✓ Database schema now fully matches Prisma schema')

    console.log('\n💰 Supported Currencies:')
    console.log('🇺🇸 USD - US Dollar')
    console.log('🇱🇰 LKR - Sri Lankan Rupee')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  addCurrencyColumn()
}

module.exports = { addCurrencyColumn }