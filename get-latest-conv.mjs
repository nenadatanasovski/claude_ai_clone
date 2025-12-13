import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'server', 'database.sqlite'));
const conv = db.prepare('SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1').get();
if (conv) {
  console.log(conv.id);
} else {
  console.log('No conversations found');
}
db.close();
