// Find which position conversation 81 is in the conversation list
const response = await fetch('http://localhost:3001/api/conversations');
const convs = await response.json();

console.log(`Total conversations: ${convs.length}\n`);

// Find conversation 81
const conv81Index = convs.findIndex(c => c.id === 81);
if (conv81Index >= 0) {
  console.log(`Conversation 81 found at position: ${conv81Index + 1}`);
  console.log(`Title: ${convs[conv81Index].title}`);
  console.log(`Message count: ${convs[conv81Index].message_count}`);
  console.log(`Last message: ${convs[conv81Index].last_message_at}`);

  console.log(`\nConversations around it:`);
  for (let i = Math.max(0, conv81Index - 2); i <= Math.min(convs.length - 1, conv81Index + 2); i++) {
    const marker = i === conv81Index ? '>>> ' : '    ';
    console.log(`${marker}${i + 1}. ID: ${convs[i].id}, Title: ${convs[i].title}, Messages: ${convs[i].message_count || 0}`);
  }
} else {
  console.log('Conversation 81 not found in list!');
  console.log('\nFirst 10 conversations:');
  convs.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ID: ${c.id}, Title: ${c.title}, Messages: ${c.message_count || 0}`);
  });
}
