# DEVONthink MCP - Quick Reference (v3.0)

## 9 Unified Tools (from 49 → 9)

### 🔍 **search** - Find documents
```javascript
{ mode: 'basic', query: 'quantum', limit: 10 }
{ mode: 'advanced', query: 'tag:research AND created:>2023' }
{ mode: 'batch', query: ['AI', 'ML', 'neural'], database: 'Research' }
{ mode: 'smart_groups', database: 'Work', limit: 20 }
```

### 📄 **document** - Manage documents
```javascript
{ operation: 'read', uuid: 'ABC-123' }
{ operation: 'create', name: 'Notes', content: '...', type: 'markdown' }
{ operation: 'update', uuid: 'ABC-123', tags: ['important', 'review'] }
{ operation: 'delete', uuid: 'ABC-123', confirmDelete: false }
{ operation: 'ocr', uuid: 'PDF-456' }
{ operation: 'batch_read', uuid: ['ABC-123', 'DEF-456'] }
```

### 🧠 **analyze** - Analyze & synthesize
```javascript
{ operation: 'analyze', documentUuids: 'ABC-123' }
{ operation: 'similarity', documentUuids: ['ABC', 'DEF', 'GHI'] }
{ operation: 'synthesize', documentUuids: [...], synthesisType: 'consensus' }
{ operation: 'themes', documentUuids: [...] }
{ operation: 'summary', documentUuids: [...], summaryLevel: 'detailed' }
{ operation: 'compare', documentUuids: ['ABC-123', 'DEF-456'] }
```

### 🕸️ **graph** - Knowledge graphs
```javascript
{ operation: 'build', uuid: 'ABC-123', maxDepth: 3 }
{ operation: 'path', uuid: 'START', targetUuid: 'END', maxDepth: 5 }
{ operation: 'clusters', searchQuery: 'AI research', minClusterSize: 3 }
{ operation: 'connections', uuid: 'ABC-123' }
{ operation: 'timeline', uuid: 'ABC-123' }
```

### 📁 **organize** - Organization
```javascript
{ operation: 'create_group', name: 'Project X', path: '/Research' }
{ operation: 'create_collection', name: 'Literature Review' }
{ operation: 'move', documentUuids: [...], targetGroup: '/Archive' }
{ operation: 'bulk_tag', documentUuids: [...], tags: [...], tagAction: 'add' }
{ operation: 'auto_organize', organizationMode: 'type' }
{ operation: 'folder_structure', structure: {...}, path: '/Projects' }
```

### ⬇️ **import** - Import content
```javascript
{ type: 'url', source: 'https://example.com/article' }
{ type: 'paper', source: '2301.00001', paperSource: 'arxiv' }
{ type: 'url', source: ['url1', 'url2'], maxConcurrent: 3 }
{ type: 'paper', source: ['id1', 'id2'], paperSource: 'doi' }
{ type: 'batch', source: [...] }
```

### 🔬 **research** - Research workflows
```javascript
{ workflow: 'explore', query: 'quantum computing' }
{ workflow: 'organize', query: 'machine learning', maxResults: 100 }
{ workflow: 'track_evolution', query: 'AI ethics', timeRange: 'year' }
{ workflow: 'trends' }
{ workflow: 'create_project', projectName: 'AI Research', description: '...' }
```

### 🤖 **ai** - AI features
```javascript
{ operation: 'classify', uuid: 'ABC-123' }
{ operation: 'similar', uuid: 'ABC-123', limit: 10 }
{ operation: 'related', uuid: 'ABC-123', limit: 5 }
```

### ⚙️ **system** - System & help
```javascript
{ operation: 'databases' }
{ operation: 'monitor' }
{ operation: 'performance' }
{ operation: 'reset' }
{ operation: 'help', toolName: 'search', includeExamples: true }
```

## Migration from 49-tool to 9-tool

| Old Tool | New Tool | Parameters |
|----------|----------|------------|
| `search_devonthink` | `search` | `{ mode: 'basic' }` |
| `advanced_search` | `search` | `{ mode: 'advanced' }` |
| `batch_search` | `search` | `{ mode: 'batch' }` |
| `read_document` | `document` | `{ operation: 'read' }` |
| `create_document` | `document` | `{ operation: 'create' }` |
| `synthesize_documents` | `analyze` | `{ operation: 'synthesize' }` |
| `build_knowledge_graph` | `graph` | `{ operation: 'build' }` |
| `classify_document` | `ai` | `{ operation: 'classify' }` |
| ... | ... | ... |

## Performance Tips

1. **Use batch operations** when possible:
   - `search` with `mode: 'batch'`
   - `document` with `operation: 'batch_read'`
   - `import` with arrays of sources

2. **Limit results** for better performance:
   - Add `limit` parameter to searches
   - Use `maxDepth` for graph operations
   - Set `maxResults` for analysis

3. **Target specific databases**:
   - Add `database` parameter when possible
   - Reduces search scope and improves speed

## Common Workflows

### Literature Review
```javascript
1. search { mode: 'advanced', query: 'topic AND peer-reviewed' }
2. document { operation: 'batch_read', uuid: [...] }
3. analyze { operation: 'themes', documentUuids: [...] }
4. analyze { operation: 'synthesize', synthesisType: 'consensus' }
```

### Knowledge Mapping
```javascript
1. graph { operation: 'build', uuid: 'seed-doc', maxDepth: 3 }
2. graph { operation: 'clusters', searchQuery: 'related-topic' }
3. ai { operation: 'classify', uuid: 'new-doc' }
```

### Research Project Setup
```javascript
1. research { workflow: 'create_project', projectName: 'My Research' }
2. import { type: 'paper', source: ['id1', 'id2'], paperSource: 'arxiv' }
3. organize { operation: 'auto_organize', organizationMode: 'type' }
```

## Error Handling

All tools return consistent error format:
```json
{
  "error": "Error message",
  "details": {
    "tool": "tool_name",
    "timestamp": "ISO-8601",
    "context": {...}
  }
}
```

## Getting Help

Use the system tool for inline help:
```javascript
system { operation: 'help', toolName: 'search', includeExamples: true }
system { operation: 'help', toolName: 'list' }  // List all tools
```