# DEVONthink MCP Server v3.0 - Quick Reference

**Version**: 3.0.0
**Last Updated**: December 13, 2025
**Architecture**: 9 Unified Tools

---

## Overview

This document provides a complete parameter reference for all 9 unified tools in the DEVONthink MCP Server v3.0. Each tool supports multiple modes or operations, allowing 49+ distinct operations through a streamlined interface.

### The 9 Unified Tools

1. **search** - Find documents (4 modes)
2. **document** - Manage documents (6 operations)
3. **analyze** - Analysis & synthesis (6 operations)
4. **graph** - Knowledge graphs (5 operations)
5. **organize** - Organization (6 operations)
6. **import** - Import content (3 types, bulk support)
7. **research** - Research workflows (5 workflows)
8. **ai** - Native DEVONthink AI (3 operations)
9. **system** - System & help (5 operations)

---

## 1. search - Find Documents

Find documents using various search strategies.

### Mode: basic
Basic search across DEVONthink databases.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| mode | string | Yes | - | Must be "basic" |
| query | string | Yes | - | Search query. Supports boolean (AND/OR/NOT), wildcards (*), exact phrases ("..."), field filters (kind:PDF, tag:research, created:2023) |
| database | string | No | all | Database name (case-sensitive) |
| limit | number | No | 100 | Maximum results (Desktop: 10 max, Code: 100 max) |
| searchScope | string | No | all | Search scope: "content", "name", "comment", "all" |

**Example**:
```json
{
  "mode": "basic",
  "query": "quantum physics",
  "limit": 10
}
```

### Mode: advanced
Advanced search with full DEVONthink syntax and filtering.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| mode | string | Yes | - | Must be "advanced" |
| query | string | Yes | - | Advanced query with operators |
| database | string | No | all | Database name |
| searchIn | string | No | all | Search scope: "all", "selected", "current" |
| searchScope | string | No | all | Field scope: "content", "name", "comment", "all" |
| sortBy | string | No | relevance | Sort: "relevance", "date", "name", "size" |
| limit | number | No | 100 | Maximum results |

**Example**:
```json
{
  "mode": "advanced",
  "query": "tag:research AND created:>2023",
  "sortBy": "date",
  "limit": 50
}
```

### Mode: batch
Execute multiple searches simultaneously.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| mode | string | Yes | - | Must be "batch" |
| query | string[] | Yes | - | Array of search queries |
| database | string | No | all | Database to search in |

**Example**:
```json
{
  "mode": "batch",
  "query": ["AI", "ML", "neural networks"]
}
```

### Mode: smart_groups
List all smart groups in DEVONthink.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| mode | string | Yes | - | Must be "smart_groups" |
| database | string | No | all | Database name (lists from all if omitted) |

**Example**:
```json
{
  "mode": "smart_groups",
  "database": "Research"
}
```

---

## 2. document - Manage Documents

Perform document operations.

### Operation: read
Read document content and metadata.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "read" |
| uuid | string | Yes | - | Document UUID (format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX) |
| includeContent | boolean | No | false | Include full document content |

**Example**:
```json
{
  "operation": "read",
  "uuid": "ABC-123-DEF",
  "includeContent": true
}
```

### Operation: create
Create new documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "create" |
| name | string | Yes | - | Document name (without extension) |
| content | string | Yes | - | Document content |
| type | string | No | markdown | Document type: "markdown", "txt", "rtf" |
| database | string | No | Global Inbox | Target database name |
| groupPath | string | No | root | Folder path like "/Research/Papers" |
| tags | string[] | No | [] | Array of tags |

**Example**:
```json
{
  "operation": "create",
  "name": "Meeting Notes",
  "content": "# Notes\n\n...",
  "type": "markdown",
  "tags": ["meeting", "2024"]
}
```

### Operation: update
Update document tags or metadata.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "update" |
| uuid | string | Yes | - | Document UUID |
| tags | string[] | Yes | - | New tags (replaces existing) |

**Example**:
```json
{
  "operation": "update",
  "uuid": "ABC-123",
  "tags": ["important", "reviewed"]
}
```

### Operation: delete
Delete a document.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "delete" |
| uuid | string | Yes | - | Document UUID |
| confirmDelete | boolean | No | true | Require confirmation |

**Example**:
```json
{
  "operation": "delete",
  "uuid": "ABC-123",
  "confirmDelete": true
}
```

