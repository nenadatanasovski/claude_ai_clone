const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/claude.db');

// Get the most recent conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1').get();
console.log('Latest conversation:', conv);

// Get messages for that conversation
if (conv) {
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conv.id);
  console.log('\nMessages in conversation:');
  messages.forEach(msg => {
    console.log(`- ${msg.role}: ${msg.content.substring(0, 100)}`);
  });
}

db.close();
