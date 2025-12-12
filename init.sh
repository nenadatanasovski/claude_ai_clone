#!/bin/bash

# Claude.ai Clone - Development Environment Setup Script
# This script sets up and runs the full-stack application

set -e  # Exit on error

echo "=================================="
echo "Claude.ai Clone - Setup & Launch"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Please install Node.js (v18 or higher) first.${NC}"
    exit 1
fi

echo -e "${BLUE}Node.js version: $(node --version)${NC}"

# Check if pnpm is installed, if not install it
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${BLUE}pnpm version: $(pnpm --version)${NC}"

# Install frontend dependencies
echo -e "\n${GREEN}[1/4] Installing frontend dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    pnpm install
else
    echo -e "${BLUE}Frontend dependencies already installed. Run 'pnpm install' to update.${NC}"
fi

# Set up backend directory and dependencies
echo -e "\n${GREEN}[2/4] Setting up backend...${NC}"
mkdir -p server

if [ ! -f "server/package.json" ]; then
    echo -e "${BLUE}Creating backend package.json...${NC}"
    cd server
    npm init -y

    # Install backend dependencies
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    npm install express better-sqlite3 @anthropic-ai/sdk cors dotenv
    npm install --save-dev nodemon

    cd ..
else
    echo -e "${BLUE}Backend package.json exists.${NC}"
    cd server
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    cd ..
fi

# Create or verify .env file
echo -e "\n${GREEN}[3/4] Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    if [ -f "/tmp/api-key" ]; then
        echo "VITE_ANTHROPIC_API_KEY=$(cat /tmp/api-key)" > .env
        echo "ANTHROPIC_API_KEY=$(cat /tmp/api-key)" >> .env
    else
        echo "VITE_ANTHROPIC_API_KEY=your_api_key_here" > .env
        echo "ANTHROPIC_API_KEY=your_api_key_here" >> .env
        echo -e "${YELLOW}⚠️  Please update .env with your Anthropic API key${NC}"
    fi
    echo "PORT=3001" >> .env
    echo "VITE_API_URL=http://localhost:3001" >> .env
else
    echo -e "${BLUE}.env file already exists.${NC}"
fi

# Initialize database
echo -e "\n${GREEN}[4/4] Initializing database...${NC}"
mkdir -p server/data
echo -e "${BLUE}Database directory created at server/data${NC}"

echo -e "\n${GREEN}✓ Setup complete!${NC}"
echo ""
echo "=================================="
echo "Starting Development Servers"
echo "=================================="
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}Starting backend server on port 3001...${NC}"
cd server
if [ -f "server.js" ]; then
    if grep -q "nodemon" package.json; then
        npm run dev &
    else
        node server.js &
    fi
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Backend server.js not found. Backend needs to be implemented.${NC}"
fi
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start frontend development server
echo -e "\n${BLUE}Starting frontend development server...${NC}"
pnpm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"

# Wait for servers to fully start
sleep 3

echo ""
echo "=================================="
echo -e "${GREEN}🚀 Application is running!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}Backend API:${NC} http://localhost:3001"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for user interrupt
wait
