# DEVONthink MCP Server - Parameter Examples

This document shows correct JSON parameter formatting for all MCP tools.

## Important: JSON Syntax Rules

1. **Always use double quotes** for property names and string values
2. **Never use backticks** (`) or single quotes (')
3. **Boolean values** are `true` or `false` (lowercase, no quotes)
4. **Numbers** don't need quotes
5. **Arrays** use square brackets `[]`

## Common Syntax Errors

### ❌ WRONG - Using backticks:
```
{
  `uuid`: `93FA2969-A1C2-4982-B7E9-379B27AEAC3E`
}
```

### ❌ WRONG - Using single quotes:
```
{
  'uuid': '93FA2969-A1C2-4982-B7E9-379B27AEAC3E'
}
```

### ✅ CORRECT - Using double quotes:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E"
}
```

## Tool Parameter Examples

### list_databases
No parameters required:
```
{}
```

### search_devonthink
Basic search:
```
{
  "query": "machine learning"
}
```

Search in specific database:
```
{
  "query": "kind:PDF created:2023",
  "database": "Research"
}
```

### read_document
Read metadata only:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "includeContent": false
}
```

Read with full content:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "includeContent": true
}
```

### create_document
Create markdown document:
```
{
  "name": "Meeting Notes 2024-01-15",
  "content": "# Team Meeting\n\n## Attendees\n- Alice\n- Bob\n\n## Topics\n1. Project status\n2. Next steps",
  "type": "markdown",
  "database": "Work",
  "tags": ["meetings", "project-x", "2024"]
}
```

Create plain text:
```
{
  "name": "Quick Note",
  "content": "Remember to review the proposal by Friday",
  "type": "txt"
}
```

### update_tags
Add tags to document:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "tags": ["important", "review", "ai-research"]
}
```

### build_knowledge_graph
Basic graph (default depth 3):
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E"
}
```

Deeper graph exploration:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "maxDepth": 5
}
```

### find_shortest_path
Find path between documents:
```
{
  "fromUuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "toUuid": "A7B8C9D0-E1F2-4567-8901-234567890ABC"
}
```

### synthesize_documents
Synthesize multiple documents:
```
{
  "uuids": [
    "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
    "A7B8C9D0-E1F2-4567-8901-234567890ABC",
    "B8C9D0E1-F234-5678-9012-345678901BCD"
  ],
  "synthesisType": "consensus"
}
```

### analyze_document
Analyze document complexity:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E"
}
```

### track_topic_evolution
Track topic over time:
```
{
  "topic": "artificial intelligence",
  "startDate": "2020-01-01",
  "endDate": "2024-01-01"
}
```

### create_smart_group
Create dynamic collection:
```
{
  "name": "Recent AI Papers",
  "searchQuery": "kind:PDF tag:ai-research created:<=30days",
  "database": "Research"
}
```

### get_related_documents
Get AI-suggested related documents:
```
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "limit": 10
}
```

### batch_read_documents
Read multiple documents:
```
{
  "uuids": [
    "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
    "A7B8C9D0-E1F2-4567-8901-234567890ABC"
  ],
  "includeContent": false
}
```

## Tips for Claude Users

1. When Claude suggests using a tool, the parameters will be properly formatted
2. If you're manually calling tools, copy the examples above exactly
3. UUID values come from DEVONthink - you can get them from search results or document metadata
4. Database names must match exactly (case-sensitive) with your DEVONthink database names
5. Dates use ISO format: "YYYY-MM-DD"

## Common Mistakes to Avoid

1. **Don't mix quote types** - Use only double quotes
2. **Don't forget commas** between properties
3. **Don't add trailing commas** after the last property
4. **Boolean values** are not strings - use `true` not `"true"`
5. **Arrays need brackets** even for single items: `["tag1"]` not `"tag1"`