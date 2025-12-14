import Database from 'better-sqlite3';

const db = new Database('./server/data/claude.db');

console.log('\n=== PROJECTS ===');
const projects = db.prepare('SELECT * FROM projects ORDER BY id DESC LIMIT 10').all();
console.log(projects);

console.log('\n=== CONVERSATIONS IN PROJECT 6 ===');
const convs = db.prepare('SELECT id, title, project_id FROM conversations WHERE project_id = 6 ORDER BY id DESC').all();
console.log(convs);

db.close();
