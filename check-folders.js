import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), 'server', 'data', 'claude.db');
const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

console.log('\n=== FOLDERS ===');
const folders = db.exec('SELECT * FROM conversation_folders');
if (folders.length > 0 && folders[0].values.length > 0) {
  console.log('Folders:', folders[0].values);
} else {
  console.log('No folders found');
}

console.log('\n=== FOLDER ITEMS ===');
const items = db.exec('SELECT * FROM conversation_folder_items');
if (items.length > 0 && items[0].values.length > 0) {
  console.log('Folder items:', items[0].values);
} else {
  console.log('No folder items found');
}

db.close();
