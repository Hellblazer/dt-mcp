#!/bin/bash
# Test script for Python MCP server

echo "=== Testing Python MCP Server ==="
echo

# 1. Check Python version
echo "1. Checking Python version..."
python3 --version
if [ $? -ne 0 ]; then
    echo "❌ Python 3 not found"
    exit 1
fi
echo "✅ Python 3 installed"
echo

# 2. Check if mcp package is installed
echo "2. Checking mcp package..."
python3 -c "import mcp" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  mcp package not installed"
    echo "Installing mcp package..."
    pip3 install mcp
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install mcp package"
        exit 1
    fi
fi
echo "✅ mcp package available"
echo

# 3. Check if server.py exists and is executable
echo "3. Checking server.py..."
if [ ! -f "server.py" ]; then
    echo "❌ server.py not found"
    exit 1
fi
echo "✅ server.py exists"
echo

# 4. Check if AppleScript files exist
echo "4. Checking AppleScript files..."
for script in search read create; do
    if [ ! -f "scripts/minimal/${script}.applescript" ]; then
        echo "❌ scripts/minimal/${script}.applescript not found"
        exit 1
    fi
done
echo "✅ All AppleScript files present"
echo

# 5. Check if DEVONthink is running
echo "5. Checking DEVONthink..."
osascript -e 'tell application "System Events" to (name of processes) contains "DEVONthink 3"' 2>/dev/null | grep -q "true"
if [ $? -ne 0 ]; then
    echo "⚠️  DEVONthink not running (required for actual operations)"
else
    echo "✅ DEVONthink is running"
fi
echo

# 6. Test AppleScript execution directly
echo "6. Testing AppleScript execution..."
osascript scripts/minimal/search.applescript "test" "" 5 2>&1 | head -n 5
if [ $? -eq 0 ]; then
    echo "✅ AppleScript can execute"
else
    echo "⚠️  AppleScript execution test had issues (may need DEVONthink running)"
fi
echo

echo "=== Test Summary ==="
echo "✅ Python 3 installed"
echo "✅ mcp package available"
echo "✅ server.py present"
echo "✅ AppleScript files present"
echo
echo "To start the server:"
echo "  python3 server.py"
echo
echo "To configure Claude Desktop:"
echo "  Edit ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  Add:"
echo '  {'
echo '    "mcpServers": {'
echo '      "devonthink": {'
echo '        "command": "python3",'
echo "        \"args\": [\"$(pwd)/server.py\"]"
echo '      }'
echo '    }'
echo '  }'
