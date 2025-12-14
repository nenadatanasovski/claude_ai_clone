import Database from 'better-sqlite3';
const db = new Database('server/data/claude.db');

// Get latest conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest conversation:', JSON.stringify(conv, null, 2));

// Get messages for this conversation
if (conv) {
  const msgs = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);
  console.log('\nMessages count:', msgs.length);
  msgs.forEach((msg, i) => {
    console.log(`\nMessage ${i + 1}:`, JSON.stringify(msg, null, 2));
  });
}

db.close();
