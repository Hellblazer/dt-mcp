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
      query: 'DEVONthink search query string. Supports full syntax: boolean operators (AND/OR/NOT), wildcards (*), exact phrases ("machine learning"), metadata filters (kind:PDF, tag:important, created:2023). Examples: "AI AND ethics", "quantum computing", "kind:PDF AND tag:research"',
      database: 'Optional database name filter. Must match exact database name (case-sensitive). Examples: "Research", "Archive", "Main Database". Omit to search all open databases. Default: all databases'
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
      uuid: 'Document UUID from DEVONthink. Required format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX (36 characters with hyphens). Example: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890". Obtain from search results or other tools.',
      includeContent: 'Boolean flag for content inclusion. Values: true (include full text content), false (metadata only). Default: false for better performance. Example: true'
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
      documentUUIDs: 'Array of document UUIDs to synthesize. Format: ["UUID1", "UUID2", ...]. Each UUID must be valid format (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX). Minimum: 1 document, Recommended: 2-15 documents, Maximum: 50. Example: ["A1B2C3D4-E5F6-7890-ABCD-EF1234567890", "B2C3D4E5-F6G7-8901-BCDE-F12345678901"]',
      synthesisType: 'Type of synthesis to perform. Options: "summary" (unified overview), "consensus" (points of agreement), "insights" (key patterns and themes). Default: "summary". Example: "consensus"'
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

  // Phase 4: Advanced Research Automation (6 new tools)
  import_url: {
    brief: 'Import content from a single URL into DEVONthink',
    detailed: `Import web content from a URL with automatic content extraction and metadata.
    
    WHEN TO USE:
    - Adding web articles to research collection
    - Importing single web pages or PDFs
    - Building reference collections from online sources
    
    FEATURES:
    - Automatic content extraction and cleaning
    - Metadata preservation (title, author, date)
    - PDF and web page support
    - Automatic tagging and organization
    
    COMMON PATTERNS:
    - Article: {"url": "https://example.com/article", "targetGroup": "/Research/Articles"}
    - PDF: {"url": "https://arxiv.org/pdf/2301.00001.pdf", "tags": ["arxiv", "research"]}
    
    RETURNS: Imported document object with metadata
    ERRORS: URL not accessible, import failed, invalid URL format`,
    
    parameterHelp: {
      url: 'URL to import (web page or PDF)',
      targetGroup: 'Optional group path for organization',
      tags: 'Optional array of tags to apply'
    }
  },

  create_group: {
    brief: 'Create a new group (folder) in DEVONthink',
    detailed: `Create organizational groups for document management.
    
    WHEN TO USE:
    - Setting up research project structure
    - Creating topic-based folders
    - Organizing imported content
    
    FEATURES:
    - Hierarchical group creation
    - Automatic parent creation if needed
    - Cross-database group creation
    
    COMMON PATTERNS:
    - Project folder: {"name": "AI Safety Research", "database": "Research"}
    - Nested structure: {"name": "Deep Learning/Papers/2024", "database": "Archive"}
    
    RETURNS: Created group object with path and metadata
    ERRORS: Database not found, invalid group name`,
    
    parameterHelp: {
      name: 'Group name or path (supports nested: "Parent/Child")',
      database: 'Target database name (optional)',
      description: 'Optional group description'
    }
  },

  download_paper: {
    brief: 'Download academic paper with metadata extraction',
    detailed: `Download academic papers from various sources with automatic metadata extraction.
    
    WHEN TO USE:
    - Building research paper collections
    - Downloading from arXiv, PubMed, academic sites
    - Automated literature collection
    
    SUPPORTED SOURCES:
    - arXiv (arxiv.org)
    - PubMed/PMC
    - IEEE Xplore
    - ACM Digital Library
    - Direct PDF URLs
    
    METADATA EXTRACTION:
    - Title, authors, abstract
    - Publication date and venue
    - DOI and citation information
    - Automatic tagging by source
    
    COMMON PATTERNS:
    - arXiv: {"source": "arxiv", "identifier": "2301.00001"}
    - DOI: {"source": "doi", "identifier": "10.1000/182"}
    - Direct: {"source": "url", "identifier": "https://example.com/paper.pdf"}
    
    RETURNS: Downloaded paper with extracted metadata
    ERRORS: Paper not found, download failed, unsupported source`,
    
    parameterHelp: {
      source: 'Paper source: "arxiv", "pubmed", "doi", "url"',
      identifier: 'Paper identifier (arXiv ID, DOI, URL, etc.)',
      targetGroup: 'Optional group for organization'
    }
  },

  move_to_group: {
    brief: 'Move document to a different group in DEVONthink',
    detailed: `Move documents between groups for better organization.
    
    WHEN TO USE:
    - Reorganizing research collections
    - Moving documents after review
    - Batch organization operations
    
    FEATURES:
    - Cross-database moves
    - Automatic group creation if needed
    - Preserves document metadata and relationships
    
    COMMON PATTERNS:
    - Simple move: {"uuid": "...", "targetGroup": "/Research/Completed"}
    - Cross-database: {"uuid": "...", "targetGroup": "/Archive/Old Projects", "database": "Archive"}
    
    RETURNS: Updated document location
    ERRORS: Document not found, target group invalid`,
    
    parameterHelp: {
      uuid: 'Document UUID to move',
      targetGroup: 'Target group path',
      database: 'Optional target database name'
    }
  },

  create_folder_structure: {
    brief: 'Create comprehensive folder structure for research projects',
    detailed: `Create complete folder hierarchies for organized research projects.
    
    WHEN TO USE:
    - Setting up new research projects
    - Standardizing project organization
    - Creating template structures
    
    TYPICAL STRUCTURES CREATED:
    - Research Projects: Papers/, Notes/, Data/, Analysis/, Reports/
    - Literature Reviews: Sources/, Summaries/, Themes/, Timeline/
    - Data Projects: Raw/, Processed/, Analysis/, Visualizations/
    
    FEATURES:
    - Multiple predefined templates
    - Custom structure creation
    - Automatic README file creation
    - Template-based setup
    
    COMMON PATTERNS:
    - Research project: {"projectName": "Quantum Computing Study", "template": "research"}
    - Custom structure: {"projectName": "Custom", "folders": ["Folder1", "Folder2/Sub1"]}
    
    RETURNS: Created folder structure with paths
    ERRORS: Invalid template, database error`,
    
    parameterHelp: {
      projectName: 'Project name (will be root folder)',
      template: 'Structure template: "research", "literature_review", "data_analysis", "custom"',
      folders: 'Custom folder array (when template="custom")',
      database: 'Target database (optional)'
    }
  },

  bulk_tag: {
    brief: 'Apply tags to multiple documents in bulk',
    detailed: `Efficiently apply tags to multiple documents for organization.
    
    WHEN TO USE:
    - Batch organization of imported documents
    - Applying research project tags
    - Categorizing document collections
    
    TAGGING OPTIONS:
    - Add to existing tags
    - Replace all tags
    - Remove specific tags
    - Apply conditional tags based on content
    
    COMMON PATTERNS:
    - Project tagging: {"uuids": [...], "tags": ["project-name", "research"], "mode": "add"}
    - Recategorization: {"uuids": [...], "tags": ["new-category"], "mode": "replace"}
    
    RETURNS: Summary of tagging operations
    ERRORS: Documents not found, invalid tag format`,
    
    parameterHelp: {
      uuids: 'Array of document UUIDs to tag',
      tags: 'Array of tags to apply',
      mode: 'Tagging mode: "add", "replace", "remove"'
    }
  },

  batch_import: {
    brief: 'Import multiple items (URLs, files) in batch with progress tracking',
    detailed: `Import multiple items efficiently with progress monitoring and error handling.
    
    WHEN TO USE:
    - Large-scale content import
    - Building research databases
    - Migrating content collections
    
    SUPPORTED IMPORT TYPES:
    - URLs (web pages, PDFs)
    - Local files
    - Academic papers (arXiv, DOI)
    - RSS/feed URLs
    
    FEATURES:
    - Concurrent processing
    - Progress tracking with ETAs
    - Error recovery and retry
    - Automatic organization
    - Duplicate detection
    
    BATCH SIZE LIMITS:
    - URLs: Up to 50 concurrent imports
    - Files: Up to 100 files per batch
    - Memory management and throttling
    
    COMMON PATTERNS:
    - URL batch: {"items": [{"type": "url", "source": "https://..."}, ...]}
    - Mixed batch: {"items": [{"type": "url"}, {"type": "arxiv", "id": "2301.00001"}]}
    
    RETURNS: Batch import results with success/failure details
    ERRORS: Too many items, invalid sources, batch timeout`,
    
    parameterHelp: {
      items: 'Array of import items with type and source',
      targetGroup: 'Optional group for all imports',
      maxConcurrent: 'Max concurrent imports (default: 10)'
    }
  },

  auto_organize_by_type: {
    brief: 'Automatically organize documents by type and metadata',
    detailed: `Intelligently organize documents using DEVONthink AI and metadata analysis.
    
    WHEN TO USE:
    - Cleaning up unorganized document collections
    - Applying consistent organization schemes
    - Preparing research databases
    
    ORGANIZATION METHODS:
    - By document type (PDFs, web pages, notes)
    - By topic using AI classification
    - By date and metadata
    - By source and origin
    
    AI-POWERED FEATURES:
    - Topic detection and categorization
    - Duplicate identification
    - Content-based grouping
    - Automatic tag suggestions
    
    COMMON PATTERNS:
    - Type-based: {"uuids": [...], "method": "by_type"}
    - AI topic-based: {"uuids": [...], "method": "by_topic", "useAI": true}
    - Date-based: {"uuids": [...], "method": "by_date", "dateField": "created"}
    
    RETURNS: Organization summary with document movements
    ERRORS: Documents not found, organization failed`,
    
    parameterHelp: {
      uuids: 'Array of document UUIDs to organize',
      method: 'Organization method: "by_type", "by_topic", "by_date", "by_source"',
      useAI: 'Use DEVONthink AI for smart categorization (default: true)',
      targetDatabase: 'Optional target database'
    }
  },

  // Phase 4: Bulk Operations (3 specialized bulk tools)
  bulk_import_urls: {
    brief: 'Import multiple URLs concurrently with progress tracking',
    detailed: `High-performance URL import system with concurrent processing and real-time progress monitoring.
    
    WHEN TO USE:
    - Importing reading lists and bookmarks
    - Building research databases from web sources
    - Batch processing of article collections
    - Migrating from other systems
    
    ADVANCED FEATURES:
    - Concurrent import processing (configurable concurrency)
    - Real-time progress tracking with ETAs
    - Intelligent retry logic for failed imports
    - Automatic duplicate detection and handling
    - Content extraction and cleaning
    - Metadata preservation (title, author, date, source)
    
    PERFORMANCE OPTIMIZATIONS:
    - Queue-based processing with priority levels
    - Memory management for large batches
    - Rate limiting to respect server policies
    - Automatic throttling based on system resources
    
    SUPPORTED URL TYPES:
    - Web articles and blog posts
    - PDF documents
    - Academic papers (arXiv, PubMed)
    - News articles
    - Documentation pages
    
    BATCH PROCESSING LIMITS:
    - Recommended: 10-50 URLs per batch
    - Maximum: 100 URLs (may require longer processing)
    - Optimal concurrency: 5-10 concurrent imports
    
    COMMON PATTERNS:
    - Reading list: {"urls": ["https://article1.com", "https://article2.com"], "targetGroup": "/Research/Reading"}
    - Research batch: {"urls": [...], "tags": ["research", "2024"], "maxConcurrent": 8}
    
    RETURNS: Detailed import results with success/failure statistics, progress metrics, and error details
    ERRORS: Too many URLs, invalid URLs, network failures, import timeout`,
    
    parameterHelp: {
      urls: 'Array of URLs to import (max 100, recommended 10-50)',
      targetGroup: 'Optional group path for imported content',
      tags: 'Optional array of tags to apply to all imports',
      maxConcurrent: 'Maximum concurrent imports (default: 5, max: 10)',
      priority: 'Import priority: "low", "normal", "high" (default: "normal")'
    }
  },

  bulk_download_papers: {
    brief: 'Download academic papers in bulk with metadata extraction',
    detailed: `Specialized system for downloading and organizing academic papers from multiple sources with comprehensive metadata extraction.
    
    WHEN TO USE:
    - Building research paper libraries
    - Literature review preparation
    - Academic research database creation
    - Conference proceeding collection
    
    SUPPORTED ACADEMIC SOURCES:
    - arXiv (arxiv.org) - preprints and papers
    - PubMed/PMC - medical and life science literature
    - IEEE Xplore - engineering and computer science
    - ACM Digital Library - computing research
    - DOI-based downloads from any publisher
    - Direct PDF URLs from academic sites
    
    METADATA EXTRACTION:
    - Complete bibliographic information
    - Author names and affiliations
    - Abstract and keywords
    - Publication venue and date
    - Citation count and metrics
    - DOI and persistent identifiers
    - Subject classifications
    
    ADVANCED FEATURES:
    - Concurrent paper downloads with queue management
    - Progress tracking for long-running operations
    - Automatic citation network discovery
    - Related paper suggestions
    - Duplicate detection across sources
    - Automatic tagging by field and source
    - Citation format generation (BibTeX, RIS)
    
    BULK PROCESSING:
    - Process up to 50 papers per batch
    - Intelligent source prioritization
    - Retry logic for failed downloads
    - Bandwidth management and throttling
    
    COMMON PATTERNS:
    - arXiv batch: {"papers": [{"source": "arxiv", "id": "2301.00001"}, {"source": "arxiv", "id": "2301.00002"}]}
    - DOI collection: {"papers": [{"source": "doi", "id": "10.1000/182"}, {"source": "doi", "id": "10.1000/183"}]}
    - Mixed sources: {"papers": [{"source": "arxiv", "id": "..."}, {"source": "pubmed", "id": "..."}]}
    
    RETURNS: Comprehensive download results with metadata, citation info, and organization details
    ERRORS: Papers not found, download failures, unsupported sources, metadata extraction errors`,
    
    parameterHelp: {
      papers: 'Array of paper objects with source and identifier',
      targetGroup: 'Optional group for organizing downloaded papers',
      extractCitations: 'Extract citation networks (default: true)',
      autoTag: 'Automatically tag by field and source (default: true)',
      maxConcurrent: 'Maximum concurrent downloads (default: 3, max: 5)'
    }
  },

  create_research_project: {
    brief: 'Create comprehensive research project structure with initial sources',
    detailed: `Complete research project setup system that creates organizational structure and populates with initial sources.
    
    WHEN TO USE:
    - Starting new research projects
    - Setting up literature reviews
    - Creating organized research environments
    - Academic project initialization
    
    PROJECT COMPONENTS CREATED:
    - Hierarchical folder structure
    - Smart groups for dynamic organization
    - Initial source collection
    - Progress tracking documents
    - Template documents (notes, summaries)
    - Bibliography management setup
    
    FOLDER STRUCTURE CREATED:
    - /Sources/ - Original papers and articles
    - /Notes/ - Research notes and annotations
    - /Analysis/ - Data analysis and findings
    - /Drafts/ - Work-in-progress documents
    - /References/ - Bibliography and citations
    - /Archive/ - Completed or outdated materials
    
    SMART GROUPS CREATED:
    - Recent additions (last 7 days)
    - Unread sources
    - High-priority items
    - Topic-specific collections
    - Document type filters
    
    INITIAL SOURCE POPULATION:
    - Automatic keyword-based source discovery
    - Related paper suggestions using AI
    - Citation network exploration
    - Web source recommendations
    
    WORKFLOW AUTOMATION:
    - Automated progress tracking
    - Citation extraction and linking
    - Duplicate detection across sources
    - Content summarization
    
    COMMON PATTERNS:
    - Topic research: {"projectName": "Quantum Computing Applications", "topic": "quantum algorithms"}
    - Literature review: {"projectName": "AI Ethics Review", "keywords": ["artificial intelligence", "ethics", "bias"]}
    - Comprehensive setup: {"projectName": "Climate Change Analysis", "initialSources": 20, "useAI": true}
    
    RETURNS: Complete project setup summary with created structure, initial sources, and automation status
    ERRORS: Invalid project parameters, source discovery failures, structure creation errors`,
    
    parameterHelp: {
      projectName: 'Research project name (becomes root folder)',
      topic: 'Main research topic for source discovery',
      keywords: 'Optional array of keywords for broader source discovery',
      initialSources: 'Number of initial sources to discover (default: 10, max: 25)',
      database: 'Target database for project (optional)',
      useAI: 'Use AI for source recommendations (default: true)'
    }
  },

  execute_workflow: {
    brief: 'Execute predefined research workflows',
    detailed: `Execute automated research workflows that combine multiple operations for common research tasks.
    
    WHEN TO USE:
    - Automating repetitive research tasks
    - Standardizing research processes
    - Large-scale content processing
    - Multi-step research operations
    
    AVAILABLE WORKFLOWS:
    
    1. **academic_research** - Complete academic research pipeline
       - Topic exploration and source discovery
       - Paper download and organization
       - Citation network analysis
       - Summary generation
    
    2. **literature_review** - Systematic literature review process
       - Search strategy execution
       - Study selection and screening
       - Data extraction and synthesis
       - Timeline and trend analysis
    
    3. **content_curation** - Web content curation workflow
       - URL collection and validation
       - Content extraction and cleaning
       - Automatic categorization
       - Duplicate removal
    
    4. **data_collection** - Structured data collection process
       - Source identification and validation
       - Batch import and processing
       - Quality control and validation
       - Organization and tagging
    
    WORKFLOW FEATURES:
    - Multi-step automation with progress tracking
    - Error handling and recovery
    - Configurable parameters for each step
    - Result validation and quality control
    - Real-time progress updates
    
    COMMON PATTERNS:
    - Academic research: {"workflowType": "academic_research", "topic": "machine learning", "parameters": {"maxPapers": 30}}
    - Literature review: {"workflowType": "literature_review", "query": "AI ethics", "parameters": {"dateRange": "2020-2024"}}
    - Content curation: {"workflowType": "content_curation", "sources": [...], "parameters": {"autoTag": true}}
    
    RETURNS: Workflow execution summary with step-by-step results, metrics, and generated content
    ERRORS: Invalid workflow type, parameter errors, execution failures, timeout`,
    
    parameterHelp: {
      workflowType: 'Workflow to execute: "academic_research", "literature_review", "content_curation", "data_collection"',
      parameters: 'Workflow-specific parameters object',
      priority: 'Execution priority: "low", "normal", "high" (default: "normal")',
      maxDuration: 'Maximum execution time in minutes (default: 30)'
    }
  },

  monitor_operations: {
    brief: 'Monitor active operations and system resources',
    detailed: `Real-time monitoring system for tracking active operations, system performance, and resource utilization.
    
    WHEN TO USE:
    - Monitoring long-running batch operations
    - System performance analysis
    - Resource utilization tracking
    - Operation debugging and optimization
    
    MONITORING CAPABILITIES:
    
    **Active Operations:**
    - Current operation status and progress
    - Queue position and estimated completion
    - Resource usage per operation
    - Error logs and warnings
    
    **System Resources:**
    - Memory usage and availability
    - CPU utilization patterns
    - Disk space and I/O performance
    - Network activity for imports
    
    **Performance Metrics:**
    - Operation throughput rates
    - Average completion times
    - Success/failure ratios
    - Resource efficiency metrics
    
    **Queue Management:**
    - Operation prioritization
    - Concurrency levels
    - Pending operation counts
    - Resource allocation
    
    MONITORING OPTIONS:
    - Real-time status updates
    - Historical performance data
    - System health indicators
    - Alerting for issues
    
    COMMON PATTERNS:
    - Current status: {"includeSystem": true, "includeQueue": true}
    - Operation focus: {"operationId": "batch_import_123", "detailed": true}
    - Performance analysis: {"includeMetrics": true, "timeRange": "24h"}
    
    RETURNS: Comprehensive monitoring data with current status, metrics, and system information
    ERRORS: Monitoring data unavailable, system access issues`,
    
    parameterHelp: {
      includeSystem: 'Include system resource information (default: true)',
      includeQueue: 'Include operation queue status (default: true)',
      includeMetrics: 'Include performance metrics (default: false)',
      operationId: 'Focus on specific operation (optional)',
      timeRange: 'Time range for metrics: "1h", "24h", "7d" (default: "1h")'
    }
  },

  manage_operation_queue: {
    brief: 'Manage operation queue with priority control',
    detailed: `Advanced queue management system for controlling concurrent operations, priorities, and system resource allocation.
    
    WHEN TO USE:
    - Controlling system resource usage
    - Prioritizing urgent operations
    - Managing concurrent processing limits
    - Optimizing system performance
    
    QUEUE MANAGEMENT OPERATIONS:
    
    **Priority Control:**
    - Adjust operation priorities
    - Promote urgent operations
    - Reorder queue based on importance
    
    **Concurrency Management:**
    - Set maximum concurrent operations
    - Allocate resources per operation type
    - Balance CPU and memory usage
    
    **Queue Operations:**
    - Pause/resume specific operations
    - Cancel pending operations
    - Clear completed operations
    - Restart failed operations
    
    **Resource Allocation:**
    - Set memory limits per operation
    - Configure CPU usage thresholds
    - Manage disk I/O priorities
    - Control network bandwidth
    
    QUEUE COMMANDS:
    - "pause": Pause queue processing
    - "resume": Resume queue processing
    - "clear": Clear completed operations
    - "set_concurrency": Adjust concurrent operation limit
    - "cancel_operation": Cancel specific operation
    - "reorder": Reorder queue by priority
    
    COMMON PATTERNS:
    - Pause queue: {"command": "pause"}
    - Set concurrency: {"command": "set_concurrency", "limit": 5}
    - Cancel operation: {"command": "cancel_operation", "operationId": "batch_123"}
    - Priority boost: {"command": "set_priority", "operationId": "urgent_123", "priority": "high"}
    
    RETURNS: Queue management results with updated status and configuration
    ERRORS: Invalid commands, operation not found, system limits exceeded`,
    
    parameterHelp: {
      command: 'Queue command: "pause", "resume", "clear", "set_concurrency", "cancel_operation", "set_priority"',
      operationId: 'Target operation ID (for operation-specific commands)',
      limit: 'Concurrency limit (for set_concurrency command)',
      priority: 'Priority level: "low", "normal", "high" (for set_priority command)'
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
\`\`\``,

  analyze_document_similarity: `
### Compare multiple research papers (optimized)
\`\`\`json
{
  "uuids": [
    "93FA2969-A1C2-4982-B7E9-379B27AEAC3E",
    "B4E7A1F2-D3C5-4F89-A7B8-E9F1A2B3C4D5",
    "C5F8B2G3-E4D6-5G91-B8C9-F1G2A3B4D5E6"
  ]
}
\`\`\``,

  detect_knowledge_clusters: `
### Find clusters in AI research documents
\`\`\`json
{
  "searchQuery": "tag:ai-research",
  "maxDocuments": 30,
  "minClusterSize": 3
}
\`\`\`

### Analyze all recent documents
\`\`\`json
{
  "searchQuery": "created:>=2024",
  "maxDocuments": 50
}
\`\`\``,

  create_document: `
### Create research note with tags
\`\`\`json
{
  "name": "AI Safety Analysis Summary",
  "content": "# Summary\\n\\nKey findings from recent AI safety papers...",
  "type": "markdown",
  "groupPath": "/Research/AI Safety"
}
\`\`\`

### Create simple text document
\`\`\`json
{
  "name": "Meeting Notes 2024-01-15",
  "content": "Attendees: ...\\nDiscussion points: ...",
  "type": "txt"
}
\`\`\``,

  // Phase 4 Advanced Research Automation Examples
  import_url: `
### Import web article
\`\`\`json
{
  "url": "https://example.com/research-article",
  "targetGroup": "/Research/Articles",
  "tags": ["imported", "research"]
}
\`\`\`

### Import PDF from URL
\`\`\`json
{
  "url": "https://arxiv.org/pdf/2301.00001.pdf",
  "tags": ["arxiv", "machine-learning"]
}
\`\`\``,

  download_paper: `
### Download arXiv paper
\`\`\`json
{
  "source": "arxiv",
  "identifier": "2301.00001",
  "targetGroup": "/Research/Papers/2024"
}
\`\`\`

### Download paper by DOI
\`\`\`json
{
  "source": "doi",
  "identifier": "10.1000/182"
}
\`\`\``,

  bulk_import_urls: `
### Import reading list with progress tracking
\`\`\`json
{
  "urls": [
    "https://blog.example.com/ai-article-1",
    "https://research.example.com/paper.pdf",
    "https://news.example.com/tech-news"
  ],
  "targetGroup": "/Research/Reading List",
  "tags": ["reading-list", "2024"],
  "maxConcurrent": 3
}
\`\`\``,

  bulk_download_papers: `
### Download multiple arXiv papers
\`\`\`json
{
  "papers": [
    {"source": "arxiv", "id": "2301.00001"},
    {"source": "arxiv", "id": "2301.00002"},
    {"source": "doi", "id": "10.1000/182"}
  ],
  "targetGroup": "/Research/Literature Review",
  "autoTag": true,
  "extractCitations": true
}
\`\`\``,

  create_research_project: `
### Set up new research project
\`\`\`json
{
  "projectName": "Quantum Computing in Drug Discovery",
  "topic": "quantum algorithms pharmaceutical research",
  "initialSources": 15,
  "database": "Research",
  "useAI": true
}
\`\`\``,

  execute_workflow: `
### Run academic research workflow
\`\`\`json
{
  "workflowType": "academic_research",
  "parameters": {
    "topic": "neural networks for climate modeling",
    "maxPapers": 25,
    "includeArxiv": true,
    "startDate": "2022-01-01"
  }
}
\`\`\`

### Execute literature review workflow
\`\`\`json
{
  "workflowType": "literature_review",
  "parameters": {
    "searchQuery": "machine learning ethics bias",
    "databases": ["Research", "Archive"],
    "dateRange": "2020-2024"
  }
}
\`\`\``,

  monitor_operations: `
### Monitor all active operations
\`\`\`json
{
  "includeSystem": true,
  "includeQueue": true,
  "includeMetrics": false
}
\`\`\`

### Focus on specific operation
\`\`\`json
{
  "operationId": "bulk_import_20240823_001",
  "detailed": true,
  "includeMetrics": true
}
\`\`\``,

  manage_operation_queue: `
### Pause queue processing
\`\`\`json
{
  "command": "pause"
}
\`\`\`

### Set concurrency limit
\`\`\`json
{
  "command": "set_concurrency",
  "limit": 3
}
\`\`\`

### Boost operation priority
\`\`\`json
{
  "command": "set_priority",
  "operationId": "urgent_download_123",
  "priority": "high"
}
\`\`\``
};
