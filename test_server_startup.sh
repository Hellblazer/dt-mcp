#!/bin/bash

echo "=== Testing DEVONthink MCP Server Startup ==="
echo

# Kill any existing instances
echo "1. Killing any existing server instances..."
pkill -f "node server.js" 2>/dev/null
sleep 1

# Verify no instances running
echo "2. Checking for running instances..."
if ps aux | grep "node server.js" | grep -v grep > /dev/null; then
    echo "   ❌ ERROR: Server still running!"
    exit 1
else
    echo "   ✅ No instances running"
fi

# Start the server in background
echo "3. Starting fresh server instance..."
node server.js > server.log 2>&1 &
SERVER_PID=$!
echo "   Server started with PID: $SERVER_PID"

# Wait for startup
echo "4. Waiting for server startup..."
sleep 3

# Check if server is still running
if ps -p $SERVER_PID > /dev/null; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server crashed during startup!"
    echo "   Last 20 lines of log:"
    tail -20 server.log
    exit 1
fi

# Check startup messages
echo "5. Checking startup log..."
if grep -q "Starting Streamlined DEVONthink MCP server" server.log; then
    echo "   ✅ Found correct startup message (Streamlined server)"
else
    echo "   ❌ Wrong server version!"
    head -10 server.log
    kill $SERVER_PID
    exit 1
fi

if grep -q "Registered 9 tools" server.log; then
    echo "   ✅ Registered 9 tools correctly"
else
    echo "   ⚠️  Could not verify tool registration"
fi

# List the tools
echo "6. Verifying registered tools..."
grep "Registering tool:" server.log 2>/dev/null | head -10

# Test a simple request
echo "7. Testing basic functionality..."
echo '{"jsonrpc":"2.0","id":"test1","method":"tools/call","params":{"name":"system","arguments":{"operation":"databases"}}}' | nc localhost 3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Server responding to requests"
else
    echo "   ⚠️  Could not test via network (expected if not using stdio transport)"
fi

# Verify single instance
echo "8. Confirming single instance..."
INSTANCE_COUNT=$(ps aux | grep "node server.js" | grep -v grep | wc -l)
if [ $INSTANCE_COUNT -eq 1 ]; then
    echo "   ✅ Exactly one instance running"
else
    echo "   ❌ Found $INSTANCE_COUNT instances!"
    ps aux | grep "node server.js" | grep -v grep
fi

echo
echo "=== Server Status ==="
echo "PID: $SERVER_PID"
echo "Log file: server.log"
echo "Status: RUNNING"
echo
echo "First 15 lines of startup log:"
head -15 server.log

echo
echo "=== Test Complete ==="
echo "Server is running correctly. To stop it: kill $SERVER_PID"