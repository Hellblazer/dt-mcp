# DEVONthink MCP Server

MCP server for DEVONthink integration with Claude Desktop.

## Commands

- `npm start` - Run the server
- `npm install` - Install dependencies
- `npm test` - Test the AppleScripts

## Architecture

```
server.js                    # MCP server
├── src/services/
│   └── devonthink.js       # DEVONthink service
└── scripts/devonthink/     # AppleScript files
```

## Tools

Core:
- `search_devonthink` - Search documents
- `read_document` - Read document content
- `create_document` - Create new documents
- `list_databases` - List databases

Advanced:
- `update_tags` - Update document tags
- `get_related_documents` - Find related documents
- `create_smart_group` - Create smart groups
- `ocr_document` - OCR PDFs/images
- `batch_search` - Search multiple queries
- `batch_read_documents` - Read multiple documents

Research:
- `find_connections` - Find document relationships
- `compare_documents` - Compare two documents
- `create_collection` - Create research collections
- `add_to_collection` - Add to collections

## Development

- Logging: `LOG_LEVEL=DEBUG npm start`
- Test AppleScript: `osascript scripts/devonthink/[script].applescript`
- MCP Inspector: `npx @modelcontextprotocol/inspector server.js`