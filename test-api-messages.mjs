// Test the messages API endpoint
const response = await fetch('http://localhost:3001/api/conversations/81/messages');
const data = await response.json();

console.log('API Response Status:', response.status);
console.log('Response is array:', Array.isArray(data));
console.log('Number of messages:', data.length);

if (data.length > 0) {
  console.log('\nFirst message:');
  console.log('  ID:', data[0].id);
  console.log('  Role:', data[0].role);
  console.log('  Content:', data[0].content.substring(0, 50) + '...');

  console.log('\nLast message:');
  const last = data[data.length - 1];
  console.log('  ID:', last.id);
  console.log('  Role:', last.role);
  console.log('  Content:', last.content.substring(0, 50) + '...');
} else {
  console.log('No messages returned!');
}
