const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBooking37() {
  try {
    console.log('🔍 Checking booking ID 37...');
    
    const booking = await prisma.booking.findUnique({
      where: { id: 37 },
      include: {
        user: { select: { username: true } }
      }
    });
    
    if (booking) {
      console.log('📋 Booking Details:');
      console.log(`  ID: ${booking.id}`);
      console.log(`  User: ${booking.user.username} (ID: ${booking.userId})`);
      console.log(`  Tenant: ${booking.tenantId}`);
      console.log(`  Date: ${booking.bookingDate.toDateString()}`);
      console.log(`  Time: ${booking.bookingTime.toTimeString()}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Created: ${booking.createdAt.toISOString()}`);
      
      // Test the exact query used in the availability API
      console.log('\n🔍 Testing booking count query...');
      
      const bookingDate = new Date('2025-09-09');
      const timeString = '09:00:00';
      
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE tenant_id = ${1}
          AND booking_date = ${bookingDate}
          AND booking_time = ${timeString}::time
          AND status IN ('pending', 'confirmed')
      `;
      
      console.log('📊 Query Result:', result);
      console.log('🔢 Count:', Number(result[0]?.count) || 0);
      
    } else {
      console.log('❌ Booking ID 37 not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking37();