### Operation: ocr
Perform OCR on PDF or image documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "ocr" |
| uuid | string | Yes | - | Document UUID |

**Example**:
```json
{
  "operation": "ocr",
  "uuid": "ABC-123"
}
```

### Operation: batch_read
Read multiple documents simultaneously.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "batch_read" |
| uuid | string[] | Yes | - | Array of document UUIDs |
| includeContent | boolean | No | false | Include full content |

**Example**:
```json
{
  "operation": "batch_read",
  "uuid": ["ABC-123", "DEF-456"],
  "includeContent": false
}
```

---

## 3. analyze - Analysis & Synthesis

Analyze and synthesize document content.

### Operation: analyze
Analyze document complexity and readability.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "analyze" |
| uuid | string | Yes | - | Document UUID to analyze |

**Example**:
```json
{
  "operation": "analyze",
  "uuid": "ABC-123"
}
```

### Operation: similarity
Compare multiple documents for similarity.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "similarity" |
| documentUuids | string[] | Yes | - | Array of UUIDs (min: 2, recommended max: 20) |

**Example**:
```json
{
  "operation": "similarity",
  "documentUuids": ["ABC-123", "DEF-456", "GHI-789"]
}
```

### Operation: synthesize
Synthesize insights from multiple documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "synthesize" |
| documentUuids | string[] | Yes | - | Array of document UUIDs (recommended: 2-15) |
| synthesisType | string | No | summary | Type: "summary", "consensus", "insights" |

**Example**:
```json
{
  "operation": "synthesize",
  "documentUuids": ["ABC-123", "DEF-456"],
  "synthesisType": "consensus"
}
```

### Operation: themes
Extract themes from document collection.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "themes" |
| documentUuids | string[] | Yes | - | Array of document UUIDs |

**Example**:
```json
{
  "operation": "themes",
  "documentUuids": ["ABC-123", "DEF-456", "GHI-789"]
}
```

### Operation: summary
Create multi-level summaries.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "summary" |
| documentUuids | string[] | Yes | - | Array of document UUIDs |
| summaryLevel | string | No | brief | Level: "brief", "detailed", "full" |

**Example**:
```json
{
  "operation": "summary",
  "documentUuids": ["ABC-123"],
  "summaryLevel": "detailed"
}
```

### Operation: compare
Compare two documents in detail.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "compare" |
| uuid1 | string | Yes | - | First document UUID |
| uuid2 | string | Yes | - | Second document UUID |

**Example**:
```json
{
  "operation": "compare",
  "uuid1": "ABC-123",
  "uuid2": "DEF-456"
}
```

---

## 4. graph - Knowledge Graphs

Build and explore knowledge graphs.

### Operation: build
Build a knowledge graph from a document.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "build" |
| uuid | string | Yes | - | Starting document UUID |
| maxDepth | number | No | 3 | Traversal depth (1-5, recommended: 3) |

**Example**:
```json
{
  "operation": "build",
  "uuid": "ABC-123",
  "maxDepth": 3
}
```

### Operation: path
Find connection path between two documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "path" |
| uuid | string | Yes | - | Starting document UUID |
| targetUuid | string | Yes | - | Target document UUID |
| maxDepth | number | No | 3 | Maximum path depth |

**Example**:
```json
{
  "operation": "path",
  "uuid": "START-UUID",
  "targetUuid": "END-UUID"
}
```

### Operation: clusters
Detect clusters of related documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "clusters" |
| searchQuery | string | Yes | - | Base search query |
| minClusterSize | number | No | 3 | Minimum cluster size |
| maxDepth | number | No | 3 | Analysis depth |

**Example**:
```json
{
  "operation": "clusters",
  "searchQuery": "AI research",
  "minClusterSize": 3
}
```

### Operation: connections
Find all connections from a document.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "connections" |
| uuid | string | Yes | - | Document UUID |
| maxResults | number | No | 10 | Maximum connections |

**Example**:
```json
{
  "operation": "connections",
  "uuid": "ABC-123",
  "maxResults": 15
}
```

### Operation: timeline
Create chronological timeline from documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "timeline" |
| documentUuids | string[] | Yes | - | Array of document UUIDs |

**Example**:
```json
{
  "operation": "timeline",
  "documentUuids": ["ABC-123", "DEF-456", "GHI-789"]
}
```

---

## 5. organize - Organization

