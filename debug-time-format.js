const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTimeFormat() {
  try {
    console.log('🕒 Debugging time format issues...');
    
    // Get the raw booking data
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        booking_date,
        booking_time,
        booking_time::text as time_text,
        status,
        tenant_id
      FROM bookings 
      WHERE id = 37
    `;
    
    console.log('📊 Raw Database Data:');
    console.log(result[0]);
    
    // Test different time formats
    console.log('\n🔍 Testing different time queries...');
    
    const bookingDate = new Date('2025-09-09');
    const timeFormats = [
      '09:00:00',
      '09:00',
      '03:30:00', // IST offset
      '09:00:00+05:30'
    ];
    
    for (const timeString of timeFormats) {
      try {
        const countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM bookings 
          WHERE tenant_id = ${1}
            AND booking_date = ${bookingDate}
            AND booking_time = ${timeString}::time
            AND status IN ('pending', 'confirmed')
        `;
        console.log(`⏰ Time "${timeString}": Count = ${Number(countResult[0]?.count)}`);
      } catch (error) {
        console.log(`❌ Time "${timeString}": Error = ${error.message.split('\n')[0]}`);
      }
    }
    
    // Try finding bookings with broader matching
    console.log('\n🔍 Finding bookings for this date...');
    const dateBookings = await prisma.$queryRaw`
      SELECT 
        id,
        booking_time::text as time_text,
        status
      FROM bookings 
      WHERE tenant_id = ${1}
        AND booking_date = ${bookingDate}
        AND status IN ('pending', 'confirmed')
    `;
    
    console.log('📅 All bookings for 2025-09-09:');
    dateBookings.forEach(booking => {
      console.log(`  ID ${booking.id}: ${booking.time_text} (${booking.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTimeFormat();