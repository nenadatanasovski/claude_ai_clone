const Database = require('better-sqlite3');
const db = new Database('./server/database.db');

const convs = db.prepare(`
  SELECT c.id, c.title, COUNT(m.id) as cnt
  FROM conversations c
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE c.is_deleted = 0
  GROUP BY c.id
  HAVING cnt > 0
  ORDER BY c.updated_at DESC
  LIMIT 5
`).all();

convs.forEach(c => console.log(`ID: ${c.id}, Title: "${c.title}", Msgs: ${c.cnt}`));
db.close();