Organize documents and create structure.

### Operation: create_group
Create new group (folder) in DEVONthink.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "create_group" |
| name | string | Yes | - | Group name or path (supports nested: "Parent/Child") |
| path | string | No | root | Parent path |
| database | string | No | first available | Target database |
| description | string | No | "" | Group description |

**Example**:
```json
{
  "operation": "create_group",
  "name": "Project X",
  "path": "/Research"
}
```

### Operation: create_collection
Create a document collection.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "create_collection" |
| name | string | Yes | - | Collection name |
| description | string | No | "" | Collection description |
| database | string | No | first available | Target database |

**Example**:
```json
{
  "operation": "create_collection",
  "name": "Reading List",
  "description": "Papers to read"
}
```

### Operation: move
Move document to different group.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "move" |
| uuid | string | Yes | - | Document UUID |
| targetGroup | string | Yes | - | Target group path |
| database | string | No | current | Target database |

**Example**:
```json
{
  "operation": "move",
  "uuid": "ABC-123",
  "targetGroup": "/Research/Completed"
}
```

### Operation: bulk_tag
Apply tags to multiple documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "bulk_tag" |
| documentUuids | string[] | Yes | - | Array of document UUIDs |
| tags | string[] | Yes | - | Tags to apply |
| tagAction | string | No | add | Action: "add", "replace", "remove" |

**Example**:
```json
{
  "operation": "bulk_tag",
  "documentUuids": ["ABC-123", "DEF-456"],
  "tags": ["project-x", "reviewed"],
  "tagAction": "add"
}
```

### Operation: auto_organize
Automatically organize documents by type/metadata.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "auto_organize" |
| documentUuids | string[] | Yes | - | Array of document UUIDs |
| organizationMode | string | No | type | Mode: "type", "date", "size", "content" |
| useAI | boolean | No | true | Use DEVONthink AI for categorization |

**Example**:
```json
{
  "operation": "auto_organize",
  "organizationMode": "type"
}
```

### Operation: folder_structure
Create comprehensive folder structure.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "folder_structure" |
| projectName | string | Yes | - | Project name (root folder) |
| structure | object | No | - | Custom folder structure definition |
| database | string | No | first available | Target database |

**Example**:
```json
{
  "operation": "folder_structure",
  "projectName": "Research Project",
  "structure": {
    "Papers": {},
    "Notes": {},
    "Data": {
      "Raw": {},
      "Processed": {}
    }
  }
}
```

---

## 6. import - Import Content

Import content from various sources.

### Type: url
Import single URL or batch of URLs.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | - | Must be "url" |
| source | string or string[] | Yes | - | Single URL or array of URLs |
| targetGroup | string | No | root | Target group path |
| tags | string[] | No | [] | Tags to apply |
| maxConcurrent | number | No | 5 | Max concurrent imports (for batch, max: 10) |
| extractMetadata | boolean | No | true | Extract metadata |

**Example (single)**:
```json
{
  "type": "url",
  "source": "https://example.com/article",
  "targetGroup": "/Research/Articles"
}
```

**Example (batch)**:
```json
{
  "type": "url",
  "source": ["https://url1.com", "https://url2.com"],
  "maxConcurrent": 3,
  "tags": ["imported", "2024"]
}
```

### Type: paper
Download academic paper with metadata.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | - | Must be "paper" |
| source | string or array | Yes | - | Paper identifier(s) |
| paperSource | string | Yes | - | Source: "arxiv", "doi", "pubmed" |
| targetGroup | string | No | root | Target group path |
| extractMetadata | boolean | No | true | Extract bibliographic metadata |

**Example (single)**:
```json
{
  "type": "paper",
  "source": "2301.00001",
  "paperSource": "arxiv"
}
```

**Example (batch)**:
```json
{
  "type": "paper",
  "source": ["2301.00001", "2301.00002"],
  "paperSource": "arxiv",
  "targetGroup": "/Research/Papers"
}
```

### Type: batch
Import mixed content types.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | Yes | - | Must be "batch" |
| items | object[] | Yes | - | Array of import items with type and source |
| targetGroup | string | No | root | Default target group |
| maxConcurrent | number | No | 5 | Max concurrent operations |

**Example**:
```json
{
  "type": "batch",
  "items": [
    {"type": "url", "source": "https://example.com"},
    {"type": "paper", "source": "2301.00001", "paperSource": "arxiv"}
  ],
  "maxConcurrent": 3
}
```

---

## 7. research - Research Workflows

Automated research workflows.

### Workflow: explore
Explore a research topic.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| workflow | string | Yes | - | Must be "explore" |
| query | string | Yes | - | Research topic or query |
| maxResults | number | No | 50 | Maximum documents to process |

**Example**:
```json
{
  "workflow": "explore",
  "query": "quantum computing"
}
```

### Workflow: organize
Organize search results by relevance.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| workflow | string | Yes | - | Must be "organize" |
| query | string | Yes | - | Search query |
| maxResults | number | No | 50 | Maximum results |

**Example**:
```json
{
  "workflow": "organize",
  "query": "machine learning ethics"
}
```

### Workflow: track_evolution
Track topic evolution over time.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| workflow | string | Yes | - | Must be "track_evolution" |
| query | string | Yes | - | Topic to track |
| timeRange | string | No | month | Range: "week", "month", "year", "all" |

**Example**:
```json
{
  "workflow": "track_evolution",
  "query": "artificial intelligence",
  "timeRange": "year"
}
```

### Workflow: trends
Identify trending topics.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| workflow | string | Yes | - | Must be "trends" |
| database | string | No | all | Database to analyze |

**Example**:
```json
{
  "workflow": "trends"
}
```

### Workflow: create_project
Create comprehensive research project.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| workflow | string | Yes | - | Must be "create_project" |
| projectName | string | Yes | - | Project name |
| query | string | No | - | Initial search query |
| description | string | No | "" | Project description |

**Example**:
```json
{
  "workflow": "create_project",
  "projectName": "AI Research",
  "query": "artificial intelligence ethics"
}
```

---

## 8. ai - Native DEVONthink AI

Use DEVONthink's built-in AI capabilities.

### Operation: classify
Classify document using DEVONthink AI.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "classify" |
| uuid | string | Yes | - | Document UUID |

**Example**:
```json
{
  "operation": "classify",
  "uuid": "ABC-123"
}
```

### Operation: similar
Find similar documents using AI.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "similar" |
| uuid | string | Yes | - | Source document UUID |
| limit | number | No | 10 | Maximum similar documents |

**Example**:
```json
{
  "operation": "similar",
  "uuid": "ABC-123",
  "limit": 10
}
```

### Operation: related
Get AI-suggested related documents.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "related" |
| uuid | string | Yes | - | Document UUID |
| limit | number | No | 10 | Maximum results |

**Example**:
```json
{
  "operation": "related",
  "uuid": "ABC-123",
  "limit": 15
}
```

---

## 9. system - System & Help

System operations and help.

### Operation: databases
List all open DEVONthink databases.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "databases" |

**Example**:
```json
{
  "operation": "databases"
}
```

### Operation: monitor
Monitor active operations.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "monitor" |
| includeSystem | boolean | No | true | Include system resources |
| includeQueue | boolean | No | true | Include operation queue |

**Example**:
```json
{
  "operation": "monitor",
  "includeSystem": true
}
```

### Operation: performance
Get performance metrics.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "performance" |

**Example**:
```json
{
  "operation": "performance"
}
```

### Operation: reset
Reset connection state.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "reset" |

**Example**:
```json
{
  "operation": "reset"
}
```

### Operation: help
Get tool help and examples.

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| operation | string | Yes | - | Must be "help" |
| toolName | string | No | - | Tool name (omit to list all) |
| includeExamples | boolean | No | false | Include usage examples |

**Example**:
```json
{
  "operation": "help",
  "toolName": "search",
  "includeExamples": true
}
```

---

## Common Patterns

### Literature Review Workflow
```json
// 1. Search for relevant documents
{"mode": "advanced", "query": "topic AND peer-reviewed"}

// 2. Read documents
{"operation": "batch_read", "uuid": [...]}

// 3. Extract themes
{"operation": "themes", "documentUuids": [...]}

// 4. Synthesize findings
{"operation": "synthesize", "documentUuids": [...], "synthesisType": "consensus"}
```

### Research Project Setup
```json
// 1. Create project
{"workflow": "create_project", "projectName": "My Research"}

// 2. Import papers
{"type": "paper", "source": ["id1", "id2"], "paperSource": "arxiv"}

// 3. Auto-organize
{"operation": "auto_organize", "organizationMode": "type"}
```

### Knowledge Exploration
```json
// 1. Build graph
{"operation": "build", "uuid": "seed-doc", "maxDepth": 3}

// 2. Find clusters
{"operation": "clusters", "searchQuery": "related-topic"}

// 3. Classify new documents
{"operation": "classify", "uuid": "new-doc"}
```

---

## Client-Aware Response Limits

The server automatically adjusts responses based on the client:

| Client | Max Results | Max Response Size | Notes |
|--------|-------------|-------------------|-------|
| Claude Desktop | 10 | 25 KB | Optimized for conversation |
| Claude Code | 100 | 500 KB | Supports larger datasets |
| MCP Inspector | 100 | 500 KB | Full debugging capability |

Responses exceeding limits are automatically truncated with metadata preserved.

---

## Error Handling

All tools return consistent error format:

```json
{
  "error": "Error message",
  "details": {
    "tool": "tool_name",
    "operation": "operation_name",
    "timestamp": "2025-12-13T10:30:00Z",
    "context": {
      "parameter": "value",
      "reason": "specific error reason"
    }
  }
}
```

---

## Performance Notes

### Optimized Operations

- **synthesize**: Uses intelligent sampling (200 words/doc), 30x+ faster
- **similarity**: Optimized word selection (100 words/doc), sub-second analysis
- **batch imports**: Concurrent processing with configurable limits
- **graph operations**: Iterative BFS (not recursive), handles large graphs

### Best Practices

1. **Batch Operations**: Use batch modes for multiple items (faster than sequential)
2. **Content Inclusion**: Only request `includeContent: true` when needed
3. **Result Limits**: Request appropriate limits for your use case
4. **Concurrent Imports**: Use `maxConcurrent` to control system load
5. **Search Scope**: Use specific scopes ("content", "name") for faster searches

---

## Migration from v2.x (49 tools)

| v2.x Tool | v3.0 Equivalent |
|-----------|-----------------|
| search_devonthink | search {mode: "basic"} |
| advanced_search | search {mode: "advanced"} |
| batch_search | search {mode: "batch"} |
| list_smart_groups | search {mode: "smart_groups"} |
| read_document | document {operation: "read"} |
| create_document | document {operation: "create"} |
| update_tags | document {operation: "update"} |
| ocr_document | document {operation: "ocr"} |
| batch_read_documents | document {operation: "batch_read"} |
| analyze_document | analyze {operation: "analyze"} |
| analyze_document_similarity | analyze {operation: "similarity"} |
| synthesize_documents | analyze {operation: "synthesize"} |
| extract_themes | analyze {operation: "themes"} |
| create_multi_level_summary | analyze {operation: "summary"} |
| compare_documents | analyze {operation: "compare"} |
| build_knowledge_graph | graph {operation: "build"} |
| find_shortest_path | graph {operation: "path"} |
| detect_knowledge_clusters | graph {operation: "clusters"} |
| find_connections | graph {operation: "connections"} |
| create_knowledge_timeline | graph {operation: "timeline"} |
| create_group | organize {operation: "create_group"} |
| create_collection | organize {operation: "create_collection"} |
| move_to_group | organize {operation: "move"} |
| bulk_tag | organize {operation: "bulk_tag"} |
| auto_organize_by_type | organize {operation: "auto_organize"} |
| create_folder_structure | organize {operation: "folder_structure"} |
| import_url | import {type: "url"} |
| download_paper | import {type: "paper"} |
| bulk_import_urls | import {type: "url", source: [...]} |
| bulk_download_papers | import {type: "paper", source: [...]} |
| batch_import | import {type: "batch"} |
| automate_research | research {workflow: "explore"} |
| organize_findings | research {workflow: "organize"} |
| track_topic_evolution | research {workflow: "track_evolution"} |
| identify_trends | research {workflow: "trends"} |
| create_research_project | research {workflow: "create_project"} |
| classify_document | ai {operation: "classify"} |
| get_similar_documents | ai {operation: "similar"} |
| get_related_documents | ai {operation: "related"} |
| list_databases | system {operation: "databases"} |
| monitor_operations | system {operation: "monitor"} |
| get_performance_report | system {operation: "performance"} |
| reset_connection_state | system {operation: "reset"} |
| get_tool_help | system {operation: "help"} |

---

**Status**: Production Ready
**Version**: 3.0.0
**Last Updated**: December 13, 2025
**Next Review**: Q1 2026