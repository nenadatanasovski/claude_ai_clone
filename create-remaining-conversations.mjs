// Create Technical Specs conversation
const conv2Response = await fetch('http://localhost:3001/api/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Technical Specs',
    project_id: 6
  })
});
const conv2 = await conv2Response.json();
console.log('Created Technical Specs:', conv2.id);

// Send a message in Technical Specs
await fetch(`http://localhost:3001/api/conversations/${conv2.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Help me define technical specifications for our product',
    role: 'user'
  })
});

// Create Timeline conversation
const conv3Response = await fetch('http://localhost:3001/api/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Timeline',
    project_id: 6
  })
});
const conv3 = await conv3Response.json();
console.log('Created Timeline:', conv3.id);

// Send a message in Timeline
await fetch(`http://localhost:3001/api/conversations/${conv3.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Create a project timeline for the product launch',
    role: 'user'
  })
});

console.log('All 3 conversations created successfully!');
