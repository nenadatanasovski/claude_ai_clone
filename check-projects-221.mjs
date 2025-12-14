const response = await fetch('http://localhost:3001/api/projects');
const data = await response.json();
console.log('Total projects:', data.length);
console.log('\nProjects:');
data.forEach(p => {
  console.log(`ID: ${p.id}, Name: "${p.name}", Color: ${p.color}`);
});
