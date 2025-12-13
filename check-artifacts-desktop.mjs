import Database from 'better-sqlite3';
const db = new Database('./server/database.sqlite');
const artifacts = db.prepare('SELECT id, conversation_id, type, title FROM artifacts LIMIT 10').all();
console.log('Found artifacts:', artifacts.length);
artifacts.forEach(a => {
  console.log(`- ID: ${a.id}, Conversation: ${a.conversation_id}, Type: ${a.type}, Title: ${a.title}`);
});
db.close();
