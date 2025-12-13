import Database from 'better-sqlite3';
const db = new Database('./server/data/claude.db');

const conversations = db.prepare(`
  SELECT c.id, c.title, c.message_count
  FROM conversations c
  WHERE c.is_deleted = 0 AND c.message_count > 0
  ORDER BY c.last_message_at DESC
  LIMIT 5
`).all();

console.log('Conversations with messages:');
conversations.forEach(c => {
  console.log(`ID: ${c.id}, Title: "${c.title}", Messages: ${c.message_count}`);
});

db.close();
