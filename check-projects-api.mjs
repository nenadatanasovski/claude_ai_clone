const response = await fetch('http://localhost:3001/api/projects');
const projects = await response.json();
console.log(JSON.stringify(projects, null, 2));
