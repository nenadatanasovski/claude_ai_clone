// Archive the Marketing Copy conversation (ID 201)
const response = await fetch('http://localhost:3001/api/conversations/201/archive', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' }
});
const data = await response.json();
console.log('Archived Marketing Copy conversation:', data);
