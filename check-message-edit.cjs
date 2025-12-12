const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/claude.db');

console.log('\n=== Checking Message Edit in Conversation 130 ===\n');

const messages = db.prepare(`
  SELECT id, content, role, created_at, edited_at
  FROM messages
  WHERE conversation_id = 130
  ORDER BY created_at
`).all();

messages.forEach((msg, idx) => {
  console.log(`Message ${idx + 1}:`);
  console.log(`  ID: ${msg.id}`);
  console.log(`  Role: ${msg.role}`);
  console.log(`  Content: ${msg.content}`);
  console.log(`  Edited: ${msg.edited_at ? 'Yes (' + msg.edited_at + ')' : 'No'}`);
  console.log('');
});

db.close();
