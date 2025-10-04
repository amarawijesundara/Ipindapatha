const { Client } = require('pg');

async function investigateTenant3Bookings() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'ipindapatha'
  });

  try {
    await client.connect();
    console.log('🔍 Connected to database. Investigating Tenant 3 bookings...\n');

    // 1. Check regular bookings for tenant 3 (Sep-Oct 2025)
    console.log('📅 REGULAR BOOKINGS for Tenant 3 (Sep-Oct 2025):');
    console.log('=' .repeat(70));

    const regularBookingsQuery = `
      SELECT
        b.id, b.user_id, b.booking_date, b.meal_period,
        b.status, b.offering_type, b.created_at,
        u.username, u.email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.tenant_id = 3
        AND b.booking_date >= '2025-09-01'
        AND b.booking_date <= '2025-10-31'
      ORDER BY b.booking_date, b.meal_period;
    `;

    const regularBookings = await client.query(regularBookingsQuery);
    console.log(`Found ${regularBookings.rows.length} regular bookings:\n`);

    regularBookings.rows.forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Date: ${booking.booking_date.toISOString().split('T')[0]}`);
      console.log(`   User: ${booking.username} (${booking.email}) [ID: ${booking.user_id}]`);
      console.log(`   Meal: ${booking.meal_period}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Type: ${booking.offering_type}`);
      console.log(`   Created: ${booking.created_at}`);
      console.log('');
    });

    // 2. Check recurring bookings for tenant 3
    console.log('\n🔄 RECURRING BOOKINGS for Tenant 3:');
    console.log('=' .repeat(70));

    const recurringBookingsQuery = `
      SELECT
        rb.id, rb.user_id, rb.booking_month, rb.booking_day,
        rb.meal_period, rb.is_active, rb.created_at, rb.offering_type,
        u.username, u.email
      FROM recurring_bookings rb
      JOIN users u ON rb.user_id = u.id
      WHERE rb.tenant_id = 3 AND rb.is_active = true
      ORDER BY rb.booking_month, rb.booking_day;
    `;

    const recurringBookings = await client.query(recurringBookingsQuery);
    console.log(`Found ${recurringBookings.rows.length} recurring bookings:\n`);

    recurringBookings.rows.forEach((booking, index) => {
      console.log(`${index + 1}. Recurring Booking ID: ${booking.id}`);
      console.log(`   Date Pattern: Month ${booking.booking_month}, Day ${booking.booking_day} (${booking.booking_month}/${booking.booking_day})`);
      console.log(`   User: ${booking.username} (${booking.email}) [ID: ${booking.user_id}]`);
      console.log(`   Meal: ${booking.meal_period}`);
      console.log(`   Active: ${booking.is_active}`);
      console.log(`   Type: ${booking.offering_type}`);
      console.log(`   Created: ${booking.created_at}`);
      console.log('');
    });

    // 3. Check all users in tenant 3
    console.log('\n👥 USERS in Tenant 3:');
    console.log('=' .repeat(70));

    const usersQuery = `
      SELECT id, username, email, role, tenant_id, is_active, created_at
      FROM users
      WHERE tenant_id = 3
      ORDER BY created_at;
    `;

    const users = await client.query(usersQuery);
    console.log(`Found ${users.rows.length} users:\n`);

    users.rows.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Name: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // 4. Summary analysis
    console.log('\n📊 SUMMARY ANALYSIS:');
    console.log('=' .repeat(70));

    const totalRegularBookings = regularBookings.rows.length;
    const totalRecurringBookings = recurringBookings.rows.length;
    const totalUsers = users.rows.length;

    console.log(`• Tenant 3 has ${totalUsers} users`);
    console.log(`• Tenant 3 has ${totalRegularBookings} regular bookings (Sep-Oct 2025)`);
    console.log(`• Tenant 3 has ${totalRecurringBookings} recurring bookings`);

    // Check specific dates
    const sep30Bookings = regularBookings.rows.filter(b =>
      b.booking_date.toISOString().split('T')[0] === '2025-09-30'
    );
    const oct1Bookings = regularBookings.rows.filter(b =>
      b.booking_date.toISOString().split('T')[0] === '2025-10-01'
    );

    console.log(`\n🎯 SPECIFIC DATE ANALYSIS:`);
    console.log(`• Sep 30, 2025: ${sep30Bookings.length} regular booking(s)`);
    console.log(`• Oct 1, 2025: ${oct1Bookings.length} regular booking(s)`);

    // Check for recurring bookings that match Sep 30 or Oct 1
    const sep30Recurring = recurringBookings.rows.filter(rb =>
      rb.booking_month === 9 && rb.booking_day === 30
    );
    const oct1Recurring = recurringBookings.rows.filter(rb =>
      rb.booking_month === 10 && rb.booking_day === 1
    );

    console.log(`• Sep 30 recurring: ${sep30Recurring.length} recurring booking(s)`);
    console.log(`• Oct 1 recurring: ${oct1Recurring.length} recurring booking(s)`);

    if (sep30Bookings.length === 0 && sep30Recurring.length === 0) {
      console.log(`⚠️  WARNING: No bookings found for Sep 30, but calendar shows it as booked!`);
    }

    if (oct1Bookings.length === 0 && oct1Recurring.length === 0) {
      console.log(`⚠️  WARNING: No bookings found for Oct 1, but calendar shows it as booked!`);
    }

  } catch (error) {
    console.error('❌ Database investigation error:', error);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed.');
  }
}

// Run the investigation
investigateTenant3Bookings().catch(console.error);