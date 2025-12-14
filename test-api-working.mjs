// Test if the API is working
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/conversations');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API is working!');
      console.log(`Found ${data.length} conversations`);
      return true;
    } else {
      console.log('❌ Backend API returned error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to backend:', error.message);
    return false;
  }
}

testAPI();
