import Database from 'better-sqlite3';
const db = new Database('./server/data/claude.db');

const conversation = db.prepare('SELECT id, title, model FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest conversation:');
console.log(JSON.stringify(conversation, null, 2));
db.close();
