const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function fixConstraints() {
  try {
    console.log('🔧 Fixing database constraints for meal period migration...')

    // Drop old unique constraints that are causing issues
    const constraintsToRemove = [
      'recurring_bookings_tenant_id_booking_month_booking_day_book_key',
      'availability_templates_tenant_id_booking_month_booking_day_book_key',
      'booking_availability_tenant_id_date_time_slot_key'
    ]

    for (const constraintName of constraintsToRemove) {
      try {
        // Try to find and drop the constraint
        const tableResult = await pool.query(`
          SELECT table_name
          FROM information_schema.table_constraints
          WHERE constraint_name = $1
        `, [constraintName])

        if (tableResult.rows.length > 0) {
          const tableName = tableResult.rows[0].table_name
          console.log(`Dropping constraint ${constraintName} from table ${tableName}...`)

          await pool.query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName} CASCADE`)
          console.log(`✓ Dropped ${constraintName}`)
        } else {
          console.log(`- Constraint ${constraintName} not found (already removed)`)
        }
      } catch (error) {
        console.log(`- Could not remove ${constraintName}: ${error.message}`)
      }
    }

    // Drop old columns that might be causing issues
    const columnsToRemove = [
      { table: 'bookings', column: 'booking_time' },
      { table: 'recurring_bookings', column: 'booking_time' },
      { table: 'availability_templates', column: 'time_slots' },
      { table: 'availability_templates', column: 'max_bookings' },
      { table: 'booking_availability', column: 'time_slot' },
      { table: 'booking_availability', column: 'max_bookings' }
    ]

    for (const { table, column } of columnsToRemove) {
      try {
        // Check if column exists
        const columnExists = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
        `, [table, column])

        if (columnExists.rows.length > 0) {
          console.log(`Dropping column ${column} from table ${table}...`)
          await pool.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column} CASCADE`)
          console.log(`✓ Dropped column ${table}.${column}`)
        } else {
          console.log(`- Column ${table}.${column} already removed`)
        }
      } catch (error) {
        console.log(`- Could not remove ${table}.${column}: ${error.message}`)
      }
    }

    console.log('✅ Database constraints fixed! Ready for Prisma schema push.')

  } catch (error) {
    console.error('❌ Failed to fix constraints:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  fixConstraints()
}

module.exports = { fixConstraints }