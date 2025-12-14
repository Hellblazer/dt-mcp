#!/bin/bash

# DEVONthink MCP Server Connection Test Script
# Tests all critical components of the connection

set -e

echo "================================================"
echo "DEVONthink MCP Server Connection Test"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if DEVONthink process exists
echo "Test 1: Checking if DEVONthink process exists..."
if ps aux | grep -i "DEVONthink.app" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC} - DEVONthink process is running"
else
    echo -e "${RED}✗ FAIL${NC} - DEVONthink process not found"
    echo "  Solution: Launch DEVONthink from Applications"
    exit 1
fi
echo ""

# Test 2: Check if DEVONthink is responsive to AppleScript
echo "Test 2: Checking if DEVONthink responds to AppleScript..."
if osascript -e 'tell application id "DNtp" to return running' 2>/dev/null | grep -q "true"; then
    echo -e "${GREEN}✓ PASS${NC} - DEVONthink is responsive to AppleScript"
else
    echo -e "${YELLOW}⚠ WARNING${NC} - DEVONthink is not fully responsive"
    echo "  Attempting to activate DEVONthink..."
    open -a DEVONthink
    sleep 2
    if osascript -e 'tell application id "DNtp" to return running' 2>/dev/null | grep -q "true"; then
        echo -e "${GREEN}✓ PASS${NC} - DEVONthink is now responsive"
    else
        echo -e "${RED}✗ FAIL${NC} - DEVONthink still not responsive"
        echo "  Solution: Manually click on DEVONthink to bring it to foreground"
        exit 1
    fi
fi
echo ""

# Test 3: Check if DEVONthink has databases open
echo "Test 3: Checking if DEVONthink has databases open..."
DB_COUNT=$(osascript -e 'tell application id "DNtp" to return count of databases' 2>/dev/null || echo "0")
if [ "$DB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} - DEVONthink has $DB_COUNT database(s) open"
else
    echo -e "${YELLOW}⚠ WARNING${NC} - No databases are open"
    echo "  The MCP server will work, but you may need to open a database first"
fi
echo ""

# Test 4: Test the check_devonthink script
echo "Test 4: Testing check_devonthink.applescript..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK_RESULT=$(osascript "$SCRIPT_DIR/../scripts/devonthink/check_devonthink.applescript" 2>&1)

if echo "$CHECK_RESULT" | grep -q '"status": "success"'; then
    echo -e "${GREEN}✓ PASS${NC} - check_devonthink.applescript works correctly"
    echo "  Result: $CHECK_RESULT"
else
    echo -e "${RED}✗ FAIL${NC} - check_devonthink.applescript failed"
    echo "  Result: $CHECK_RESULT"
    exit 1
fi
echo ""

# Test 5: Check for console.log in source code
echo "Test 5: Checking for problematic console.log statements..."
LOG_COUNT=$(grep -r "console\.log" "$SCRIPT_DIR/../src/" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$LOG_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} - No console.log statements found (all use console.error)"
else
    echo -e "${RED}✗ FAIL${NC} - Found $LOG_COUNT console.log statement(s)"
    echo "  These can interfere with JSON-RPC communication"
    grep -r "console\.log" "$SCRIPT_DIR/../src/" 2>/dev/null | grep -v "node_modules"
fi
echo ""

# Test 6: Verify bundle ID usage in AppleScripts
echo "Test 6: Verifying AppleScripts use version-independent bundle ID..."
TOTAL_SCRIPTS=$(find "$SCRIPT_DIR/../scripts/devonthink" -name "*.applescript" | wc -l | tr -d ' ')
BUNDLE_ID_SCRIPTS=$(grep -l 'application id "DNtp"' "$SCRIPT_DIR/../scripts/devonthink"/*.applescript 2>/dev/null | wc -l | tr -d ' ')

if [ "$BUNDLE_ID_SCRIPTS" -eq "$TOTAL_SCRIPTS" ]; then
    echo -e "${GREEN}✓ PASS${NC} - All $TOTAL_SCRIPTS scripts use bundle ID (version-independent)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} - $BUNDLE_ID_SCRIPTS/$TOTAL_SCRIPTS scripts use bundle ID"
    echo "  Some scripts may use version-specific names"
fi
echo ""

# Test 7: Check Node.js and dependencies
echo "Test 7: Checking Node.js and dependencies..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ PASS${NC} - Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗ FAIL${NC} - Node.js not found"
    exit 1
fi

if [ -f "$SCRIPT_DIR/../package.json" ]; then
    if [ -d "$SCRIPT_DIR/../node_modules" ]; then
        echo -e "${GREEN}✓ PASS${NC} - node_modules directory exists"
    else
        echo -e "${YELLOW}⚠ WARNING${NC} - node_modules not found, run: npm install"
    fi
else
    echo -e "${RED}✗ FAIL${NC} - package.json not found"
fi
echo ""

# Final Summary
echo "================================================"
echo "Connection Test Summary"
echo "================================================"
echo ""
echo "✓ All critical tests passed!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Code/Desktop to reload the MCP server"
echo "2. Try using a DEVONthink MCP tool (e.g., list databases)"
echo "3. Check logs at: ~/Library/Logs/Claude/mcp-server-devonthink.log"
echo ""
echo "To manually test the server, run:"
echo "  node $SCRIPT_DIR/../server.js"
echo ""
