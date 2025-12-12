async function testMessages() {
  try {
    const response = await fetch('http://localhost:3001/api/conversations/119/messages');
    const messages = await response.json();
    console.log('Message count:', messages.length);
    console.log('Messages:', JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testMessages();
