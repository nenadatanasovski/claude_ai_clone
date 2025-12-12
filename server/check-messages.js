const Database = require('better-sqlite3');
const db = new Database('./data/database.sqlite');

const messages = db.prepare('SELECT id, conversation_id, role, substr(content, 1, 50) as content, created_at FROM messages ORDER BY created_at DESC LIMIT 10').all();
console.log(JSON.stringify(messages, null, 2));

db.close();
