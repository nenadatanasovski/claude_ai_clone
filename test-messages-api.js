// Test what the messages API returns
const testAPI = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/conversations/25/messages');
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Messages count:', data.length);
    console.log('Messages:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

testAPI();
