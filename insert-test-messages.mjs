import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'server', 'data', 'claude.db');

const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

// Find or create a conversation for testing
let conversationId;

// Check if there's an existing conversation
const conversations = db.exec('SELECT id, title FROM conversations ORDER BY id DESC LIMIT 1');
if (conversations.length > 0 && conversations[0].values.length > 0) {
  conversationId = conversations[0].values[0][0];
  console.log(`Using existing conversation ID: ${conversationId}`);
} else {
  // Create a new conversation
  db.run(`
    INSERT INTO conversations (user_id, title, model, created_at, updated_at, last_message_at)
    VALUES (1, 'Performance Test - 100+ Messages', 'claude-sonnet-4-5-20250929', datetime('now'), datetime('now'), datetime('now'))
  `);
  const result = db.exec('SELECT last_insert_rowid()');
  conversationId = result[0].values[0][0];
  console.log(`Created new conversation ID: ${conversationId}`);
}

// Generate sample messages (alternating user and assistant)
const messageCount = 120; // Create 120 messages for thorough testing
const sampleUserMessages = [
  "Hello, can you help me with a question?",
  "What's the best way to learn programming?",
  "Can you explain how recursion works?",
  "I'm working on a web application. Any tips?",
  "What are the benefits of using TypeScript?",
  "How do I optimize database queries?",
  "Can you help me debug this code?",
  "What's the difference between REST and GraphQL?",
  "How does async/await work in JavaScript?",
  "What are React hooks and why should I use them?",
  "Can you explain the event loop?",
  "What's the best way to handle errors?",
  "How do I secure my API endpoints?",
  "What are some common security vulnerabilities?",
  "Can you explain CORS and how to configure it?",
  "What's the difference between authentication and authorization?",
  "How do I implement user sessions?",
  "What are the best practices for API design?",
  "Can you help me understand closures?",
  "What's the difference between let, const, and var?",
];

const sampleAssistantMessages = [
  "Of course! I'd be happy to help. What would you like to know?",
  "Learning programming is a journey. Start with fundamentals like variables, loops, and functions. Practice regularly with small projects and gradually increase complexity.",
  "Recursion is when a function calls itself. It's useful for problems that can be broken down into smaller, similar subproblems. The key is having a base case to prevent infinite recursion.",
  "For web applications, focus on user experience, performance, and security. Use modern frameworks, implement proper error handling, and test thoroughly.",
  "TypeScript adds static typing to JavaScript, which helps catch errors early, improves code documentation, and enhances IDE support with better autocomplete and refactoring tools.",
  "Database optimization includes indexing frequently queried columns, avoiding N+1 queries, using connection pooling, and analyzing query execution plans to identify bottlenecks.",
  "Sure! Share the code and the error message you're seeing, and I'll help you identify the issue.",
  "REST uses HTTP methods (GET, POST, etc.) with resource-based URLs, while GraphQL uses a single endpoint with a query language to request exactly the data you need.",
  "Async/await is syntactic sugar over Promises. It lets you write asynchronous code that looks synchronous, making it easier to read and reason about.",
  "React hooks are functions that let you use state and other React features in functional components. They simplify code and make it easier to reuse stateful logic.",
  "The event loop is how JavaScript handles asynchronous operations. It continuously checks if the call stack is empty and processes items from the callback queue.",
  "Use try-catch blocks for synchronous errors, .catch() for promises, and error boundaries in React. Always validate input and provide meaningful error messages.",
  "Use authentication (JWT, OAuth), validate all inputs, implement rate limiting, use HTTPS, sanitize data, and follow the principle of least privilege.",
  "Common vulnerabilities include SQL injection, XSS, CSRF, insecure authentication, broken access control, and using components with known vulnerabilities.",
  "CORS (Cross-Origin Resource Sharing) controls which domains can access your API. Configure it to allow specific origins, methods, and headers you need.",
  "Authentication verifies who you are (login), while authorization determines what you can access (permissions). You need both for secure applications.",
  "Use secure session management with HTTP-only cookies, implement proper session expiration, use CSRF tokens, and store session data securely.",
  "Good API design includes clear naming, proper HTTP status codes, versioning, pagination, filtering, comprehensive documentation, and consistent error responses.",
  "A closure is when a function retains access to variables from its outer scope even after the outer function has returned. It's fundamental to JavaScript.",
  "let and const are block-scoped and can't be redeclared. const prevents reassignment. var is function-scoped and can be redeclared. Use const by default, let when reassignment is needed.",
];

console.log(`\nInserting ${messageCount} messages into conversation ${conversationId}...`);

let inserted = 0;
for (let i = 0; i < messageCount; i++) {
  const isUser = i % 2 === 0;
  const role = isUser ? 'user' : 'assistant';
  const messageTemplates = isUser ? sampleUserMessages : sampleAssistantMessages;
  const content = messageTemplates[i % messageTemplates.length] + ` [Message ${i + 1}]`;

  // Calculate created_at with progressive timestamps (1 minute apart)
  const minutesAgo = messageCount - i;

  db.run(`
    INSERT INTO messages (conversation_id, role, content, created_at, tokens, finish_reason)
    VALUES (?, ?, ?, datetime('now', '-${minutesAgo} minutes'), ?, ?)
  `, [conversationId, role, content, isUser ? 50 : 150, isUser ? null : 'end_turn']);

  inserted++;

  if (inserted % 20 === 0) {
    console.log(`  Inserted ${inserted}/${messageCount} messages...`);
  }
}

// Update conversation metadata
db.run(`
  UPDATE conversations
  SET message_count = ?,
      token_count = ?,
      last_message_at = datetime('now')
  WHERE id = ?
`, [messageCount, messageCount * 100, conversationId]);

// Save database
const data = db.export();
writeFileSync(dbPath, data);

console.log(`\n✅ Successfully inserted ${messageCount} messages into conversation ${conversationId}`);
console.log(`📊 Database saved to: ${dbPath}`);
console.log(`\nYou can now test scrolling performance with this conversation!`);

db.close();
