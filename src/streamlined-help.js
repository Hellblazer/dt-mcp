/**
 * Help system for streamlined DEVONthink MCP server
 * Provides detailed information about the 10 unified tools and their operations
 */

export const streamlinedToolHelp = {
  search: {
    description: 'Unified search with multiple modes: basic, advanced, batch, smart_groups',
    modes: {
      basic: {
        description: 'Standard DEVONthink search',
        example: '{"mode": "basic", "query": "quantum computing", "limit": 10}',
        parameters: ['query', 'database', 'limit', 'offset']
      },
      advanced: {
        description: 'Full search syntax with Boolean operators and field searches',
        example: '{"mode": "advanced", "query": "name:paper AND tag:physics", "sortBy": "relevance"}',
        parameters: ['query', 'database', 'limit', 'searchIn', 'searchScope', 'sortBy']
      },
      batch: {
        description: 'Multiple searches in parallel',
        example: '{"mode": "batch", "query": ["quantum", "physics", "mathematics"]}',
        parameters: ['query (array)', 'database', 'limit']
      },
      smart_groups: {
        description: 'List DEVONthink smart groups',
        example: '{"mode": "smart_groups", "database": "Research"}',
        parameters: ['database', 'limit', 'offset']
      }
    }
  },

  document: {
    description: 'Document operations: read, create, update, delete, OCR, batch operations',
    operations: {
      read: {
        description: 'Read document content and metadata',
        example: '{"operation": "read", "uuid": "12345678-1234-1234-1234-123456789012", "includeContent": true}',
        parameters: ['uuid', 'includeContent']
      },
      create: {
        description: 'Create new document',
        example: '{"operation": "create", "name": "My Note", "content": "Content here", "type": "markdown"}',
        parameters: ['name', 'content', 'type', 'groupPath']
      },
      update: {
        description: 'Update document tags',
        example: '{"operation": "update", "uuid": "12345678-1234-1234-1234-123456789012", "tags": ["tag1", "tag2"]}',
        parameters: ['uuid', 'tags']
      },
      delete: {
        description: 'Delete document (with confirmation)',
        example: '{"operation": "delete", "uuid": "12345678-1234-1234-1234-123456789012", "confirmDelete": true}',
        parameters: ['uuid', 'confirmDelete']
      },
      ocr: {
        description: 'Extract text from image-based documents',
        example: '{"operation": "ocr", "uuid": "12345678-1234-1234-1234-123456789012"}',
        parameters: ['uuid']
      },
      batch_read: {
        description: 'Read multiple documents simultaneously',
        example: '{"operation": "batch_read", "uuid": ["uuid1", "uuid2"], "includeContent": false}',
        parameters: ['uuid (array)', 'includeContent']
      }
    }
  },

  analyze: {
    description: 'Document analysis & synthesis: synthesize, themes, summary, similarity, classify',
    operations: {
      synthesize: {
        description: 'Multi-document synthesis with different approaches',
        example: '{"operation": "synthesize", "documentUuids": ["uuid1", "uuid2"], "synthesisType": "consensus"}',
        parameters: ['documentUuids', 'synthesisType (summary|consensus|insights)']
      },
      themes: {
        description: 'Extract common themes from documents',
        example: '{"operation": "themes", "documentUuids": ["uuid1", "uuid2", "uuid3"]}',
        parameters: ['documentUuids']
      },
      summary: {
        description: 'Create tiered summaries at different detail levels',
        example: '{"operation": "summary", "documentUuids": ["uuid1"], "summaryLevel": "detailed"}',
        parameters: ['documentUuids', 'summaryLevel (brief|detailed|full)']
      },
      similarity: {
        description: 'Analyze similarity between multiple documents',
        example: '{"operation": "similarity", "documentUuids": ["uuid1", "uuid2", "uuid3"]}',
        parameters: ['documentUuids']
      },
      classify: {
        description: 'AI-powered document classification using DEVONthink native AI',
        example: '{"operation": "classify", "documentUuids": "uuid1"}',
        parameters: ['documentUuids (single UUID)']
      },
      analyze: {
        description: 'Comprehensive document analysis including readability metrics',
        example: '{"operation": "analyze", "documentUuids": "uuid1"}',
        parameters: ['documentUuids (single UUID)']
      },
      compare: {
        description: 'Compare two documents for similarity',
        example: '{"operation": "compare", "documentUuids": ["uuid1", "uuid2"]}',
        parameters: ['documentUuids (exactly 2 UUIDs)']
      }
    }
  },

  graph: {
    description: 'Knowledge graph operations: build graphs, find paths, detect clusters',
    operations: {
      build: {
        description: 'Build knowledge graph from document with configurable depth',
        example: '{"operation": "build", "uuid": "uuid1", "maxDepth": 3}',
        parameters: ['uuid', 'maxDepth']
      },
      path: {
        description: 'Find shortest connection path between two documents',
        example: '{"operation": "path", "uuid": "uuid1", "targetUuid": "uuid2", "maxDepth": 5}',
        parameters: ['uuid', 'targetUuid', 'maxDepth']
      },
      clusters: {
        description: 'Detect knowledge clusters using AI-powered grouping',
        example: '{"operation": "clusters", "searchQuery": "machine learning", "minClusterSize": 3}',
        parameters: ['searchQuery', 'minClusterSize']
      },
      connections: {
        description: 'Find all connections for a document',
        example: '{"operation": "connections", "uuid": "uuid1"}',
        parameters: ['uuid']
      },
      timeline: {
        description: 'Create chronological timeline of knowledge evolution',
        example: '{"operation": "timeline", "uuid": "uuid1"}',
        parameters: ['uuid']
      }
    }
  },

  organize: {
    description: 'Organization operations: groups, collections, tags, auto-organization',
    operations: {
      create_group: {
        description: 'Create new group/folder structure',
        example: '{"operation": "create_group", "name": "Research Papers", "path": "/Projects"}',
        parameters: ['name', 'description', 'path', 'tags']
      },
      create_collection: {
        description: 'Create document collection for research projects',
        example: '{"operation": "create_collection", "name": "Quantum Research", "description": "Papers on quantum computing"}',
        parameters: ['name', 'description']
      },
      move: {
        description: 'Move documents to different groups',
        example: '{"operation": "move", "documentUuids": ["uuid1", "uuid2"], "targetGroup": "/Research/Papers"}',
        parameters: ['documentUuids', 'targetGroup']
      },
      bulk_tag: {
        description: 'Apply tag operations to multiple documents',
        example: '{"operation": "bulk_tag", "documentUuids": ["uuid1", "uuid2"], "tags": ["physics"], "tagAction": "add"}',
        parameters: ['documentUuids', 'tags', 'tagAction (add|remove|replace)']
      },
      auto_organize: {
        description: 'Automatically organize documents by type, date, or content',
        example: '{"operation": "auto_organize", "organizationMode": "type"}',
        parameters: ['organizationMode (type|date|size|content)', 'path']
      },
      folder_structure: {
        description: 'Create nested folder hierarchies',
        example: '{"operation": "folder_structure", "structure": {"Papers": {"2023": null, "2024": null}}}',
        parameters: ['structure (nested object)', 'path']
      }
    }
  },

  import: {
    description: 'Import content from URLs, academic papers, or batch sources',
    types: {
      url: {
        description: 'Import single URL or multiple URLs',
        example: '{"type": "url", "source": "https://example.com/paper.pdf", "targetGroup": "/Papers"}',
        parameters: ['source', 'targetGroup', 'tags', 'extractMetadata']
      },
      paper: {
        description: 'Download academic papers from arXiv, DOI, or PubMed',
        example: '{"type": "paper", "source": "2301.00001", "paperSource": "arxiv", "extractMetadata": true}',
        parameters: ['source', 'paperSource (arxiv|doi|pubmed)', 'targetGroup', 'tags', 'extractMetadata']
      },
      batch: {
        description: 'Generic batch import for multiple sources',
        example: '{"type": "batch", "source": ["url1", "url2"], "maxConcurrent": 3}',
        parameters: ['source (array)', 'maxConcurrent']
      }
    }
  },

  research: {
    description: 'Research workflows: explore topics, organize findings, track evolution',
    workflows: {
      explore: {
        description: 'Explore a research topic comprehensively',
        example: '{"workflow": "explore", "query": "quantum computing applications"}',
        parameters: ['query']
      },
      organize: {
        description: 'Organize research findings by relevance',
        example: '{"workflow": "organize", "query": "machine learning", "maxResults": 50}',
        parameters: ['query', 'maxResults']
      },
      track_evolution: {
        description: 'Track how a topic has evolved over time',
        example: '{"workflow": "track_evolution", "query": "artificial intelligence", "timeRange": "year"}',
        parameters: ['query', 'timeRange (week|month|year|all)']
      },
      trends: {
        description: 'Identify trending topics in recent documents',
        example: '{"workflow": "trends"}',
        parameters: []
      },
      create_project: {
        description: 'Create comprehensive research project structure',
        example: '{"workflow": "create_project", "projectName": "AI Ethics", "description": "Research on AI ethics"}',
        parameters: ['projectName', 'description']
      },
      automate: {
        description: 'Execute automated research workflow',
        example: '{"workflow": "automate", "query": "climate change"}',
        parameters: ['query']
      }
    }
  },

  ai: {
    description: 'AI-powered operations using DEVONthink native AI capabilities',
    operations: {
      classify: {
        description: 'Classify document using DEVONthink AI',
        example: '{"operation": "classify", "uuid": "uuid1"}',
        parameters: ['uuid']
      },
      similar: {
        description: 'Find similar documents using AI',
        example: '{"operation": "similar", "uuid": "uuid1", "limit": 10}',
        parameters: ['uuid', 'limit']
      },
      related: {
        description: 'Get AI-suggested related documents',
        example: '{"operation": "related", "uuid": "uuid1", "limit": 10}',
        parameters: ['uuid', 'limit']
      }
    }
  },

  system: {
    description: 'System operations: databases, monitoring, performance, help',
    operations: {
      databases: {
        description: 'List all available DEVONthink databases',
        example: '{"operation": "databases"}',
        parameters: []
      },
      monitor: {
        description: 'Monitor active operations and system resources',
        example: '{"operation": "monitor"}',
        parameters: []
      },
      performance: {
        description: 'Get detailed performance metrics',
        example: '{"operation": "performance"}',
        parameters: []
      },
      reset: {
        description: 'Reset connection state and clear performance metrics',
        example: '{"operation": "reset"}',
        parameters: []
      },
      help: {
        description: 'Get help for specific tools or list all tools',
        example: '{"operation": "help", "toolName": "search", "includeExamples": true}',
        parameters: ['toolName', 'includeExamples']
      }
    }
  }
};

