import Database from 'better-sqlite3';

const db = new Database('server/data/claude.db');

// Get the most recent conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest Conversation:');
console.log('ID:', conv.id);
console.log('Title:', conv.title);
console.log('Created:', conv.created_at);

// Get messages for this conversation
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);
console.log('\nMessages:');
messages.forEach((msg, idx) => {
  console.log(`Message ${idx + 1} (ID: ${msg.id}):`);
  console.log('  Role:', msg.role);
  console.log('  Content preview:', msg.content.substring(0, 80) + '...');
});

console.log('\nTotal messages:', messages.length);

db.close();
