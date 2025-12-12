const Database = require('better-sqlite3');
const db = new Database('./server/data/claude.db');

// Get the latest conversation
const conv = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 1').get();
console.log('Latest conversation:', conv);

// Get messages for that conversation
const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(conv.id);
console.log('\nMessages:');
messages.forEach(msg => {
  console.log(`- ID: ${msg.id}, Role: ${msg.role}, Content: ${msg.content.substring(0, 50)}...`);
  console.log(`  Has images: ${msg.images ? 'YES' : 'NO'}`);
  if (msg.images) {
    const parsed = JSON.parse(msg.images);
    console.log(`  Image count: ${parsed.length}`);
  }
});

db.close();
