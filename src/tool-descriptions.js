/**
 * Enhanced tool descriptions for AI clients using the MCP server.
 * These descriptions are designed to help AI systems understand:
 * 1. When to use each tool
 * 2. Common parameter patterns
 * 3. Expected outputs
 * 4. Error scenarios
 */

export const toolDescriptions = {
  // Core Operations
  search_devonthink: {
    brief: 'Search documents in DEVONthink databases',
    detailed: `Search DEVONthink using its powerful query syntax. Returns document metadata.
    
    WHEN TO USE:
    - Finding documents by content, tags, dates, or metadata
    - Exploring topics across your knowledge base
    - Locating specific document types
    
    SEARCH SYNTAX EXAMPLES:
    - Simple: "machine learning"
    - Boolean: "AI AND (ethics OR safety)"
    - By type: "kind:PDF"
    - By date: "created:2023" or "modified:<=7days"
    - By tag: "tag:important"
    - Combined: "neural networks kind:PDF created:>=2023"
    
    COMMON PATTERNS:
    - Broad search: {"query": "topic"}
    - Specific database: {"query": "topic", "database": "Research"}
    - Recent docs: {"query": "modified:<=30days"}
    
    KNOWN LIMITATIONS:
    - Very common words ("the", "a", "and") may cause errors
    - Use more specific terms or search operators
    - Database names must match exactly (case-sensitive)
    
    RETURNS: Array of documents with uuid, name, type, path, tags, dates
    ERRORS: Invalid syntax, database not found, no results`,
    
    parameterHelp: {
      query: 'DEVONthink search query. Supports full syntax: boolean (AND/OR/NOT), wildcards (*), phrases ("exact match"), metadata (kind:, tag:, created:, etc.)',
      database: 'Optional. Exact database name (case-sensitive). Omit to search all open databases.'
    }
  },

  read_document: {
    brief: 'Read document content and metadata from DEVONthink',
    detailed: `Retrieve document metadata and optionally full content. Use UUID from search results.
    
    WHEN TO USE:
    - Getting document details after search
    - Reading full content for analysis
    - Checking document metadata (size, dates, tags)
    
    COMMON PATTERNS:
    - Metadata only: {"uuid": "...", "includeContent": false}
    - Full content: {"uuid": "...", "includeContent": true}
    
    PERFORMANCE NOTE: Large documents may take time when includeContent=true
    
    RETURNS: Document object with all metadata, optionally with content
    ERRORS: Document not found, UUID invalid, access denied`,
    
    parameterHelp: {
      uuid: 'Document UUID from DEVONthink. Get from search results or other tools. Format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      includeContent: 'Boolean. true = include full text content, false = metadata only. Default: false for performance.'
    }
  },

  create_document: {
    brief: 'Create new documents in DEVONthink',
    detailed: `Create text documents with specified content and metadata.
    
    WHEN TO USE:
    - Saving analysis results
    - Creating notes or summaries
    - Storing generated content
    
    DOCUMENT TYPES:
    - markdown: Best for formatted text, supports headers/lists/links
    - txt: Plain text, no formatting
    - rtf: Rich text with basic formatting
    
    COMMON PATTERNS:
    - Note: {"name": "Meeting Notes", "content": "...", "type": "markdown"}
    - Summary: {"name": "Analysis Summary", "content": "...", "tags": ["summary", "ai-generated"]}
    
    RETURNS: Created document object with uuid and metadata
    ERRORS: Invalid type, database not found, permission denied`,
    
    parameterHelp: {
      name: 'Document filename (without extension). Will be sanitized for filesystem.',
      content: 'Document text content. For markdown, use standard markdown syntax.',
      type: 'Document format: "markdown", "txt", or "rtf". Default: "markdown"',
      database: 'Target database name (case-sensitive). Default: Global Inbox',
      groupPath: 'Folder path like "/Research/Papers". Default: database root',
      tags: 'Array of tag strings: ["tag1", "tag2"]. Tags will be created if needed.'
    }
  },

  list_databases: {
    brief: 'List all open DEVONthink databases',
    detailed: `Get information about all currently open databases.
    
    WHEN TO USE:
    - Initial exploration of available databases
    - Checking database names for other operations
    - Understanding database structure
    
    NO PARAMETERS REQUIRED: {}
    
    RETURNS: Array of databases with name, uuid, itemCount, path
    ERRORS: DEVONthink not running, no databases open`,
    
    parameterHelp: {}
  },

  // Knowledge Graph Tools
  build_knowledge_graph: {
    brief: 'Build a knowledge graph from a document',
    detailed: `Create a graph of related documents using AI similarity and references.
    
    WHEN TO USE:
    - Exploring document relationships
    - Finding hidden connections
    - Understanding knowledge structure
    
    ALGORITHM: Iterative breadth-first traversal (not recursive)
    
    DEPTH GUIDANCE:
    - 1-2: Immediate connections only
    - 3: Default, good balance
    - 4-5: Comprehensive but may be slow
    
    COMMON PATTERNS:
    - Basic: {"uuid": "..."}
    - Deep exploration: {"uuid": "...", "maxDepth": 5}
    
    RETURNS: Graph with nodes (documents) and edges (relationships)
    EDGE TYPES: ai_related, reference, replicant
    ERRORS: Document not found, timeout on large graphs`,
    
    parameterHelp: {
      uuid: 'Starting document UUID for graph exploration',
      maxDepth: 'How many relationship levels to explore. Default: 3, Max recommended: 5'
    }
  },

  find_shortest_path: {
    brief: 'Find connection path between two documents',
    detailed: `Discover how two documents are connected through references and relationships.
    
    WHEN TO USE:
    - Understanding connection between concepts
    - Finding intermediate documents
    - Exploring knowledge paths
    
    ALGORITHM: Breadth-first search for optimal path
    
    RETURNS: Array of documents forming the path, or null if no connection
    ERRORS: Document not found, no path exists, timeout`,
    
    parameterHelp: {
      fromUuid: 'Starting document UUID',
      toUuid: 'Target document UUID'
    }
  },

  // Research Automation
  automate_research: {
    brief: 'Automated research workflow for a topic',
    detailed: `Complete research workflow: search, expand, organize, and create collection.
    
    WHEN TO USE:
    - Starting new research on a topic
    - Comprehensive topic exploration
    - Building research collections
    
    WORKFLOW STEPS:
    1. Initial topic search
    2. Expand using AI suggestions
    3. Organize by relevance
    4. Create smart collection
    
    COMMON PATTERNS:
    - New topic: {"topic": "quantum computing", "database": "Research"}
    - Focused: {"topic": "specific protein", "maxResults": 20}
    
    RETURNS: Research summary with documents, collection name, statistics
    ERRORS: No results found, database error, timeout on large topics`,
    
    parameterHelp: {
      topic: 'Research topic or search query',
      database: 'Target database for collection. Default: first available',
      maxResults: 'Maximum documents to process. Default: 50'
    }
  },

  // Document Intelligence
  analyze_document: {
    brief: 'Analyze document complexity and readability',
    detailed: `Perform readability analysis using Flesch Reading Ease and other metrics.
    
    WHEN TO USE:
    - Assessing document complexity
    - Comparing readability across documents
    - Understanding audience level
    
    METRICS PROVIDED:
    - Flesch Reading Ease (0-100, higher = easier)
    - Average sentence length
    - Complex word percentage
    - Estimated reading time
    
    FLESCH SCORE INTERPRETATION:
    - 90-100: Very easy (5th grade)
    - 60-70: Standard (8th-9th grade)
    - 30-50: Difficult (college)
    - 0-30: Very difficult (graduate)
    
    RETURNS: Analysis object with all metrics
    ERRORS: Document not found, not text document`,
    
    parameterHelp: {
      uuid: 'Document UUID to analyze'
    }
  },

  // Knowledge Synthesis
  synthesize_documents: {
    brief: 'Synthesize insights from multiple documents',
    detailed: `Combine multiple documents into unified insights using various synthesis methods.
    
    WHEN TO USE:
    - Summarizing research findings
    - Finding consensus across sources
    - Identifying contradictions
    - Creating literature reviews
    
    SYNTHESIS TYPES:
    - summary: Unified summary of all documents
    - consensus: Points of agreement
    - contradictions: Conflicting information
    - themes: Common themes and patterns
    
    OPTIMAL DOCUMENT COUNT: 3-15 documents
    MAXIMUM RECOMMENDED: 50 documents
    
    RETURNS: Synthesis object with type-specific insights
    ERRORS: Documents not found, too many documents, timeout`,
    
    parameterHelp: {
      uuids: 'Array of document UUIDs to synthesize',
      synthesisType: 'Type of synthesis: "summary", "consensus", "contradictions", or "themes"'
    }
  },

  track_topic_evolution: {
    brief: 'Track how a topic changes over time',
    detailed: `Analyze topic evolution across time periods in your documents.
    
    WHEN TO USE:
    - Understanding topic trends
    - Tracking research evolution
    - Identifying emerging themes
    - Historical analysis
    
    TIME PERIODS: Automatically grouped by year/month based on range
    
    COMMON PATTERNS:
    - Recent evolution: {"topic": "AI", "startDate": "2020-01-01"}
    - Historical: {"topic": "internet", "startDate": "1990-01-01", "endDate": "2010-01-01"}
    
    RETURNS: Timeline with period summaries and key changes
    ERRORS: No documents in range, invalid dates`,
    
    parameterHelp: {
      topic: 'Topic to track (can be simple term or complex query)',
      startDate: 'ISO date format: YYYY-MM-DD',
      endDate: 'ISO date format: YYYY-MM-DD. Default: today'
    }
  }
};

