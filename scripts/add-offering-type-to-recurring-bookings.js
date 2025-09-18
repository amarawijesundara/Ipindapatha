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

async function addOfferingTypeToRecurringBookings() {
  try {
    console.log('Connected to database')

    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recurring_bookings'
      AND column_name = 'offering_type'
    `

    const columnCheck = await pool.query(checkColumnQuery)

    if (columnCheck.rows.length > 0) {
      console.log('offering_type column already exists in recurring_bookings table')
      return
    }

    // Add the offering_type column to recurring_bookings table
    console.log('Adding offering_type column to recurring_bookings table...')

    const addColumnQuery = `
      ALTER TABLE recurring_bookings
      ADD COLUMN offering_type VARCHAR(20) DEFAULT 'food_preparation' NOT NULL
    `

    await pool.query(addColumnQuery)
    console.log('✅ Successfully added offering_type column')

    // Update the specific Oct 30, 2026 booking if it exists
    console.log('Looking for Oct 30, 2026 booking to update...')

    // First, find the recurring booking that generated this instance
    const findRecurringQuery = `
      SELECT rb.id, rb.offering_type, b.id as booking_id
      FROM recurring_bookings rb
      JOIN bookings b ON b.recurring_booking_id = rb.id
      WHERE b.booking_date = '2026-10-30'
      AND b.meal_period = 'morning_tea'
      AND b.is_recurring = true
    `

    const recurringResult = await pool.query(findRecurringQuery)

    if (recurringResult.rows.length > 0) {
      const { booking_id } = recurringResult.rows[0]

      // Update the booking to show monetary_donation instead of food_preparation
      const updateBookingQuery = `
        UPDATE bookings
        SET offering_type = 'monetary_donation'
        WHERE id = $1
      `

      await pool.query(updateBookingQuery, [booking_id])
      console.log(`✅ Updated booking ${booking_id} to monetary_donation`)

      // Also update the recurring booking pattern if needed
      const updateRecurringQuery = `
        UPDATE recurring_bookings
        SET offering_type = 'monetary_donation'
        WHERE id = $1
      `

      await pool.query(updateRecurringQuery, [recurringResult.rows[0].id])
      console.log(`✅ Updated recurring booking pattern to monetary_donation`)
    } else {
      console.log('Oct 30, 2026 recurring booking not found')
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
addOfferingTypeToRecurringBookings()