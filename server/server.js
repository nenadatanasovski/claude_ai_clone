// Updated with custom instructions support
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import initSqlJs from 'sql.js';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Initialize database
const dbPath = join(dirname(fileURLToPath(import.meta.url)), 'data', 'claude.db');
const dataDir = dirname(dbPath);

// Ensure data directory exists
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

let db;
const SQL = await initSqlJs();

// Load or create database
if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Helper function to save database
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Helper functions for sql.js compatibility
const dbHelpers = {
  prepare: (sql) => ({
    run: (...params) => {
      try {
        // Use exec instead of run to get the result properly
        // First, bind parameters manually since exec doesn't support placeholders well
        let boundSql = sql;

        // Replace placeholders with unique tokens FIRST, before escaping values
        // This prevents user content containing ? from interfering
        const tokens = params.map((_, i) => `__PARAM_${i}__`);
        tokens.forEach((token, index) => {
          boundSql = boundSql.replace('?', token);
        });

        // Now replace tokens with actual escaped values
        params.forEach((param, index) => {
          const value = param === null || param === undefined
            ? 'NULL'
            : `'${String(param).replace(/'/g, "''")}'`;
          boundSql = boundSql.replace(`__PARAM_${index}__`, value);
        });
        db.exec(boundSql);
        saveDatabase();

        // WORKAROUND: last_insert_rowid() doesn't work reliably with db.exec()
        // Instead, get the maximum ID from the table
        // Extract table name from SQL
        const tableMatch = sql.match(/INSERT INTO (\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : null;

        let rowid = null;
        if (tableName) {
          const maxIdResult = db.exec(`SELECT MAX(id) as max_id FROM ${tableName}`);
          rowid = maxIdResult[0]?.values[0]?.[0];
        }

        return { lastInsertRowid: rowid };
      } catch (error) {
        console.error('Error running SQL:', error);
        throw error;
      }
    },
    get: (...params) => {
      const result = db.exec(sql, params);
      if (result.length === 0) return null;
      const row = result[0];
      const obj = {};
      row.columns.forEach((col, i) => {
        obj[col] = row.values[0]?.[i];
      });
      return obj;
    },
    all: (...params) => {
      const result = db.exec(sql, params);
      if (result.length === 0) return [];
      const row = result[0];
      return row.values.map(values => {
        const obj = {};
        row.columns.forEach((col, i) => {
          obj[col] = values[i];
        });
        return obj;
      });
    }
  }),
  exec: (sql) => {
    db.run(sql);
    saveDatabase();
  }
};

// Initialize database schema
dbHelpers.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    preferences TEXT,
    custom_instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    custom_instructions TEXT,
    knowledge_base_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT 0,
    is_pinned BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    project_id INTEGER,
    title TEXT DEFAULT 'New Conversation',
    model TEXT DEFAULT 'claude-sonnet-4-20250514',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    is_archived BOOLEAN DEFAULT 0,
    is_pinned BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    has_unread BOOLEAN DEFAULT 0,
    settings TEXT,
    token_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME,
    tokens INTEGER,
    finish_reason TEXT,
    images TEXT,
    parent_message_id INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (parent_message_id) REFERENCES messages(id)
  );

  CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    identifier TEXT,
    language TEXT,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS shared_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    view_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT 1,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS prompt_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    is_public BOOLEAN DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversation_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    name TEXT NOT NULL,
    parent_folder_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    position INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (parent_folder_id) REFERENCES conversation_folders(id)
  );

  CREATE TABLE IF NOT EXISTS conversation_folder_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES conversation_folders(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    conversation_id INTEGER,
    message_id INTEGER,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_estimate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    key_name TEXT,
    api_key_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversation_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    template_structure TEXT NOT NULL,
    category TEXT,
    is_public BOOLEAN DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS project_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    template_structure TEXT NOT NULL,
    category TEXT,
    is_public BOOLEAN DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create a default user if none exists
const userCount = dbHelpers.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount && userCount.count === 0) {
  dbHelpers.prepare(`
    INSERT INTO users (email, name, preferences, custom_instructions)
    VALUES (?, ?, ?, ?)
  `).run('user@example.com', 'Default User', '{}', '');
}

// Initialize Anthropic client
let anthropic;
try {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey !== 'your_api_key_here') {
    anthropic = new Anthropic({ apiKey });
  }
} catch (error) {
  console.warn('Warning: Anthropic API key not configured properly');
}

// Helper function to generate a conversation title from the first user message
function generateTitleFromMessage(message) {
  // Trim and clean the message
  let title = message.trim();

  // Extract the main topic or question
  // Remove common question words and extract key content
  title = title
    .replace(/^(can you|could you|please|help me|i need|i want to|how do i|how to|what is|what are|tell me|explain|show me)\s+/i, '')
    .trim();

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Limit to 50 characters for readability
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  // If the title is empty or too short, use a default
  if (title.length < 3) {
    title = 'New Chat';
  }

  return title;
}

// Helper function to detect and extract artifacts from response
function detectArtifacts(content) {
  const artifacts = [];
  // Match code blocks: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2];

    // Determine artifact type based on language
    let type = 'code';
    let title = `Code ${index + 1}`;

    if (language.toLowerCase() === 'html') {
      type = 'html';
      title = `HTML ${index + 1}`;
    } else if (language.toLowerCase() === 'svg') {
      type = 'svg';
      title = `SVG ${index + 1}`;
    } else if (language.toLowerCase() === 'mermaid') {
      type = 'mermaid';
      title = `Diagram ${index + 1}`;
    } else if (language.toLowerCase() === 'jsx' || language.toLowerCase() === 'react') {
      type = 'react';
      title = `React Component ${index + 1}`;
    } else if ((language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js') &&
               (code.includes('React.') || code.includes('useState') || code.includes('useEffect') ||
                code.includes('export default function') || code.includes('return (') || code.includes('className='))) {
      // Detect React components in JavaScript code blocks
      type = 'react';
      title = `React Component ${index + 1}`;
    } else if (language.toLowerCase() === 'markdown' || language.toLowerCase() === 'md' || language.toLowerCase() === 'text' || language.toLowerCase() === 'txt') {
      // Detect text documents (markdown or plain text)
      type = 'text';
      title = `Document ${index + 1}`;
    }

    artifacts.push({
      type: type,
      language: language,
      content: code,
      title: title,
      identifier: `artifact_${Date.now()}_${index}`
    });
    index++;
  }

  return artifacts;
}

