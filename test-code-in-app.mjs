import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'server/data/claude.db'));

// Create a test conversation with a code block
const insertConv = db.prepare(`
  INSERT INTO conversations (user_id, title, model, created_at, updated_at, last_message_at)
  VALUES (1, 'Code Theme Test', 'claude-sonnet-4-5', datetime('now'), datetime('now'), datetime('now'))
`);

const convResult = insertConv.run();
const convId = convResult.lastInsertRowid;

console.log('Created conversation:', convId);

// Insert user message
db.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at)
  VALUES (?, 'user', 'Write a Python hello world function', datetime('now'))
`).run(convId);

// Insert assistant message with code
const codeResponse = `Here's a simple Python hello world function:

\`\`\`python
def hello_world():
    """A simple hello world function"""
    message = "Hello, World!"
    print(message)
    return message

# Call the function
result = hello_world()
print(f"Function returned: {result}")
\`\`\`

This function defines a simple greeting, prints it, and returns the message string.`;

db.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at)
  VALUES (?, 'assistant', ?, datetime('now'))
`).run(convId, codeResponse);

console.log('Created messages with code block');
console.log('Conversation ID:', convId);

db.close();
