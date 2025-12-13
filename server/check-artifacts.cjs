const Database = require('better-sqlite3');
const db = new Database('./data/claude.db', { readonly: true });

// Check artifacts table
try {
  const artifacts = db.prepare('SELECT id, message_id, conversation_id, type, title, language, created_at FROM artifacts ORDER BY created_at DESC LIMIT 5').all();
  console.log('Recent artifacts:');
  console.log(JSON.stringify(artifacts, null, 2));

  // Count total artifacts
  const count = db.prepare('SELECT COUNT(*) as count FROM artifacts').get();
  console.log('\nTotal artifacts:', count.count);
} catch (err) {
  console.log('Error checking artifacts:', err.message);
}

db.close();
