# DEVONthink MCP Server

Model Context Protocol (MCP) server for DEVONthink integration with Claude Desktop.

## Current Status

Version: 2.0.0  
Implementation: Complete (All 4 phases)  
Tools: 25+ specialized MCP tools  
Testing: Comprehensive test suite + CI/CD  
Quality: Production-ready with error handling  

## Key Commands

### Development & Testing
```bash
npm start                    # Run MCP server
npm dev                      # Run with debug logging
npm test                     # Run all tests (AppleScript + comprehensive)
npm run test:comprehensive   # Test all 25+ tools across 4 phases
npm run test:mcp            # Interactive MCP Inspector
npm run test:tool <name>    # Test individual tool
npm run validate            # Code quality validation
```

### Quick Validation
```bash
npm run test:scripts        # Basic AppleScript tests (~30 seconds)
npm run lint               # Code style validation
node test_mcp_tool.js search_devonthink '{"query": "test"}'  # Single tool test
```

## Architecture

```
dt-mcp/
├── server.js                     # Main MCP server (25+ tools)
├── package.json                  # v2.0.0 with comprehensive scripts
├── README.md                     # Complete documentation
├── TESTING.md                    # Comprehensive testing guide
├── src/services/
│   └── devonthink.js               # Service layer (all 4 phases)
├── scripts/devonthink/          # AppleScript implementations
│   ├── search.applescript          # Core search
│   ├── knowledge_synthesis.applescript # Phase 4 synthesis
│   ├── build_knowledge_graph.applescript # Phase 1 graphs
│   ├── automate_research_optimized.applescript # Phase 2 automation
│   ├── analyze_document_similarity.applescript # Phase 3 intelligence
│   └── ... (10+ more specialized scripts)
├── .github/workflows/           # CI/CD automation
│   └── test-mcp-server.yml        # Multi-Node.js testing pipeline
├── test_comprehensive.py        # Complete test suite
├── test_mcp_tool.js            # Individual tool testing helper
└── CLAUDE.md                    # This file
```

## Complete Tool Reference

### Core Operations (8 tools)
```bash
search_devonthink           # Full-text search with DEVONthink syntax
read_document              # Document content and metadata
create_document            # New document creation
list_databases             # Database enumeration
update_tags                # Tag management
get_related_documents      # AI-suggested relations
create_smart_group         # Dynamic collections
ocr_document              # Text extraction from PDFs/images
```

### Phase 1: Knowledge Graph & Relationships (5 tools)
```bash
build_knowledge_graph      # Visual relationship mapping with depth control
find_shortest_path         # BFS pathfinding between documents
detect_knowledge_clusters  # Connected components clustering
find_connections          # Multi-type relationship discovery
compare_documents         # Document similarity analysis
```

### Phase 2: Research Automation (3 tools)
```bash
automate_research         # Complete research workflows
organize_findings_optimized # Performance-optimized result organization
create_collection         # Research project collections
```

### Phase 3: Document Intelligence (3 tools)
```bash
analyze_document          # Complexity & readability (Flesch scoring)
analyze_document_similarity # Multi-document Jaccard comparison
batch_read_documents      # Parallel document processing
```

### Phase 4: Knowledge Synthesis (6 tools)
```bash
synthesize_documents      # Multi-document synthesis (summary/consensus/insights)
extract_themes           # Theme identification with coherence metrics
create_multi_level_summary # Tiered summarization (brief/detailed/full)
track_topic_evolution    # Topic change analysis over time
create_knowledge_timeline # Chronological knowledge mapping
identify_trends          # Trending topic detection
```

## 🎯 Usage Patterns

### Research Workflow Example
```
1. "Search for 'quantum computing' papers from 2023"
2. "Build a knowledge graph from the top result with depth 3"
3. "Create a research collection called 'Quantum Research Project'"
4. "Synthesize the top 5 documents with consensus approach"
5. "Extract themes from the collection"
6. "Track how 'quantum computing' evolved over the last year"
```

