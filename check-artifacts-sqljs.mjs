import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const buffer = fs.readFileSync('./server/data/claude.db');
const db = new SQL.Database(buffer);

// Check artifacts
const artifacts = db.exec('SELECT id, message_id, conversation_id, type, title, language, created_at FROM artifacts ORDER BY created_at DESC LIMIT 10');
console.log('Artifacts:', JSON.stringify(artifacts, null, 2));

// Count
const count = db.exec('SELECT COUNT(*) as count FROM artifacts');
console.log('Total artifacts:', count);

db.close();
