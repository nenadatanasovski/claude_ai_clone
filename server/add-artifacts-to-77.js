import { readFileSync, writeFileSync } from 'fs';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), 'data', 'claude.db');

async function addArtifacts() {
  try {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    const conversationId = 77;

    // Check existing artifacts
    const existing = db.exec(`SELECT id, title FROM artifacts WHERE conversation_id = ${conversationId}`);
    console.log('Existing artifacts for conversation 77:', existing);

    // Add 2 more artifacts to conversation 77
    const artifacts = [
      {
        type: 'code',
        title: 'JavaScript Greeting',
        identifier: 'artifact_js_' + Date.now(),
        language: 'javascript',
        content: `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Hello, \${name}!\`;
}

// Usage
greet("World");`
      },
      {
        type: 'html',
        title: 'HTML Welcome Page',
        identifier: 'artifact_html_' + Date.now(),
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome Page</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #CC785C; }
  </style>
</head>
<body>
  <h1>Welcome to the Test Page!</h1>
  <p>This is an HTML artifact for testing tabs.</p>
</body>
</html>`
      }
    ];

    artifacts.forEach(art => {
      db.run(`
        INSERT INTO artifacts (conversation_id, message_id, type, title, identifier, language, content, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [conversationId, 1, art.type, art.title, art.identifier, art.language, art.content, 1]);
    });

    // Save database
    const data = db.export();
    const buf = Buffer.from(data);
    writeFileSync(dbPath, buf);

    console.log('✅ Added 2 more artifacts to conversation 77!');
    console.log('📝 Total artifacts should now be 3+');
    console.log('🔗 Reload the UI to see the tabs!');

    db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

addArtifacts();
