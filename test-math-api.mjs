// Test if math request detection is working
const response = await fetch('http://localhost:3001/api/conversations/test/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Show me a math equation',
    role: 'user'
  })
});

console.log('Response status:', response.status);
console.log('Response headers:', response.headers.get('content-type'));

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

console.log('\nFull response (first 500 chars):');
console.log(fullResponse.substring(0, 500));

// Check if it contains LaTeX
if (fullResponse.includes('$$') || fullResponse.includes('\\frac')) {
  console.log('\n✅ Math LaTeX detected in response!');
} else {
  console.log('\n❌ No LaTeX found in response');
}
