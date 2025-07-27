# DEVONthink MCP Server

A Model Context Protocol (MCP) server that enables Claude Desktop to interact with DEVONthink databases on macOS. Search, read, create, and organize documents directly through Claude.

## Overview

This MCP server provides comprehensive integration between Claude Desktop and DEVONthink, allowing AI-powered document management, research organization, and knowledge discovery.

## Features

### 🔍 Core Document Operations
- **Search** - Full-text search across all databases with DEVONthink's powerful query syntax
- **Read** - Access document content and metadata (supports all DEVONthink document types)
- **Create** - Generate new documents in Markdown, RTF, or plain text formats
- **List** - View all open databases with statistics

### 📁 Document Management
- **Tags** - Update and organize documents with tags
- **Smart Groups** - Create dynamic collections based on search criteria
- **OCR** - Extract text from PDFs and images
- **Related Documents** - Find similar documents using DEVONthink's AI

### 🔬 Research Tools
- **Document Connections** - Discover relationships between documents:
  - AI-based similarity (using DEVONthink's comparison algorithms)
  - Incoming references (documents linking to current)
  - Outgoing references (documents linked from current)
- **Document Comparison** - Analyze similarity between two documents
- **Research Collections** - Create and manage document collections for projects
- **Batch Operations** - Process multiple documents or searches simultaneously

### 🧠 Advanced Knowledge Features
- **Knowledge Graph** - Build visual relationship maps with configurable depth
- **Shortest Path** - Find connection paths between any two documents
- **Knowledge Clusters** - Detect groups of related documents automatically
- **Research Automation** - Streamline research workflows:
  - Explore topics with automatic collection creation
  - Expand research from a single document
  - Organize findings by relevance scores

## Prerequisites

- macOS (required for AppleScript integration)
- [DEVONthink 3 or 4](https://www.devontechnologies.com/apps/devonthink) installed
- Node.js 16 or later
- [Claude Desktop](https://claude.ai/download)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/dt-mcp.git
   cd dt-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test the installation:
   ```bash
   npm test
   ```

## Configuration

### Claude Desktop Setup

1. Locate your Claude Desktop configuration:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add the DEVONthink server to your configuration:
   ```json
   {
     "mcpServers": {
       "devonthink": {
         "command": "node",
         "args": ["/absolute/path/to/dt-mcp/server.js"],
         "env": {}
       }
     }
   }
   ```

3. Replace `/absolute/path/to/dt-mcp` with the full path to where you cloned this repository

4. Restart Claude Desktop

### Verify Installation

After restarting Claude, you should see "devonthink" in the MCP tools list (🔌 icon in Claude Desktop).

## Usage Guide

### Basic Operations

Ask Claude to perform document operations naturally:

```
"Search DEVONthink for machine learning papers from 2023"
"Create a new markdown note about today's meeting"
"Show me all my DEVONthink databases"
"Read the document with UUID ABC123..."
```

### Research Workflows

Organize research projects with collections:

```
"Create a research collection called 'PhD Thesis - Chapter 3'"
"Add this document to my thesis collection"
"Find all documents related to this paper"
"Compare these two research papers for similarity"
```

### Advanced Searches

Use DEVONthink's search syntax:

```
"Search for: machine learning AND (neural OR deep) created:2023"
"Find all PDFs with tag:important modified:<=7days"
"Search in database 'Research' for content:transformer"
```

## Tool Reference

### Core Tools

#### `search_devonthink`
Search across DEVONthink databases.
- **Parameters:**
  - `query` (required): Search query supporting DEVONthink syntax
  - `database` (optional): Specific database name
- **Returns:** Array of matching documents with metadata

#### `read_document`
Read document content and metadata.
- **Parameters:**
  - `uuid` (required): Document UUID
  - `includeContent` (optional): Include full content (default: true)
- **Returns:** Document metadata and content

#### `create_document`
Create new documents in DEVONthink.
- **Parameters:**
  - `name` (required): Document name
  - `content` (required): Document content
  - `type` (optional): "markdown", "rtf", or "txt" (default: "markdown")
  - `groupPath` (optional): Destination folder path
- **Returns:** Created document metadata with UUID

#### `list_databases`
List all open DEVONthink databases.
- **Returns:** Array of databases with name, UUID, path, item count, and status

### Document Management Tools

#### `update_tags`
Update document tags.
- **Parameters:**
  - `uuid` (required): Document UUID
  - `tags` (required): Array of tag strings
- **Returns:** Updated document metadata

#### `get_related_documents`
Find AI-suggested related documents.
- **Parameters:**
  - `uuid` (required): Document UUID
  - `limit` (optional): Maximum results (default: 10)
- **Returns:** Array of related documents sorted by relevance

#### `create_smart_group`
Create dynamic smart groups.
- **Parameters:**
  - `name` (required): Smart group name
  - `searchQuery` (required): Search criteria
  - `database` (optional): Target database
- **Returns:** Created smart group metadata

#### `ocr_document`
Perform OCR on PDFs or images.
- **Parameters:**
  - `uuid` (required): Document UUID
- **Returns:** OCR operation status

### Research Tools

#### `find_connections`
Discover document relationships.
- **Parameters:**
  - `uuid` (required): Document UUID
  - `maxResults` (optional): Maximum connections (default: 10)
- **Returns:** Connections categorized by type (AI, references)

#### `build_knowledge_graph`
Build a knowledge graph showing document relationships with depth control.
- **Parameters:**
  - `uuid` (required): Starting document UUID
  - `maxDepth` (optional): Maximum traversal depth (default: 3)
- **Returns:** Graph structure with nodes and edges showing:
  - AI-based relationships (similarity scores)
  - Reference links (incoming/outgoing)
  - Replicant connections
  - Depth information for each node

#### `find_shortest_path`
Find the shortest connection path between two documents.
- **Parameters:**
  - `startUUID` (required): Starting document UUID
  - `targetUUID` (required): Target document UUID
  - `maxDepth` (optional): Maximum search depth (default: 5)
- **Returns:** Path information including:
  - `found`: Whether a path exists
  - `length`: Number of hops in the path
  - `path`: Array of documents in the path with names and types
  - Uses breadth-first search for optimal path finding

#### `detect_knowledge_clusters`
Identify clusters of related documents based on shared tags and connections.
- **Parameters:**
  - `searchQuery` (optional): Search query to find documents (empty = use current selection)
  - `maxDocuments` (optional): Maximum documents to analyze (default: 50)
  - `minClusterSize` (optional): Minimum cluster size (default: 3)
- **Returns:** Cluster analysis including:
  - `clusters`: Groups of connected documents with common tags
  - `topTags`: Most frequently occurring tags across documents
  - `clusterCount`: Number of clusters found
  - Uses connected components algorithm for clustering

#### `automate_research`
Run automated research workflows to explore topics and organize findings.
- **Parameters:**
  - `workflowType` (required): Type of workflow to run:
    - `"explore_topic"`: Search topic, analyze results, create organized collection
    - `"expand_research"`: From one document, find and collect related documents
    - `"organize_findings"`: Sort search results by relevance scores
  - `queryOrUUID` (required): Search query for explore/organize, or document UUID for expand
- **Returns:** Workflow-specific results:
  - **explore_topic**: Collection UUID, documents added, top tags summary
  - **expand_research**: Collection UUID, AI-related and reference counts
  - **organize_findings**: Collection UUID with High/Medium/Low relevance groups

#### `compare_documents`
Compare two documents.
- **Parameters:**
  - `uuid1` (required): First document UUID
  - `uuid2` (required): Second document UUID
- **Returns:** Similarity metrics and common tags

#### `create_collection`
Create research collections.
- **Parameters:**
  - `name` (required): Collection name
  - `description` (required): Collection description
  - `database` (optional): Target database
- **Returns:** Collection metadata with UUID

#### `add_to_collection`
Add documents to collections.
- **Parameters:**
  - `collectionUUID` (required): Collection UUID
  - `documentUUID` (required): Document UUID
  - `notes` (optional): Addition notes
- **Returns:** Success status

### Batch Operations

#### `batch_search`
Search multiple queries simultaneously.
- **Parameters:**
  - `queries` (required): Array of search queries
  - `database` (optional): Target database
- **Returns:** Results grouped by query

#### `batch_read_documents`
Read multiple documents at once.
- **Parameters:**
  - `uuids` (required): Array of document UUIDs
  - `includeContent` (optional): Include content (default: false)
- **Returns:** Array of documents or errors

## Architecture

```
dt-mcp/
├── server.js                    # Main MCP server implementation
├── package.json                 # Node.js configuration
├── src/
│   └── services/
│       └── devonthink.js       # DEVONthink service layer
└── scripts/
    └── devonthink/             # AppleScript implementations
        ├── check_devonthink.applescript
        ├── search.applescript
        ├── read_document.applescript
        ├── create_document.applescript
        ├── list_databases.applescript
        ├── update_tags.applescript
        ├── get_related.applescript
        ├── create_smart_group.applescript
        ├── ocr_document.applescript
        ├── find_connections.applescript
        ├── compare_documents.applescript
        ├── create_collection.applescript
        ├── add_to_collection.applescript
        ├── build_knowledge_graph.applescript
        ├── find_shortest_path.applescript
        ├── detect_knowledge_clusters.applescript
        └── automate_research.applescript
```

## Troubleshooting

### DEVONthink Not Found
- Ensure DEVONthink 3 or 4 is installed
- Start DEVONthink before using the MCP server
- The server will attempt to auto-start DEVONthink if needed

### Permission Issues
Grant automation permissions:
1. Open System Settings → Privacy & Security → Automation
2. Enable Terminal/Node.js to control DEVONthink
3. Restart both applications if needed

### Search Problems
- Verify the database is open in DEVONthink
- Test your search query in DEVONthink first
- Check DEVONthink's search syntax guide for complex queries

### Connection Issues
- Ensure the path in `claude_desktop_config.json` is absolute
- Check server starts without errors: `npm start`
- Restart Claude Desktop after configuration changes
- Look for "devonthink" in Claude's MCP connections (🔌 icon)

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=DEBUG npm start
```

## Development

### Testing AppleScripts
```bash
# Test individual scripts
osascript scripts/devonthink/list_databases.applescript
osascript scripts/devonthink/search.applescript "test query"

# Run all tests
npm test
```

### MCP Inspector
Test the server interactively:
```bash
npx @modelcontextprotocol/inspector server.js
```

### Adding New Features
1. Create AppleScript in `scripts/devonthink/`
2. Add method to `src/services/devonthink.js`
3. Register tool in `server.js`
4. Update documentation

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [DEVONthink](https://www.devontechnologies.com/apps/devonthink)'s AppleScript API
- Designed for [Claude Desktop](https://claude.ai)