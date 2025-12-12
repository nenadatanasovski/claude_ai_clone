const Database = require('better-sqlite3');
const db = new Database('./server/data/claude.db');

const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = 108 ORDER BY created_at').all();
console.log('Messages in conversation 108:');
messages.forEach((m, i) => {
  console.log(`${i+1}. [${m.role}] ${m.content.substring(0, 150)}`);
});

const artifacts = db.prepare('SELECT * FROM artifacts WHERE conversation_id = 108 ORDER BY created_at').all();
console.log('\nArtifacts in conversation 108:');
artifacts.forEach((a, i) => {
  console.log(`${i+1}. ${a.title} (${a.type}/${a.language}) - ${a.content.substring(0, 80)}`);
});

db.close();
