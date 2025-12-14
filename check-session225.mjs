import Database from 'better-sqlite3';
const db = new Database('./server/data/claude.db');

const conversations = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 3').all();
console.log('Recent conversations:', JSON.stringify(conversations, null, 2));

const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 5').all();
console.log('\nRecent messages:', JSON.stringify(messages, null, 2));

db.close();
