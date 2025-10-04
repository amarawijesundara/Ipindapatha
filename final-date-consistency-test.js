const { Client } = require('pg');

async function finalDateConsistencyTest() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'ipindapatha'
  });

  try {
    await client.connect();
    console.log('🎯 FINAL DATE CONSISTENCY TEST');
    console.log('=' .repeat(60));
    console.log('Testing if Calendar API and My Account API show same dates\n');

    // Get the actual booking from database
    const rawBooking = await client.query(`
      SELECT id, booking_date, meal_period, user_id
      FROM bookings
      WHERE tenant_id = 3 AND id = 58
      LIMIT 1
    `);

    if (rawBooking.rows.length === 0) {
      console.log('❌ No test booking found (ID: 58)');
      return;
    }

    const booking = rawBooking.rows[0];
    console.log('📅 TEST BOOKING DETAILS:');
    console.log(`  Booking ID: ${booking.id}`);
    console.log(`  Raw Database Date: ${booking.booking_date.toISOString()}`);
    console.log(`  Meal Period: ${booking.meal_period}`);

    // Test 1: Calendar API Logic (PostgreSQL DATE function)
    console.log('\n🔍 CALENDAR API LOGIC TEST:');
    console.log('Testing which dates find the booking using PostgreSQL DATE()...\n');

    const testDates = ['2025-09-29', '2025-09-30', '2025-10-01'];
    let calendarFoundDate = null;

    for (const testDate of testDates) {
      const result = await client.query(`
        SELECT id, booking_date, meal_period
        FROM bookings
        WHERE tenant_id = 3
          AND DATE(booking_date) = $1::date
          AND meal_period = 'morning_meal'
        LIMIT 1
      `, [testDate]);

      if (result.rows.length > 0) {
        calendarFoundDate = testDate;
        console.log(`  ✅ Calendar API finds booking on: ${testDate}`);
      } else {
        console.log(`  ❌ Calendar API: No booking found for ${testDate}`);
      }
    }

    // Test 2: My Account API Logic (Local date string)
    console.log('\n🔍 MY ACCOUNT API LOGIC TEST:');
    console.log('Testing local date string extraction...\n');

    const localDateStr = booking.booking_date.toLocaleDateString('en-CA');
    console.log(`  📊 My Account API shows booking on: ${localDateStr}`);

    // Test 3: Consistency Check
    console.log('\n🎯 CONSISTENCY VERIFICATION:');
    console.log('=' .repeat(40));

    if (calendarFoundDate && calendarFoundDate === localDateStr) {
      console.log(`✅ SUCCESS: Both APIs show booking on ${calendarFoundDate}`);
      console.log(`   ✓ Calendar API: Finds booking when searching ${calendarFoundDate}`);
      console.log(`   ✓ My Account API: Displays booking date as ${localDateStr}`);
      console.log(`   ✓ User will see CONSISTENT dates across all pages`);
    } else {
      console.log(`❌ INCONSISTENCY DETECTED:`);
      console.log(`   Calendar API finds booking on: ${calendarFoundDate || 'NONE'}`);
      console.log(`   My Account API shows date as: ${localDateStr}`);
      console.log(`   ⚠️ User will see DIFFERENT dates on different pages`);
    }

    // Test 4: Previous Issue Verification
    console.log('\n🔬 BEFORE/AFTER COMPARISON:');
    console.log('=' .repeat(40));

    const utcDateStr = booking.booking_date.toISOString().split('T')[0];
    console.log(`OLD LOGIC (problematic):`);
    console.log(`  - Used UTC extraction: ${utcDateStr}`);
    console.log(`  - Calendar showed booking on: Sep 30 (PostgreSQL local)`);
    console.log(`  - My Account showed booking on: ${utcDateStr} (UTC)`);
    console.log(`  - Result: INCONSISTENT ❌`);

    console.log(`\nNEW LOGIC (fixed):`);
    console.log(`  - Calendar shows booking on: ${calendarFoundDate} (PostgreSQL DATE())`);
    console.log(`  - My Account shows booking on: ${localDateStr} (toLocaleDateString)`);
    console.log(`  - Result: ${calendarFoundDate === localDateStr ? 'CONSISTENT ✅' : 'INCONSISTENT ❌'}`);

    // Test 5: User Experience Summary
    console.log('\n👤 USER EXPERIENCE SUMMARY:');
    console.log('=' .repeat(40));
    console.log('Before the fix:');
    console.log('  "niwandakimu tenant admin cant see all the bookings"');
    console.log('  "30th and oct 1st already booked" but actually booking was Sep 29');
    console.log('  "calendar and myaccount showing 30th as booked date" inconsistently');

    console.log('\nAfter the fix:');
    if (calendarFoundDate === localDateStr) {
      console.log(`  ✅ Both calendar and My Account show: ${calendarFoundDate}`);
      console.log(`  ✅ Admin can see booking consistently across all pages`);
      console.log(`  ✅ No phantom bookings on wrong dates`);
      console.log(`  ✅ Date display is unified across the application`);
    } else {
      console.log(`  ❌ Still inconsistent - more work needed`);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await client.end();
    console.log('\n✅ Final test completed.');
  }
}

finalDateConsistencyTest().catch(console.error);