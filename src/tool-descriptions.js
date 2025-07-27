/**
 * Enhanced tool descriptions for AI clients using the MCP server.
 * These descriptions are designed to help AI systems understand:
 * 1. When to use each tool
 * 2. Common parameter patterns
 * 3. Expected outputs
 * 4. Error scenarios
 */

export const toolDescriptions = {
  // Core Operations (8 tools)
  search_devonthink: {
    brief: 'Search documents in DEVONthink databases',
    detailed: `Search DEVONthink using its query syntax. Returns document metadata.
    
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
    brief: 'Synthesize insights from multiple documents (performance-optimized)',
    detailed: `Combine multiple documents into unified insights using various synthesis methods.
    
    WHEN TO USE:
    - Summarizing research findings
    - Finding consensus across sources
    - Extracting key insights
    - Creating literature reviews
    
    SYNTHESIS TYPES:
    - summary: Unified summary of all documents
    - consensus: Points of agreement across documents
    - insights: Key insights and patterns
    
    PERFORMANCE:
    - Uses optimized sampling (200 words/doc) for speed
    - Automatically falls back to full analysis if needed
    - <1 second for most operations (vs 30+ seconds previously)
    
    OPTIMAL DOCUMENT COUNT: 2-15 documents
    MAXIMUM RECOMMENDED: 50 documents
    
    RETURNS: Synthesis object with common themes and synthesis text
    ERRORS: Documents not found, invalid synthesis type`,
    
    parameterHelp: {
      documentUUIDs: 'Array of document UUIDs to synthesize',
      synthesisType: 'Type of synthesis: "summary", "consensus", or "insights" (default: summary)'
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
  },

  // Additional Core Operations
  update_tags: {
    brief: 'Update tags for a DEVONthink document',
    detailed: `Update or replace the tags for a specific document.
    
    WHEN TO USE:
    - Organizing documents with tags
    - Batch tagging operations
    - Updating document metadata
    
    COMMON PATTERNS:
    - Add tags: {"uuid": "...", "tags": ["new-tag1", "new-tag2"]}
    - Replace all tags: {"uuid": "...", "tags": ["only-these-tags"]}
    - Clear tags: {"uuid": "...", "tags": []}
    
    RETURNS: Updated document object with new tags
    ERRORS: Document not found, invalid UUID`,
    
    parameterHelp: {
      uuid: 'Document UUID to update',
      tags: 'Array of tag strings. Replaces all existing tags.'
    }
  },

  get_related_documents: {
    brief: 'Get AI-suggested related documents',
    detailed: `Find documents related to a specific document using DEVONthink's AI.
    
    WHEN TO USE:
    - Discovering related content
    - Expanding research topics
    - Finding similar documents
    
    RETURNS: Array of related documents sorted by relevance
    ERRORS: Document not found, AI not available`,
    
    parameterHelp: {
      uuid: 'Document UUID to find relations for',
      limit: 'Maximum number of related documents. Default: 10'
    }
  },

  create_smart_group: {
    brief: 'Create a smart group with search criteria',
    detailed: `Create a dynamic smart group that auto-updates based on search criteria.
    
    WHEN TO USE:
    - Creating dynamic collections
    - Organizing research by criteria
    - Monitoring new documents matching criteria
    
    COMMON PATTERNS:
    - Topic group: {"name": "AI Papers", "searchQuery": "kind:PDF tag:ai"}
    - Recent items: {"name": "This Week", "searchQuery": "created:<=7days"}
    
    RETURNS: Created smart group object
    ERRORS: Invalid search query, database not found`,
    
    parameterHelp: {
      name: 'Smart group name',
      searchQuery: 'DEVONthink search predicate',
      database: 'Target database name. Default: first available'
    }
  },

  ocr_document: {
    brief: 'Perform OCR on PDF or image documents',
    detailed: `Extract text from scanned PDFs or images using OCR.
    
    WHEN TO USE:
    - Processing scanned documents
    - Making PDFs searchable
    - Extracting text from images
    
    NOTE: OCR may take time for large documents
    
    RETURNS: OCR status and extracted text preview
    ERRORS: Document not PDF/image, OCR failed`,
    
    parameterHelp: {
      uuid: 'Document UUID to OCR'
    }
  },

  // Batch Operations
  batch_search: {
    brief: 'Search for multiple queries simultaneously',
    detailed: `Execute multiple searches in parallel for efficiency.
    
    WHEN TO USE:
    - Searching for multiple topics
    - Comparing search results
    - Building comprehensive result sets
    
    COMMON PATTERNS:
    - Multiple topics: {"queries": ["topic1", "topic2", "topic3"]}
    - Different criteria: {"queries": ["kind:PDF", "tag:important", "created:2023"]}
    
    RETURNS: Object mapping queries to their results
    ERRORS: Invalid queries, database errors`,
    
    parameterHelp: {
      queries: 'Array of search query strings',
      database: 'Optional database to search in'
    }
  },

  batch_read_documents: {
    brief: 'Read multiple documents simultaneously',
    detailed: `Retrieve multiple documents in parallel for performance.
    
    WHEN TO USE:
    - Processing multiple documents
    - Bulk operations
    - Comparative analysis
    
    RETURNS: Array of document objects
    ERRORS: Documents not found, timeout`,
    
    parameterHelp: {
      uuids: 'Array of document UUIDs',
      includeContent: 'Include full content. Default: false'
    }
  },

  // Advanced Features
  find_connections: {
    brief: 'Find all connections from a document',
    detailed: `Discover all types of connections from a document.
    
    WHEN TO USE:
    - Exploring document relationships
    - Finding references
    - Understanding document context
    
    CONNECTION TYPES:
    - AI-based similarities
    - Explicit references
    - Shared tags
    - Same group/location
    
    RETURNS: Array of connections with type and strength
    ERRORS: Document not found`,
    
    parameterHelp: {
      uuid: 'Document UUID to find connections from',
      maxResults: 'Maximum connections to return. Default: 10'
    }
  },

  compare_documents: {
    brief: 'Compare two documents for similarity',
    detailed: `Detailed comparison of two documents.
    
    WHEN TO USE:
    - Finding duplicate content
    - Comparing versions
    - Analyzing similarity
    
    COMPARISON METRICS:
    - Tag overlap
    - Word count difference
    - Content similarity (if available)
    
    RETURNS: Comparison object with metrics
    ERRORS: Documents not found`,
    
    parameterHelp: {
      uuid1: 'First document UUID',
      uuid2: 'Second document UUID'
    }
  },

  create_collection: {
    brief: 'Create a new document collection',
    detailed: `Create a collection for organizing related documents.
    
    WHEN TO USE:
    - Starting research projects
    - Grouping related documents
    - Creating reading lists
    
    RETURNS: Created collection object
    ERRORS: Database not found`,
    
    parameterHelp: {
      name: 'Collection name',
      description: 'Collection description',
      database: 'Target database. Default: first available'
    }
  },

  add_to_collection: {
    brief: 'Add document to collection',
    detailed: `Add a document to an existing collection.
    
    WHEN TO USE:
    - Building research collections
    - Organizing findings
    - Creating curated lists
    
    RETURNS: Success status
    ERRORS: Collection or document not found`,
    
    parameterHelp: {
      collectionUUID: 'Collection UUID',
      documentUUID: 'Document UUID to add',
      notes: 'Optional notes about why added'
    }
  },

  // Phase 2: Research Automation (continued)
  detect_knowledge_clusters: {
    brief: 'Detect clusters of related documents',
    detailed: `Find groups of related documents using clustering algorithms.
    
    WHEN TO USE:
    - Discovering topic clusters
    - Finding document groups
    - Understanding knowledge structure
    
    ALGORITHM: Tag-based and connection clustering
    
    RETURNS: Clusters with documents and common themes
    ERRORS: Insufficient documents, no clusters found`,
    
    parameterHelp: {
      searchQuery: 'Base search query for documents',
      maxDocuments: 'Max documents to analyze. Default: 50',
      minClusterSize: 'Minimum cluster size. Default: 3'
    }
  },

  organize_findings: {
    brief: 'Organize search results by relevance',
    detailed: `Sort and organize search results using relevance scoring.
    
    WHEN TO USE:
    - Prioritizing search results
    - Finding most relevant documents
    - Research organization
    
    RETURNS: Organized results with relevance scores
    ERRORS: Search failed, no results`,
    
    parameterHelp: {
      searchQuery: 'Search query',
      maxResults: 'Maximum results to return. Default: 50'
    }
  },

  // Phase 3: Document Intelligence (continued)
  analyze_document_similarity: {
    brief: 'Compare multiple documents for similarity (performance-optimized)',
    detailed: `Analyze similarity across multiple documents using optimized content sampling.
    
    WHEN TO USE:
    - Finding similar documents
    - Detecting duplicates
    - Grouping by similarity
    - Comparing research papers
    
    PERFORMANCE:
    - Uses optimized sampling (100 words/doc) for speed
    - <1 second for most operations (vs 2+ minutes previously)
    - Maintains accuracy through intelligent word selection
    
    METRICS:
    - Jaccard similarity (word overlap)
    - Tag overlap percentage
    - Content similarity score
    - Metadata comparison
    
    RETURNS: Similarity matrix with scores and detailed analysis
    ERRORS: Insufficient documents (minimum 2 required)`,
    
    parameterHelp: {
      uuids: 'Array of document UUIDs to compare (minimum 2, maximum recommended: 20)'
    }
  },

  // Phase 4: Knowledge Synthesis (continued)
  extract_themes: {
    brief: 'Extract themes from document collection',
    detailed: `Identify common themes and topics across documents.
    
    WHEN TO USE:
    - Understanding document collections
    - Finding common topics
    - Theme analysis
    
    RETURNS: Array of themes with relevance scores
    ERRORS: No themes found, insufficient content`,
    
    parameterHelp: {
      documentUUIDs: 'Array of document UUIDs to analyze'
    }
  },

  create_multi_level_summary: {
    brief: 'Create summaries at different detail levels',
    detailed: `Generate summaries with varying levels of detail.
    
    WHEN TO USE:
    - Creating executive summaries
    - Different audience needs
    - Progressive disclosure
    
    SUMMARY LEVELS:
    - brief: 1-2 paragraphs
    - detailed: Full page summary
    - full: Comprehensive summary
    
    RETURNS: Summary object with all levels
    ERRORS: Documents not found`,
    
    parameterHelp: {
      documentUUIDs: 'Array of document UUIDs',
      summaryLevel: 'Level: "brief", "detailed", or "full"'
    }
  },

  create_knowledge_timeline: {
    brief: 'Create chronological timeline from documents',
    detailed: `Build a timeline showing knowledge evolution.
    
    WHEN TO USE:
    - Historical analysis
    - Progress tracking
    - Evolution visualization
    
    RETURNS: Timeline with events and documents
    ERRORS: No dated documents`,
    
    parameterHelp: {
      documentUUIDs: 'Array of document UUIDs'
    }
  },

  identify_trends: {
    brief: 'Identify trending topics in recent documents',
    detailed: `Find trending topics based on recent document activity.
    
    WHEN TO USE:
    - Spotting emerging topics
    - Trend analysis
    - Current awareness
    
    RETURNS: Trending topics with growth metrics
    ERRORS: Insufficient recent documents`,
    
    parameterHelp: {
      databaseName: 'Optional specific database to analyze'
    }
  },

  // Advanced Search & Organization (2 tools)
  advanced_search: {
    brief: 'Advanced search with full DEVONthink syntax and operators',
    detailed: `Perform advanced search with DEVONthink's complete syntax including Boolean operators, field searches, wildcards, and filtering options.
    
    WHEN TO USE:
    - Complex queries requiring multiple operators
    - Field-specific searches (name:, tag:, comment:, etc.)
    - Advanced filtering by scope, sorting, result limits
    - Precision searches with exact phrases or fuzzy matching
    
    SUPPORTED OPERATORS:
    - Boolean: AND, OR, NOT
    - Field searches: name:term, tag:term, comment:term, kind:pdf
    - Date queries: date:YYYY-MM-DD, created:>=2023
    - Wildcards: term*, *term, *term*
    - Fuzzy search: ~term
    - Exact phrases: "exact phrase"
    
    SEARCH SCOPES:
    - content: Search document content only
    - name: Search document names only
    - comment: Search comments only
    - all: Search all fields
    
    SORT OPTIONS:
    - relevance: DEVONthink relevance scoring
    - date: Newest first
    - name: Alphabetical
    - size: Largest first
    
    RETURNS: Comprehensive search results with metadata and analysis
    ERRORS: Invalid syntax, unsupported operators`,
    
    parameterHelp: {
      query: 'Advanced search query with operators: AND/OR/NOT, name:, tag:, comment:, kind:, date:, wildcards (*), fuzzy (~), "exact phrases"',
      database: 'Specific database name (optional)',
      searchIn: 'Search scope: "all", "selected", or "current" documents',
      maxResults: 'Maximum results to return (default: 100)',
      sortBy: 'Sort by: "relevance", "date", "name", or "size"',
      searchScope: 'Field scope: "content", "name", "comment", or "all"'
    }
  },

  list_smart_groups: {
    brief: 'List all smart groups in DEVONthink databases',
    detailed: `Access DEVONthink's smart groups, which are dynamic collections that automatically organize documents based on search criteria.
    
    WHEN TO USE:
    - Exploring existing organizational structures
    - Understanding automated document groupings
    - Finding dynamic collections for specific topics
    - Accessing pre-configured document filters
    
    SMART GROUP FEATURES:
    - Automatically update based on criteria
    - Dynamic membership as documents change
    - Searchable and filterable results
    - Database-specific or cross-database collections
    
    COMMON PATTERNS:
    - All smart groups: {}
    - Database-specific: {"database": "Research"}
    
    RETURNS: Array of smart groups with names, criteria, document counts
    ERRORS: Database not found, access denied`,
    
    parameterHelp: {
      database: 'Specific database name to list smart groups from (optional, lists from all databases if not provided)'
    }
  },

  // Native AI Tools (2 tools)
  classify_document: {
    brief: 'Use DEVONthink\'s native AI to classify a document',
    detailed: `Leverage DEVONthink 4's built-in AI classification system for document analysis and organizational suggestions.
    
    WHEN TO USE:
    - Getting AI-powered document categorization
    - Finding suggested tags and classifications
    - Understanding document themes using native AI
    - Accessing DEVONthink's trained classification models
    
    NATIVE AI ADVANTAGES:
    - Pre-trained on large document corpus
    - Semantic understanding beyond keyword matching
    - Consistent with DEVONthink's organization paradigms
    - Performance optimized for large collections
    
    RETURNS: AI classification with suggested categories, tags, and themes
    ERRORS: Document not found, AI not available`,
    
    parameterHelp: {
      uuid: 'Document UUID to classify using DEVONthink AI'
    }
  },

  get_similar_documents: {
    brief: 'Find similar documents using DEVONthink\'s native AI',
    detailed: `Use DEVONthink 4's AI to find documents similar to a given document based on semantic content analysis.
    
    WHEN TO USE:
    - Discovering related content
    - Finding documents on similar topics
    - Exploring connections between ideas
    - Building research collections around themes
    
    AI SIMILARITY FEATURES:
    - Semantic understanding beyond keyword matching
    - Content-based relevance scoring
    - Cross-database similarity detection
    - Performance optimized for large collections
    
    RETURNS: Array of similar documents ranked by AI-determined relevance
    ERRORS: Document not found, AI not available`,
    
    parameterHelp: {
      uuid: 'Source document UUID to find similar documents for',
      limit: 'Maximum number of similar documents to return (default: 10)'
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
### Create summary from research papers (optimized)
\`\`\`json
{
  "documentUUIDs": [
    "UUID-1",
    "UUID-2",
    "UUID-3"
  ],
  "synthesisType": "summary"
}
\`\`\`

### Find consensus across sources
\`\`\`json
{
  "documentUUIDs": ["UUID-1", "UUID-2"],
  "synthesisType": "consensus"
}
\`\`\`

### Extract key insights
\`\`\`json
{
  "documentUUIDs": ["UUID-1", "UUID-2", "UUID-3"],
  "synthesisType": "insights"
}
\`\`\``,

  build_knowledge_graph: `
### Build basic knowledge graph
\`\`\`json
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E"
}
\`\`\`

### Deep exploration with max depth
\`\`\`json
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "maxDepth": 5
}
\`\`\``,

  automate_research: `
### Explore new topic
\`\`\`json
{
  "queryOrUUID": "quantum computing algorithms",
  "workflowType": "explore_topic"
}
\`\`\`

### Expand from existing document
\`\`\`json
{
  "queryOrUUID": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "workflowType": "expand_research"
}
\`\`\``,

  batch_search: `
### Search multiple topics
\`\`\`json
{
  "queries": ["machine learning", "neural networks", "deep learning"],
  "database": "Research"
}
\`\`\``,

  create_smart_group: `
### Create AI papers group
\`\`\`json
{
  "name": "AI Research 2024",
  "searchQuery": "kind:PDF tag:ai created:>=2024",
  "database": "Research"
}
\`\`\``,

  advanced_search: `
### Complex Boolean search with field filters
\`\`\`json
{
  "query": "(quantum AND computing) OR (machine AND learning) AND kind:PDF",
  "database": "Research",
  "sortBy": "date",
  "maxResults": 50
}
\`\`\`

### Search by date range and tags
\`\`\`json
{
  "query": "tag:important AND created:>=2023-01-01 AND name:*analysis*",
  "searchScope": "all",
  "sortBy": "relevance"
}
\`\`\``,

  list_smart_groups: `
### List all smart groups
\`\`\`json
{}
\`\`\`

### List smart groups from specific database
\`\`\`json
{
  "database": "Research"
}
\`\`\``,

  classify_document: `
### Classify document using native AI
\`\`\`json
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E"
}
\`\`\``,

  get_similar_documents: `
### Find similar documents
\`\`\`json
{
  "uuid": "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
  "limit": 15
}
\`\`\``,

  get_tool_help: `
### List all available tools
\`\`\`json
{
  "toolName": "list"
}
\`\`\`

### Get detailed help for specific tool
\`\`\`json
{
  "toolName": "search_devonthink",
  "examples": true
}
\`\`\``
};