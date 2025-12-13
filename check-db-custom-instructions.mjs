import Database from 'better-sqlite3';

const db = new Database('server/claude.db');
const row = db.prepare('SELECT custom_instructions FROM users WHERE id = 1').get();
console.log('Custom instructions in DB:', row ? row.custom_instructions : 'No user found');
db.close();