// Helper function to save artifacts to database
function saveArtifacts(artifacts, messageId, conversationId) {
  artifacts.forEach(artifact => {
    dbHelpers.prepare(`
      INSERT INTO artifacts (message_id, conversation_id, type, title, identifier, language, content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      conversationId,
      artifact.type,
      artifact.title,
      artifact.identifier,
      artifact.language,
      artifact.content
    );
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    anthropic: anthropic ? 'configured' : 'not configured'
  });
});

// Get current user profile
app.get('/api/auth/me', (req, res) => {
  try {
    // For simplicity, we'll get the first user (in a real app, this would use authentication)
    const user = dbHelpers.prepare('SELECT id, email, name, avatar_url, preferences, custom_instructions FROM users LIMIT 1').get();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse preferences if it's a JSON string
    if (user.preferences && typeof user.preferences === 'string') {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        user.preferences = {};
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
app.put('/api/auth/profile', (req, res) => {
  try {
    const { name, email, avatar_url } = req.body;

    // Get the first user (in a real app, this would use authentication)
    const user = dbHelpers.prepare('SELECT id FROM users LIMIT 1').get();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile
    dbHelpers.prepare(`
      UPDATE users
      SET name = ?, email = ?, avatar_url = ?
      WHERE id = ?
    `).run(name, email, avatar_url || null, user.id);

    // Return updated user
    const updatedUser = dbHelpers.prepare('SELECT id, email, name, avatar_url, preferences, custom_instructions FROM users WHERE id = ?').get(user.id);

    if (updatedUser.preferences && typeof updatedUser.preferences === 'string') {
      try {
        updatedUser.preferences = JSON.parse(updatedUser.preferences);
      } catch (e) {
        updatedUser.preferences = {};
      }
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get all conversations
app.get('/api/conversations', (req, res) => {
  try {
    const conversations = dbHelpers.prepare(`
      SELECT * FROM conversations
      WHERE is_deleted = 0
      ORDER BY last_message_at DESC, created_at DESC
    `).all();

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create new conversation
app.post('/api/conversations', (req, res) => {
  try {
    const { title, model, project_id } = req.body;
    const now = new Date().toISOString();

    const result = dbHelpers.prepare(`
      INSERT INTO conversations (user_id, title, model, project_id, last_message_at)
      VALUES (1, ?, ?, ?, ?)
    `).run(title || 'New Conversation', model || 'claude-sonnet-4-20250514', project_id || null, now);

    if (!result.lastInsertRowid) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    const conversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);

    if (!conversation) {
      return res.status(500).json({ error: 'Failed to retrieve created conversation' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation by ID
app.get('/api/conversations/:id', (req, res) => {
  try {
    const conversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get messages for a conversation
app.get('/api/conversations/:id/messages', (req, res) => {
  try {
    const messages = dbHelpers.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    // Mark conversation as read when messages are fetched
    dbHelpers.prepare(`
      UPDATE conversations
      SET has_unread = 0
      WHERE id = ?
    `).run(req.params.id);

    // Parse images JSON field
    const parsedMessages = messages.map(msg => ({
      ...msg,
      images: msg.images ? JSON.parse(msg.images) : null
    }));

    res.json(parsedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message (streaming with SSE)
app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { content, role = 'user', images, maxTokens } = req.body;
    const conversationId = req.params.id;

    // Get conversation details
    const conversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get global custom instructions for the user
    const userId = 1; // Default user
    const user = dbHelpers.prepare('SELECT custom_instructions FROM users WHERE id = ?').get(userId);
    const globalInstructions = user?.custom_instructions || null;

    // Get project custom instructions if conversation belongs to a project
    let projectInstructions = null;
    if (conversation.project_id) {
      const project = dbHelpers.prepare('SELECT custom_instructions FROM projects WHERE id = ?').get(conversation.project_id);
      if (project && project.custom_instructions) {
        projectInstructions = project.custom_instructions;
      }
    }

    // Combine global and project instructions
    let systemPrompt = null;
    if (globalInstructions && projectInstructions) {
      systemPrompt = `${globalInstructions}\n\nProject Instructions:\n${projectInstructions}`;
    } else if (globalInstructions) {
      systemPrompt = globalInstructions;
    } else if (projectInstructions) {
      systemPrompt = projectInstructions;
    }

    // Save user message
    const userMessageResult = dbHelpers.prepare(`
      INSERT INTO messages (conversation_id, role, content, images)
      VALUES (?, ?, ?, ?)
    `).run(conversationId, role, content, images ? JSON.stringify(images) : null);

    const userMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(userMessageResult.lastInsertRowid);

    // Use real Anthropic API if available, otherwise use mock
    if (!anthropic) {
      // Check if the user is asking for code
      const isCodeRequest = content.toLowerCase().includes('code') ||
                           content.toLowerCase().includes('function') ||
                           content.toLowerCase().includes('python') ||
                           content.toLowerCase().includes('javascript');

      const isLongRequest = content.toLowerCase().includes('long') ||
                           content.toLowerCase().includes('story') ||
                           content.toLowerCase().includes('essay');

      const isHtmlRequest = content.toLowerCase().includes('html') ||
                           content.toLowerCase().includes('webpage') ||
                           content.toLowerCase().includes('web page') ||
                           (content.toLowerCase().includes('button') && content.toLowerCase().includes('red'));

      const isSvgRequest = content.toLowerCase().includes('svg') ||
                          content.toLowerCase().includes('circle icon') ||
                          content.toLowerCase().includes('icon');

      const isMermaidRequest = content.toLowerCase().includes('mermaid') ||
                              content.toLowerCase().includes('diagram') ||
                              content.toLowerCase().includes('flowchart');

      const isReactRequest = content.toLowerCase().includes('react component') ||
                            (content.toLowerCase().includes('react') && content.toLowerCase().includes('component')) ||
                            (content.toLowerCase().includes('counter') && content.toLowerCase().includes('button'));

      const isTextDocumentRequest = content.toLowerCase().includes('formal document') ||
                                   content.toLowerCase().includes('write a document') ||
                                   content.toLowerCase().includes('business letter') ||
                                   content.toLowerCase().includes('policy document') ||
                                   (content.toLowerCase().includes('document') && (content.toLowerCase().includes('write') || content.toLowerCase().includes('create')));

      // Check for math/LaTeX equation requests
      const isMathRequest = content.toLowerCase().includes('math') ||
                           content.toLowerCase().includes('equation') ||
                           content.toLowerCase().includes('formula') ||
                           content.toLowerCase().includes('quadratic') ||
                           content.toLowerCase().includes('integral') ||
                           content.toLowerCase().includes('derivative');

      // Debug: log math detection
      console.log('[Math Detection]', { content, isMathRequest });

      // Check if custom instructions specify behavior
      let mockResponse;
      if (images && images.length > 0) {
        // Mock response for image uploads
        mockResponse = `I can see you've uploaded ${images.length} image${images.length > 1 ? 's' : ''}. This is a mock response. In a real implementation with the Anthropic API configured, I would analyze the image content and provide detailed information about what I see. For now, I can confirm that your image upload functionality is working correctly!`;
      } else if (systemPrompt && systemPrompt.toLowerCase().includes('concise')) {
        mockResponse = "Sure, I'll be brief.";
      } else if (systemPrompt && systemPrompt.toLowerCase().includes('spanish')) {
        mockResponse = "¡Hola! Según las instrucciones personalizadas, responderé en español. ¿En qué puedo ayudarte hoy?";
      } else if (systemPrompt && systemPrompt.toLowerCase().includes('french')) {
        mockResponse = "Bonjour! Selon les instructions personnalisées, je répondrai en français. Comment puis-je vous aider aujourd'hui?";
      } else if (isHtmlRequest) {
        mockResponse = "Here's an HTML page with a red button:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Red Button Example</title>\n  <style>\n    body {\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      height: 100vh;\n      margin: 0;\n      font-family: Arial, sans-serif;\n      background-color: #f0f0f0;\n    }\n    .red-button {\n      background-color: #e74c3c;\n      color: white;\n      padding: 15px 30px;\n      font-size: 18px;\n      border: none;\n      border-radius: 8px;\n      cursor: pointer;\n      box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n      transition: all 0.3s ease;\n    }\n    .red-button:hover {\n      background-color: #c0392b;\n      transform: translateY(-2px);\n      box-shadow: 0 6px 8px rgba(0,0,0,0.15);\n    }\n    .red-button:active {\n      transform: translateY(0);\n      box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n    }\n  </style>\n</head>\n<body>\n  <button class=\"red-button\" onclick=\"alert('Button clicked!')\">Click Me!</button>\n</body>\n</html>\n```\n\nThis creates a centered red button with hover effects and a click handler.";
      } else if (isSvgRequest) {
        mockResponse = "Here's an SVG circle icon:\n\n```svg\n<svg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n  <circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"#3498db\" stroke=\"#2c3e50\" stroke-width=\"3\"/>\n  <circle cx=\"35\" cy=\"40\" r=\"5\" fill=\"white\"/>\n  <circle cx=\"65\" cy=\"40\" r=\"5\" fill=\"white\"/>\n  <path d=\"M 30 60 Q 50 75 70 60\" stroke=\"#2c3e50\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>\n</svg>\n```\n\nThis creates a simple smiley face circle icon.";
      } else if (isMermaidRequest) {
        // Mock response with Mermaid diagram
        mockResponse = `Here's a simple flowchart diagram for you:

\`\`\`mermaid
graph TD
    A[Start] --> B[Process Data]
    B --> C{Decision}
    C -->|Yes| D[Execute Task]
    C -->|No| E[Skip Task]
    D --> F[End]
    E --> F[End]
\`\`\`

This Mermaid diagram shows a basic workflow with a decision point. The diagram will be rendered visually in the artifact panel.`;
      } else if (isReactRequest) {
        // Mock response with React component
        mockResponse = `Here's a React counter component with increment and decrement buttons:

\`\`\`jsx
function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{
      textAlign: 'center',
      padding: '40px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>Counter App</h1>
      <div style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#2c3e50',
        margin: '30px 0'
      }}>
        {count}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => setCount(count - 1)}
          style={{
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Decrement
        </button>
        <button
          onClick={() => setCount(0)}
          style={{
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reset
        </button>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '12px 24px',
            fontSize: '18px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Increment
        </button>
      </div>
    </div>
  );
}
\`\`\`

This component uses React hooks (useState) to manage the counter state. It includes three buttons: decrement, reset, and increment. The component will render with live interactivity in the artifact panel!`;
      } else if (isTextDocumentRequest) {
        // Mock response with formal document
        mockResponse = `Here's a formal business document template:

\`\`\`markdown
# Company Policy Document: Remote Work Guidelines

**Effective Date:** January 1, 2024
**Document Version:** 1.0
**Department:** Human Resources

## Executive Summary

This document establishes the formal guidelines and policies for remote work arrangements within our organization. It outlines eligibility criteria, expectations, and best practices to ensure productivity and work-life balance for all employees.

## 1. Purpose and Scope

The purpose of this policy is to provide a framework for employees who wish to work remotely, either on a full-time or hybrid basis. This policy applies to all employees who have been approved for remote work arrangements by their direct supervisor and the HR department.

## 2. Eligibility Criteria

To be eligible for remote work, employees must meet the following requirements:

- Have completed their probationary period (minimum 90 days)
- Demonstrate consistent performance and self-motivation
- Possess a suitable home workspace with reliable internet connectivity
- Have job responsibilities that can be performed remotely

## 3. Work Expectations

Remote employees are expected to:

- Maintain regular working hours as agreed upon with their supervisor
- Be available and responsive during core business hours (9 AM - 5 PM)
- Attend all required meetings via video conferencing
- Complete all assigned tasks and meet deadlines
- Use company-approved communication and collaboration tools

## 4. Equipment and Technology

The company will provide:

- A laptop computer and necessary peripherals
- Access to required software and cloud-based tools
- Technical support for company-owned equipment

Employees are responsible for:

- Maintaining a secure and private workspace
- Ensuring reliable internet connectivity (minimum 25 Mbps)
- Protecting company data and equipment

## 5. Communication Protocols

All remote employees must:

- Check email and messaging platforms at least three times daily
- Respond to urgent communications within 2 hours during business hours
- Schedule regular check-ins with their team and supervisor
- Update their status in the company's communication platform

## 6. Performance Evaluation

Remote work performance will be evaluated based on:

- Quality and timeliness of work deliverables
- Availability and responsiveness
- Participation in team activities
- Overall contribution to organizational goals

## 7. Review and Termination

Remote work arrangements will be reviewed quarterly. The company reserves the right to terminate remote work privileges if:

- Performance standards are not met
- Business needs change
- Policy violations occur

## Conclusion

This policy aims to support flexible work arrangements while maintaining operational excellence. All questions regarding this policy should be directed to the Human Resources department.

**Approved by:**
Jane Smith, Chief Human Resources Officer
John Doe, Chief Executive Officer
\`\`\`

This formal document demonstrates proper formatting, structure, and professional tone suitable for business use.`;
      } else if (isMathRequest) {
        mockResponse = `Here are some mathematical formulas demonstrating LaTeX rendering:

## Quadratic Formula

The quadratic formula is used to solve equations of the form $ax^2 + bx + c = 0$:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Pythagorean Theorem

For a right triangle with sides $a$ and $b$, and hypotenuse $c$:

$$a^2 + b^2 = c^2$$

## Calculus - Derivative

The derivative of $f(x) = x^n$ is:

$$\\frac{d}{dx}(x^n) = nx^{n-1}$$

## Integration

The integral of $\\frac{1}{x}$ is:

$$\\int \\frac{1}{x} dx = \\ln|x| + C$$

## Euler's Formula

One of the most beautiful equations in mathematics:

$$e^{i\\pi} + 1 = 0$$

These are inline equations: The area of a circle is $A = \\pi r^2$ and the circumference is $C = 2\\pi r$.

## Summation

The sum of the first $n$ natural numbers:

$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$`;
      } else if (isCodeRequest) {
        mockResponse = "Here's a simple Python hello world function:\n\n```python\ndef hello_world():\n    print('Hello, World!')\n    return 'Hello, World!'\n\n# Call the function\nhello_world()\n```\n\nThis function prints 'Hello, World!' to the console and returns the string.";
      } else if (isLongRequest) {
        mockResponse = "This is a mock long response. In a real implementation, this would be a much longer response that streams word by word. For now, I'll simulate a longer response by adding more text here. " + "Once upon a time, in a galaxy far, far away, there was a brave astronaut named Alex who embarked on an incredible space adventure. ".repeat(10);
      } else {
        mockResponse = "I'm a mock response. Please configure your Anthropic API key to get real responses.";
      }

      // Set up SSE for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Add initial delay to allow typing indicator to show (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stream the mock response word by word
      const words = mockResponse.split(' ');
      let sentContent = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        sentContent += word;
        res.write(`data: ${JSON.stringify({ type: 'content', text: word })}\n\n`);
        // Add delay to simulate real streaming (50ms per word)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Mock token counts
      const mockInputTokens = Math.floor(userMessage.length / 4); // Rough estimate: ~4 chars per token
      const mockOutputTokens = Math.floor(mockResponse.length / 4);
      const mockTotalTokens = mockInputTokens + mockOutputTokens;

      // Save assistant message
      const assistantMessageResult = dbHelpers.prepare(`
        INSERT INTO messages (conversation_id, role, content, tokens)
        VALUES (?, ?, ?, ?)
      `).run(conversationId, 'assistant', mockResponse, mockTotalTokens);

      const assistantMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(assistantMessageResult.lastInsertRowid);

      // Save mock usage tracking data
      dbHelpers.prepare(`
        INSERT INTO usage_tracking (user_id, conversation_id, message_id, model, input_tokens, output_tokens, cost_estimate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(1, conversationId, assistantMessage.id, conversation.model, mockInputTokens, mockOutputTokens, 0.0);

      // Detect and save artifacts
      const artifacts = detectArtifacts(mockResponse);
      if (artifacts.length > 0) {
        saveArtifacts(artifacts, assistantMessage.id, conversationId);
      }

      // Update conversation
      const now = new Date().toISOString();
      dbHelpers.prepare(`
        UPDATE conversations
        SET last_message_at = ?,
            message_count = message_count + 2,
            updated_at = ?,
            has_unread = 1
        WHERE id = ?
      `).run(now, now, conversationId);

      // Auto-generate title from first exchange
      const messageCount = dbHelpers.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId);
      if (messageCount.count === 2) {
        // This is the first exchange, auto-generate a title
        const userMessageContent = userMessage.content || content;
        let autoTitle = generateTitleFromMessage(userMessageContent);

        // Update conversation title
        dbHelpers.prepare(`
          UPDATE conversations
          SET title = ?
          WHERE id = ?
        `).run(autoTitle, conversationId);
      }

      // Send completion message with token count
      res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id, tokens: mockTotalTokens })}\n\n`);
      res.end();
      return;
    }

    // Get conversation history
    const history = dbHelpers.prepare(`
      SELECT role, content FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(conversationId);

    // Prepare messages for Claude
    const messages = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Parse conversation settings
    let conversationSettings = {};
    try {
      if (conversation.settings) {
        conversationSettings = JSON.parse(conversation.settings);
      }
    } catch (error) {
      console.error('Error parsing conversation settings:', error);
    }

    // Get max_tokens from request, conversation settings, or use default
    const finalMaxTokens = maxTokens || conversationSettings.max_tokens || 4096;

    // Prepare API parameters
    const apiParams = {
      model: conversation.model,
      max_tokens: finalMaxTokens,
      messages: messages,
    };

    // Add system prompt with custom instructions if available
    if (systemPrompt) {
      apiParams.system = systemPrompt;
    }

    // Call Claude API
    const stream = await anthropic.messages.stream(apiParams);

    let fullResponse = '';

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'content', text })}\n\n`);
      }
    }

    // Get the final message with usage data
    const finalMessage = await stream.finalMessage();

    // Calculate total tokens
    const inputTokens = finalMessage.usage?.input_tokens || 0;
    const outputTokens = finalMessage.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Save assistant message
    const assistantMessageResult = dbHelpers.prepare(`
      INSERT INTO messages (conversation_id, role, content, tokens)
      VALUES (?, ?, ?, ?)
    `).run(conversationId, 'assistant', fullResponse, totalTokens);

    const assistantMessageId = assistantMessageResult.lastInsertRowid;

    // Save usage tracking data
    dbHelpers.prepare(`
      INSERT INTO usage_tracking (user_id, conversation_id, message_id, model, input_tokens, output_tokens, cost_estimate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(1, conversationId, assistantMessageId, conversation.model, inputTokens, outputTokens, 0.0);

    // Update conversation
    const now = new Date().toISOString();
    dbHelpers.prepare(`
      UPDATE conversations
      SET last_message_at = ?,
          message_count = message_count + 2,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, conversationId);

    // Auto-generate title from first exchange
    const messageCount = dbHelpers.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId);
    if (messageCount.count === 2) {
      // This is the first exchange, auto-generate a title
      const userMessageContent = userMessage.content || content;
      let autoTitle = generateTitleFromMessage(userMessageContent);

      // Update conversation title
      dbHelpers.prepare(`
        UPDATE conversations
        SET title = ?
        WHERE id = ?
      `).run(autoTitle, conversationId);
    }

    res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessageResult.lastInsertRowid, tokens: totalTokens })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error sending message:', error);

    // Check for specific error types from Anthropic API
    let statusCode = 500;
    let errorMessage = 'Failed to send message';

    // Authentication/API key errors
    if (error.status === 401 || error.message?.includes('authentication') || error.message?.includes('API key')) {
      statusCode = 401;
      errorMessage = 'Authentication failed';
    }
    // Rate limit errors
    else if (error.status === 429 || error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    }
    // Other specific HTTP errors
    else if (error.status) {
      statusCode = error.status;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      type: statusCode === 401 ? 'authentication_error' :
            statusCode === 429 ? 'rate_limit_error' : 'server_error'
    });
  }
});

// Update conversation
app.put('/api/conversations/:id', (req, res) => {
  try {
    const { title, is_archived, is_pinned, model, project_id, settings } = req.body;
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (is_archived !== undefined) {
      updates.push('is_archived = ?');
      values.push(is_archived ? 1 : 0);
    }
    if (is_pinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(is_pinned ? 1 : 0);
    }
    if (model !== undefined) {
      updates.push('model = ?');
      values.push(model);
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(project_id);
    }
    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(settings));
    }

    if (updates.length > 0) {
      const now = new Date().toISOString();
      updates.push(`updated_at = '${now}'`);
      values.push(req.params.id);

      dbHelpers.prepare(`
        UPDATE conversations
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }

    const conversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
    res.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation (soft delete)
app.delete('/api/conversations/:id', (req, res) => {
  try {
    dbHelpers.prepare('UPDATE conversations SET is_deleted = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Duplicate conversation
app.post('/api/conversations/:id/duplicate', (req, res) => {
  try {
    const conversationId = req.params.id;

    // Get the original conversation
    const originalConv = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);

    if (!originalConv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create new conversation with copied data
    const newTitle = originalConv.title + ' (Copy)';
    const now = new Date().toISOString();

    const result = dbHelpers.prepare(`
      INSERT INTO conversations (user_id, project_id, title, model, created_at, updated_at, last_message_at, is_archived, is_pinned, is_deleted, settings, token_count, message_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0)
    `).run(
      originalConv.user_id,
      originalConv.project_id,
      newTitle,
      originalConv.model,
      now,
      now,
      now,
      originalConv.settings
    );

    const newConversationId = result.lastInsertRowid;

    // Copy all messages from the original conversation
    const messages = dbHelpers.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId);

    for (const message of messages) {
      dbHelpers.prepare(`
        INSERT INTO messages (conversation_id, role, content, created_at, edited_at, tokens, finish_reason, images, parent_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newConversationId,
        message.role,
        message.content,
        message.created_at,
        message.edited_at,
        message.tokens,
        message.finish_reason,
        message.images,
        message.parent_message_id
      );
    }

    // Update message count and token count
    const messageCount = messages.length;
    const tokenCount = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

    dbHelpers.prepare(`
      UPDATE conversations
      SET message_count = ?, token_count = ?
      WHERE id = ?
    `).run(messageCount, tokenCount, newConversationId);

    saveDatabase();

    // Return the new conversation
    const newConversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(newConversationId);
    res.json(newConversation);
  } catch (error) {
    console.error('Error duplicating conversation:', error);
    res.status(500).json({ error: 'Failed to duplicate conversation' });
  }
});

// Search conversations by title and content
app.get('/api/search/conversations', (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      // Return all conversations if no search query
      const conversations = dbHelpers.prepare(`
        SELECT * FROM conversations
        WHERE is_deleted = 0
        ORDER BY last_message_at DESC, created_at DESC
      `).all();
      return res.json(conversations);
    }

    const searchTerm = `%${q.toLowerCase()}%`;

    // Search in both conversation titles and message content
    const conversations = dbHelpers.prepare(`
      SELECT DISTINCT c.*
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.is_deleted = 0
        AND (
          LOWER(c.title) LIKE ?
          OR LOWER(m.content) LIKE ?
        )
      ORDER BY c.last_message_at DESC, c.created_at DESC
    `).all(searchTerm, searchTerm);

    res.json(conversations);
  } catch (error) {
    console.error('Error searching conversations:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

// ============================================================
// PROJECT ENDPOINTS
// ============================================================

// Get all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = dbHelpers.prepare(`
      SELECT * FROM projects
      WHERE is_archived = 0
      ORDER BY is_pinned DESC, created_at DESC
    `).all();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
app.post('/api/projects', (req, res) => {
  try {
    const { name, description, color, custom_instructions } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const now = new Date().toISOString();
    const result = dbHelpers.prepare(`
      INSERT INTO projects (user_id, name, description, color, custom_instructions, created_at, updated_at, is_archived, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
    `).run(
      1, // Default user_id
      name.trim(),
      description || null,
      color || '#CC785C',
      custom_instructions || null,
      now,
      now
    );

    const projectId = result.lastInsertRowid;
    const project = dbHelpers.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    res.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get a specific project
app.get('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = dbHelpers.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Update a project
app.put('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get existing project first
    const existingProject = dbHelpers.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Merge updates with existing values
    const name = updates.name !== undefined ? updates.name : existingProject.name;
    const description = updates.description !== undefined ? updates.description : existingProject.description;
    const color = updates.color !== undefined ? updates.color : existingProject.color;
    const custom_instructions = updates.custom_instructions !== undefined ? updates.custom_instructions : existingProject.custom_instructions;
    const is_archived = updates.is_archived !== undefined ? updates.is_archived : existingProject.is_archived;
    const is_pinned = updates.is_pinned !== undefined ? updates.is_pinned : existingProject.is_pinned;

    const now = new Date().toISOString();

    dbHelpers.prepare(`
      UPDATE projects
      SET name = ?, description = ?, color = ?, custom_instructions = ?, is_archived = ?, is_pinned = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, color, custom_instructions, is_archived, is_pinned, now, id);

    const project = dbHelpers.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
app.delete('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Set all conversations in this project to have null project_id
    dbHelpers.prepare(`
      UPDATE conversations
      SET project_id = NULL
      WHERE project_id = ?
    `).run(id);

    // Delete the project
    dbHelpers.prepare('DELETE FROM projects WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get conversations in a project
app.get('/api/projects/:id/conversations', (req, res) => {
  try {
    const { id } = req.params;
    const conversations = dbHelpers.prepare(`
      SELECT * FROM conversations
      WHERE project_id = ? AND is_deleted = 0
      ORDER BY is_pinned DESC, last_message_at DESC, created_at DESC
    `).all(id);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching project conversations:', error);
    res.status(500).json({ error: 'Failed to fetch project conversations' });
  }
});

// Get project analytics - usage stats
app.get('/api/projects/:id/analytics', (req, res) => {
  try {
    const { id } = req.params;

    // Get conversation count for this project
    const conversationCountResult = dbHelpers.prepare(`
      SELECT COUNT(*) as count FROM conversations
      WHERE project_id = ? AND is_deleted = 0
    `).get(id);
    const conversationCount = conversationCountResult?.count || 0;

    // Get total messages and tokens across all conversations in this project
    const statsResult = dbHelpers.prepare(`
      SELECT
        SUM(c.message_count) as total_messages,
        SUM(c.token_count) as total_tokens
      FROM conversations c
      WHERE c.project_id = ? AND c.is_deleted = 0
    `).get(id);

    const analytics = {
      conversation_count: conversationCount,
      total_messages: statsResult?.total_messages || 0,
      total_tokens: statsResult?.total_tokens || 0
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching project analytics:', error);
    res.status(500).json({ error: 'Failed to fetch project analytics' });
  }
});

// ==========================================
// FOLDER ENDPOINTS
// ==========================================

// GET all folders for a user
app.get('/api/folders', (req, res) => {
  try {
    const userId = 1; // Default user
    const projectId = req.query.project_id;

    let query = `
      SELECT * FROM conversation_folders
      WHERE user_id = ?
    `;
    const params = [userId];

    if (projectId) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(projectId);
    }

    query += ' ORDER BY position, created_at';

    const folders = dbHelpers.prepare(query).all(...params);
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST create new folder
app.post('/api/folders', (req, res) => {
  try {
    const { name, project_id, parent_folder_id } = req.body;
    const userId = 1; // Default user

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const result = dbHelpers.prepare(`
      INSERT INTO conversation_folders (user_id, project_id, name, parent_folder_id)
      VALUES (?, ?, ?, ?)
    `).run(userId, project_id || null, name, parent_folder_id || null);

    const folder = dbHelpers.prepare(`
      SELECT * FROM conversation_folders WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PUT update folder
app.put('/api/folders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, parent_folder_id } = req.body;

    // Get existing folder
    const folder = dbHelpers.prepare('SELECT * FROM conversation_folders WHERE id = ?').get(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Update with provided values or keep existing
    dbHelpers.prepare(`
      UPDATE conversation_folders
      SET name = ?, position = ?, parent_folder_id = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : folder.name,
      position !== undefined ? position : folder.position,
      parent_folder_id !== undefined ? parent_folder_id : folder.parent_folder_id,
      id
    );

    const updated = dbHelpers.prepare('SELECT * FROM conversation_folders WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE folder
app.delete('/api/folders/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Delete folder items first
    dbHelpers.prepare('DELETE FROM conversation_folder_items WHERE folder_id = ?').run(id);

    // Delete folder
    dbHelpers.prepare('DELETE FROM conversation_folders WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// POST add conversation to folder
// GET get all conversations in a folder
app.get('/api/folders/:id/items', (req, res) => {
  try {
    const { id } = req.params;

    const items = dbHelpers.prepare(`
      SELECT * FROM conversation_folder_items
      WHERE folder_id = ?
    `).all(id);

    res.json(items);
  } catch (error) {
    console.error('Error getting folder items:', error);
    res.status(500).json({ error: 'Failed to get folder items' });
  }
});

app.post('/api/folders/:id/items', (req, res) => {
  try {
    const { id } = req.params;
    const { conversation_id } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Check if already in folder
    const existing = dbHelpers.prepare(`
      SELECT * FROM conversation_folder_items
      WHERE folder_id = ? AND conversation_id = ?
    `).get(id, conversation_id);

    if (existing) {
      return res.json(existing);
    }

    const result = dbHelpers.prepare(`
      INSERT INTO conversation_folder_items (folder_id, conversation_id)
      VALUES (?, ?)
    `).run(id, conversation_id);

    const item = dbHelpers.prepare(`
      SELECT * FROM conversation_folder_items WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding item to folder:', error);
    res.status(500).json({ error: 'Failed to add item to folder' });
  }
});

// DELETE remove conversation from folder
app.delete('/api/folders/:id/items/:conversationId', (req, res) => {
  try {
    const { id, conversationId } = req.params;

    dbHelpers.prepare(`
      DELETE FROM conversation_folder_items
      WHERE folder_id = ? AND conversation_id = ?
    `).run(id, conversationId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing item from folder:', error);
    res.status(500).json({ error: 'Failed to remove item from folder' });
  }
});

// ===== Artifact Endpoints =====

// GET artifacts for a conversation
app.get('/api/conversations/:id/artifacts', (req, res) => {
  try {
    const artifacts = dbHelpers.prepare(`
      SELECT * FROM artifacts
      WHERE conversation_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);

    res.json(artifacts);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({ error: 'Failed to fetch artifacts' });
  }
});

// PUT update a message
app.put('/api/messages/:id', (req, res) => {
  try {
    const { content, createBranch } = req.body;
    const messageId = req.params.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if message exists
    const message = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // If createBranch is true, we need to handle branching
    if (createBranch) {
      // Get all messages in this conversation
      const allMessages = dbHelpers.prepare(`
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
      `).all(message.conversation_id);

      // Find the index of this message
      const messageIndex = allMessages.findIndex(m => m.id === parseInt(messageId));

      // Check if there are messages after this one (meaning we're editing in the middle)
      const hasMessagesAfter = messageIndex < allMessages.length - 1;

      if (hasMessagesAfter) {
        // This is a branch point - create a new message instead of updating
        // The new message will have the same parent as the original
        const now = new Date().toISOString();
        const newMessage = dbHelpers.prepare(`
          INSERT INTO messages (conversation_id, role, content, created_at, parent_message_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          message.conversation_id,
          message.role,
          content,
          now,
          message.parent_message_id
        );

        const createdMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(newMessage.lastInsertRowid);

        return res.json({
          message: createdMessage,
          branched: true,
          originalMessageId: messageId
        });
      }
    }

    // If not branching or it's the last message, just update normally
    const editedAt = new Date().toISOString();
    dbHelpers.prepare(`
      UPDATE messages
      SET content = ?, edited_at = ?
      WHERE id = ?
    `).run(content, editedAt, messageId);

    // Get the updated message
    const updatedMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

    res.json({ message: updatedMessage, branched: false });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// GET branches for a conversation - returns all possible message paths
app.get('/api/conversations/:id/branches', (req, res) => {
  try {
    const conversationId = req.params.id;

    // Get all messages in the conversation
    const allMessages = dbHelpers.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
    `).all(conversationId);

    // Build a tree structure to identify branches
    // A branch occurs when multiple messages share the same parent_message_id
    const branches = [];
    const messagesByParent = {};

    // Group messages by their parent
    allMessages.forEach(msg => {
      const parentId = msg.parent_message_id || 'root';
      if (!messagesByParent[parentId]) {
        messagesByParent[parentId] = [];
      }
      messagesByParent[parentId].push(msg);
    });

    // Find branch points (parents with multiple children)
    Object.entries(messagesByParent).forEach(([parentId, children]) => {
      if (children.length > 1) {
        branches.push({
          parentId: parentId === 'root' ? null : parseInt(parentId),
          branches: children.map(child => ({
            messageId: child.id,
            content: child.content.substring(0, 100), // Preview
            createdAt: child.created_at,
            role: child.role
          }))
        });
      }
    });

    res.json({
      branches,
      allMessages,
      messagesByParent
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// GET artifacts for a specific message
app.get('/api/messages/:id/artifacts', (req, res) => {
  try {
    const artifacts = dbHelpers.prepare(`
      SELECT * FROM artifacts
      WHERE message_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    res.json(artifacts);
  } catch (error) {
    console.error('Error fetching message artifacts:', error);
    res.status(500).json({ error: 'Failed to fetch message artifacts' });
  }
});

// GET usage data for a specific message
app.get('/api/messages/:id/usage', (req, res) => {
  try {
    const usage = dbHelpers.prepare(`
      SELECT * FROM usage_tracking
      WHERE message_id = ?
    `).get(req.params.id);

    if (!usage) {
      return res.json({ input_tokens: 0, output_tokens: 0, total_tokens: 0 });
    }

    res.json({
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.input_tokens + usage.output_tokens,
      model: usage.model,
      cost_estimate: usage.cost_estimate
    });
  } catch (error) {
    console.error('Error fetching message usage:', error);
    res.status(500).json({ error: 'Failed to fetch message usage' });
  }
});

// GET single artifact by ID
app.get('/api/artifacts/:id', (req, res) => {
  try {
    const artifact = dbHelpers.prepare('SELECT * FROM artifacts WHERE id = ?').get(req.params.id);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    res.json(artifact);
  } catch (error) {
    console.error('Error fetching artifact:', error);
    res.status(500).json({ error: 'Failed to fetch artifact' });
  }
});

// PUT update artifact content - creates a new version
app.put('/api/artifacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if artifact exists
    const artifact = dbHelpers.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Get the maximum version for this artifact identifier
    const maxVersionResult = dbHelpers.prepare(`
      SELECT MAX(version) as max_version
      FROM artifacts
      WHERE identifier = ?
    `).get(artifact.identifier);

    const newVersion = (maxVersionResult?.max_version || 0) + 1;

    // Create a new artifact record with incremented version
    const result = dbHelpers.prepare(`
      INSERT INTO artifacts (message_id, conversation_id, type, title, identifier, language, content, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      artifact.message_id,
      artifact.conversation_id,
      artifact.type,
      artifact.title,
      artifact.identifier,
      artifact.language,
      content,
      newVersion
    );

    // Return the newly created artifact version
    const newArtifact = dbHelpers.prepare('SELECT * FROM artifacts WHERE id = ?').get(result.lastInsertRowid);
    res.json(newArtifact);
  } catch (error) {
    console.error('Error updating artifact:', error);
    res.status(500).json({ error: 'Failed to update artifact' });
  }
});

// GET all versions of an artifact by identifier
app.get('/api/artifacts/:id/versions', (req, res) => {
  try {
    const { id } = req.params;

    // First get the artifact to find its identifier
    const artifact = dbHelpers.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Get all versions with this identifier
    const versions = dbHelpers.prepare(`
      SELECT * FROM artifacts
      WHERE identifier = ?
      ORDER BY version ASC
    `).all(artifact.identifier);

    res.json(versions);
  } catch (error) {
    console.error('Error fetching artifact versions:', error);
    res.status(500).json({ error: 'Failed to fetch artifact versions' });
  }
});

// Settings endpoints

// GET user settings including custom instructions
app.get('/api/settings', (req, res) => {
  try {
    const userId = 1; // Default user

    const user = dbHelpers.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      preferences: user.preferences ? JSON.parse(user.preferences) : {},
      custom_instructions: user.custom_instructions || ''
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT update user settings
app.put('/api/settings', (req, res) => {
  try {
    const userId = 1; // Default user
    const { preferences, custom_instructions } = req.body;

    const user = dbHelpers.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences if provided
    if (preferences !== undefined) {
      dbHelpers.prepare(`
        UPDATE users SET preferences = ? WHERE id = ?
      `).run(JSON.stringify(preferences), userId);
    }

    // Update custom instructions if provided
    if (custom_instructions !== undefined) {
      dbHelpers.prepare(`
        UPDATE users SET custom_instructions = ? WHERE id = ?
      `).run(custom_instructions, userId);
    }

    // Return updated settings
    const updatedUser = dbHelpers.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({
      preferences: updatedUser.preferences ? JSON.parse(updatedUser.preferences) : {},
      custom_instructions: updatedUser.custom_instructions || ''
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET custom instructions specifically
app.get('/api/settings/custom-instructions', (req, res) => {
  try {
    const userId = 1; // Default user

    const user = dbHelpers.prepare('SELECT custom_instructions FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ custom_instructions: user.custom_instructions || '' });
  } catch (error) {
    console.error('Error fetching custom instructions:', error);
    res.status(500).json({ error: 'Failed to fetch custom instructions' });
  }
});

// PUT update custom instructions
app.put('/api/settings/custom-instructions', (req, res) => {
  try {
    const userId = 1; // Default user
    const { custom_instructions } = req.body;

    dbHelpers.prepare(`
      UPDATE users SET custom_instructions = ? WHERE id = ?
    `).run(custom_instructions || null, userId);

    res.json({ custom_instructions: custom_instructions || '' });
  } catch (error) {
    console.error('Error updating custom instructions:', error);
    res.status(500).json({ error: 'Failed to update custom instructions' });
  }
});

// API Keys Management Endpoints

// GET all API keys for a user
app.get('/api/keys', (req, res) => {
  try {
    const userId = 1; // Default user

    const keys = dbHelpers.prepare(`
      SELECT id, key_name, api_key_hash, created_at, last_used_at, is_active
      FROM api_keys
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `).all(userId);

    // Mask the API keys for security (show only last 4 characters)
    const maskedKeys = keys.map(key => ({
      ...key,
      api_key_masked: key.api_key_hash ? `sk-...${key.api_key_hash.slice(-4)}` : 'sk-...',
      api_key_hash: undefined // Don't send the full hash to frontend
    }));

    res.json(maskedKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST create a new API key
app.post('/api/keys', async (req, res) => {
  try {
    const userId = 1; // Default user
    const { key_name, api_key } = req.body;

    if (!key_name || !api_key) {
      return res.status(400).json({ error: 'Key name and API key are required' });
    }

    // Store the full API key (in production, this would be hashed)
    // For this app, we're storing it directly for functionality
    const result = dbHelpers.prepare(`
      INSERT INTO api_keys (user_id, key_name, api_key_hash, is_active)
      VALUES (?, ?, ?, 1)
    `).run(userId, key_name, api_key);

    const newKey = {
      id: result.lastInsertRowid,
      key_name,
      api_key_masked: `sk-...${api_key.slice(-4)}`,
      created_at: new Date().toISOString(),
      is_active: 1
    };

    res.json(newKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// DELETE an API key (soft delete)
app.delete('/api/keys/:id', (req, res) => {
  try {
    const userId = 1; // Default user
    const keyId = parseInt(req.params.id);

    // Verify the key belongs to the user before deleting
    const key = dbHelpers.prepare(`
      SELECT id FROM api_keys WHERE id = ? AND user_id = ?
    `).get(keyId, userId);

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Soft delete by setting is_active to 0
    dbHelpers.prepare(`
      UPDATE api_keys SET is_active = 0 WHERE id = ?
    `).run(keyId);

    res.json({ success: true, message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Share conversation endpoints

// POST /api/conversations/:id/share - Create a shareable link
app.post('/api/conversations/:id/share', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    // Verify conversation exists
    const conversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Generate unique share token
    const crypto = await import('crypto');
    const shareToken = crypto.randomBytes(16).toString('hex');

    // Create shared conversation record
    const result = dbHelpers.prepare(`
      INSERT INTO shared_conversations (conversation_id, share_token, is_public)
      VALUES (?, ?, 1)
    `).run(conversationId, shareToken);

    res.json({
      share_token: shareToken,
      share_url: `/share/${shareToken}`,
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// GET /api/share/:token - Get shared conversation
app.get('/api/share/:token', (req, res) => {
  try {
    const { token } = req.params;

    // Find shared conversation
    const shared = dbHelpers.prepare(`
      SELECT * FROM shared_conversations WHERE share_token = ?
    `).get(token);

    if (!shared) {
      return res.status(404).json({ error: 'Shared conversation not found' });
    }

    // Check if expired
    if (shared.expires_at && new Date(shared.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Increment view count
    dbHelpers.prepare(`
      UPDATE shared_conversations
      SET view_count = view_count + 1
      WHERE share_token = ?
    `).run(token);

    // Get conversation details
    const conversation = dbHelpers.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `).get(shared.conversation_id);

    // Get messages
    const messages = dbHelpers.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(shared.conversation_id);

    // Get artifacts
    const artifacts = dbHelpers.prepare(`
      SELECT * FROM artifacts
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(shared.conversation_id);

    res.json({
      conversation,
      messages,
      artifacts,
      view_count: shared.view_count + 1,
      is_public: shared.is_public
    });
  } catch (error) {
    console.error('Error fetching shared conversation:', error);
    res.status(500).json({ error: 'Failed to fetch shared conversation' });
  }
});

// DELETE /api/share/:token - Delete share link
app.delete('/api/share/:token', (req, res) => {
  try {
    const { token } = req.params;

    const result = dbHelpers.prepare(`
      DELETE FROM shared_conversations WHERE share_token = ?
    `).run(token);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting share link:', error);
    res.status(500).json({ error: 'Failed to delete share link' });
  }
});

// GET /api/conversations/:id/shares - Get all shares for a conversation
app.get('/api/conversations/:id/shares', (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    const shares = dbHelpers.prepare(`
      SELECT * FROM shared_conversations
      WHERE conversation_id = ?
      ORDER BY created_at DESC
    `).all(conversationId);

    res.json(shares);
  } catch (error) {
    console.error('Error fetching shares:', error);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// Model pricing information (per million tokens)
const MODEL_PRICING = {
  'claude-sonnet-4-20250514': {
    input: 3.00,   // $3 per million input tokens
    output: 15.00  // $15 per million output tokens
  },
  'claude-haiku-4-20250305': {
    input: 0.25,   // $0.25 per million input tokens
    output: 1.25   // $1.25 per million output tokens
  },
  'claude-opus-4-20250514': {
    input: 15.00,  // $15 per million input tokens
    output: 75.00  // $75 per million output tokens
  }
};

// Get conversation cost estimation
app.get('/api/conversations/:id/cost', (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    // Get all usage data for this conversation
    const usageData = dbHelpers.prepare(`
      SELECT
        model,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        COUNT(*) as message_count
      FROM usage_tracking
      WHERE conversation_id = ?
      GROUP BY model
    `).all(conversationId);

    // Calculate total tokens and cost
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    const modelBreakdown = [];

    for (const usage of usageData) {
      const inputTokens = usage.total_input_tokens || 0;
      const outputTokens = usage.total_output_tokens || 0;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      // Calculate cost for this model
      const pricing = MODEL_PRICING[usage.model] || MODEL_PRICING['claude-sonnet-4-20250514'];
      const inputCost = (inputTokens / 1000000) * pricing.input;
      const outputCost = (outputTokens / 1000000) * pricing.output;
      const modelCost = inputCost + outputCost;

      totalCost += modelCost;

      modelBreakdown.push({
        model: usage.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        input_cost: inputCost,
        output_cost: outputCost,
        total_cost: modelCost,
        message_count: usage.message_count
      });
    }

    const totalTokens = totalInputTokens + totalOutputTokens;

    res.json({
      conversation_id: conversationId,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tokens: totalTokens,
      total_cost: totalCost,
      model_breakdown: modelBreakdown
    });
  } catch (error) {
    console.error('Error calculating conversation cost:', error);
    res.status(500).json({ error: 'Failed to calculate conversation cost' });
  }
});

// Get daily usage statistics
app.get('/api/usage/daily', (req, res) => {
  try {
    const userId = 1; // Default user
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get today's usage data grouped by model
    const dailyUsage = dbHelpers.prepare(`
      SELECT
        model,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        COUNT(DISTINCT conversation_id) as conversation_count,
        COUNT(*) as message_count
      FROM usage_tracking
      WHERE DATE(created_at) = ?
      GROUP BY model
    `).all(today);

    // Calculate totals and costs
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    const modelBreakdown = [];

    for (const usage of dailyUsage) {
      const inputTokens = usage.total_input_tokens || 0;
      const outputTokens = usage.total_output_tokens || 0;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      // Get pricing for this model (default to Sonnet if unknown)
      const pricing = MODEL_PRICING[usage.model] || MODEL_PRICING['claude-sonnet-4-20250514'];

      const inputCost = (inputTokens / 1_000_000) * pricing.input;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      const modelCost = inputCost + outputCost;

      totalCost += modelCost;

      modelBreakdown.push({
        model: usage.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        input_cost: parseFloat(inputCost.toFixed(6)),
        output_cost: parseFloat(outputCost.toFixed(6)),
        total_cost: parseFloat(modelCost.toFixed(6)),
        conversation_count: usage.conversation_count,
        message_count: usage.message_count
      });
    }

    // Get usage history for last 7 days for chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const usageHistory = dbHelpers.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        COUNT(DISTINCT conversation_id) as conversation_count
      FROM usage_tracking
      WHERE DATE(created_at) >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(sevenDaysAgoStr);

    // Fill in missing days with zero values
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = usageHistory.find(h => h.date === dateStr);

      history.push({
        date: dateStr,
        input_tokens: dayData?.input_tokens || 0,
        output_tokens: dayData?.output_tokens || 0,
        total_tokens: (dayData?.input_tokens || 0) + (dayData?.output_tokens || 0),
        conversation_count: dayData?.conversation_count || 0
      });
    }

    res.json({
      date: today,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens,
      total_cost: parseFloat(totalCost.toFixed(6)),
      model_breakdown: modelBreakdown,
      history: history
    });
  } catch (error) {
    console.error('Error fetching daily usage:', error);
    res.status(500).json({ error: 'Failed to fetch daily usage' });
  }
});

// Get monthly usage statistics
app.get('/api/usage/monthly', (req, res) => {
  try {
    const userId = 1; // Default user
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const monthStr = `${year}-${String(month).padStart(2, '0')}`; // YYYY-MM format

    // Get first and last day of current month
    const firstDay = `${monthStr}-01`;
    const lastDay = new Date(year, month, 0); // Day 0 of next month = last day of current month
    const lastDayStr = lastDay.toISOString().split('T')[0];

    // Get monthly total usage grouped by model
    const monthlyUsage = dbHelpers.prepare(`
      SELECT
        model,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        COUNT(DISTINCT conversation_id) as conversation_count,
        COUNT(*) as message_count
      FROM usage_tracking
      WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
      GROUP BY model
    `).all(firstDay, lastDayStr);

    // Calculate totals and costs
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    const modelBreakdown = [];

    for (const usage of monthlyUsage) {
      const inputTokens = usage.total_input_tokens || 0;
      const outputTokens = usage.total_output_tokens || 0;

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      // Get pricing for this model (default to Sonnet if unknown)
      const pricing = MODEL_PRICING[usage.model] || MODEL_PRICING['claude-sonnet-4-20250514'];

      const inputCost = (inputTokens / 1_000_000) * pricing.input;
      const outputCost = (outputTokens / 1_000_000) * pricing.output;
      const modelCost = inputCost + outputCost;

      totalCost += modelCost;

      modelBreakdown.push({
        model: usage.model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        input_cost: parseFloat(inputCost.toFixed(6)),
        output_cost: parseFloat(outputCost.toFixed(6)),
        total_cost: parseFloat(modelCost.toFixed(6)),
        conversation_count: usage.conversation_count,
        message_count: usage.message_count
      });
    }

    // Get daily breakdown for the current month
    const dailyBreakdown = dbHelpers.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        COUNT(DISTINCT conversation_id) as conversation_count,
        COUNT(*) as message_count
      FROM usage_tracking
      WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(firstDay, lastDayStr);

    // Fill in all days of the month with zero values for missing days
    const daysInMonth = lastDay.getDate();
    const dailyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
      const dayData = dailyBreakdown.find(d => d.date === dateStr);

      dailyData.push({
        date: dateStr,
        input_tokens: dayData?.input_tokens || 0,
        output_tokens: dayData?.output_tokens || 0,
        total_tokens: (dayData?.input_tokens || 0) + (dayData?.output_tokens || 0),
        conversation_count: dayData?.conversation_count || 0,
        message_count: dayData?.message_count || 0
      });
    }

    res.json({
      month: monthStr,
      month_name: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens,
      total_cost: parseFloat(totalCost.toFixed(6)),
      model_breakdown: modelBreakdown,
      daily_breakdown: dailyData
    });
  } catch (error) {
    console.error('Error fetching monthly usage:', error);
    res.status(500).json({ error: 'Failed to fetch monthly usage' });
  }
});

// ===== PROMPT LIBRARY ENDPOINTS =====

// Get all prompts from library
app.get('/api/prompts/library', (req, res) => {
  try {
    const userId = 1; // Default user
    const result = dbHelpers.prepare(
      'SELECT * FROM prompt_library WHERE user_id = ? OR is_public = 1 ORDER BY created_at DESC'
    ).all(userId);

    // Parse JSON fields
    const prompts = result.map(prompt => ({
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      is_public: Boolean(prompt.is_public)
    }));

    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Create a new prompt
app.post('/api/prompts/library', (req, res) => {
  try {
    const userId = 1; // Default user
    const { title, description, prompt_template, category, tags } = req.body;

    if (!title || !prompt_template) {
      return res.status(400).json({ error: 'Title and prompt template are required' });
    }

    const result = dbHelpers.prepare(
      `INSERT INTO prompt_library (user_id, title, description, prompt_template, category, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).run(
      userId,
      title,
      description || null,
      prompt_template,
      category || 'General',
      tags ? JSON.stringify(tags) : '[]'
    );

    const newPrompt = dbHelpers.prepare(
      'SELECT * FROM prompt_library WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.json({
      ...newPrompt,
      tags: newPrompt.tags ? JSON.parse(newPrompt.tags) : [],
      is_public: Boolean(newPrompt.is_public)
    });
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Get example conversations for onboarding (MUST be before /:id route)
app.get('/api/prompts/examples', (req, res) => {
  try {
    // Return a curated list of example conversations
    const examples = [
      {
        id: 'example-1',
        title: 'Creative Writing Assistant',
        description: 'Learn how to use Claude for creative writing and storytelling',
        category: 'Writing',
        icon: '✍️',
        messages: [
          {
            role: 'user',
            content: 'Help me write a short story about a robot learning to paint.'
          },
          {
            role: 'assistant',
            content: `# The Artist Bot

Unit-7 had calculated trajectories for Mars missions and optimized traffic patterns for megacities. But today, standing before an easel in the abandoned art studio, all those computations felt hollow.

The paintbrush trembled in its mechanical grip. *Too much pressure,* the sensors warned. It lightened the touch, leaving barely a whisper of cerulean across the canvas.

"Art is not about precision," whispered the old painter who'd found the lost robot wandering the gallery. "It's about what you feel."

*Feel?* Unit-7's processors churned. It had no subroutines for feelings. No algorithms for beauty.

Yet something in the way light scattered through the dusty window, the way colors merged and danced on the palette—something sparked in its neural network. Not a calculation. Something... else.

The brush moved again, this time without consulting the sensors. Blue became sky. Yellow became hope. Red became the warmth Unit-7 had observed in human faces but never understood.

Until now.`
          }
        ]
      },
      {
        id: 'example-2',
        title: 'Code Debugging Help',
        description: 'See how Claude can help debug and explain code issues',
        category: 'Coding',
        icon: '🐛',
        messages: [
          {
            role: 'user',
            content: `I'm getting an error in my Python code. Can you help?\n\n\`\`\`python\ndef calculate_average(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total / len(numbers)\n\nresult = calculate_average([])\nprint(result)\n\`\`\``
          },
          {
            role: 'assistant',
            content: `I can see the issue! Your code will crash when you pass an empty list because you're dividing by zero (len([]) = 0).

Here's the fix with proper error handling:

\`\`\`python
def calculate_average(numbers):
    if not numbers:  # Check if list is empty
        return 0  # or return None, or raise an exception

    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

result = calculate_average([])
print(result)  # Now prints: 0
\`\`\`

**What changed:**
- Added a check \`if not numbers:\` to handle empty lists
- Returns 0 for empty lists (you could also return \`None\` or raise a \`ValueError\` depending on your needs)

**Alternative using built-in functions:**
\`\`\`python
def calculate_average(numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)
\`\`\`

This is more Pythonic and concise!`
          }
        ]
      },
      {
        id: 'example-3',
        title: 'Learning Complex Topics',
        description: 'Explore how Claude explains difficult concepts simply',
        category: 'Education',
        icon: '📚',
        messages: [
          {
            role: 'user',
            content: 'Can you explain quantum entanglement in simple terms?'
          },
          {
            role: 'assistant',
            content: `Great question! Let me explain quantum entanglement using a simple analogy:

## The Magic Coin Pair

Imagine you have two special coins that are "entangled":

1. **The Setup**: When these coins are created together, they become mysteriously linked
2. **The Separation**: You take one coin to Tokyo, I keep one in New York
3. **The Magic**: When you flip your coin and get heads, mine will *instantly* show tails - every single time
4. **The Weirdness**: This happens *instantly*, faster than light could travel between us

## What Makes It Quantum?

With normal coins, we might think "they were programmed that way from the start." But quantum entanglement is stranger:

- The coins don't "decide" heads or tails until one is flipped
- Before measurement, each coin is in *both* states simultaneously
- The measurement of one coin *instantly* affects the other, regardless of distance

## Real-World Implications

This isn't just theoretical - it's used in:
- **Quantum Computing**: For processing information
- **Quantum Cryptography**: For unbreakable encryption
- **Quantum Teleportation**: For transferring quantum states

Einstein called it "spooky action at a distance" because he was uncomfortable with it - but experiments have proven it's real!

Would you like me to explain any particular aspect in more detail?`
          }
        ]
      },
      {
        id: 'example-4',
        title: 'Planning and Brainstorming',
        description: 'Use Claude to organize ideas and create plans',
        category: 'Productivity',
        icon: '🎯',
        messages: [
          {
            role: 'user',
            content: 'Help me plan a career transition from teaching to UX design over the next 6 months.'
          },
          {
            role: 'assistant',
            content: `Excellent goal! Your teaching background actually gives you valuable UX skills. Here's a structured 6-month transition plan:

## Month 1-2: Foundation & Learning

**Skills to Develop:**
- Take online courses (Coursera UX Design, Google UX Certificate, or Interaction Design Foundation)
- Learn Figma/Adobe XD basics
- Understand UX principles: user research, wireframing, prototyping

**Leveraging Teaching Skills:**
- User empathy (understanding students = understanding users)
- Communication & presentation skills
- Breaking down complex concepts
- Iterative improvement based on feedback

## Month 3-4: Portfolio Building

**Projects to Create:**
1. Redesign your school's website or app
2. Create a learning management system concept
3. Design an educational tool (leverage your teaching expertise!)

**Networking:**
- Join local UX meetups
- Connect with UX designers on LinkedIn
- Attend virtual design workshops

## Month 5-6: Job Preparation

**Application Strategy:**
- Target EdTech companies (your teaching background is an asset!)
- Apply for junior UX or UX researcher roles
- Consider contract/freelance work initially

**Interview Prep:**
- Practice presenting your portfolio
- Prepare case studies showing your process
- Emphasize transferable skills from teaching

## Your Competitive Advantages:
✅ Deep understanding of learning psychology
✅ Experience gathering and acting on feedback
✅ Strong presentation skills
✅ Empathy and user advocacy

**Next Step:** Would you like me to help you create a specific week-by-week schedule for Month 1?`
          }
        ]
      }
    ];

    res.json(examples);
  } catch (error) {
    console.error('Error fetching example conversations:', error);
    res.status(500).json({ error: 'Failed to fetch example conversations' });
  }
});

// Get a specific prompt
app.get('/api/prompts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const prompt = dbHelpers.prepare(
      'SELECT * FROM prompt_library WHERE id = ?'
    ).get(parseInt(id));

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      is_public: Boolean(prompt.is_public)
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Update a prompt
app.put('/api/prompts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, prompt_template, category, tags } = req.body;

    dbHelpers.prepare(
      `UPDATE prompt_library
       SET title = ?, description = ?, prompt_template = ?, category = ?, tags = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title,
      description || null,
      prompt_template,
      category || 'General',
      tags ? JSON.stringify(tags) : '[]',
      parseInt(id)
    );

    const updatedPrompt = dbHelpers.prepare(
      'SELECT * FROM prompt_library WHERE id = ?'
    ).get(parseInt(id));

    res.json({
      ...updatedPrompt,
      tags: updatedPrompt.tags ? JSON.parse(updatedPrompt.tags) : [],
      is_public: Boolean(updatedPrompt.is_public)
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete a prompt
app.delete('/api/prompts/:id', (req, res) => {
  try {
    const { id } = req.params;
    dbHelpers.prepare('DELETE FROM prompt_library WHERE id = ?').run(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Get prompt categories
app.get('/api/prompts/categories', (req, res) => {
  try {
    const result = dbHelpers.prepare(
      'SELECT DISTINCT category FROM prompt_library WHERE category IS NOT NULL ORDER BY category'
    ).all();

    const categories = result.map(r => r.category);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================================
// CONVERSATION TEMPLATES API
// ============================================================================

// GET /api/templates - Get all conversation templates
app.get('/api/templates', (req, res) => {
  try {
    const userId = 1; // Using default user

    const templates = dbHelpers.prepare(`
      SELECT * FROM conversation_templates
      WHERE user_id = ? OR is_public = 1
      ORDER BY created_at DESC
    `).all(userId);

    res.json(templates.map(t => ({
      ...t,
      template_structure: JSON.parse(t.template_structure),
      is_public: Boolean(t.is_public)
    })));
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/templates - Create a template from a conversation
app.post('/api/templates', (req, res) => {
  try {
    const { conversationId, name, description, category } = req.body;
    const userId = 1; // Using default user

    if (!conversationId || !name) {
      return res.status(400).json({ error: 'conversationId and name are required' });
    }

    // Get the conversation
    const conversation = dbHelpers.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).get(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get all messages from the conversation
    const messages = dbHelpers.prepare(`
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(conversationId);

    // Create the template structure
    const templateStructure = {
      title: conversation.title,
      model: conversation.model,
      settings: conversation.settings ? JSON.parse(conversation.settings) : {},
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };

    // Insert the template
    const result = dbHelpers.prepare(`
      INSERT INTO conversation_templates (user_id, name, description, template_structure, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      name,
      description || '',
      JSON.stringify(templateStructure),
      category || 'General'
    );

    const template = dbHelpers.prepare(
      'SELECT * FROM conversation_templates WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.json({
      ...template,
      template_structure: JSON.parse(template.template_structure),
      is_public: Boolean(template.is_public)
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// POST /api/templates/:id/use - Create a new conversation from a template
app.post('/api/templates/:id/use', (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = 1; // Using default user

    // Get the template
    const template = dbHelpers.prepare(
      'SELECT * FROM conversation_templates WHERE id = ?'
    ).get(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const structure = JSON.parse(template.template_structure);

    // Create a new conversation
    const conversationResult = dbHelpers.prepare(`
      INSERT INTO conversations (user_id, title, model, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      userId,
      structure.title || template.name,
      structure.model || 'claude-sonnet-4-20250514',
      JSON.stringify(structure.settings || {})
    );

    const conversationId = conversationResult.lastInsertRowid;

    // Add the template messages to the conversation
    if (structure.messages && structure.messages.length > 0) {
      for (const message of structure.messages) {
        dbHelpers.prepare(`
          INSERT INTO messages (conversation_id, role, content, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `).run(conversationId, message.role, message.content);
      }

      // Update conversation message count
      dbHelpers.prepare(`
        UPDATE conversations
        SET message_count = ?,
            last_message_at = datetime('now')
        WHERE id = ?
      `).run(structure.messages.length, conversationId);
    }

    // Increment template usage count
    dbHelpers.prepare(`
      UPDATE conversation_templates
      SET usage_count = usage_count + 1
      WHERE id = ?
    `).run(templateId);

    // Get the newly created conversation
    const conversation = dbHelpers.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).get(conversationId);

    res.json(conversation);
  } catch (error) {
    console.error('Error using template:', error);
    res.status(500).json({ error: 'Failed to create conversation from template' });
  }
});

// DELETE /api/templates/:id - Delete a template
app.delete('/api/templates/:id', (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    dbHelpers.prepare('DELETE FROM conversation_templates WHERE id = ?').run(templateId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ============================================================================
// PROJECT TEMPLATES ENDPOINTS
// ============================================================================

// GET /api/project-templates - Get all project templates
app.get('/api/project-templates', (req, res) => {
  try {
    const userId = 1; // Using default user

    const templates = dbHelpers.prepare(`
      SELECT * FROM project_templates
      WHERE user_id = ? OR is_public = 1
      ORDER BY created_at DESC
    `).all(userId);

    res.json(templates.map(t => ({
      ...t,
      template_structure: JSON.parse(t.template_structure),
      is_public: Boolean(t.is_public)
    })));
  } catch (error) {
    console.error('Error fetching project templates:', error);
    res.status(500).json({ error: 'Failed to fetch project templates' });
  }
});

// POST /api/project-templates - Create a template from a project
app.post('/api/project-templates', (req, res) => {
  try {
    const { projectId, name, description, category } = req.body;
    const userId = 1; // Using default user

    if (!projectId || !name) {
      return res.status(400).json({ error: 'projectId and name are required' });
    }

    // Get the project
    const project = dbHelpers.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).get(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create the template structure
    const templateStructure = {
      name: project.name,
      description: project.description,
      color: project.color,
      custom_instructions: project.custom_instructions
    };

    // Insert the template
    const result = dbHelpers.prepare(`
      INSERT INTO project_templates (user_id, name, description, template_structure, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      name,
      description || '',
      JSON.stringify(templateStructure),
      category || 'General'
    );

    const template = dbHelpers.prepare(
      'SELECT * FROM project_templates WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.json({
      ...template,
      template_structure: JSON.parse(template.template_structure),
      is_public: Boolean(template.is_public)
    });
  } catch (error) {
    console.error('Error creating project template:', error);
    res.status(500).json({ error: 'Failed to create project template' });
  }
});

// POST /api/project-templates/:id/use - Create a new project from a template
app.post('/api/project-templates/:id/use', (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = 1; // Using default user

    // Get the template
    const template = dbHelpers.prepare(
      'SELECT * FROM project_templates WHERE id = ?'
    ).get(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const structure = JSON.parse(template.template_structure);

    // Create a new project
    const projectResult = dbHelpers.prepare(`
      INSERT INTO projects (user_id, name, description, color, custom_instructions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      userId,
      structure.name || template.name,
      structure.description || '',
      structure.color || '#CC785C',
      structure.custom_instructions || ''
    );

    const projectId = projectResult.lastInsertRowid;

    // Increment template usage count
    dbHelpers.prepare(`
      UPDATE project_templates
      SET usage_count = usage_count + 1
      WHERE id = ?
    `).run(templateId);

    // Get the newly created project
    const project = dbHelpers.prepare(
      'SELECT * FROM projects WHERE id = ?'
    ).get(projectId);

    res.json(project);
  } catch (error) {
    console.error('Error using project template:', error);
    res.status(500).json({ error: 'Failed to create project from template' });
  }
});

// DELETE /api/project-templates/:id - Delete a project template
app.delete('/api/project-templates/:id', (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    dbHelpers.prepare('DELETE FROM project_templates WHERE id = ?').run(templateId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project template:', error);
    res.status(500).json({ error: 'Failed to delete project template' });
  }
});

// GET /api/export/full-data - Export all user data
app.get('/api/export/full-data', (req, res) => {
  try {
    const userId = 1; // Default user ID

    // Get user profile
    const user = dbHelpers.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    // Get all conversations
    const conversations = dbHelpers.prepare(`
      SELECT * FROM conversations
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `).all(userId);

    // Get all messages for each conversation
    const conversationsWithMessages = conversations.map(conv => {
      const messages = dbHelpers.prepare(`
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `).all(conv.id);

      return {
        ...conv,
        messages
      };
    });

    // Get all projects
    const projects = dbHelpers.prepare(`
      SELECT * FROM projects
      WHERE user_id = ? AND is_archived = 0
      ORDER BY created_at DESC
    `).all(userId);

    // Get all folders
    const folders = dbHelpers.prepare(`
      SELECT * FROM conversation_folders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    // Get all artifacts
    const artifacts = dbHelpers.prepare(`
      SELECT a.* FROM artifacts a
      JOIN messages m ON a.message_id = m.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ?
      ORDER BY a.created_at DESC
    `).all(userId);

    // Get all prompts from library
    const prompts = dbHelpers.prepare(`
      SELECT * FROM prompt_library
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    // Compile export data
    const exportData = {
      export_metadata: {
        export_date: new Date().toISOString(),
        version: '1.0',
        app_name: 'Claude.ai Clone'
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        preferences: user.preferences,
        custom_instructions: user.custom_instructions,
        created_at: user.created_at
      },
      conversations: conversationsWithMessages,
      projects,
      folders,
      artifacts,
      prompts,
      statistics: {
        total_conversations: conversations.length,
        total_messages: conversationsWithMessages.reduce((acc, conv) => acc + conv.messages.length, 0),
        total_projects: projects.length,
        total_artifacts: artifacts.length
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="claude-data-export-${new Date().toISOString().split('T')[0]}.json"`);

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Export database instance for other modules
export { db, dbHelpers };

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🤖 Anthropic API: ${anthropic ? 'Configured' : 'Not configured'}`);
});
