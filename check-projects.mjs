import Database from 'better-sqlite3';
const db = new Database('./server/database.db');
const projects = db.prepare('SELECT * FROM projects').all();
console.log(JSON.stringify(projects, null, 2));
db.close();
