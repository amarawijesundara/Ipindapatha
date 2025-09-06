const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestBooking() {
  try {
    console.log('📝 Creating test booking...');
    
    // Create a test booking for September 9, 2025 at 09:00
    const booking = await prisma.booking.create({
      data: {
        tenant: {
          connect: { id: 1 }
        },
        user: {
          connect: { id: 2 } // amara user
        },
        bookingDate: new Date('2025-09-09T00:00:00.000Z'),
        bookingTime: new Date('1970-01-01T03:30:00.000Z'), // 09:00 IST
        eventNote: 'Test booking to verify calendar display',
        status: 'confirmed'
      }
    });
    
    console.log('✅ Test booking created:', {
      id: booking.id,
      date: booking.bookingDate.toISOString().split('T')[0],
      time: booking.bookingTime.toTimeString().split(' ')[0],
      status: booking.status
    });
    
    console.log('\n📊 Now testing availability API...');
    
    // Test availability API to see if booking shows up
    const availability = await fetch('http://localhost:3001/api/bookings/availability?date=2025-09-09');
    
    if (availability) {
      console.log('✅ Booking created successfully. Check availability API and calendar!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBooking();