const fetch = require('node-fetch');

async function testAvailabilityAPI() {
  try {
    console.log('🔍 Testing availability API...');
    
    // Get today's date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Test the availability API endpoint
    const url = `http://localhost:3001/api/bookings/availability?date=${dateStr}`;
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', data);
      return;
    }
    
    console.log('✅ API Response:', {
      status: response.status,
      dataKeys: Object.keys(data),
      availabilityCount: data.availability?.length || 0
    });
    
    // Show first few availability items
    if (data.availability && data.availability.length > 0) {
      console.log('\n📊 Sample availability data:');
      data.availability.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.date} ${item.time_slot} - Available: ${item.is_available} (Source: ${item.source})`);
      });
      
      // Check if any have bookings
      const withBookings = data.availability.filter(item => !item.is_available);
      console.log(`\n🔒 Slots with bookings: ${withBookings.length}`);
      withBookings.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.date} ${item.time_slot} - ${item.source}`);
      });
    } else {
      console.log('❌ No availability data returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAvailabilityAPI();