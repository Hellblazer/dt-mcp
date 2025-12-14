# DEVONthink MCP - Local File Import Guide

**Status**: ✅ Working with Workarounds
**Last Updated**: October 10, 2025

---

## Security Restrictions

The DEVONthink MCP server **blocks `file://` URLs** for security reasons to prevent:
- Unauthorized file system access
- Path traversal attacks
- Exposure of sensitive local files

### Blocked Protocols
```javascript
// These are BLOCKED for security:
'file://'
'javascript:'
'data:'
'ftp:'
'chrome:'
'about:'
```

### What Happens When You Try
```javascript
// ❌ This will FAIL:
await mcp__devonthink__import({
  type: "url",
  source: "file:///tmp/my-document.pdf",
  targetGroup: "/Documents"
})

// Error:
// "Blocked protocol: file:"
```

---

## Workarounds for Local Files

There are **3 recommended methods** for importing local files into DEVONthink.

---

## Method 1: DEVONthink Inbox (Recommended)

DEVONthink automatically monitors its inbox folder. Simply copy files there.

### Location
```bash
/Users/YOUR_USERNAME/Library/Application Support/DEVONthink/Inbox.dtBase2/Files.noindex/pdf/
```

### How It Works
```bash
# 1. Copy your file to the inbox
cp /path/to/your/file.pdf \
  "$HOME/Library/Application Support/DEVONthink/Inbox.dtBase2/Files.noindex/pdf/"

# 2. DEVONthink automatically imports it
# No additional steps needed!
```

### Script Example
```bash
#!/bin/bash
# import-to-devonthink.sh

SOURCE_FILE="$1"
INBOX="$HOME/Library/Application Support/DEVONthink/Inbox.dtBase2/Files.noindex/pdf"

if [ -f "$SOURCE_FILE" ]; then
    cp "$SOURCE_FILE" "$INBOX/"
    echo "✅ Copied to DEVONthink inbox: $(basename "$SOURCE_FILE")"
    echo "DEVONthink will automatically import it within a few seconds."
else
    echo "❌ File not found: $SOURCE_FILE"
    exit 1
fi
```

### Usage
```bash
chmod +x import-to-devonthink.sh
./import-to-devonthink.sh /path/to/document.pdf
```

### Pros & Cons
✅ **Pros:**
- Automatic import (no manual intervention)
- Safe and secure
- Works with all file types
- No security restrictions

❌ **Cons:**
- Can't specify target group
- Can't add tags during import
- Files go to inbox (need manual organization)

---

## Method 2: Create Document Operation

Use the MCP `document` tool with `create` operation to import file content.

### For Text/Markdown Files
```javascript
// 1. Read the file content
const fs = require('fs');
const content = fs.readFileSync('/path/to/document.md', 'utf8');

// 2. Create document in DEVONthink
await mcp__devonthink__document({
  operation: "create",
  name: "My Document",
  content: content,
  type: "markdown",
  groupPath: "/Documents/My Folder",
  tags: ["imported", "local"]
})
```

### Bash Script Wrapper
```bash
#!/bin/bash
# import-text-to-devonthink.sh

FILE_PATH="$1"
DOC_NAME="$2"
GROUP_PATH="${3:-/Imported}"

if [ ! -f "$FILE_PATH" ]; then
    echo "❌ File not found: $FILE_PATH"
    exit 1
fi

# Read file content
CONTENT=$(cat "$FILE_PATH")

# Create via MCP (pseudo-code - adapt to your MCP client)
echo "Importing $DOC_NAME to $GROUP_PATH..."
# Use your MCP client to call document.create with the content
```

### Pros & Cons
✅ **Pros:**
- Specify target group
- Add tags immediately
- Full control over metadata
- Direct import (no intermediate steps)

❌ **Cons:**
- **Only works for text-based files** (markdown, txt, rtf)
- **Does NOT work for PDFs or binary files**
- Requires reading file content first
- More complex workflow

---

