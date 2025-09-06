const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function createTimeFromString(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return null
  }

  // Handle both HH:MM and HH:MM:SS formats
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!timeMatch) {
    return null
  }

  const [, hours, minutes, seconds = '00'] = timeMatch
  const hoursNum = parseInt(hours, 10)
  const minutesNum = parseInt(minutes, 10)
  const secondsNum = parseInt(seconds, 10)

  // Validate time components
  if (hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59 || secondsNum < 0 || secondsNum > 59) {
    return null
  }

  // Create date with base date of 1970-01-01 (epoch) for time-only storage
  return new Date(`1970-01-01T${hours.padStart(2, '0')}:${minutes}:${seconds.padStart(2, '0')}`)
}

async function testFixedQuery() {
  try {
    console.log('🔧 Testing fixed availability query...');
    
    const slotDate = '2025-09-09';
    const slotTime = '09:00';
    const DEFAULT_TENANT_ID = 1;
    
    // Parse date and time correctly using the same format as booking creation
    const bookingDate = new Date(slotDate);
    const bookingTime = createTimeFromString(slotTime);
    
    console.log('📊 Query Parameters:');
    console.log(`  Date: ${bookingDate.toISOString()}`);
    console.log(`  Time: ${bookingTime ? bookingTime.toISOString() : 'null'}`);
    
    if (bookingTime) {
      // Extract time portion from Date object for PostgreSQL TIME comparison
      const timeString = bookingTime.toISOString().substring(11, 19) // "HH:MM:SS"
      console.log(`  Time String: ${timeString}`);
      
      // Query using proper type casting for PostgreSQL
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE tenant_id = ${DEFAULT_TENANT_ID}
          AND booking_date = ${bookingDate}
          AND booking_time = ${timeString}::time
          AND status IN ('pending', 'confirmed')
      `;
      
      console.log('🔍 Query Result:', result);
      console.log('🔢 Booking Count:', Number(result[0]?.count) || 0);
      
      // Also show existing bookings for comparison
      const allBookings = await prisma.$queryRaw`
        SELECT 
          id,
          booking_date,
          booking_time,
          booking_time::text as time_text,
          status
        FROM bookings 
        WHERE tenant_id = ${DEFAULT_TENANT_ID}
          AND booking_date = ${bookingDate}
      `;
      
      console.log('\n📅 All bookings for this date:');
      allBookings.forEach(booking => {
        console.log(`  ID ${booking.id}: ${booking.time_text} (${booking.status}) - Time Object: ${booking.booking_time.toISOString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedQuery();