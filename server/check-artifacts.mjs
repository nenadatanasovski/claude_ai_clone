import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'data', 'claude.db');
console.log('Looking for database at:', dbPath);
const buffer = fs.readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Check artifacts
console.log('=== Checking Artifacts Table ===\n');
const artifacts = db.exec('SELECT id, message_id, conversation_id, type, title, language, created_at FROM artifacts ORDER BY created_at DESC LIMIT 10');
if (artifacts.length > 0 && artifacts[0].values.length > 0) {
  console.log('Recent artifacts:');
  artifacts[0].values.forEach((row, idx) => {
    console.log(`${idx + 1}. ID: ${row[0]}, Type: ${row[3]}, Title: ${row[4]}, Language: ${row[5]}`);
  });
} else {
  console.log('No artifacts found');
}

// Count
console.log('\n=== Total Count ===');
const count = db.exec('SELECT COUNT(*) as count FROM artifacts');
if (count.length > 0) {
  console.log('Total artifacts:', count[0].values[0][0]);
}

db.close();
