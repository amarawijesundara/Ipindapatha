const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllBookings() {
  try {
    console.log('📊 Checking all bookings in database...');
    
    const allBookings = await prisma.booking.findMany({
      include: {
        user: { select: { username: true } }
      },
      orderBy: [
        { bookingDate: 'desc' },
        { id: 'desc' }
      ]
    });
    
    console.log(`Total bookings: ${allBookings.length}`);
    
    allBookings.forEach(booking => {
      console.log(`
📋 Booking ID: ${booking.id}
👤 User: ${booking.user.username} (ID: ${booking.userId})
🏢 Tenant: ${booking.tenantId}
📅 Date: ${booking.bookingDate.toDateString()}
🕒 Time: ${booking.bookingTime.toISOString()} -> ${booking.bookingTime.toTimeString()}
📝 Note: ${booking.eventNote || 'None'}
📊 Status: ${booking.status}
🕐 Created: ${booking.createdAt.toISOString()}
      `);
    });
    
    // Check if booking 37 exists
    console.log('\n🔍 Checking booking ID 37 specifically...');
    const booking37 = await prisma.booking.findUnique({
      where: { id: 37 }
    });
    
    if (booking37) {
      console.log('✅ Booking 37 exists');
      console.log(`   Date: ${booking37.bookingDate.toDateString()}`);
      console.log(`   Time (raw): ${booking37.bookingTime.toISOString()}`);
      console.log(`   Time (text): ${booking37.bookingTime.toTimeString()}`);
      console.log(`   Status: ${booking37.status}`);
    } else {
      console.log('❌ Booking 37 NOT found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllBookings();