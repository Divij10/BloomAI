#!/bin/bash

# Kill any existing server on port 3000
echo "Stopping any existing server on port 3000..."
lsof -i :3000 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null

# Clear terminal
clear

echo "Starting AR Emotional Mirror server..."
echo "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯"
echo "Server will be available at: http://localhost:3000"
echo "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js 