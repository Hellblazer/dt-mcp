#!/bin/bash
# Comprehensive test of Minimal Python MCP server

echo "========================================="
echo "Testing Minimal Python MCP Server"
echo "========================================="
echo

# Test 1: Compile all AppleScripts
echo "1. Compiling AppleScripts..."
osacompile -o /tmp/search.scpt scripts/minimal/search.applescript && echo "  ✅ search.applescript compiles"
osacompile -o /tmp/read.scpt scripts/minimal/read.applescript && echo "  ✅ read.applescript compiles"
osacompile -o /tmp/create.scpt scripts/minimal/create.applescript && echo "  ✅ create.applescript compiles"
echo

# Test 2: Search
echo "2. Testing search..."
SEARCH_RESULT=$(osascript scripts/minimal/search.applescript "" "" 5)
echo "  Search result (first 200 chars): ${SEARCH_RESULT:0:200}"
echo "$SEARCH_RESULT" | python3 -m json.tool > /dev/null 2>&1 && echo "  ✅ Valid JSON" || echo "  ❌ Invalid JSON"
echo

# Test 3: Create a test document
echo "3. Creating test document..."
CREATE_RESULT=$(osascript scripts/minimal/create.applescript "MCP Test Document" "This is a test document created by the MCP server test suite at $(date)" "markdown" "" "")
echo "  Create result: $CREATE_RESULT"
echo "$CREATE_RESULT" | python3 -m json.tool > /dev/null 2>&1 && echo "  ✅ Valid JSON" || echo "  ❌ Invalid JSON"
TEST_UUID=$(echo "$CREATE_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('uuid', ''))" 2>/dev/null)
echo "  Created document UUID: $TEST_UUID"
echo

# Test 4: Read the created document
if [ -n "$TEST_UUID" ]; then
    echo "4. Reading created document..."
    READ_RESULT=$(osascript scripts/minimal/read.applescript "$TEST_UUID" "true")
    echo "  Read result (first 300 chars): ${READ_RESULT:0:300}"
    echo "$READ_RESULT" | python3 -m json.tool > /dev/null 2>&1 && echo "  ✅ Valid JSON" || echo "  ❌ Invalid JSON"

    # Verify content matches
    CONTENT=$(echo "$READ_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('content', ''))" 2>/dev/null)
    if echo "$CONTENT" | grep -q "test document created by the MCP server"; then
        echo "  ✅ Content verification passed"
    else
        echo "  ❌ Content verification failed"
    fi
else
    echo "4. ⚠️  Skipping read test (no UUID from create)"
fi
echo

# Test 5: Test Python server imports
echo "5. Testing Python server..."
python3 -c "import sys; sys.path.insert(0, '.'); import server; print('  ✅ server.py imports successfully')"
echo

# Test 6: Verify validation functions
echo "6. Testing validation functions..."
python3 << 'PYTHON'
import sys
sys.path.insert(0, '.')
import server

try:
    server.validate_query("test query")
    print("  ✅ Query validation works")
except:
    print("  ❌ Query validation failed")

try:
    server.validate_uuid("12345678-1234-1234-1234-123456789012")
    print("  ✅ UUID validation works")
except:
    print("  ❌ UUID validation failed")

try:
    server.validate_limit(50)
    print("  ✅ Limit validation works")
except:
    print("  ❌ Limit validation failed")
PYTHON
echo

echo "========================================="
echo "Test Summary"
echo "========================================="
echo "All core functionality tested!"
echo
echo "To test the full MCP server:"
echo "  python3 server.py"
echo
echo "To configure Claude Desktop, add to config:"
echo '  {'
echo '    "mcpServers": {'
echo '      "devonthink": {'
echo '        "command": "python3",'
echo "        \"args\": [\"$(pwd)/server.py\"]"
echo '      }'
echo '    }'
echo '  }'
