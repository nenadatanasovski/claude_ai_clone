import Database from './server/node_modules/better-sqlite3/lib/index.js';

const db = new Database('server/data/claude.db');

const convs = db.prepare('SELECT id, title, created_at FROM conversations ORDER BY id DESC LIMIT 1').all();
console.log('Latest conversation:', JSON.stringify(convs, null, 2));

if (convs[0]) {
  const messages = db.prepare('SELECT id, role, substr(content, 1, 100) as content FROM messages WHERE conversation_id = ? ORDER BY id').all(convs[0].id);
  console.log('\nMessages:', JSON.stringify(messages, null, 2));
}

db.close();
