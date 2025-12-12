// Create multiple artifacts for testing
const fetch = require('node-fetch');

async function createTestConversation() {
  const API_BASE = 'http://localhost:3001/api';

  try {
    // Create a new conversation
    const convResponse = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Multiple Artifacts',
        model: 'claude-sonnet-4-5-20250929'
      })
    });

    const conversation = await convResponse.json();
    console.log('Created conversation:', conversation.id);

    // Create 3 different artifacts
    const artifacts = [
      {
        conversation_id: conversation.id,
        message_id: 1,
        type: 'code',
        title: 'Python Function',
        identifier: 'python-hello',
        language: 'python',
        content: 'def hello():\n    print("Hello, World!")\n    return "Hello"',
        version: 1
      },
      {
        conversation_id: conversation.id,
        message_id: 1,
        type: 'code',
        title: 'JavaScript Greeting',
        identifier: 'js-greeting',
        language: 'javascript',
        content: 'function greet(name) {\n  console.log(`Hello, ${name}!`);\n  return `Hello, ${name}!`;\n}',
        version: 1
      },
      {
        conversation_id: conversation.id,
        message_id: 1,
        type: 'html',
        title: 'HTML Page',
        identifier: 'html-page',
        language: 'html',
        content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Test Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
        version: 1
      }
    ];

    // Insert artifacts directly via SQL
    const Database = require('better-sqlite3');
    const db = new Database('./server/data/claude.db');

    const insertStmt = db.prepare(`
      INSERT INTO artifacts (conversation_id, message_id, type, title, identifier, language, content, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    artifacts.forEach(art => {
      insertStmt.run(
        art.conversation_id,
        art.message_id,
        art.type,
        art.title,
        art.identifier,
        art.language,
        art.content,
        art.version
      );
    });

    db.close();

    console.log('Created 3 artifacts for conversation', conversation.id);
    console.log('Navigate to: http://localhost:5173 and open conversation', conversation.id);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestConversation();
