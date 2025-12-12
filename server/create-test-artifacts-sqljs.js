import { readFileSync, writeFileSync } from 'fs';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dbPath = join(dirname(fileURLToPath(import.meta.url)), 'data', 'claude.db');

async function createTestArtifacts() {
  try {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    // Create a new conversation
    db.run(`
      INSERT INTO conversations (title, model, created_at, updated_at, last_message_at)
      VALUES ('Test: Multiple Artifacts', 'claude-sonnet-4-5-20250929', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const convResult = db.exec('SELECT last_insert_rowid() as id');
    const conversationId = convResult[0].values[0][0];

    console.log('Created conversation:', conversationId);

    // Create 3 different artifacts
    const artifacts = [
      {
        type: 'code',
        title: 'Python Hello World',
        identifier: 'artifact_test_py_' + Date.now(),
        language: 'python',
        content: `def hello():
    print("Hello, World!")
    return "Hello"`
      },
      {
        type: 'code',
        title: 'JavaScript Greeting',
        identifier: 'artifact_test_js_' + Date.now(),
        language: 'javascript',
        content: `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Hello, \${name}!\`;
}`
      },
      {
        type: 'html',
        title: 'HTML Page',
        identifier: 'artifact_test_html_' + Date.now(),
        language: 'html',
        content: `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is a test HTML artifact.</p>
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

    console.log('✅ Created 3 artifacts successfully!');
    console.log('📝 Conversation ID:', conversationId);
    console.log('🔗 Refresh the UI and click on "Test: Multiple Artifacts" to see the tabs!');

    db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestArtifacts();
