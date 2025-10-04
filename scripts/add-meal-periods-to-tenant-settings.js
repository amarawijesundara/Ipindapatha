const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function addMealPeriodsColumn() {
  try {
    console.log('🔄 Adding meal_periods column to tenant_settings table...')

    // Check if the column already exists
    const columnExistsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenant_settings' AND column_name = 'meal_periods'
    `)

    if (columnExistsResult.rows.length > 0) {
      console.log('✓ meal_periods column already exists in tenant_settings table')
      return
    }

    // Add the meal_periods column
    console.log('Adding meal_periods column as JSON type...')
    await pool.query(`
      ALTER TABLE tenant_settings
      ADD COLUMN meal_periods JSON
    `)

    console.log('✓ meal_periods column added successfully')

    // Set default meal periods for existing tenant settings
    console.log('Setting default meal periods for existing tenants...')

    const defaultMealPeriods = [
      {
        id: 'morning_meal',
        name: 'Morning Meal',
        icon: '🌅',
        timeRange: '6:30 - 7:30 AM',
        description: 'Traditional morning meal offering',
        color: 'amber',
        cost: 75,
        isEnabled: true,
        order: 1
      },
      {
        id: 'morning_tea',
        name: 'Morning Tea',
        icon: '🍵',
        timeRange: '9:30 - 10:30 AM',
        description: 'Light refreshments and tea',
        color: 'green',
        cost: 25,
        isEnabled: true,
        order: 2
      },
      {
        id: 'lunch_meal',
        name: 'Lunch Meal',
        icon: '🍽️',
        timeRange: '11:30 AM - 12:00 PM',
        description: 'Main midday meal offering',
        color: 'blue',
        cost: 100,
        isEnabled: true,
        order: 3
      },
      {
        id: 'evening_tea',
        name: 'Evening Tea',
        icon: '☕',
        timeRange: '3:00 - 4:00 PM',
        description: 'Afternoon tea and refreshments',
        color: 'orange',
        cost: 30,
        isEnabled: true,
        order: 4
      }
    ]

    await pool.query(`
      UPDATE tenant_settings
      SET meal_periods = $1
      WHERE meal_periods IS NULL
    `, [JSON.stringify(defaultMealPeriods)])

    // Check how many tenant settings were updated
    const updateCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM tenant_settings
      WHERE meal_periods IS NOT NULL
    `)

    console.log(`✓ Default meal periods set for ${updateCount.rows[0].count} tenant(s)`)

    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📋 Summary:')
    console.log('✓ Added meal_periods column to tenant_settings table')
    console.log('✓ Set default meal period configurations for existing tenants')
    console.log('✓ Database schema now matches Prisma schema')

    console.log('\n🍽️ Default Meal Periods Added:')
    console.log('🌅 Morning Meal (6:30-7:30 AM): $75')
    console.log('🍵 Morning Tea (9:30-10:30 AM): $25')
    console.log('🍽️ Lunch Meal (11:30-12:00 PM): $100')
    console.log('☕ Evening Tea (3:00-4:00 PM): $30')

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
  addMealPeriodsColumn()
}

module.exports = { addMealPeriodsColumn }