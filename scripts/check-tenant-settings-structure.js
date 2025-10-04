const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function checkTenantSettingsStructure() {
  try {
    console.log('🔍 Checking tenant_settings table structure...')

    // Get all columns in tenant_settings table
    const columnsResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'tenant_settings'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 Current tenant_settings table columns:')
    console.log('=' .repeat(80))
    console.log('| Column Name       | Data Type | Nullable | Default Value')
    console.log('=' .repeat(80))

    columnsResult.rows.forEach(row => {
      const columnName = row.column_name.padEnd(17)
      const dataType = row.data_type.padEnd(9)
      const nullable = row.is_nullable.padEnd(8)
      const defaultValue = (row.column_default || 'null').substring(0, 20)
      console.log(`| ${columnName} | ${dataType} | ${nullable} | ${defaultValue}`)
    })
    console.log('=' .repeat(80))

    // Check for specific columns that should exist based on Prisma schema
    const expectedColumns = [
      'id',
      'tenant_id',
      'business_hours',
      'booking_rules',
      'custom_fields',
      'branding',
      'notifications',
      'features',
      'meal_costs',
      'meal_periods',  // We added this
      'currency',      // This is missing
      'created_at',
      'updated_at'
    ]

    console.log('\n🔍 Column existence check:')
    console.log('-'.repeat(40))

    const existingColumns = columnsResult.rows.map(row => row.column_name)
    const missingColumns = []

    expectedColumns.forEach(column => {
      if (existingColumns.includes(column)) {
        console.log(`✅ ${column}`)
      } else {
        console.log(`❌ ${column} - MISSING`)
        missingColumns.push(column)
      }
    })

    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Found ${missingColumns.length} missing column(s):`)
      missingColumns.forEach(column => {
        console.log(`   - ${column}`)
      })
    } else {
      console.log('\n✅ All expected columns are present!')
    }

    console.log('\n📊 Summary:')
    console.log(`   Total columns: ${existingColumns.length}`)
    console.log(`   Expected columns: ${expectedColumns.length}`)
    console.log(`   Missing columns: ${missingColumns.length}`)

  } catch (error) {
    console.error('❌ Error checking table structure:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code
    })
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  checkTenantSettingsStructure()
}

module.exports = { checkTenantSettingsStructure }