const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

console.log('Recent conversations:');
const convs = db.prepare('SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 5').all();
console.log(JSON.stringify(convs, null, 2));

db.close();
