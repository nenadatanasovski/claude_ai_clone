#!/bin/bash
# Test artifacts API endpoints

# Get all conversations first
CONV_ID=$(curl -s http://localhost:3001/api/conversations | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo "Testing conversation ID: $CONV_ID"
echo ""
echo "=== GET /api/conversations/$CONV_ID/artifacts ==="
curl -s "http://localhost:3001/api/conversations/$CONV_ID/artifacts" | head -c 1000
echo ""
echo ""
