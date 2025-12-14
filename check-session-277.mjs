import Database from 'better-sqlite3';
const db = new Database('server/data/claude.db');

// Get the most recent conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest Conversation:', conv);

// Get messages for this conversation
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);
console.log('\nMessages:');
messages.forEach(msg => {
  console.log(`- ID: ${msg.id}, Role: ${msg.role}, Content: ${msg.content.substring(0, 80)}...`);
});

db.close();
