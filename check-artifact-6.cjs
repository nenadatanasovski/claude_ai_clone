const Database = require('better-sqlite3');
const db = new Database('server/data/claude.db');
const artifact = db.prepare('SELECT content FROM artifacts WHERE id = 6').get();
console.log('Artifact 6 content:');
console.log(artifact.content);
db.close();
