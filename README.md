# Claude.ai Clone - AI Chat Interface

A fully functional clone of claude.ai, Anthropic's conversational AI interface. This application provides a clean, modern chat interface for interacting with Claude via the API, including features like conversation management, artifact rendering, project organization, and more.

## Technology Stack

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context
- **Routing**: React Router
- **Markdown**: React Markdown for message rendering
- **Code Highlighting**: Syntax highlighting for code blocks

### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **API Integration**: Claude API (Anthropic SDK)
- **Streaming**: Server-Sent Events (SSE)

## Features

### Core Features
- ✨ Real-time streaming chat interface
- 💬 Multi-turn conversations with context
- 🎨 Artifact detection and rendering (code, HTML, SVG, React, Mermaid)
- 📁 Project and folder organization
- 🔍 Search across conversations
- 🎯 Multiple Claude model selection (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- 🎨 Light/Dark theme support
- 📱 Responsive design (mobile, tablet, desktop)
- 🖼️ Image upload and multi-modal support
- 🔄 Message editing and regeneration
- 📊 Usage tracking and analytics
- ⚙️ Custom instructions (global and project-specific)
- 🔗 Conversation sharing
- 📥 Export to JSON, Markdown, PDF
- ⌨️ Keyboard shortcuts and command palette
- ♿ Accessibility features (screen reader, keyboard navigation)

## Quick Start

### Prerequisites
- Node.js v18 or higher
- pnpm (will be installed automatically if not present)
- Anthropic API key

### Installation & Setup

1. **Clone and navigate to the project**:
   ```bash
   cd claide_ai_clone
   ```

2. **Run the setup script**:
   ```bash
   ./init.sh
   ```

   This script will:
   - Install all frontend dependencies
   - Set up the backend directory and dependencies
   - Create the `.env` file with API key configuration
   - Initialize the database
   - Start both frontend and backend servers

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Manual Setup (Alternative)

If you prefer manual setup:

1. **Install frontend dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up backend**:
   ```bash
   mkdir -p server
   cd server
   npm init -y
   npm install express better-sqlite3 @anthropic-ai/sdk cors dotenv
   npm install --save-dev nodemon
   cd ..
   ```

3. **Configure environment**:
   Create a `.env` file in the root directory:
   ```env
   VITE_ANTHROPIC_API_KEY=your_api_key_here
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=3001
   VITE_API_URL=http://localhost:3001
   ```

4. **Start backend**:
   ```bash
   cd server
   node server.js
   ```

5. **Start frontend** (in a new terminal):
   ```bash
   pnpm run dev
   ```

## Development

### Project Structure

```
claide_ai_clone/
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── App.jsx            # Main application component
├── server/                # Backend Express application
│   ├── server.js          # Main server file
│   ├── routes/            # API routes
│   ├── controllers/       # Route controllers
│   ├── models/            # Database models
│   └── data/              # SQLite database
├── public/                # Static assets
├── feature_list.json      # Comprehensive test cases (200+ features)
├── init.sh                # Setup and launch script
├── .env                   # Environment variables
└── README.md              # This file
```

### Feature Testing

The project includes a comprehensive `feature_list.json` file with 200+ detailed test cases covering:
- Functional features (chat, conversations, artifacts, projects, etc.)
- UI/UX styling and design
- Responsive design
- Accessibility
- Performance
- End-to-end workflows

Each feature includes:
- Category (functional or style)
- Description
- Step-by-step testing instructions
- Pass/fail status

**Important**: Features should ONLY be marked as passing by changing `"passes": false` to `"passes": true`. Never remove or edit features.

### API Endpoints

The backend provides RESTful endpoints for:
- Authentication (`/api/auth/*`)
- Conversations (`/api/conversations/*`)
- Messages (`/api/conversations/:id/messages`)
- Artifacts (`/api/artifacts/*`)
- Projects (`/api/projects/*`)
- Sharing (`/api/conversations/:id/share`)
- Search (`/api/search/*`)
- Usage tracking (`/api/usage/*`)
- Settings (`/api/settings/*`)

See `app_spec.txt` for complete API documentation.

## Database Schema

The SQLite database includes tables for:
- `users` - User accounts and preferences
- `projects` - Project organization
- `conversations` - Chat conversations
- `messages` - Individual messages
- `artifacts` - Code and content artifacts
- `shared_conversations` - Sharing tokens
- `prompt_library` - Saved prompts
- `conversation_folders` - Folder organization
- `usage_tracking` - Token usage analytics
- `api_keys` - API key management

## Keyboard Shortcuts

- `Cmd/Ctrl + K` - Open command palette
- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Cmd/Ctrl + ↑/↓` - Navigate conversations
- `Esc` - Close modals/stop generation

## Contributing

This is an autonomous development project. Each coding session:
1. Reviews the `feature_list.json` for pending features
2. Implements features one at a time
3. Tests thoroughly before marking as passing
4. Commits progress with descriptive messages
5. Updates `claude-progress.txt` with session summary

## License

This project is built for educational and demonstration purposes.

## Acknowledgments

- Built as a clone of [claude.ai](https://claude.ai) by Anthropic
- Uses the Anthropic Claude API
- Inspired by the excellent design and UX of the original claude.ai interface
