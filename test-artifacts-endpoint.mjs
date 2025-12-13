// Test artifacts API endpoint
const API_BASE = 'http://localhost:3001/api';

// Get conversations
const convResponse = await fetch(`${API_BASE}/conversations`);
const conversations = await convResponse.json();
console.log('Total conversations:', conversations.length);

if (conversations.length > 0) {
  const conv = conversations[0];
  console.log('\nTesting conversation:', conv.id, '-', conv.title);

  // Get artifacts for this conversation
  const artResponse = await fetch(`${API_BASE}/conversations/${conv.id}/artifacts`);
  const artifacts = await artResponse.json();

  console.log('\nArtifacts response:');
  console.log(JSON.stringify(artifacts, null, 2));
}
