// Find the Python script conversation
const API_BASE = 'http://localhost:3001/api';

const convResponse = await fetch(`${API_BASE}/conversations`);
const conversations = await convResponse.json();

// Find conversation with "Python" in title
const pythonConv = conversations.find(c => c.title && c.title.includes('Python'));

if (pythonConv) {
  console.log('Found Python conversation:', pythonConv.id, '-', pythonConv.title);

  // Get artifacts
  const artResponse = await fetch(`${API_BASE}/conversations/${pythonConv.id}/artifacts`);
  const artifacts = await artResponse.json();

  console.log('\nArtifacts for this conversation:');
  console.log(JSON.stringify(artifacts, null, 2));
  console.log('\nTotal artifacts:', artifacts.length);
} else {
  console.log('Python conversation not found');
  console.log('\nAll conversation titles:');
  conversations.forEach(c => console.log(`  ${c.id}: ${c.title}`));
}
