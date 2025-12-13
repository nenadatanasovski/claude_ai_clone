import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data', 'claude.db');

const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Check conversation 81
const convResult = db.exec('SELECT id, title, message_count FROM conversations WHERE id = 81');
if (convResult.length > 0 && convResult[0].values.length > 0) {
  console.log('Conversation 81:');
  console.log('  ID:', convResult[0].values[0][0]);
  console.log('  Title:', convResult[0].values[0][1]);
  console.log('  Message Count:', convResult[0].values[0][2]);
}

// Count messages
const msgResult = db.exec('SELECT COUNT(*) FROM messages WHERE conversation_id = 81');
if (msgResult.length > 0) {
  console.log('  Actual messages in DB:', msgResult[0].values[0][0]);
}

// Show first few messages
const sampleResult = db.exec('SELECT id, role, substr(content, 1, 50) FROM messages WHERE conversation_id = 81 ORDER BY created_at LIMIT 5');
if (sampleResult.length > 0) {
  console.log('\nFirst 5 messages:');
  sampleResult[0].values.forEach((row, i) => {
    console.log(`  ${i+1}. [${row[1]}] ${row[2]}...`);
  });
}

db.close();
