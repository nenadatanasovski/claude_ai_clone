import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'server', 'data', 'claude.db');

const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Get the latest message
const result = db.exec(`
  SELECT id, conversation_id, role, content, created_at
  FROM messages
  ORDER BY id DESC
  LIMIT 5
`);

if (result.length > 0) {
  const rows = result[0];
  console.log('\n=== Latest 5 Messages ===\n');
  console.log('Columns:', rows.columns);
  console.log('');
  rows.values.forEach((row, idx) => {
    console.log(`Message ${idx + 1}:`);
    rows.columns.forEach((col, i) => {
      const value = row[i];
      if (col === 'content') {
        console.log(`  ${col}: "${value}"`);
        console.log(`  ${col} length: ${value ? value.length : 0}`);
        console.log(`  ${col} bytes:`, Buffer.from(value || '').toString('hex').substring(0, 100));
      } else {
        console.log(`  ${col}: ${value}`);
      }
    });
    console.log('');
  });
}

db.close();
