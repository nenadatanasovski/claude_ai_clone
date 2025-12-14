// Assign conversation 201 to project 6 (Product Launch)
const response = await fetch('http://localhost:3001/api/conversations/201', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project_id: 6, title: 'Marketing Copy' })
});
const data = await response.json();
console.log('Updated conversation:', data);