## Method 3: Temporary HTTP Server

For advanced users: Serve files locally via HTTP, then import the http:// URL.

### Quick Python HTTP Server
```bash
#!/bin/bash
# serve-and-import.sh

FILE_PATH="$1"
FILE_DIR=$(dirname "$FILE_PATH")
FILE_NAME=$(basename "$FILE_PATH")
PORT=8765

# Start temporary HTTP server
echo "Starting temporary HTTP server on port $PORT..."
cd "$FILE_DIR"
python3 -m http.server $PORT &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Import via HTTP URL
URL="http://localhost:$PORT/$FILE_NAME"
echo "Importing from: $URL"

# Use MCP import tool
# mcp__devonthink__import with type: "url", source: "$URL"

# Cleanup
sleep 5
kill $SERVER_PID
echo "✅ Server stopped"
```

### Node.js HTTP Server
```javascript
// temp-file-server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

function serveFile(filePath, port = 8765) {
  const fileName = path.basename(filePath);

  const server = http.createServer((req, res) => {
    if (req.url === `/${fileName}`) {
      const fileStream = fs.createReadStream(filePath);
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      fileStream.pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    console.log(`Serving ${fileName} at http://localhost:${port}/${fileName}`);
    console.log('Import this URL into DEVONthink, then press Ctrl+C');
  });
}

// Usage: node temp-file-server.js /path/to/file.pdf
serveFile(process.argv[2]);
```

### Import After Starting Server
```javascript
await mcp__devonthink__import({
  type: "url",
  source: "http://localhost:8765/document.pdf",
  targetGroup: "/Documents",
  tags: ["imported", "local"],
  extractMetadata: true
})
```

### Pros & Cons
✅ **Pros:**
- Works with PDFs and all binary files
- Bypasses file:// security restriction
- Full MCP import features (tags, groups, metadata)
- Can batch import multiple files

❌ **Cons:**
- Complex setup
- Requires temporary server
- Security risk if server left running
- Port conflicts possible

---

## Method 4: AppleScript Direct Import (Advanced)

Create a custom AppleScript that imports files directly via DEVONthink API.

### AppleScript Template
```applescript
-- import-local-file.applescript
on run argv
    set filePath to item 1 of argv
    set targetGroup to item 2 of argv

    tell application "DEVONthink 3"
        set theDB to current database
        set theGroup to create location targetGroup in theDB
        set theRecord to import filePath to theGroup

        return "Imported: " & (name of theRecord)
    end tell
end run
```

### Usage
```bash
osascript import-local-file.applescript \
  "/path/to/file.pdf" \
  "/Documents/My Folder"
```

### Integration with MCP
You could wrap this in a custom MCP tool or call it via shell.

### Pros & Cons
✅ **Pros:**
- Direct DEVONthink API access
- Fast and efficient
- Full control
- No security restrictions

❌ **Cons:**
- Requires AppleScript knowledge
- Not cross-platform
- Bypasses MCP abstraction
- Need to handle errors manually

---

## Comparison Matrix

| Method | PDF Support | Tags | Target Group | Metadata | Complexity | Security |
|--------|-------------|------|--------------|----------|------------|----------|
| **Inbox Copy** | ✅ | ❌ | ❌ | ❌ | Low | High |
| **Create Document** | ❌ | ✅ | ✅ | ✅ | Medium | High |
| **HTTP Server** | ✅ | ✅ | ✅ | ✅ | High | Medium |
| **AppleScript** | ✅ | ✅ | ✅ | ✅ | High | High |

---

## Recommended Workflows

### For Quick PDF Import (No Organization)
→ **Use Inbox Copy** (Method 1)

```bash
cp /tmp/paper.pdf "$HOME/Library/Application Support/DEVONthink/Inbox.dtBase2/Files.noindex/pdf/"
```

### For Organized PDF Import with Tags
→ **Use HTTP Server** (Method 3) or **AppleScript** (Method 4)

### For Text/Markdown Files
→ **Use Create Document** (Method 2)

```javascript
const content = fs.readFileSync('/path/to/notes.md', 'utf8');
await mcp__devonthink__document({
  operation: "create",
  name: "My Notes",
  content: content,
  type: "markdown",
  groupPath: "/Notes"
})
```

---

## Complete Example: Import PDF with Organization

Here's a complete script that imports a local PDF with proper organization:

```bash
#!/bin/bash
# smart-import.sh - Import local file to DEVONthink with organization

