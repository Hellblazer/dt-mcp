# DEVONthink MCP Server

MCP server for integrating DEVONthink with Claude Desktop on macOS.

## Features

### Core
- Search documents across databases
- Read document content and metadata
- Create new documents (Markdown, RTF, Plain Text)
- List databases

### Advanced
- Update document tags
- Get related documents using DEVONthink's AI
- Create smart groups
- OCR PDFs and images
- Batch operations

## Prerequisites

- macOS (required for AppleScript)
- [DEVONthink 3](https://www.devontechnologies.com/apps/devonthink) installed and running
- Node.js 16+ installed
- [Claude Desktop](https://claude.ai/download) (for integration)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/hal.hildebrand/dt-mcp.git
   cd dt-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test the server:
   ```bash
   npm start
   ```

## Claude Desktop Integration

1. Open Claude Desktop settings
2. Navigate to Developer → MCP Settings
3. Add or update your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devonthink": {
      "command": "node",
      "args": ["/path/to/dt-mcp/server.js"],
      "env": {}
    }
  }
}
```

Replace `/path/to/dt-mcp` with the absolute path to this repository.

4. Restart Claude Desktop

## Usage Examples

Once configured, you can ask Claude to:

- "Search my DEVONthink for documents about project management"
- "List all my DEVONthink databases"
- "Create a new markdown note in DEVONthink about today's meeting"
- "Read the document with UUID [uuid-here]"

## Available Tools

### search_devonthink
Search for documents across DEVONthink databases.

Parameters:
- `query` (required): Search query using DEVONthink search syntax
- `database` (optional): Specific database name to search in

### read_document
Read the content and metadata of a specific document.

Parameters:
- `uuid` (required): Document UUID
- `includeContent` (optional): Include document content (default: true)

### create_document
Create a new document in DEVONthink.

Parameters:
- `name` (required): Document name
- `content` (required): Document content
- `type` (optional): Document type - "markdown", "rtf", or "txt" (default: "markdown")
- `groupPath` (optional): Path to target group

### list_databases
List all open DEVONthink databases.

Parameters: None

Returns: Array of database information (name, uuid, path, itemCount, encrypted, readOnly)

### update_tags
Update tags for a specific document.

Parameters:
- `uuid` (required): Document UUID
- `tags` (required): Array of tags to set

### get_related_documents
Get documents related to a specific document using DEVONthink's AI.

Parameters:
- `uuid` (required): Document UUID
- `limit` (optional): Maximum number of related documents (default: 10)

### create_smart_group
Create a smart group with search criteria.

Parameters:
- `name` (required): Smart group name
- `searchQuery` (required): Search query/predicate
- `database` (optional): Target database name

### ocr_document
Perform OCR on a PDF or image document.

Parameters:
- `uuid` (required): Document UUID

Returns: Success status and document information

### batch_search
Search for multiple queries simultaneously.

Parameters:
- `queries` (required): Array of search queries
- `database` (optional): Database to search in

### batch_read_documents
Read multiple documents simultaneously.

Parameters:
- `uuids` (required): Array of document UUIDs
- `includeContent` (optional): Include content (default: false)

Returns: Array of documents or errors for failed reads

## Architecture

```
server.js                    # Main MCP server
├── src/services/
│   └── devonthink.js       # DEVONthink service interface
└── scripts/devonthink/
    ├── utils.applescript    # Shared utility functions
    ├── check_devonthink.applescript  # DEVONthink status checker
    │
    ├── Core Operations
    ├── search.applescript   # Search implementation
    ├── read_document.applescript    # Document reading
    ├── create_document.applescript  # Document creation
    ├── list_databases.applescript   # Database listing
    │
    └── Advanced Operations
        ├── update_tags.applescript      # Tag management
        ├── get_related.applescript      # AI-powered related documents
        ├── create_smart_group.applescript # Smart group creation
        └── ocr_document.applescript     # OCR processing
```

## Troubleshooting

### DEVONthink Not Found
- Ensure DEVONthink 3 is installed
- Try starting DEVONthink manually
- Check application ID: `osascript -e 'tell application id "DNtp" to name'`

### Permission Errors
- Grant Terminal/Node.js permission to control DEVONthink:
  - System Settings → Privacy & Security → Automation
  - Allow Terminal to control DEVONthink

### Search Returns No Results
- Verify database is open in DEVONthink
- Check search syntax is valid
- Test search directly in DEVONthink first

### MCP Connection Issues
- Restart Claude Desktop after config changes
- Verify path in config file is absolute
- Check server starts without errors: `npm start`

## Development

Test AppleScripts:
```bash
osascript scripts/devonthink/list_databases.applescript
osascript scripts/devonthink/search.applescript "test"
```

MCP Inspector:
```bash
npx @modelcontextprotocol/inspector server.js
```

Debug mode:
```bash
LOG_LEVEL=DEBUG npm start
```

## License

MIT