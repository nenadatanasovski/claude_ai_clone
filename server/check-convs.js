import Database from 'better-sqlite3';
const db = new Database('server/database.sqlite');

const convs = db.prepare(`
  SELECT id, title, message_count
  FROM conversations
  WHERE message_count > 0
  ORDER BY last_message_at DESC
  LIMIT 5
`).all();

console.log('Conversations with messages:');
console.log(JSON.stringify(convs, null, 2));

db.close();
