# Testing Guide

Testing documentation for DEVONthink MCP Server.

This guide covers all testing approaches, from basic validation to comprehensive integration testing.

## Test Overview

The DEVONthink MCP Server includes multiple testing layers:

- **Basic Validation**: AppleScript syntax and server startup
- **Unit Testing**: Individual tool testing  
- **Integration Testing**: End-to-end workflows
- **Comprehensive Testing**: All 29 tools across implementation phases
- **CI/CD Testing**: Automated GitHub Actions pipeline

## Quick Test Commands

```bash
# Run all tests
npm test

# Test basic functionality only
npm run test:scripts

# Test comprehensive suite (all 29 tools)
npm run test:comprehensive

# Test search functionality specifically
npm run test:search

# Test individual tool
npm run test:tool search_devonthink '{"query": "test"}'

# Test with MCP Inspector (interactive)
npm run test:mcp

# Validate code quality
npm run validate
```

## Test Categories

### 1. Basic Validation Tests

**Purpose**: Verify core functionality and setup
**Duration**: ~30 seconds
**Command**: `npm run test:scripts`

```bash
# What it tests:
- DEVONthink connection
- Database access
- Basic search functionality
- AppleScript execution
```

**Example Output**:
```
All tests completed successfully
DEVONthink running: true
Number of databases: 3
Search results count: 6884
```

### 2. Search Functionality Tests

**Purpose**: Comprehensive testing of search capabilities
**Duration**: ~30 seconds
**Command**: `npm run test:search`

**What it tests**:
- Basic search across all databases
- Database-specific search
- Complex queries with operators
- Error handling for invalid databases
- Common word searches

**Example Output**:
```
✅ Basic search across all databases
✅ Search in Sims database
✅ Complex search with operators
✅ Error handling for non-existent database
```

### 3. Individual Tool Testing

**Purpose**: Test specific MCP tools in isolation
**Duration**: ~10 seconds per tool
**Command**: `npm run test:tool <tool_name> '<parameters_json>'`

**Examples**:
```bash
# Test basic search
npm run test:tool search_devonthink '{"query": "machine learning"}'

# Test knowledge graph building
npm run test:tool build_knowledge_graph '{"uuid": "ABC-123", "maxDepth": 2}'

# Test document synthesis
npm run test:tool synthesize_documents '{"documentUUIDs": ["UUID1", "UUID2"], "synthesisType": "summary"}'

# Test with no parameters
npm run test:tool list_databases '{}'
```

**Example Output**:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "{\n  \"documents\": [\n    {\n      \"name\": \"Machine Learning Paper\",\n      \"uuid\": \"ABC-123\",\n      \"score\": 1.0\n    }\n  ]\n}"
    }
  ]
}
```

### 3. Comprehensive Integration Testing

**Purpose**: Test all 29 tools across implementation phases
**Duration**: ~2-5 minutes
**Command**: `npm run test:comprehensive`

**Test Coverage**:
- **Core Operations** (8 tools): search, read, create, tags, etc.
- **Knowledge Graph** (5 tools): graph building, shortest path, clusters
- **Research Automation** (3 tools): workflows, optimization, collections  
- **Document Intelligence** (3 tools): analysis, similarity, extraction
- **Knowledge Synthesis** (6 tools): synthesis, themes, evolution, trends

**Example Output**:
```
DEVONthink MCP Server - Comprehensive Test Suite
======================================================================
Testing all 29 tools across implementation phases...

CORE: Basic DEVONthink Operations Tests
============================================================
Testing search_devonthink: Basic document search...
  PASSED
Testing list_databases: List DEVONthink databases...
  PASSED

KNOWLEDGE GRAPH: Graph & Relationships Tests
============================================================
Testing build_knowledge_graph: Build knowledge graph with depth control...
  PASSED

TEST RESULTS SUMMARY
======================================================================
Total Tests: 29
Passed: 27
Failed: 2
Success Rate: 93.0%
Duration: 4.2s

