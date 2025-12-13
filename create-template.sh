#!/bin/bash

# Get the Python ML Project Template ID
PROJECT_ID=$(curl -s http://localhost:3000/api/projects | grep -o '"id":[0-9]*,"user_id":[0-9]*,"name":"Python ML Project Template"' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

echo "Project ID: $PROJECT_ID"

if [ -z "$PROJECT_ID" ]; then
  echo "Python ML Project Template not found"
  exit 1
fi

# Create a project template
echo "Creating project template..."
curl -X POST http://localhost:3000/api/project-templates \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": $PROJECT_ID,
    \"name\": \"ML Project Starter\",
    \"description\": \"Template for Python machine learning projects with pre-configured settings\",
    \"category\": \"Development\"
  }"

echo -e "\n\nDone!"
