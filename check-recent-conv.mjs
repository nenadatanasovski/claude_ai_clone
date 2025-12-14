import Database from './server/node_modules/better-sqlite3/lib/index.js';

const db = new Database('./server/data/claude.db');

// Get recent conversations
const convs = db.prepare('SELECT id, title, created_at FROM conversations ORDER BY created_at DESC LIMIT 5').all();
console.log('Recent conversations:');
console.log(JSON.stringify(convs, null, 2));

// Get messages from conversation 269
const messages269 = db.prepare('SELECT id, role, substr(content, 1, 100) as content FROM messages WHERE conversation_id = 269 ORDER BY created_at').all();
console.log('\nMessages in conversation 269:');
console.log(JSON.stringify(messages269, null, 2));

db.close();
