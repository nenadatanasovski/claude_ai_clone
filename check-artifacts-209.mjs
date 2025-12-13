import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = Database(join(__dirname, 'server', 'database.db'));

const artifacts = db.prepare('SELECT * FROM artifacts ORDER BY id DESC LIMIT 5').all();
console.log('Recent artifacts:', JSON.stringify(artifacts, null, 2));

const conversations = db.prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT 3').all();
console.log('\nRecent conversations:', JSON.stringify(conversations, null, 2));

db.close();
