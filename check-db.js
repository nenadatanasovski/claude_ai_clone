import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), 'server', 'data', 'claude.db');
const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

console.log('\n=== CONVERSATIONS ===');
const convs = db.exec('SELECT id, title FROM conversations LIMIT 10');
if (convs.length > 0 && convs[0].values.length > 0) {
  console.log('ID | Title');
  convs[0].values.forEach(row => {
    console.log(`${row[0]} | ${row[1]}`);
  });
} else {
  console.log('No conversations found');
}

console.log('\n=== MESSAGES (first 5) ===');
const msgs = db.exec('SELECT id, conversation_id, role, substr(content, 1, 50) as content_preview FROM messages LIMIT 5');
if (msgs.length > 0 && msgs[0].values.length > 0) {
  console.log('ID | ConvID | Role | Content Preview');
  msgs[0].values.forEach(row => {
    console.log(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]}`);
  });
} else {
  console.log('No messages found');
}

console.log('\n=== Messages count by conversation ===');
const msgCount = db.exec('SELECT conversation_id, COUNT(*) as count FROM messages GROUP BY conversation_id LIMIT 10');
if (msgCount.length > 0 && msgCount[0].values.length > 0) {
  console.log('ConvID | Message Count');
  msgCount[0].values.forEach(row => {
    console.log(`${row[0]} | ${row[1]}`);
  });
} else {
  console.log('No messages found');
}

db.close();
