import Database from 'better-sqlite3';

const db = new Database('./server/database.sqlite');

console.log('Recent conversations:');
const convs = db.prepare('SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 5').all();
console.log(JSON.stringify(convs, null, 2));

console.log('\nRecent messages:');
const messages = db.prepare('SELECT id, conversation_id, role, substr(content, 1, 50) as preview FROM messages ORDER BY created_at DESC LIMIT 5').all();
console.log(JSON.stringify(messages, null, 2));

db.close();
