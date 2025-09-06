const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeConflictingBooking() {
  try {
    console.log('🗑️ Removing conflicting booking ID 36...');
    
    // First check if booking 36 exists
    const booking = await prisma.booking.findUnique({
      where: { id: 36 },
      include: {
        user: { select: { username: true } }
      }
    });
    
    if (booking) {
      console.log(`📋 Found booking: ${booking.user.username} - ${booking.bookingDate.toDateString()} ${booking.bookingTime.toTimeString().split(' ')[0]} (${booking.status})`);
      
      // Delete the booking
      await prisma.booking.delete({
        where: { id: 36 }
      });
      
      console.log('✅ Booking ID 36 removed successfully');
    } else {
      console.log('ℹ️ Booking ID 36 not found (already removed)');
    }
    
    // Show current bookings for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBookings = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: { select: { username: true } }
      }
    });
    
    console.log(`\n📅 Today's bookings (${todayBookings.length}):`);
    todayBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID ${booking.id}: ${booking.user.username} - ${booking.bookingTime.toTimeString().split(' ')[0]} (${booking.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeConflictingBooking();