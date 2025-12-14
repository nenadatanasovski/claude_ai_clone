const response = await fetch('http://localhost:3001/api/conversations');
const data = await response.json();
console.log('Total conversations:', data.length);
console.log('\nLatest 3 conversations:');
data.slice(0, 3).forEach(c => {
  console.log(`ID: ${c.id}, Title: "${c.title}", Project: ${c.project_id}`);
});
