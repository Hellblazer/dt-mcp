# Python Implementation Notes

This document provides implementation details for the DEVONthink MCP server.

See [README.md](README.md) for user-facing documentation.

---

## Architecture

### MCP Server (server.py)

The server implements the Model Context Protocol using the official `mcp` Python package:

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, CallToolResult
```

**Three tools exposed:**
1. `search` - Search DEVONthink with advanced query syntax
2. `document` - Read or create documents (operation-based)
3. `import` - Import from URLs or academic papers

### AppleScript Bridge

Communication with DEVONthink uses AppleScript via `osascript`:

```python
async def run_applescript(script_name: str, *args) -> dict:
    cmd = ["osascript", str(script_path)] + [str(arg) for arg in args]
    process = await asyncio.create_subprocess_exec(...)
    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
    return json.loads(output)
```

**Key design decisions:**
- 30-second timeout to prevent hanging
- JSON-based communication between Python and AppleScript
- Subprocess isolation for error handling

### AppleScript Scripts

Located in `scripts/minimal/`:

#### search.applescript
- Takes: query, database (optional), limit
- Returns: JSON array of matching documents
- Uses DEVONthink's native search with full query syntax

#### read.applescript
- Takes: UUID, includeContent flag
- Returns: JSON object with document metadata and optional content
- Handles missing documents gracefully

#### create.applescript
- Takes: name, content, type, database (optional), groupPath (optional)
- Returns: JSON object with created document info
- Supports markdown, txt, and rtf formats

#### import.applescript
- Takes: URL, tags (comma-separated), database (optional), groupPath (optional)
- Downloads file using curl
- Imports to DEVONthink with tags
- Returns: JSON object with imported document info

**Critical implementation detail**: All JSON is built manually using string concatenation to avoid AppleScript's line continuation and record serialization issues.

---

## Input Validation

All inputs are validated before processing:

```python
# Query validation
MAX_QUERY_LENGTH = 1000
def validate_query(query: str) -> str:
    if not query or len(query) > MAX_QUERY_LENGTH:
        raise ValueError(...)

# UUID validation
UUID_PATTERN = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-...')
def validate_uuid(uuid: str) -> str:
    if not UUID_PATTERN.match(uuid):
        raise ValueError(...)

# Content size validation
MAX_CONTENT_SIZE = 10 * 1024 * 1024  # 10MB
def validate_content(content: str) -> str:
    if len(content.encode('utf-8')) > MAX_CONTENT_SIZE:
        raise ValueError(...)
```

**Why this matters:**
- Prevents command injection via script name allowlisting
- Prevents JSON injection via proper escaping
- Prevents resource exhaustion via size limits
- Provides clear error messages to users

See [SECURITY_FIXES.md](SECURITY_FIXES.md) for detailed security audit.

---

## Error Handling

Three-tier error handling strategy:

### 1. Python-level validation
Catches user input errors before calling AppleScript:
```python
try:
    query = validate_query(arguments["query"])
except ValueError as e:
    return [TextContent(type="text", text=f"Invalid input: {str(e)}")]
```

### 2. AppleScript execution errors
Handles subprocess failures and timeouts:
```python
try:
    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
except asyncio.TimeoutError:
    raise RuntimeError("AppleScript execution timed out")
```

### 3. DEVONthink errors
AppleScripts return JSON with error field:
```applescript
on error errMsg
    return "{\"error\":\"Search failed: " & my escapeString(errMsg) & "\"}"
end try
```

**All errors return valid JSON** - never raw exceptions to the client.

---

## AppleScript Best Practices

### Manual JSON Construction

We build JSON manually instead of using AppleScript's record serialization:

```applescript
-- ❌ Don't do this (breaks with line continuations)
set result to {uuid:docUUID, name:docName}
return result as text

-- ✅ Do this instead
set docJSON to "{"
set docJSON to docJSON & "\"uuid\":\"" & docUUID & "\","
set docJSON to docJSON & "\"name\":\"" & my escapeString(docName) & "\""
set docJSON to docJSON & "}"
return docJSON
```

### Scoping Issues with `my` keyword

**Critical bug discovered**: Calling functions with `my` inside `tell application` blocks doesn't return values correctly.

**Solution**: Extract data inside tell block, build JSON outside:

```applescript
tell application id "DNtp"
    set recordUUID to uuid of importedRecord
    set recordTags to tags of importedRecord
end tell

-- Build JSON OUTSIDE tell block
set tagsJSON to "["
repeat with i from 1 to count of recordTags
    set tagText to item i of recordTags as text
    set tagsJSON to tagsJSON & "\"" & tagText & "\""
end repeat
set tagsJSON to tagsJSON & "]"
```

### Iteration over Lists

**Don't use references**:
```applescript
-- ❌ Creates references, not values
repeat with tag in tagList
    set end of jsonTags to tag  -- Bug!
end repeat

-- ✅ Use index-based iteration
repeat with i from 1 to count of tagList
    set tagText to item i of tagList as text
    set end of jsonTags to tagText
end repeat
```

---

## Testing

Run the automated test suite:

```bash
./test_minimal_workflow.sh
```

Tests:
1. AppleScript syntax (compilation)
2. Search functionality (JSON response)
3. Create document (UUID returned)
4. Read document (content verification)
5. Python server imports
6. Validation functions

**All tests must pass** before committing changes.

---

## Performance Characteristics

- **Server startup**: <100ms
- **Search (100 results)**: ~500ms
- **Read document**: ~200ms
- **Create document**: ~300ms
- **Import document**: 2-10s (depends on download size)

**Memory usage**: ~20MB (Python + mcp package)

**Context overhead**: ~800 tokens (tool definitions in Claude's context)

---

## Future Considerations

If adding features, maintain these principles:

1. **Simplicity**: Keep the codebase under 500 lines
2. **Data access only**: Don't process/analyze data - let agents do that
3. **Zero dependencies**: Only use Python stdlib + mcp package
4. **Fast operations**: All operations should complete in <30 seconds
5. **Clear errors**: Always return actionable error messages

Features that should NOT be added:
- ❌ Document synthesis/analysis (agents do this better)
- ❌ Knowledge graphs (agents can build these)
- ❌ Batch operations (agents can loop)
- ❌ Complex workflows (agents handle orchestration)

The goal is **data access**, not **data processing**.

---

## Deployment

The server runs as a subprocess of Claude Desktop/Code:

```json
{
  "mcpServers": {
    "devonthink": {
      "command": "python3",
      "args": ["/absolute/path/to/server.py"]
    }
  }
}
```

**Important**: Use absolute paths - relative paths won't work in Claude's subprocess environment.

**No background daemon needed** - MCP handles lifecycle automatically.

---

## Debugging

Enable debug logging:

```bash
# Run server directly to see logs
python3 server.py

# Check Claude Desktop logs
tail -f ~/Library/Logs/Claude/mcp*.log
```

Test AppleScripts directly:

```bash
# Search
osascript scripts/minimal/search.applescript "test query" "" 10

# Read
osascript scripts/minimal/read.applescript "UUID-HERE" "true"

# Create
osascript scripts/minimal/create.applescript "Test Doc" "Content" "markdown" "" ""

# Import
osascript scripts/minimal/import.applescript "https://example.com/doc.pdf" "tag1,tag2" "" ""
```

All scripts return JSON - check for `"error"` field.

---

## Contributing

Changes should:
- Include tests in `test_minimal_workflow.sh`
- Update this document if architecture changes
- Keep total line count under 500 (excluding tests)
- Follow existing code style (Black formatting for Python)
- Not add external dependencies

For major changes, open an issue first to discuss the approach.
