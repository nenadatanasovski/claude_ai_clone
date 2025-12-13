import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data', 'claude.db');

const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Get conversation 81 details
const result = db.exec('SELECT id, title, created_at, last_message_at, message_count FROM conversations WHERE id = 81');
if (result.length > 0 && result[0].values.length > 0) {
  const row = result[0].values[0];
  console.log('Conversation 81 found:');
  console.log('  ID:', row[0]);
  console.log('  Title:', row[1]);
  console.log('  Created:', row[2]);
  console.log('  Last Message:', row[3]);
  console.log('  Message Count:', row[4]);
} else {
  console.log('Conversation 81 not found');
}

db.close();
