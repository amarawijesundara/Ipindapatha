#!/usr/bin/env node

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function addOfferingTypeToMainBookings() {
  try {
    console.log('Connected to database')

    // Check if the column already exists in bookings table
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      AND column_name = 'offering_type'
    `

    const columnCheck = await pool.query(checkColumnQuery)

    if (columnCheck.rows.length > 0) {
      console.log('offering_type column already exists in bookings table')
    } else {
      // Add the offering_type column to bookings table
      console.log('Adding offering_type column to bookings table...')

      const addColumnQuery = `
        ALTER TABLE bookings
        ADD COLUMN offering_type VARCHAR(20) DEFAULT 'food_preparation' NOT NULL
        CHECK (offering_type IN ('food_preparation', 'monetary_donation'))
      `

      await pool.query(addColumnQuery)
      console.log('✅ Successfully added offering_type column to bookings table')
    }

    // Now look for the specific Oct 1st, 2025 booking that should be monetary_donation
    console.log('Looking for Oct 1st, 2025 bookings to update...')

    // Find Oct 1st bookings in niwandakimu tenant (tenant_id = 3 based on logs)
    const findOct1BookingsQuery = `
      SELECT b.id, b.booking_date, b.meal_period, b.offering_type, b.event_note,
             u.username, u.email, t.name as tenant_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.booking_date = '2025-10-01'
      AND t.subdomain = 'niwandakimu'
    `

    const oct1Result = await pool.query(findOct1BookingsQuery)

    if (oct1Result.rows.length > 0) {
      console.log(`Found ${oct1Result.rows.length} booking(s) for Oct 1st, 2025 in niwandakimu:`)

      oct1Result.rows.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id}, Meal: ${booking.meal_period}, Current Type: ${booking.offering_type}`)
        console.log(`     User: ${booking.username} (${booking.email})`)
        if (booking.event_note) {
          console.log(`     Note: ${booking.event_note}`)
        }
      })

      // Since user mentioned they booked as monetary donation, let's update all Oct 1st bookings
      // to monetary_donation (user can correct specific ones if needed)
      const updateQuery = `
        UPDATE bookings
        SET offering_type = 'monetary_donation'
        WHERE booking_date = '2025-10-01'
        AND tenant_id = (SELECT id FROM tenants WHERE subdomain = 'niwandakimu')
      `

      const updateResult = await pool.query(updateQuery)
      console.log(`✅ Updated ${updateResult.rowCount} Oct 1st booking(s) to monetary_donation`)
    } else {
      console.log('No Oct 1st, 2025 bookings found in niwandakimu tenant')
    }

    // Also check for any other bookings that might need updating based on event notes
    console.log('Checking for other bookings with monetary/payment keywords in notes...')

    const findMonetaryNotesQuery = `
      SELECT b.id, b.booking_date, b.meal_period, b.offering_type, b.event_note,
             u.username, t.name as tenant_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.offering_type = 'food_preparation'
      AND (
        LOWER(b.event_note) LIKE '%money%' OR
        LOWER(b.event_note) LIKE '%donation%' OR
        LOWER(b.event_note) LIKE '%payment%' OR
        LOWER(b.event_note) LIKE '%monetary%' OR
        LOWER(b.event_note) LIKE '%cash%'
      )
    `

    const monetaryNotesResult = await pool.query(findMonetaryNotesQuery)

    if (monetaryNotesResult.rows.length > 0) {
      console.log(`Found ${monetaryNotesResult.rows.length} booking(s) with monetary keywords in notes:`)

      monetaryNotesResult.rows.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id}, Date: ${booking.booking_date}, Note: "${booking.event_note}"`)
      })

      console.log('These bookings may need manual review to determine if they should be monetary donations.')
    } else {
      console.log('No bookings found with monetary keywords in notes.')
    }

    console.log('✅ Migration completed successfully')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
addOfferingTypeToMainBookings()