Detailed results saved to: test_results_comprehensive.json
```

### 4. Interactive MCP Testing

**Purpose**: Manual exploration and debugging
**Duration**: Interactive
**Command**: `npm run test:mcp`

This opens the MCP Inspector for interactive testing:
- Browse available tools
- Test with custom parameters
- View real-time responses
- Debug connection issues

## Tool-Specific Testing

### Core Operations Testing

```bash
# Test search with different parameters
npm run test:tool search_devonthink '{"query": "machine learning AND neural"}'
npm run test:tool search_devonthink '{"query": "kind:PDF created:2023", "database": "Research"}'

# Test document operations
npm run test:tool read_document '{"uuid": "YOUR-UUID", "includeContent": true}'
npm run test:tool create_document '{"name": "Test Note", "content": "Test content", "type": "markdown"}'

# Test database operations
npm run test:tool list_databases '{}'
npm run test:tool update_tags '{"uuid": "YOUR-UUID", "tags": ["test", "important"]}'
```

### Knowledge Graph Testing

```bash
# Test knowledge graph with different depths
npm run test:tool build_knowledge_graph '{"uuid": "YOUR-UUID", "maxDepth": 1}'
npm run test:tool build_knowledge_graph '{"uuid": "YOUR-UUID", "maxDepth": 3}'

# Test shortest path finding
npm run test:tool find_shortest_path '{"startUUID": "UUID1", "targetUUID": "UUID2"}'

# Test cluster detection
npm run test:tool detect_knowledge_clusters '{"searchQuery": "AI", "maxDocuments": 20}'
```

### Research Automation Testing

```bash
# Test different research workflows
npm run test:tool automate_research '{"workflowType": "explore_topic", "queryOrUUID": "quantum computing"}'
npm run test:tool automate_research '{"workflowType": "expand_research", "queryOrUUID": "YOUR-UUID"}'

# Test optimized organization
npm run test:tool organize_findings_optimized '{"searchQuery": "machine learning", "maxResults": 10}'
```

### Document Intelligence Testing

```bash
# Test document analysis
npm run test:tool analyze_document '{"uuid": "YOUR-UUID"}'

# Test similarity comparison
npm run test:tool analyze_document_similarity '{"uuids": ["UUID1", "UUID2", "UUID3"]}'
```

### Knowledge Synthesis Testing

```bash
# Test different synthesis types
npm run test:tool synthesize_documents '{"documentUUIDs": ["UUID1", "UUID2"], "synthesisType": "summary"}'
npm run test:tool synthesize_documents '{"documentUUIDs": ["UUID1", "UUID2"], "synthesisType": "consensus"}'

# Test theme extraction
npm run test:tool extract_themes '{"documentUUIDs": ["UUID1", "UUID2", "UUID3"]}'

# Test evolution tracking
npm run test:tool track_topic_evolution '{"topic": "artificial intelligence", "timeRange": "month"}'

# Test trend identification
npm run test:tool identify_trends '{}'
```

## Troubleshooting Tests

### Common Test Issues

**"Unknown tool" errors**:
```bash
# Check available tools
node -e "
import('./server.js').then(async () => {
  // Server logs available tools on startup
});
"
```

**"No documents found" warnings**:
- Ensure DEVONthink has documents in open databases
- Try broader search queries like `"*"` or `"kind:any"`
- Check DEVONthink is running and databases are open

**Test timeouts**:
```bash
# Increase timeout for comprehensive tests
timeout 300s python3 test_comprehensive.py
```

**Permission errors**:
- System Settings → Privacy & Security → Automation
- Enable Terminal/Node.js to control DEVONthink
- Restart both Terminal and DEVONthink

### Debug Mode Testing

Enable verbose logging:
```bash
LOG_LEVEL=DEBUG npm run test:comprehensive
LOG_LEVEL=DEBUG npm run test:tool search_devonthink '{"query": "test"}'
```

### Manual AppleScript Testing

Test individual scripts directly:
```bash
# Test basic search
osascript scripts/devonthink/search.applescript "machine learning"

# Test knowledge synthesis
osascript scripts/devonthink/knowledge_synthesis.applescript "synthesize" "summary" "UUID1" "UUID2"

