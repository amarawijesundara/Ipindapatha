const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testStringDates() {
  try {
    console.log('📅 Testing with string date formats...');
    
    // Test with string date format instead of Date object
    console.log('\n🔍 Test 1: Using string date format');
    const stringDateMatch = await prisma.$queryRaw`
      SELECT 
        id,
        booking_date,
        booking_time,
        booking_date::text as date_text,
        booking_time::text as time_text,
        status,
        tenant_id
      FROM bookings 
      WHERE booking_date::text = '2025-09-09'
        AND booking_time = '03:30:00'::time
        AND tenant_id = 1
        AND status IN ('pending', 'confirmed')
    `;
    
    console.log('String date match result:', stringDateMatch);
    
    // Test count with string date
    console.log('\n🔍 Test 2: Count with string date');
    const countWithStringDate = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE tenant_id = 1
        AND booking_date::text = '2025-09-09'
        AND booking_time = '03:30:00'::time
        AND status IN ('pending', 'confirmed')
    `;
    
    console.log('Count with string date:', countWithStringDate);
    console.log('Count value:', Number(countWithStringDate[0]?.count) || 0);
    
    // Test with date casting
    console.log('\n🔍 Test 3: Using date casting');
    const datecastMatch = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE tenant_id = 1
        AND booking_date = '2025-09-09'::date
        AND booking_time = '03:30:00'::time
        AND status IN ('pending', 'confirmed')
    `;
    
    console.log('Count with date casting:', datecastMatch);
    console.log('Count value:', Number(datecastMatch[0]?.count) || 0);
    
    // Test to see what the JavaScript Date object looks like in SQL
    console.log('\n🔍 Test 4: JavaScript Date object in SQL');
    const jsDate = new Date('2025-09-09');
    console.log('JS Date object:', jsDate.toISOString());
    
    const jsDateMatch = await prisma.$queryRaw`
      SELECT 
        ${jsDate} as js_date,
        ${jsDate}::text as js_date_text,
        booking_date,
        booking_date::text as booking_date_text,
        (booking_date = ${jsDate}) as dates_equal
      FROM bookings 
      WHERE id = 37
    `;
    
    console.log('Date comparison result:', jsDateMatch[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStringDates();