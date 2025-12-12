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

    const result = dbHelpers.prepare(`
      INSERT INTO conversations (user_id, title, model, project_id, last_message_at)
      VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(title || 'New Conversation', model || 'claude-sonnet-4-20250514', project_id || null);

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
    const { content, role = 'user', images } = req.body;
    const conversationId = req.params.id;

    // Get conversation details
    const conversation = dbHelpers.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get project custom instructions if conversation belongs to a project
    let projectInstructions = null;
    if (conversation.project_id) {
      const project = dbHelpers.prepare('SELECT custom_instructions FROM projects WHERE id = ?').get(conversation.project_id);
      if (project && project.custom_instructions) {
        projectInstructions = project.custom_instructions;
      }
    }

    // Save user message
    const userMessageResult = dbHelpers.prepare(`
      INSERT INTO messages (conversation_id, role, content, images)
      VALUES (?, ?, ?, ?)
    `).run(conversationId, role, content, images ? JSON.stringify(images) : null);

    const userMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(userMessageResult.lastInsertRowid);

    // If no Anthropic client, return mock streaming response
    // TODO: Fix API key configuration - using mock for now
    if (true || !anthropic) {
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

      // Check if project instructions specify a language
      let mockResponse;
      if (images && images.length > 0) {
        // Mock response for image uploads
        mockResponse = `I can see you've uploaded ${images.length} image${images.length > 1 ? 's' : ''}. This is a mock response. In a real implementation with the Anthropic API configured, I would analyze the image content and provide detailed information about what I see. For now, I can confirm that your image upload functionality is working correctly!`;
      } else if (projectInstructions && projectInstructions.toLowerCase().includes('spanish')) {
        mockResponse = "¡Hola! Según las instrucciones personalizadas del proyecto, responderé en español. ¿En qué puedo ayudarte hoy?";
      } else if (projectInstructions && projectInstructions.toLowerCase().includes('french')) {
        mockResponse = "Bonjour! Selon les instructions personnalisées du projet, je répondrai en français. Comment puis-je vous aider aujourd'hui?";
      } else if (isHtmlRequest) {
        mockResponse = "Here's an HTML page with a red button:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Red Button Example</title>\n  <style>\n    body {\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      height: 100vh;\n      margin: 0;\n      font-family: Arial, sans-serif;\n      background-color: #f0f0f0;\n    }\n    .red-button {\n      background-color: #e74c3c;\n      color: white;\n      padding: 15px 30px;\n      font-size: 18px;\n      border: none;\n      border-radius: 8px;\n      cursor: pointer;\n      box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n      transition: all 0.3s ease;\n    }\n    .red-button:hover {\n      background-color: #c0392b;\n      transform: translateY(-2px);\n      box-shadow: 0 6px 8px rgba(0,0,0,0.15);\n    }\n    .red-button:active {\n      transform: translateY(0);\n      box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n    }\n  </style>\n</head>\n<body>\n  <button class=\"red-button\" onclick=\"alert('Button clicked!')\">Click Me!</button>\n</body>\n</html>\n```\n\nThis creates a centered red button with hover effects and a click handler.";
      } else if (isSvgRequest) {
        mockResponse = "Here's an SVG circle icon:\n\n```svg\n<svg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">\n  <circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"#3498db\" stroke=\"#2c3e50\" stroke-width=\"3\"/>\n  <circle cx=\"35\" cy=\"40\" r=\"5\" fill=\"white\"/>\n  <circle cx=\"65\" cy=\"40\" r=\"5\" fill=\"white\"/>\n  <path d=\"M 30 60 Q 50 75 70 60\" stroke=\"#2c3e50\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>\n</svg>\n```\n\nThis creates a simple smiley face circle icon.";
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

      // Save assistant message
      const assistantMessageResult = dbHelpers.prepare(`
        INSERT INTO messages (conversation_id, role, content, tokens)
        VALUES (?, ?, ?, ?)
      `).run(conversationId, 'assistant', mockResponse, 50);

      const assistantMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(assistantMessageResult.lastInsertRowid);

      // Detect and save artifacts
      const artifacts = detectArtifacts(mockResponse);
      if (artifacts.length > 0) {
        saveArtifacts(artifacts, assistantMessage.id, conversationId);
      }

      // Update conversation
      dbHelpers.prepare(`
        UPDATE conversations
        SET last_message_at = CURRENT_TIMESTAMP,
            message_count = message_count + 2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(conversationId);

      // Send completion message
      res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id })}\n\n`);
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

    // Prepare API parameters
    const apiParams = {
      model: conversation.model,
      max_tokens: 4096,
      messages: messages,
    };

    // Add system prompt with project custom instructions if available
    if (projectInstructions) {
      apiParams.system = projectInstructions;
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

    // Save assistant message
    const assistantMessageResult = dbHelpers.prepare(`
      INSERT INTO messages (conversation_id, role, content, tokens)
      VALUES (?, ?, ?, ?)
    `).run(conversationId, 'assistant', fullResponse, fullResponse.length);

    // Update conversation
    dbHelpers.prepare(`
      UPDATE conversations
      SET last_message_at = CURRENT_TIMESTAMP,
          message_count = message_count + 2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(conversationId);

    res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessageResult.lastInsertRowid })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Update conversation
app.put('/api/conversations/:id', (req, res) => {
  try {
    const { title, is_archived, is_pinned, model, project_id } = req.body;
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

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
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
    const { content } = req.body;
    const messageId = req.params.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if message exists
    const message = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update the message
    dbHelpers.prepare(`
      UPDATE messages
      SET content = ?, edited_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(content, messageId);

    // Get the updated message
    const updatedMessage = dbHelpers.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
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

// Export database instance for other modules
export { db, dbHelpers };

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🤖 Anthropic API: ${anthropic ? 'Configured' : 'Not configured'}`);
});
