// Create artifact versions by editing
async function createVersions() {
  try {
    // Edit artifact 8 to create version 2
    const response1 = await fetch('http://localhost:3001/api/artifacts/8', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `def hello_world():
    print('Hello, World! Version 2')
    return 'Hello, World!'

# Call the function
hello_world()
`
      })
    });
    const data1 = await response1.json();
    console.log('Version 2 created:', data1);

    // Edit again to create version 3
    const response2 = await fetch('http://localhost:3001/api/artifacts/8', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `def hello_world():
    print('Hello, World! Version 3')
    return 'Hello, World!'

# Call the function
hello_world()
`
      })
    });
    const data2 = await response2.json();
    console.log('Version 3 created:', data2);

    // Fetch all versions
    const response3 = await fetch('http://localhost:3001/api/artifacts/8/versions');
    const versions = await response3.json();
    console.log('\nAll versions:', JSON.stringify(versions, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

createVersions();
