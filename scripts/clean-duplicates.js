const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function cleanDuplicates() {
  try {
    console.log('🧹 Cleaning duplicate data for unique constraints...')

    // Check for duplicates in recurring_bookings
    const duplicatesResult = await pool.query(`
      SELECT tenant_id, booking_month, booking_day, meal_period, COUNT(*)
      FROM recurring_bookings
      WHERE meal_period IS NOT NULL
      GROUP BY tenant_id, booking_month, booking_day, meal_period
      HAVING COUNT(*) > 1
    `)

    if (duplicatesResult.rows.length > 0) {
      console.log('Found duplicates in recurring_bookings:')
      duplicatesResult.rows.forEach(row => {
        console.log(`  Tenant ${row.tenant_id}, Month ${row.booking_month}, Day ${row.booking_day}, Meal ${row.meal_period}: ${row.count} duplicates`)
      })

      // Remove duplicates, keeping the first one
      for (const duplicate of duplicatesResult.rows) {
        const { tenant_id, booking_month, booking_day, meal_period } = duplicate

        const idsResult = await pool.query(`
          SELECT id FROM recurring_bookings
          WHERE tenant_id = $1 AND booking_month = $2 AND booking_day = $3 AND meal_period = $4
          ORDER BY created_at ASC
        `, [tenant_id, booking_month, booking_day, meal_period])

        // Keep the first one, delete the rest
        const idsToDelete = idsResult.rows.slice(1).map(row => row.id)

        if (idsToDelete.length > 0) {
          await pool.query(`
            DELETE FROM recurring_bookings
            WHERE id = ANY($1)
          `, [idsToDelete])

          console.log(`  ✓ Removed ${idsToDelete.length} duplicate recurring_bookings`)
        }
      }
    } else {
      console.log('✓ No duplicates found in recurring_bookings')
    }

    // Check for duplicates in booking_availability
    const availabilityDuplicatesResult = await pool.query(`
      SELECT tenant_id, date, meal_period, COUNT(*)
      FROM booking_availability
      WHERE meal_period IS NOT NULL
      GROUP BY tenant_id, date, meal_period
      HAVING COUNT(*) > 1
    `)

    if (availabilityDuplicatesResult.rows.length > 0) {
      console.log('Found duplicates in booking_availability:')

      for (const duplicate of availabilityDuplicatesResult.rows) {
        const { tenant_id, date, meal_period } = duplicate

        const idsResult = await pool.query(`
          SELECT id FROM booking_availability
          WHERE tenant_id = $1 AND date = $2 AND meal_period = $3
          ORDER BY created_at ASC
        `, [tenant_id, date, meal_period])

        // Keep the first one, delete the rest
        const idsToDelete = idsResult.rows.slice(1).map(row => row.id)

        if (idsToDelete.length > 0) {
          await pool.query(`
            DELETE FROM booking_availability
            WHERE id = ANY($1)
          `, [idsToDelete])

          console.log(`  ✓ Removed ${idsToDelete.length} duplicate booking_availability entries`)
        }
      }
    } else {
      console.log('✓ No duplicates found in booking_availability')
    }

    // Check for duplicates in availability_overrides
    const overridesDuplicatesResult = await pool.query(`
      SELECT tenant_id, date, meal_period, COUNT(*)
      FROM availability_overrides
      WHERE meal_period IS NOT NULL
      GROUP BY tenant_id, date, meal_period
      HAVING COUNT(*) > 1
    `)

    if (overridesDuplicatesResult.rows.length > 0) {
      console.log('Found duplicates in availability_overrides:')

      for (const duplicate of overridesDuplicatesResult.rows) {
        const { tenant_id, date, meal_period } = duplicate

        const idsResult = await pool.query(`
          SELECT id FROM availability_overrides
          WHERE tenant_id = $1 AND date = $2 AND meal_period = $3
          ORDER BY created_at ASC
        `, [tenant_id, date, meal_period])

        // Keep the first one, delete the rest
        const idsToDelete = idsResult.rows.slice(1).map(row => row.id)

        if (idsToDelete.length > 0) {
          await pool.query(`
            DELETE FROM availability_overrides
            WHERE id = ANY($1)
          `, [idsToDelete])

          console.log(`  ✓ Removed ${idsToDelete.length} duplicate availability_overrides entries`)
        }
      }
    } else {
      console.log('✓ No duplicates found in availability_overrides')
    }

    console.log('✅ Duplicate cleanup completed!')

  } catch (error) {
    console.error('❌ Failed to clean duplicates:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  cleanDuplicates()
}

module.exports = { cleanDuplicates }