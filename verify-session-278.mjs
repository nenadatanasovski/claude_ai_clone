import Database from 'better-sqlite3';

const db = new Database('server/data/claude.db');

// Get the most recent conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest Conversation:');
console.log('  ID:', conv.id);
console.log('  Title:', conv.title);
console.log('  Created:', new Date(conv.created_at).toISOString());

// Get messages from this conversation
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(conv.id);
console.log('\nMessages:');
messages.forEach((msg, i) => {
  console.log(`  Message ${i+1} (ID: ${msg.id}):`);
  console.log(`    Role: ${msg.role}`);
  console.log(`    Content: ${msg.content.substring(0, 80)}...`);
  console.log(`    Tokens: ${msg.token_count || 'N/A'}`);
});

db.close();
