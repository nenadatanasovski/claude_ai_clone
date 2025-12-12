const Database = require('better-sqlite3');
const db = new Database('./server/data/claude.db');

// Find conversations with multiple artifacts
const convs = db.prepare(`
  SELECT c.id, c.title, COUNT(a.id) as artifact_count
  FROM conversations c
  LEFT JOIN artifacts a ON c.id = a.conversation_id
  GROUP BY c.id
  HAVING artifact_count > 1
  ORDER BY artifact_count DESC
  LIMIT 5
`).all();

console.log('Conversations with multiple artifacts:');
convs.forEach(c => {
  console.log(`  Conv ${c.id}: ${c.title} (${c.artifact_count} artifacts)`);

  // Get artifact details
  const artifacts = db.prepare('SELECT id, title, type FROM artifacts WHERE conversation_id = ?').all(c.id);
  artifacts.forEach(a => {
    console.log(`    - Artifact ${a.id}: ${a.title} (${a.type})`);
  });
});

db.close();
