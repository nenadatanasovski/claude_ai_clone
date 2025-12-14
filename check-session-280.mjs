import Database from './server/node_modules/better-sqlite3/lib/index.js';

const db = new Database('./server/data/claude.db');

const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);

console.log('=== Latest Conversation ===');
console.log('ID:', conv.id);
console.log('Title:', conv.title);
console.log('Token Count:', conv.token_count);
console.log('\n=== Messages ===');
messages.forEach((msg, i) => {
  console.log(`Message ${i+1} (ID: ${msg.id}):`);
  console.log('Role:', msg.role);
  console.log('Content:', msg.content.substring(0, 100) + '...');
  console.log('Tokens:', msg.tokens);
  console.log('');
});

db.close();
