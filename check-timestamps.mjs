import Database from 'better-sqlite3';

const db = new Database('./server/data/claude.db');

const conversations = db.prepare(`
  SELECT id, title, last_message_at, created_at
  FROM conversations
  WHERE is_deleted = 0
  ORDER BY id DESC
  LIMIT 5
`).all();

console.log('Recent conversations:');
conversations.forEach(conv => {
  console.log(`ID: ${conv.id}, Title: ${conv.title}`);
  console.log(`  Created: ${conv.created_at}`);
  console.log(`  Last message: ${conv.last_message_at}`);
  console.log('');
});

db.close();