# Test with error handling
osascript scripts/devonthink/check_devonthink.applescript
```

## Test Results Analysis

### Comprehensive Test Results

The comprehensive test suite generates `test_results_comprehensive.json`:

```json
{
  "summary": {
    "total_tests": 29,
    "passed": 27,
    "failed": 2,
    "success_rate": 93.0
  },
  "tests": {
    "search_devonthink": {
      "description": "Basic document search",
      "success": true,
      "result": { "documents": [...] }
    },
    "build_knowledge_graph": {
      "description": "Build knowledge graph with depth control", 
      "success": true,
      "result": { "nodes": [...], "edges": [...] }
    }
  },
  "errors": [
    "batch_search: Tool not implemented",
    "create_collection: Database permission error"
  ]
}
```

### Performance Metrics

Monitor test performance:
- **Search tests**: Should complete in <2 seconds
- **Knowledge graphs**: Depth 3 should complete in <10 seconds  
- **Document synthesis**: 5 documents should complete in <15 seconds
- **Comprehensive suite**: Should complete in <5 minutes

### Success Rate Targets

- **Production**: >95% success rate
- **Development**: >85% success rate
- **CI/CD**: >90% success rate (some tools may fail without full DEVONthink setup)

## CI/CD Testing

### GitHub Actions Pipeline

The automated testing pipeline (`.github/workflows/test-mcp-server.yml`) includes:

1. **Multi-Node Testing**: Node.js 18.x and 20.x
2. **AppleScript Validation**: Syntax checking
3. **Server Startup**: Basic functionality verification
4. **Tool Registration**: Verify all tools are properly defined
5. **Mock Testing**: Phase 4 features without full DEVONthink

### Local CI Simulation

Run the same tests as CI:
```bash
# Test Node.js versions (if you have multiple installed)
nvm use 18 && npm test
nvm use 20 && npm test

# Test AppleScript syntax validation
python3 -c "
import subprocess
scripts = [
    'scripts/devonthink/search.applescript',
    'scripts/devonthink/knowledge_synthesis.applescript'
]
for script in scripts:
    try:
        subprocess.run(['osascript', script], 
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        print(f'{script} syntax OK')
    except:
        print(f'{script} syntax failed')
"

# Test server startup
timeout 10s node server.js &
sleep 3
pkill -f "node server.js" || true
echo "Server startup test completed"
```

## Writing New Tests

### Adding Tool Tests

When adding new tools, update `test_comprehensive.py`:

```python
def test_new_feature(self):
    """Test new feature functionality"""
    self.test_tool(
        'new_feature_tool',
        {'param1': 'value1', 'param2': 'value2'},
        "Description of what this tests"
    )
```

### AppleScript Test Scripts

Create test scripts in `scripts/test/`:

```applescript
-- test_new_feature.applescript
on run
    try
        tell application id "DNtp"
            -- Test logic here
            set result to "Test passed"
        end tell
        return result
    on error errMsg
        return "Test failed: " & errMsg
    end try
end run
```

### Manual Test Scenarios

Document common test scenarios:

```markdown
## Test Scenario: Research Workflow
1. Search for "artificial intelligence" 
2. Create research collection
3. Build knowledge graph from first result
4. Synthesize top 5 documents
5. Extract themes from collection
6. Track topic evolution over 1 month

Expected: Complete workflow with no errors
```

## Test Checklist

### Before Release
- [ ] All comprehensive tests passing (>95%)
- [ ] AppleScript syntax validation passes
- [ ] Server startup test passes
- [ ] Manual testing of key workflows
- [ ] Performance benchmarks within targets
- [ ] Documentation updated

### Before Major Changes
- [ ] Baseline test run and results saved
- [ ] New functionality tested individually
- [ ] Integration tests updated
- [ ] Regression testing completed
- [ ] Performance impact assessed

### Development Testing
- [ ] Individual tool tests pass
- [ ] MCP Inspector exploration completed
- [ ] Error scenarios tested
- [ ] Debug mode validation
- [ ] AppleScript direct testing

---

**Need help with testing?** Check the [main README](README.md) or open an [issue](https://github.com/hal.hildebrand/dt-mcp/issues).