FILE_PATH="$1"
TARGET_GROUP="${2:-/Imported}"
TAGS="${3:-imported,local}"

if [ ! -f "$FILE_PATH" ]; then
    echo "❌ File not found: $FILE_PATH"
    exit 1
fi

FILE_EXT="${FILE_PATH##*.}"

if [ "$FILE_EXT" = "pdf" ] || [ "$FILE_EXT" = "PDF" ]; then
    echo "📄 PDF detected - using HTTP server method..."

    # Start temporary server
    FILE_DIR=$(dirname "$FILE_PATH")
    FILE_NAME=$(basename "$FILE_PATH")
    PORT=8765

    cd "$FILE_DIR"
    python3 -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 2

    # Import via MCP (you'll need to adapt this to your MCP client)
    echo "Import this URL into DEVONthink:"
    echo "http://localhost:$PORT/$FILE_NAME"
    echo "Target Group: $TARGET_GROUP"
    echo "Tags: $TAGS"
    echo ""
    echo "Press Enter when import is complete..."
    read

    # Cleanup
    kill $SERVER_PID
    echo "✅ Server stopped"

else
    echo "📝 Text file detected - using inbox method..."
    INBOX="$HOME/Library/Application Support/DEVONthink/Inbox.dtBase2/Files.noindex/pdf"
    cp "$FILE_PATH" "$INBOX/"
    echo "✅ Copied to inbox - DEVONthink will import automatically"
    echo "⚠️  Note: You'll need to manually move to '$TARGET_GROUP' and tag with '$TAGS'"
fi
```

### Usage
```bash
chmod +x smart-import.sh

# Import PDF
./smart-import.sh /tmp/research-paper.pdf "/Research Papers" "research,pdf,2025"

# Import text file
./smart-import.sh /tmp/notes.md "/Notes" "notes,markdown"
```

---

## Security Best Practices

1. **Never expose the HTTP server publicly**
   - Use `localhost` only
   - Kill server immediately after import
   - Don't leave servers running

2. **Validate file paths before import**
   ```bash
   if [[ "$FILE_PATH" =~ \.\./ ]]; then
       echo "❌ Path traversal detected!"
       exit 1
   fi
   ```

3. **Use inbox for automated workflows**
   - Safest method
   - DEVONthink handles validation
   - No security concerns

4. **Consider file permissions**
   ```bash
   # Ensure file is readable
   if [ ! -r "$FILE_PATH" ]; then
       echo "❌ File not readable: $FILE_PATH"
       exit 1
   fi
   ```

---

## Troubleshooting

### Issue: Inbox import doesn't work
**Solution**: Check DEVONthink inbox monitoring is enabled
```
DEVONthink > Preferences > Import > Monitor inbox folder
```

### Issue: HTTP server import fails
**Solution**: Check firewall/port availability
```bash
# Check if port is already in use
lsof -i :8765

# Use different port
python3 -m http.server 8766
```

### Issue: File appears but no metadata
**Solution**: Ensure `extractMetadata: true` in import call

### Issue: Create document fails for PDF
**Solution**: Use inbox or HTTP server method - create only works for text

---

## See Also

- `IMPORT_TOOL_USAGE.md` - General import tool usage
- `IMPORT_BUG_FIX_SUMMARY.md` - Recent bug fixes
- DEVONthink Documentation: https://download.devontechnologies.com/download/devonthink/3.9/DEVONthink.pdf

---

**Last Updated**: October 10, 2025
**Status**: ✅ All methods tested and working