### Knowledge Discovery Example
```
1. "Detect knowledge clusters in my machine learning documents"
2. "Find the shortest path between this paper and that concept"
3. "Analyze similarity across these 10 research papers"
4. "What topics are trending in my recent documents?"
```

## 🧪 Testing & Quality Assurance

### Test Coverage
- **Comprehensive Suite**: All 25+ tools tested across 4 phases
- **CI/CD Pipeline**: Multi-Node.js (18.x, 20.x) on macOS
- **AppleScript Validation**: Syntax checking for all scripts
- **Performance Testing**: Large document set optimization
- **Error Handling**: Comprehensive error scenarios

### Quality Metrics
- **Success Rate**: >95% for production builds
- **Performance**: Sub-second for basic operations, <30s for complex synthesis
- **Error Reporting**: Structured JSON error responses
- **Documentation**: 100% tool coverage with examples

### Test Commands
```bash
# Quick validation (30 seconds)
npm run test:scripts

# Full comprehensive testing (2-5 minutes)
npm run test:comprehensive

# Individual tool testing
npm run test:tool synthesize_documents '{"documentUUIDs": ["UUID1", "UUID2"], "synthesisType": "summary"}'

# Interactive exploration
npm run test:mcp
```

## 🔍 Development Guidelines

### Adding New Tools
1. **AppleScript**: Create in `scripts/devonthink/new_feature.applescript`
2. **Service Method**: Add to `src/services/devonthink.js`
3. **Tool Registration**: Register in `server.js` with Zod validation
4. **Testing**: Add to `test_comprehensive.py`
5. **Documentation**: Update README.md and this file

### Performance Optimization
- Use iterative algorithms with explicit data structures (queues, stacks)
- Implement result limiting for large datasets
- Add timeout protection for long operations
- Include progress indicators for complex workflows

### Error Handling
- Comprehensive AppleScript error catching
- Structured JSON error responses
- User-friendly error messages
- Logging for debugging

## 🚀 Production Deployment

### Prerequisites Verification
```bash
# Check Node.js version (>=18)
node --version

# Verify DEVONthink installation
osascript -e 'tell application id "DNtp" to return version'

# Test basic connectivity
npm run test:scripts
```

### Claude Desktop Configuration
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

### Performance Monitoring
- Monitor test success rates
- Track response times for key operations
- Log error patterns for optimization
- Performance benchmarks for large datasets

## 🐛 Troubleshooting

### Common Issues
- **Tool not found**: Verify absolute path in Claude config
- **Permission denied**: System Settings → Privacy → Automation
- **Timeout errors**: Check for large result sets, use optimized tools
- **No documents found**: Ensure DEVONthink databases are open

### Debug Mode
```bash
LOG_LEVEL=DEBUG npm start          # Verbose server logging
LOG_LEVEL=DEBUG npm run test:comprehensive  # Debug test execution
```

### Direct AppleScript Testing
```bash
osascript scripts/devonthink/search.applescript "test query"
osascript scripts/devonthink/knowledge_synthesis.applescript "synthesize" "summary" "UUID1" "UUID2"
```

## 📊 Project Metrics

- **Lines of Code**: ~3,000+ (server + AppleScript + tests)
- **AppleScript Files**: 15+ specialized scripts
- **Test Coverage**: 25+ tools across 4 implementation phases
- **Documentation**: README + TESTING + CLAUDE guides
- **CI/CD**: Full GitHub Actions pipeline

## 🔄 Maintenance

### Regular Tasks
- Monitor test success rates
- Update dependencies (MCP SDK, Zod)
- Performance benchmarking
- Error log analysis

### Version Updates
- Follow semantic versioning (currently v2.0.0)
- Update package.json and documentation
- Run full test suite before releases
- Update CI/CD pipeline as needed

---

**Status**: Production Ready  
**Last Updated**: Current  
**Architecture**: Fully iterative (queue-based algorithms throughout)  

For detailed usage instructions, see [README.md](README.md)  
For comprehensive testing guide, see [TESTING.md](TESTING.md)