# DEVONthink MCP Server

A Model Context Protocol (MCP) server that integrates Claude Desktop and Claude Code with DEVONthink 4, providing access to DEVONthink's AI capabilities for document management and research automation.

**Latest Update (v2.0.1)**: Fixed parameter validation, improved error messages, and standardized empty array handling. See [Project Status](./docs/PROJECT_STATUS.md) for details.

[![Node.js CI](https://github.com/Hellblazer/dt-mcp/actions/workflows/test-mcp-server.yml/badge.svg)](https://github.com/Hellblazer/dt-mcp/actions/workflows/test-mcp-server.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![macOS](https://img.shields.io/badge/macOS-Required-blue.svg)](https://www.apple.com/macos/)
[![DEVONthink](https://img.shields.io/badge/DEVONthink-4.x-green.svg)](https://www.devontechnologies.com/apps/devonthink)

## Overview

This MCP server provides a wrapper around DEVONthink 4's native capabilities, exposing 30 tools for document operations and knowledge management through the MCP protocol.

### Key Features

- **Native AI Integration**: Uses DEVONthink 4's built-in AI classification and similarity detection
- **Advanced Search**: Full DEVONthink search syntax with Boolean operators and field searches
- **Smart Groups**: Access to DEVONthink's organizational features
- **Knowledge Graphs**: Document relationship mapping with iterative traversal
- **Research Automation**: Automated workflows for research tasks
- **Document Intelligence**: Analysis, comparison, and synthesis capabilities

## Quick Start

### Prerequisites

- **macOS** (required for AppleScript integration)
- **[DEVONthink 4](https://www.devontechnologies.com/apps/devonthink)** installed and running
- **Node.js 18+**
- **[Claude Desktop](https://claude.ai/download)** or **Claude Code**

### Installation

```bash
# Clone and setup
git clone https://github.com/Hellblazer/dt-mcp.git
cd dt-mcp
npm install

# Verify installation
npm run test:scripts
```

### Configuration

1. **Claude Desktop** - Add to `claude_desktop_config.json`:
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

2. **Claude Code** - Use with MCP integration
3. **Permissions** - Grant DEVONthink automation permissions in System Settings

## Tools Reference

### Core Operations (8 tools)
```bash
search_devonthink          # Document search with DEVONthink syntax
read_document              # Document content and metadata
create_document            # New document creation
list_databases             # Database enumeration
update_tags                # Tag management
get_related_documents      # AI-suggested relations
create_smart_group         # Dynamic collections
ocr_document               # Text extraction from PDFs/images
```

### Advanced Search & Organization (2 tools)
```bash
advanced_search            # Full search syntax with operators (AND, OR, NOT, field:value)
list_smart_groups          # Access to DEVONthink's organizational features
```

### Knowledge Graph & Relationships (5 tools)
```bash
build_knowledge_graph      # Visual relationship mapping with depth control
find_shortest_path         # BFS pathfinding between documents
detect_knowledge_clusters  # AI-powered document clustering
find_connections           # Multi-type relationship discovery
compare_documents          # Document similarity analysis
```

### Research Automation (3 tools)
```bash
automate_research          # Complete research workflows
organize_findings          # Performance-optimized result organization
create_collection          # Research project collections
```

### Document Intelligence (3 tools)
```bash
analyze_document           # Complexity & readability analysis
analyze_document_similarity # Multi-document comparison (performance-optimized)
batch_read_documents       # Parallel document processing
```

### Knowledge Synthesis (8 tools)
```bash
synthesize_documents       # Multi-document synthesis (performance-optimized)
extract_themes             # AI theme identification
classify_document          # Native DEVONthink AI classification
get_similar_documents      # AI-powered similarity finding
create_multi_level_summary # Tiered summarization (brief/detailed/full)
track_topic_evolution      # Topic change analysis over time
create_knowledge_timeline  # Chronological knowledge mapping
identify_trends            # Trending topic detection
```

### Batch Operations (2 tools)
```bash
batch_search               # Multiple searches in parallel
batch_read_documents       # Multiple document reads
```

### Collections (2 tools)
```bash
create_collection          # Document collections/research threads
add_to_collection          # Add documents to collections
```

### Meta Tool (1 tool)
```bash
get_tool_help              # AI-friendly help system with examples
```

## Usage Examples

### Research Workflow
```
1. "Search for 'quantum computing' papers from 2023"
   → advanced_search with date:2023 AND quantum AND computing

2. "Build a knowledge graph from the top result" 
   → build_knowledge_graph with depth 3

3. "Create a research collection"
   → create_collection for "Quantum Research Project"

4. "Synthesize the top 5 documents"
   → synthesize_documents with consensus approach

5. "What topics are trending?"
   → identify_trends across databases
```

### Advanced Search Examples
```bash
# Boolean operators
"quantum AND physics OR mathematics"

# Field searches  
"name:quantum tag:physics comment:important"

# Wildcards and fuzzy
"quant* ~quantum"

# Exact phrases
"\"quantum computing\""

# Date ranges
"date:2023 AND kind:pdf"
```

### Knowledge Discovery
```bash
# Find document clusters
detect_knowledge_clusters → Groups by AI themes

# Shortest path between concepts
find_shortest_path from_uuid to_uuid → Connection chain

# Document similarity
get_similar_documents uuid → AI-ranked related documents

# Smart groups
list_smart_groups → All organizational smart groups
```

## Technical Specifications

### Parameter Limits & Validation

- **Batch Operations**: Maximum 1000 items per batch for optimal performance
- **Search Results**: Default limit 50, maximum 1000 (larger results may timeout)
- **UUID Format**: Standard format `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` (case-insensitive)
- **Timeout**: Individual operations timeout after 2 minutes, complex operations after 10 minutes

### Performance Guidelines

| Operation | Recommended Limit | Performance Impact |
|-----------|------------------|-------------------|
| `batch_search` | 20 queries max | Linear scaling |
| `batch_read_documents` | 100 documents | Memory intensive |
| `synthesize_documents` | 50 documents | CPU intensive (uses optimization) |
| `track_topic_evolution` | All timeframe | May return 200+ entries |

### Document Type Support

#### OCR Capability
- **Supported**: PDF (image-based), PNG, JPEG, TIFF, GIF
- **Not Supported**: Text-based PDFs (already have text), Word documents, spreadsheets
- **Note**: Use `ocr_document` only on image-based documents

#### Document Creation
- **Supported Types**: `markdown`, `rtf`, `txt`
- **File Extension**: Automatically added based on type
- **Content Validation**: Name and content must be non-empty strings

### Error Handling

All tools return structured error responses:
```json
{
  "error": "Descriptive error message",
  "details": {
    "tool": "tool_name", 
    "timestamp": "ISO-8601",
    "context": "additional_context"
  }
}
```

### Response Format Standards

Successful operations return:
```json
{
  "status": "success",
  "data": { /* tool-specific data */ },
  "metadata": {
    "timestamp": "ISO-8601",
    "tool": "tool_name"
  }
}
```

## Architecture

### Design Philosophy
```
Claude ↔ MCP Server ↔ DEVONthink 4 AI
   ↑         ↑              ↑
Request   Thin Wrapper   Native AI
```

This server wraps DEVONthink 4's native AI capabilities rather than reimplementing them, providing direct access to trained models and optimized algorithms.

### Performance

#### Optimized Operations
Several tools have performance-optimized variants that sample document content for faster processing:

| Operation | Original Time | Optimized Time | Sampling Strategy |
|-----------|--------------|----------------|-------------------|
| synthesize_documents | 30+ seconds | <1 second | First 200 words/doc |
| analyze_document_similarity | 2+ minutes | <1 second | First 100 words/doc |
| Theme Extraction | Variable | 0.26s | Native AI classification |
| Classification | Variable | <1s | Native AI models |

#### Performance Features
- **Automatic Optimization**: Tools automatically use optimized versions when available
- **Intelligent Fallback**: Falls back to full analysis when optimized version returns insufficient data
- **Configurable Timeouts**: Long operations have configurable timeout protection
- **Result Validation**: Ensures quality results before accepting optimized output

## Testing & Quality

### Test Coverage
```bash
# Quick validation (30 seconds)
npm run test:scripts

# Comprehensive testing (2-5 minutes)  
npm run test:comprehensive

# Individual tool testing
npm run test:tool synthesize_documents '{"documentUUIDs": ["UUID1", "UUID2"], "synthesisType": "summary"}'

# Interactive exploration
npm run test:mcp
```

### Quality Metrics
- **Success Rate**: >95% for production builds
- **Performance**: Sub-second for most operations with intelligent optimization
- **Error Handling**: Structured JSON error responses with graceful fallbacks
- **Documentation**: Complete tool coverage with examples and performance notes
- **Code Quality**: AppleScript linting for reserved words and syntax validation

## Development

### Adding New Tools
1. **AppleScript**: Create in `scripts/devonthink/new_feature.applescript`
2. **Service Method**: Add to `src/services/devonthink.js`
3. **Tool Registration**: Register in `server.js` with Zod validation
4. **Testing**: Add to test suite
5. **Documentation**: Update README and CLAUDE.md

### Performance Guidelines
- Use DEVONthink's native AI features when available
- Create optimized versions for computationally expensive operations
- Sample document content intelligently (e.g., first N words)
- Implement structural algorithms (BFS, pathfinding) directly
- Add timeout protection and fallback mechanisms
- Validate results before accepting optimized output
- Include performance metrics in tool responses

## Project Status

- **Version**: 2.0.0
- **Implementation**: Complete
- **Tools**: 29 specialized MCP tools
- **Testing**: Comprehensive test suite + CI/CD
- **Architecture**: Wrapper around DEVONthink 4 native AI
- **Quality**: Production-ready with error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm run test:comprehensive`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related

- [DEVONthink](https://www.devontechnologies.com/apps/devonthink) - The knowledge management application
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [Claude Desktop](https://claude.ai/download) - AI assistant with MCP support

---

**Status**: Production Ready  
**Architecture**: Wrapper around DEVONthink 4 native AI capabilities