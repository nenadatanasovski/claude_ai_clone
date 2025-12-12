async function testAPI() {
  try {
    console.log('Fetching from http://localhost:3001/api/prompts/examples');
    const response = await fetch('http://localhost:3001/api/prompts/examples');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    const text = await response.text();
    console.log('Response text length:', text.length);
    console.log('Response text (first 500 chars):', text.substring(0, 500));
    const data = JSON.parse(text);
    console.log('Parsed successfully, count:', data.length);
    console.log('First example title:', data[0]?.title);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
