// Check what messages the API is returning
const API_BASE = 'http://localhost:3001/api';

async function checkMessages() {
  try {
    // Get latest conversation
    const convsResponse = await fetch(`${API_BASE}/conversations`);
    const conversations = await convsResponse.json();

    if (conversations.length > 0) {
      const latestConv = conversations[0];
      console.log('Latest conversation:', latestConv.id, latestConv.title);

      // Get messages for this conversation
      const msgsResponse = await fetch(`${API_BASE}/conversations/${latestConv.id}/messages`);
      const messages = await msgsResponse.json();

      console.log('\nMessages in conversation:');
      messages.forEach((msg, idx) => {
        console.log(`${idx + 1}. [${msg.role}] ID: ${msg.id}, Content: "${msg.content.substring(0, 80)}"`);
      });

      console.log(`\nTotal messages: ${messages.length}`);
    } else {
      console.log('No conversations found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMessages();
