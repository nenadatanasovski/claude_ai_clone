const Database = require('better-sqlite3');
const db = new Database('server/data/claude.db');

const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest Conversation:');
console.log('  ID:', conv.id);
console.log('  Title:', conv.title);

const msgs = db.prepare('SELECT id, role, substr(content, 1, 80) as preview FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);
console.log('\nMessages:', msgs.length);
msgs.forEach((msg, i) => {
  console.log(`  ${i+1}. ${msg.role}: ${msg.preview}...`);
});

db.close();
