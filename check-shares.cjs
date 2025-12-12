const Database = require('better-sqlite3');
const db = new Database('./server/data/claude.db');

// Check conversations
const convs = db.prepare('SELECT id, title FROM conversations LIMIT 5').all();
console.log('Conversations:', convs);

// Check shares
const shares = db.prepare('SELECT * FROM shared_conversations').all();
console.log('Shares:', shares);

db.close();
