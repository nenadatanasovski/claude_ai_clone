const Database = require('./server/node_modules/better-sqlite3');

const db = new Database('./server/data/claude.db');

const conv = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1').get();
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at').all(conv.id);

console.log('Latest conversation ID:', conv.id);
console.log('Title:', conv.title);
console.log('Token count:', conv.token_count);
console.log('Messages:', messages.length);
messages.forEach(m => {
  console.log(`- [${m.role}] ${m.content.substring(0, 80)}...`);
});

db.close();
