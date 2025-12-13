import Database from 'better-sqlite3';

const db = new Database('./server/database.sqlite');

const convs = db.prepare(`
  SELECT c.id, c.title, COUNT(m.id) as msg_count
  FROM conversations c
  LEFT JOIN messages m ON c.id = m.conversation_id
  GROUP BY c.id
  HAVING msg_count > 0
  ORDER BY c.updated_at DESC
  LIMIT 5
`).all();

console.log(JSON.stringify(convs, null, 2));

db.close();
