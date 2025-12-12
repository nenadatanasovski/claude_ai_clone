async function check() {
  const response = await fetch('http://localhost:3001/api/conversations/120/messages');
  const messages = await response.json();
  console.log('Total messages:', messages.length);
  messages.forEach((msg, i) => {
    console.log(`\nMessage ${i + 1}:`);
    console.log('  ID:', msg.id);
    console.log('  Role:', msg.role);
    console.log('  Content:', msg.content.substring(0, 50));
    console.log('  Has images:', !!msg.images);
    if (msg.images) {
      console.log('  Image count:', msg.images.length);
      console.log('  First image type:', msg.images[0].type);
    }
  });
}

check();
