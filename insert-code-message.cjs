const Database = require('better-sqlite3');
const db = new Database('./server/data/database.sqlite');

// Get the first conversation
const conv = db.prepare('SELECT id FROM conversations ORDER BY id DESC LIMIT 1').get();
if (!conv) {
  console.log('No conversation found');
  process.exit(1);
}

const convId = conv.id;
console.log('Using conversation ID:', convId);

// Insert a user message
const userMsg = db.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at)
  VALUES (?, ?, ?, datetime('now'))
`).run(convId, 'user', 'Write a Python hello world function');

console.log('Inserted user message:', userMsg.lastInsertRowid);

// Insert an assistant message with code
const codeResponse = `Here's a simple Python hello world function:

\`\`\`python
def hello_world():
    print("Hello, World!")
    return "Hello, World!"

# Call the function
hello_world()
\`\`\`

This function prints "Hello, World!" to the console and also returns the string.`;

const assistantMsg = db.prepare(`
  INSERT INTO messages (conversation_id, role, content, created_at)
  VALUES (?, ?, ?, datetime('now'))
`).run(convId, 'assistant', codeResponse);

console.log('Inserted assistant message with code:', assistantMsg.lastInsertRowid);
console.log('Conversation ID:', convId);

db.close();
console.log('Done! View conversation ID', convId, 'in the UI');
