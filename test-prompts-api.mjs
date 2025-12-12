async function testPromptsAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/prompts/library');
    const data = await response.json();
    console.log('Prompts from API:', JSON.stringify(data, null, 2));
    console.log('Total prompts:', data.length);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPromptsAPI();
