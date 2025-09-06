const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDateMatching() {
  try {
    console.log('📅 Debugging date matching...');
    
    const targetDate = new Date('2025-09-09');
    console.log(`Target Date: ${targetDate.toISOString()}`);
    
    // Test 1: Find all bookings for booking ID 37
    console.log('\n🔍 Test 1: Direct booking lookup');
    const booking37 = await prisma.$queryRaw`
      SELECT 
        id,
        booking_date,
        booking_time,
        booking_date::text as date_text,
        booking_time::text as time_text,
        status,
        tenant_id
      FROM bookings 
      WHERE id = 37
    `;
    
    console.log('Booking 37:', booking37[0]);
    
    // Test 2: Find bookings with exact date match
    console.log('\n🔍 Test 2: Date matching test');
    const exactDateMatch = await prisma.$queryRaw`
      SELECT 
        id,
        booking_date,
        booking_time,
        booking_date::text as date_text,
        booking_time::text as time_text,
        status
      FROM bookings 
      WHERE booking_date = ${targetDate}
    `;
    
    console.log(`Bookings with date ${targetDate.toISOString().split('T')[0]}:`, exactDateMatch);
    
    // Test 3: Find bookings with time match
    console.log('\n🔍 Test 3: Time matching test');
    const timeMatch = await prisma.$queryRaw`
      SELECT 
        id,
        booking_date,
        booking_time,
        booking_date::text as date_text,
        booking_time::text as time_text,
        status
      FROM bookings 
      WHERE booking_time = '03:30:00'::time
    `;
    
    console.log('Bookings with time 03:30:00:', timeMatch);
    
    // Test 4: Combined date and time match
    console.log('\n🔍 Test 4: Combined date and time match');
    const combinedMatch = await prisma.$queryRaw`
      SELECT 
        id,
        booking_date,
        booking_time,
        booking_date::text as date_text,
        booking_time::text as time_text,
        status,
        tenant_id
      FROM bookings 
      WHERE booking_date = ${targetDate}
        AND booking_time = '03:30:00'::time
        AND tenant_id = 1
        AND status IN ('pending', 'confirmed')
    `;
    
    console.log('Combined match result:', combinedMatch);
    
    // Test 5: Count query exactly like the API
    console.log('\n🔍 Test 5: Exact API count query');
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE tenant_id = 1
        AND booking_date = ${targetDate}
        AND booking_time = '03:30:00'::time
        AND status IN ('pending', 'confirmed')
    `;
    
    console.log('Count result:', countResult);
    console.log('Count value:', Number(countResult[0]?.count) || 0);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDateMatching();