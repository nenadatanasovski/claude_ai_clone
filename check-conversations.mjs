import Database from 'better-sqlite3';
const db = new Database('./server/database.db');

const conversations = db.prepare(`
  SELECT c.id, c.title, COUNT(m.id) as msg_count
  FROM conversations c
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE c.is_deleted = 0
  GROUP BY c.id
  HAVING msg_count > 0
  ORDER BY c.updated_at DESC
  LIMIT 5
`).all();

console.log('Conversations with messages:');
conversations.forEach(c => {
  console.log(`ID: ${c.id}, Title: "${c.title}", Messages: ${c.msg_count}`);
});

db.close();
