import Database from 'better-sqlite3';
const db = new Database('./server/data/claude.db');
const convs = db.prepare('SELECT id, title, project_id, created_at FROM conversations ORDER BY created_at DESC LIMIT 5').all();
console.log(JSON.stringify(convs, null, 2));
db.close();
