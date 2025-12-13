import Database from 'better-sqlite3';
const db = new Database('./server/database.sqlite');

const artifacts = db.prepare('SELECT id, conversation_id, type, title FROM artifacts LIMIT 5').all();
console.log('Artifacts found:', artifacts.length);
console.log(JSON.stringify(artifacts, null, 2));

db.close();
