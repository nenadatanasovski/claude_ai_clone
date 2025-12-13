import Database from 'better-sqlite3';

const db = new Database('server/data/claude_clone.db');
const user = db.prepare('SELECT * FROM users WHERE id = 1').get();
console.log(JSON.stringify(user, null, 2));
db.close();
