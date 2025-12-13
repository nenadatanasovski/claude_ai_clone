import Database from 'better-sqlite3';

const db = new Database('./server/data/claude.db');
const msgs = db.prepare('SELECT id, conversation_id, role, substr(content, 1, 50) as content FROM messages ORDER BY id DESC LIMIT 5').all();
console.log(JSON.stringify(msgs, null, 2));
db.close();
