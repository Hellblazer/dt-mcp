# DEVONthink MCP Server

**Connect Claude to DEVONthink for intelligent document management and research automation.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![macOS](https://img.shields.io/badge/macOS-Required-blue.svg)](https://www.apple.com/macos/)
[![DEVONthink](https://img.shields.io/badge/DEVONthink-3.x%20%7C%204.x-green.svg)](https://www.devontechnologies.com/apps/devonthink)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)

---

## What This Does

Gives Claude direct access to your DEVONthink database:

- 🔍 **Search** with advanced syntax (tags, dates, Boolean operators)
- 📖 **Read** document content and metadata
- ✍️ **Create** new markdown/text/RTF documents
- 📥 **Import** from URLs and academic papers (arXiv, PubMed, DOI)

**Perfect for research workflows with Claude Code agents.**

---

## Quick Start

### 1. Install Dependencies

```bash
pip3 install mcp
```

That's it! Python 3 is already on your Mac.

### 2. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devonthink": {
      "command": "python3",
      "args": ["/path/to/dt-mcp/server.py"]
    }
  }
}
```

Replace `/path/to/dt-mcp` with the actual path to this repository.

### 3. Restart Claude Desktop

Quit Claude Desktop completely (⌘Q) and restart it.

### 4. Test It

In Claude Desktop or Claude Code, try:
- "Search my DEVONthink for documents about machine learning"
- "Import this arXiv paper: 2312.03032"
- "Create a note in DEVONthink with my meeting summary"

---

## Features

### Search
Advanced DEVONthink search with full query syntax:

```python
# Boolean operators
"quantum AND physics"
"AI OR ML OR 'machine learning'"
"neural NOT network"

# Field searches
"tag:research AND kind:PDF"
"name:thesis AND date:>2023"
"comment:important"

# Wildcards and phrases
"neural*"
"\"exact phrase\""
```

### Read Documents
Get content and metadata by UUID:

```python
{
  "uuid": "ABC-123-DEF",
  "includeContent": true  # Optional, default true
}
```

### Create Documents
Create new documents in DEVONthink:

```python
{
  "name": "My Research Notes",
  "content": "# Title\n\nContent here...",
  "type": "markdown",      # or "txt", "rtf"
  "database": "Research",  # Optional
  "groupPath": "/Papers"   # Optional
}
```

### Import Documents
Import from URLs or academic paper repositories:

```python
# From arXiv
{
  "source": "arxiv",
  "identifier": "2312.03032",
  "tags": "arxiv,ml,papers"
}

# From PubMed
{
  "source": "pubmed",
  "identifier": "PMC12345",
  "tags": "biology,research"
}

# From DOI
{
  "source": "doi",
  "identifier": "10.1000/xyz123"
}

# Direct URL
{
  "source": "url",
  "identifier": "https://example.com/paper.pdf",
  "tags": "reading-list"
}
```

All imported documents are automatically tagged and imported to DEVONthink.

---

## Architecture

**Simple and maintainable:**

- **server.py**: ~450 lines - MCP server with 3 tools
- **scripts/minimal/**: 3 AppleScripts (~150 lines each)
  - `search.applescript`: Search DEVONthink
  - `read.applescript`: Read document content
  - `create.applescript`: Create new documents
  - `import.applescript`: Import from URLs/papers
- **Total**: ~250 lines of core functionality
- **Context overhead**: ~800 tokens

---

## Requirements

- macOS (DEVONthink is macOS-only)
- Python 3.8+ (pre-installed on macOS)
- DEVONthink 3.x or 4.x
- MCP Python package: `pip3 install mcp`

---

## Testing

Run the test script to verify everything works:

```bash
./test_minimal_workflow.sh
```

This tests:
- ✅ AppleScript compilation
- ✅ Search functionality
- ✅ Document creation
- ✅ Document reading
- ✅ Python server imports
- ✅ Input validation

---

## Troubleshooting

### Claude can't see the tools
1. Check config path: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Verify Python path: `which python3`
3. Check server.py is executable: `chmod +x server.py`
4. Restart Claude Desktop completely (⌘Q)

### Import not working
1. Verify DEVONthink is running
2. Check network connection (for downloads)
3. Test AppleScript directly: `osascript scripts/minimal/import.applescript "https://arxiv.org/pdf/2312.03032.pdf" "test"`

### Permission errors
Grant DEVONthink automation permissions:
- System Settings → Privacy & Security → Automation
- Enable access for "Terminal" or "Claude" to control DEVONthink

---

## Development

### Testing Changes

```bash
# Test server imports
python3 -c "import server; print('✅ Server loads')"

# Test search AppleScript
osascript scripts/minimal/search.applescript "test" "" 10

# Test import AppleScript
osascript scripts/minimal/import.applescript "https://example.com/doc.pdf" "test-tag"
```

### Adding Features

The codebase is intentionally minimal. Before adding features, consider:
1. Can Claude Code agents do this themselves? (synthesis, analysis, etc.)
2. Is this core DEVONthink access functionality? (search, read, create, import)
3. Will this add significant complexity?

The goal is to provide **data access**, not processing. Let agents handle the smart stuff.

---

## Why This Version?

After extensive testing and analysis, this "Minimal+" version is optimal for Claude Code agents:

1. ✅ **Smallest footprint**: ~800 tokens vs 4,000 for complex alternatives
2. ✅ **Zero Node.js**: Python is already on macOS
3. ✅ **Import capability**: The ONE feature agents can't do themselves
4. ✅ **Simple codebase**: Easy to understand, modify, and debug
5. ✅ **Production-ready**: All features tested and verified

See [TEST_RESULTS.md](TEST_RESULTS.md) for detailed test results and comparisons.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Contributing

This is a focused, minimal implementation. Contributions should:
- Keep the codebase simple and small
- Add core DEVONthink access capabilities only
- Include tests and documentation
- Follow the existing code style

For major changes, open an issue first to discuss the approach.

---

## Credits

Built for use with [Claude Code](https://claude.ai/claude-code) and Claude Desktop.

Developed by the Anthropic community.
