import Database from 'better-sqlite3';

const db = new Database('./server/data/claude.db');

// Get the most recent conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1').get();
console.log('Latest Conversation:');
console.log(`  ID: ${conv.id}`);
console.log(`  Title: ${conv.title}`);
console.log(`  Created: ${conv.created_at}`);

// Get messages from that conversation
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at').all(conv.id);
console.log('\nMessages:');
messages.forEach(msg => {
  console.log(`  ID: ${msg.id}, Role: ${msg.role}`);
  console.log(`  Content: ${msg.content.substring(0, 100)}...`);
});

console.log(`\nTotal messages: ${messages.length}`);

db.close();
