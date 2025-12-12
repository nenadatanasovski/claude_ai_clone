// Check artifacts in database
async function checkArtifacts() {
  try {
    const response = await fetch('http://localhost:3001/api/conversations/108/artifacts');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkArtifacts();
