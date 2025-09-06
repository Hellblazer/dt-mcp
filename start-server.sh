#!/bin/bash

# Start script for DEVONthink MCP Server
# Ensures only one instance is running

echo "🔍 Checking for existing server instances..."

# Kill any existing instances
if pgrep -f "node.*server\.js" > /dev/null; then
    echo "⚠️  Found existing instances, stopping them..."
    pkill -f "node.*server\.js"
    sleep 1
fi

# Start the server
echo "🚀 Starting DEVONthink MCP server..."
cd "$(dirname "$0")"
nohup npm start > server.log 2>&1 &
PID=$!

# Wait and verify
sleep 2
if ps -p $PID > /dev/null; then
    echo "✅ Server started successfully (PID: $PID)"
    echo "📝 Logs: tail -f server.log"
else
    echo "❌ Failed to start server"
    exit 1
fi

# Count instances to ensure only one
COUNT=$(ps aux | grep -E "node.*server\.js" | grep -v grep | wc -l | tr -d ' ')
if [ "$COUNT" -eq 1 ]; then
    echo "✅ Confirmed: Only one instance running"
else
    echo "⚠️  Warning: Found $COUNT instances running"
fi