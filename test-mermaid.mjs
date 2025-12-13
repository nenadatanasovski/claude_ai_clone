import Database from 'better-sqlite3';

const db = new Database('./server/database.db');

// Get the most recent conversation
const conversation = db.prepare('SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1').get();

if (!conversation) {
  console.log('No conversation found');
  process.exit(1);
}

const conversationId = conversation.id;
console.log('Using conversation ID:', conversationId);

// Create a test user message
const userMsg = db.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at)
  VALUES (?, 'user', 'Create a simple flowchart', datetime('now'))
`).run(conversationId);

const userMessageId = userMsg.lastInsertRowid;
console.log('Created user message ID:', userMessageId);

// Create an assistant message with Mermaid diagram
const mermaidContent = `Here's a simple flowchart for you:

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

This diagram shows a simple workflow with three steps.`;

const assistantMsg = db.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at)
  VALUES (?, 'assistant', ?, datetime('now'))
`).run(conversationId, mermaidContent);

const assistantMessageId = assistantMsg.lastInsertRowid;
console.log('Created assistant message ID:', assistantMessageId);

// Create the artifact
const artifactContent = `graph TD
    A[Start] --> B[Process]
    B --> C[End]`;

const artifact = db.prepare(`
  INSERT INTO artifacts (message_id, conversation_id, type, title, identifier, language, content)
  VALUES (?, ?, 'mermaid', 'Diagram 1', ?, 'mermaid', ?)
`).run(assistantMessageId, conversationId, `artifact_${Date.now()}_0`, artifactContent);

console.log('Created artifact ID:', artifact.lastInsertRowid);
console.log('Test Mermaid artifact created successfully!');

db.close();