export function getStreamlinedHelp(toolName = 'list', includeExamples = false) {
  if (toolName === 'list') {
    return {
      totalTools: 10,
      tools: Object.keys(streamlinedToolHelp),
      descriptions: Object.fromEntries(
        Object.entries(streamlinedToolHelp).map(([name, info]) => [name, info.description])
      ),
      note: 'Use {"operation": "help", "toolName": "TOOL_NAME", "includeExamples": true} for detailed help on specific tools'
    };
  }

  const tool = streamlinedToolHelp[toolName];
  if (!tool) {
    return { error: `Tool '${toolName}' not found. Available tools: ${Object.keys(streamlinedToolHelp).join(', ')}` };
  }

  const result = {
    tool: toolName,
    description: tool.description,
    ...tool
  };

  if (!includeExamples) {
    // Remove examples to reduce size
    const cleanTool = { ...result };
    const removeExamples = (obj) => {
      if (typeof obj === 'object' && obj !== null) {
        const cleaned = { ...obj };
        delete cleaned.example;
        Object.keys(cleaned).forEach(key => {
          if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
            cleaned[key] = removeExamples(cleaned[key]);
          }
        });
        return cleaned;
      }
      return obj;
    };
    return removeExamples(cleanTool);
  }

  return result;
}

export default { streamlinedToolHelp, getStreamlinedHelp };