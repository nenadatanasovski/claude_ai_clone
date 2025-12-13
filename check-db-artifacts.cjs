const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/claude.db', { readonly: true });

// Check artifacts table
const artifacts = db.prepare('SELECT * FROM artifacts ORDER BY created_at DESC LIMIT 5').all();
console.log('Recent artifacts:');
console.log(JSON.stringify(artifacts, null, 2));

// Count total artifacts
const count = db.prepare('SELECT COUNT(*) as count FROM artifacts').get();
console.log('\nTotal artifacts:', count.count);

db.close();
