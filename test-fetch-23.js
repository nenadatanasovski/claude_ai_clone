// Test conversation 23
const testAPI = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/conversations/23/messages');
    const data = await response.json();
    console.log('Messages from conversation 23:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

testAPI();
