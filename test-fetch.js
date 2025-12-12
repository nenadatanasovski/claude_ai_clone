// Simple test to fetch messages from API
const testAPI = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/conversations/22/messages');
    const data = await response.json();
    console.log('Messages:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

testAPI();
