const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('server/chat.db');

const convs = db.prepare(`
  SELECT id, title, created_at, last_message_at
  FROM conversations
  WHERE is_deleted = 0
  ORDER BY last_message_at DESC
  LIMIT 5
`).all();

console.log('Recent conversations:');
convs.forEach(conv => {
  const date = new Date(conv.last_message_at || conv.created_at);
  console.log(`ID: ${conv.id}, Title: ${conv.title}, Date: ${date.toISOString()}, Last Message: ${conv.last_message_at}`);
});

const today = new Date();
console.log('\nToday:', today.toISOString());
