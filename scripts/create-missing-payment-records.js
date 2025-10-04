#!/usr/bin/env node

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ipindapatha',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
})

// Calculate payment deadline (2 weeks before booking date)
function calculatePaymentDeadline(bookingDate) {
  const deadline = new Date(bookingDate)
  deadline.setDate(deadline.getDate() - 14) // 2 weeks before
  deadline.setHours(23, 59, 59, 999) // End of day
  return deadline
}

async function createMissingPaymentRecords() {
  try {
    console.log('🔍 Searching for monetary donation bookings without payment records...')

    // Find all monetary donation bookings that don't have payment records
    const findBookingsQuery = `
      SELECT
        b.id as booking_id,
        b.user_id,
        b.tenant_id,
        b.booking_date,
        b.meal_period,
        b.event_note,
        b.offering_type,
        u.username,
        u.email,
        t.name as tenant_name,
        t.subdomain
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN tenants t ON b.tenant_id = t.id
      LEFT JOIN booking_payments bp ON b.id = bp.booking_id
      WHERE b.offering_type = 'monetary_donation'
      AND bp.id IS NULL
      ORDER BY b.booking_date ASC
    `

    const bookingsResult = await pool.query(findBookingsQuery)
    const bookingsWithoutPayments = bookingsResult.rows

    if (bookingsWithoutPayments.length === 0) {
      console.log('✅ No monetary donation bookings found without payment records.')
      return
    }

    console.log(`📋 Found ${bookingsWithoutPayments.length} monetary donation booking(s) without payment records:`)

    bookingsWithoutPayments.forEach((booking, index) => {
      const paymentDeadline = calculatePaymentDeadline(booking.booking_date)
      const isOverdue = paymentDeadline < new Date()

      console.log(`  ${index + 1}. Booking ID: ${booking.booking_id}`)
      console.log(`     Date: ${booking.booking_date.toISOString().split('T')[0]}`)
      console.log(`     User: ${booking.username} (${booking.email})`)
      console.log(`     Tenant: ${booking.tenant_name} (${booking.subdomain})`)
      console.log(`     Payment Deadline: ${paymentDeadline.toISOString().split('T')[0]} ${isOverdue ? '(OVERDUE)' : ''}`)
      if (booking.event_note) {
        console.log(`     Note: ${booking.event_note}`)
      }
      console.log('')
    })

    // Default payment amount for monetary donations (this should ideally be configurable)
    const DEFAULT_PAYMENT_AMOUNT = 100.00
    const DEFAULT_CURRENCY = 'USD'

    console.log('💰 Creating payment records...')

    let createdCount = 0
    let overdueCount = 0

    for (const booking of bookingsWithoutPayments) {
      try {
        const paymentDeadline = calculatePaymentDeadline(booking.booking_date)
        const isOverdue = paymentDeadline < new Date()
        const paymentStatus = isOverdue ? 'overdue' : 'pending'

        // Create payment record
        const createPaymentQuery = `
          INSERT INTO booking_payments (
            booking_id,
            tenant_id,
            user_id,
            amount,
            currency,
            payment_deadline,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id
        `

        const paymentResult = await pool.query(createPaymentQuery, [
          booking.booking_id,
          booking.tenant_id,
          booking.user_id,
          DEFAULT_PAYMENT_AMOUNT,
          DEFAULT_CURRENCY,
          paymentDeadline,
          paymentStatus
        ])

        const paymentId = paymentResult.rows[0].id

        console.log(`✅ Created payment record ${paymentId} for booking ${booking.booking_id} (${booking.username}) - Status: ${paymentStatus}`)

        createdCount++
        if (isOverdue) overdueCount++

      } catch (error) {
        console.error(`❌ Failed to create payment record for booking ${booking.booking_id}:`, error.message)
      }
    }

    console.log('\n📊 Summary:')
    console.log(`✅ Successfully created ${createdCount} payment records`)
    console.log(`⚠️  ${overdueCount} payments are already overdue`)
    console.log(`💡 Users can now upload payment receipts for their monetary donation bookings`)

    if (overdueCount > 0) {
      console.log('\n📝 Note: Overdue payments may need special handling or deadline extensions.')
    }

  } catch (error) {
    console.error('❌ Failed to create payment records:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the script
createMissingPaymentRecords()