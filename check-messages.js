const Database = require('better-sqlite3');
const db = new Database('./server/data/claude.db');

console.log('=== Checking conversation 75 messages ===');
const messages = db.prepare(`
  SELECT id, conversation_id, role, substr(content, 1, 100) as content
  FROM messages
  WHERE conversation_id = 75
  ORDER BY created_at ASC
`).all();

console.log('Found', messages.length, 'messages:');
messages.forEach((msg, idx) => {
  console.log(`${idx + 1}. [${msg.role}] ${msg.content}...`);
});

db.close();