/**
 * Helper function to generate enhanced tool descriptions for AI clients
 */
export function getEnhancedDescription(toolName) {
  const desc = toolDescriptions[toolName];
  if (!desc) return toolName;
  
  return `${desc.brief}

${desc.detailed}`;
}

/**
 * Helper function to generate parameter descriptions with examples
 */
export function getParameterDescriptions(toolName) {
  const desc = toolDescriptions[toolName];
  if (!desc || !desc.parameterHelp) return {};
  
  return desc.parameterHelp;
}

// Example usage patterns for common scenarios
export const exampleUsage = {
  search_devonthink: `
### Find recent PDFs about AI
\`\`\`json
{
  "query": "kind:PDF tag:ai-research created:>=2023",
  "database": "Research"
}
\`\`\`

### Search across all databases
\`\`\`json
{
  "query": "machine learning AND neural networks"
}
\`\`\``,

  read_document: `
### Get document metadata only
\`\`\`json
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "includeContent": false
}
\`\`\`

### Read full document content
\`\`\`json
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "includeContent": true
}
\`\`\``,

  synthesize_documents: `
### Create consensus from research papers
\`\`\`json
{
  "uuids": [
    "UUID-1",
    "UUID-2",
    "UUID-3"
  ],
  "synthesisType": "consensus"
}
\`\`\`

### Find contradictions across sources
\`\`\`json
{
  "uuids": ["UUID-1", "UUID-2"],
  "synthesisType": "contradictions"
}
\`\`\``
};