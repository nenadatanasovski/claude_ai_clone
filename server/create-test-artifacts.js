const Database = require('better-sqlite3');
const db = new Database('./data/claude.db');

try {
  // Create a new conversation first
  const insertConv = db.prepare(`
    INSERT INTO conversations (title, model, created_at, updated_at, last_message_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const result = insertConv.run('Test: Multiple Artifacts', 'claude-sonnet-4-5-20250929');
  const conversationId = result.lastInsertRowid;

  console.log('Created conversation:', conversationId);

  // Create 3 different artifacts
  const insertArtifact = db.prepare(`
    INSERT INTO artifacts (conversation_id, message_id, type, title, identifier, language, content, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const artifacts = [
    {
      type: 'code',
      title: 'Python Hello World',
      identifier: 'artifact_test_py',
      language: 'python',
      content: 'def hello():\\n    print("Hello, World!")\\n    return "Hello"'
    },
    {
      type: 'code',
      title: 'JavaScript Greeting',
      identifier: 'artifact_test_js',
      language: 'javascript',
      content: 'function greet(name) {\\n  console.log(`Hello, ${name}!`);\\n  return `Hello, ${name}!`;\\n}'
    },
    {
      type: 'html',
      title: 'HTML Page',
      identifier: 'artifact_test_html',
      language: 'html',
      content: '<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>Test Page</title>\\n</head>\\n<body>\\n  <h1>Hello World</h1>\\n</body>\\n</html>'
    }
  ];

  artifacts.forEach(art => {
    insertArtifact.run(
      conversationId,
      1, // message_id
      art.type,
      art.title,
      art.identifier,
      art.language,
      art.content,
      1 // version
    );
  });

  console.log('Created 3 artifacts successfully!');
  console.log('Conversation ID:', conversationId);
  console.log('Open this conversation in the UI to test tabs');

  db.close();
} catch (error) {
  console.error('Error:', error);
  db.close();
}
