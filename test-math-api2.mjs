// First create a conversation
const convResponse = await fetch('http://localhost:3001/api/conversations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Math Test'
  })
});

const conv = await convResponse.json();
console.log('Created conversation:', conv.id);

// Now send a math message
const response = await fetch(`http://localhost:3001/api/conversations/${conv.id}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Show me a math equation',
    role: 'user'
  })
});

console.log('Message response status:', response.status);

// Read the SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullResponse = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  fullResponse += chunk;
}

console.log('\nFull response (first 800 chars):');
console.log(fullResponse.substring(0, 800));

// Check if it contains LaTeX
if (fullResponse.includes('$$') || fullResponse.includes('\\frac')) {
  console.log('\n✅ Math LaTeX detected in response!');
} else {
  console.log('\n❌ No LaTeX found in response - showing default mock');
}
