const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function migrateToMealPeriods() {
  try {
    console.log('🔄 Starting migration to meal period system...')

    // 1. First, add meal_costs column to tenant_settings if it doesn't exist
    console.log('Adding meal_costs column to tenant_settings...')
    await pool.query(`
      ALTER TABLE tenant_settings
      ADD COLUMN IF NOT EXISTS meal_costs JSON
    `)

    // 2. Create backup of existing data
    console.log('Creating backup of existing time-slot data...')

    // Check if we have existing bookings with booking_time
    const existingBookingsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name = 'booking_time'
    `)

    if (existingBookingsResult.rows.length > 0) {
      console.log('⚠️  Found existing time-slot based system. Creating migration backup...')

      // Create backup table for old bookings
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings_backup_timeslots AS
        SELECT * FROM bookings
      `)

      // Create backup table for old availability
      await pool.query(`
        CREATE TABLE IF NOT EXISTS booking_availability_backup_timeslots AS
        SELECT * FROM booking_availability
      `)

      console.log('✓ Backup tables created')
    }

    // 3. Add meal_period column to bookings table
    console.log('Adding meal_period column to bookings...')
    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS meal_period VARCHAR(20)
    `)

    // 4. Migrate existing bookings if they exist
    if (existingBookingsResult.rows.length > 0) {
      console.log('Migrating existing booking_time to meal_period...')

      // Time slot to meal period mapping
      const timeToMealPeriod = {
        '06:30:00': 'morning_meal',
        '07:00:00': 'morning_meal',
        '07:30:00': 'morning_meal',
        '09:30:00': 'morning_tea',
        '10:00:00': 'morning_tea',
        '10:30:00': 'morning_tea',
        '11:30:00': 'lunch_meal',
        '12:00:00': 'lunch_meal',
        '15:00:00': 'evening_tea',
        '15:30:00': 'evening_tea',
        '16:00:00': 'evening_tea'
      }

      for (const [timeSlot, mealPeriod] of Object.entries(timeToMealPeriod)) {
        await pool.query(`
          UPDATE bookings
          SET meal_period = $1
          WHERE booking_time = $2 AND meal_period IS NULL
        `, [mealPeriod, timeSlot])
      }

      console.log('✓ Existing bookings migrated to meal periods')
    }

    // 5. Update booking_availability table structure
    console.log('Updating booking_availability table structure...')

    // Add new columns
    await pool.query(`
      ALTER TABLE booking_availability
      ADD COLUMN IF NOT EXISTS meal_period VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_booked BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS booked_by INTEGER
    `)

    // Add foreign key constraint for booked_by if it doesn't exist
    const constraintExists = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'booking_availability'
      AND constraint_name = 'booking_availability_booked_by_fkey'
    `)

    if (constraintExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE booking_availability
        ADD CONSTRAINT booking_availability_booked_by_fkey
        FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE SET NULL
      `)
    }

    // 6. Clear old availability data and prepare for new system
    console.log('Clearing old availability data...')
    await pool.query('DELETE FROM booking_availability')

    // 7. Set up default meal costs in tenant_settings
    console.log('Setting up default meal costs...')
    const defaultMealCosts = {
      morning_meal: 75,
      morning_tea: 25,
      lunch_meal: 100,
      evening_tea: 30
    }

    await pool.query(`
      INSERT INTO tenant_settings (tenant_id, meal_costs)
      VALUES (1, $1)
      ON CONFLICT (tenant_id)
      DO UPDATE SET meal_costs = EXCLUDED.meal_costs
    `, [JSON.stringify(defaultMealCosts)])

    // 8. Update availability templates if they exist
    console.log('Updating availability templates...')
    const templatesExist = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'availability_templates' AND column_name = 'time_slots'
    `)

    if (templatesExist.rows.length > 0) {
      // Add meal_periods column
      await pool.query(`
        ALTER TABLE availability_templates
        ADD COLUMN IF NOT EXISTS meal_periods TEXT[]
      `)

      // Update existing templates to use meal periods
      await pool.query(`
        UPDATE availability_templates
        SET meal_periods = ARRAY['morning_meal', 'morning_tea', 'lunch_meal', 'evening_tea']::TEXT[]
        WHERE meal_periods IS NULL
      `)

      console.log('✓ Availability templates updated')
    }

    // 9. Update recurring bookings if they exist
    console.log('Updating recurring bookings...')
    const recurringExists = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recurring_bookings' AND column_name = 'booking_time'
    `)

    if (recurringExists.rows.length > 0) {
      // Add meal_period column
      await pool.query(`
        ALTER TABLE recurring_bookings
        ADD COLUMN IF NOT EXISTS meal_period VARCHAR(20)
      `)

      // Migrate existing recurring bookings
      const timeToMealPeriod = {
        '06:30:00': 'morning_meal',
        '07:00:00': 'morning_meal',
        '07:30:00': 'morning_meal',
        '09:30:00': 'morning_tea',
        '10:00:00': 'morning_tea',
        '10:30:00': 'morning_tea',
        '11:30:00': 'lunch_meal',
        '12:00:00': 'lunch_meal',
        '15:00:00': 'evening_tea',
        '15:30:00': 'evening_tea',
        '16:00:00': 'evening_tea'
      }

      for (const [timeSlot, mealPeriod] of Object.entries(timeToMealPeriod)) {
        await pool.query(`
          UPDATE recurring_bookings
          SET meal_period = $1
          WHERE booking_time = $2 AND meal_period IS NULL
        `, [mealPeriod, timeSlot])
      }

      console.log('✓ Recurring bookings migrated')
    }

    // 10. Update availability overrides if they exist
    console.log('Updating availability overrides...')
    const overridesExist = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'availability_overrides' AND column_name = 'time_slot'
    `)

    if (overridesExist.rows.length > 0) {
      // Add meal_period column
      await pool.query(`
        ALTER TABLE availability_overrides
        ADD COLUMN IF NOT EXISTS meal_period VARCHAR(20)
      `)

      console.log('✓ Availability overrides updated')
    }

    console.log('\n🎉 Migration to meal period system completed successfully!')
    console.log('\n📋 Migration Summary:')
    console.log('✓ Added meal_costs to tenant_settings')
    console.log('✓ Created backup tables for time-slot data')
    console.log('✓ Added meal_period columns to relevant tables')
    console.log('✓ Migrated existing bookings to meal periods')
    console.log('✓ Updated availability system structure')
    console.log('✓ Set up default meal costs ($75, $25, $100, $30)')
    console.log('✓ Updated templates and recurring bookings')

    console.log('\n🍽️ New Meal Period System:')
    console.log('🌅 Morning Meal (6:30-7:30 AM): $75')
    console.log('🍵 Morning Tea (9:30-10:30 AM): $25')
    console.log('🍽️ Lunch Meal (11:30-12:00 PM): $100')
    console.log('☕ Evening Tea (3:00-4:00 PM): $30')

    console.log('\n⚠️  Next Steps:')
    console.log('1. Deploy the updated application code')
    console.log('2. Test the meal period booking system')
    console.log('3. Remove old backup tables when confident migration is successful')
    console.log('4. Update any external integrations to use meal periods')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.log('\n🔙 Rollback Instructions:')
    console.log('If you need to rollback, you can restore from backup tables:')
    console.log('- bookings_backup_timeslots')
    console.log('- booking_availability_backup_timeslots')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  migrateToMealPeriods()
}

module.exports = { migrateToMealPeriods }