import Database from 'better-sqlite3';

const db = new Database('./server/data/claude.db');
const conversations = db.prepare('SELECT id, title, created_at FROM conversations ORDER BY created_at DESC LIMIT 5').all();
console.log(JSON.stringify(conversations, null, 2));
db.close();
