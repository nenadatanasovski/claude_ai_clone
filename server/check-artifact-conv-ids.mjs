import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'data', 'claude.db');

const SQL = await initSqlJs();
const buffer = fs.readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Get artifacts with conversation info
console.log('=== Artifacts with Conversation IDs ===\n');
const artifacts = db.exec(`
  SELECT a.id, a.conversation_id, a.message_id, a.type, a.title, c.title as conv_title
  FROM artifacts a
  LEFT JOIN conversations c ON a.conversation_id = c.id
  ORDER BY a.created_at DESC
  LIMIT 10
`);

if (artifacts.length > 0 && artifacts[0].values.length > 0) {
  console.log('Artifact ID | Conv ID | Msg ID | Type | Artifact Title | Conv Title');
  console.log('='.repeat(100));
  artifacts[0].values.forEach(row => {
    console.log(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5] || '(none)'}`);
  });
} else {
  console.log('No artifacts found');
}

db.close();
