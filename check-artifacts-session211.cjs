const Database = require('better-sqlite3');
const db = new Database('./server/claude.db');

const artifacts = db.prepare('SELECT id, conversation_id, type, title FROM artifacts ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent artifacts:', JSON.stringify(artifacts, null, 2));

db.close();
