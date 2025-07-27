#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { z } from 'zod';
import { DEVONthinkService } from './src/services/devonthink.js';
import { getEnhancedDescription, getParameterDescriptions, toolDescriptions, exampleUsage } from './src/tool-descriptions.js';
import { systemPrompt, contextPrompts } from './src/system-prompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Initialize logging
const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(name) {
    this.name = name;
    this.logLevel = process.env.LOG_LEVEL ? 
      logLevels[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] : 
      logLevels.INFO;
  }

  log(level, message) {
    if (logLevels[level] <= this.logLevel) {
      const timestamp = new Date().toISOString();
      console.error(`${timestamp} - ${this.name} - ${level} - ${message}`);
    }
  }

  info(message) { this.log('INFO', message); }
  warn(message) { this.log('WARN', message); }
  error(message) { this.log('ERROR', message); }
  debug(message) { this.log('DEBUG', message); }
}

const logger = new Logger('devonthink-mcp');
const devonthink = new DEVONthinkService();


async function main() {
  logger.info('Starting DEVONthink MCP server');
  
  try {
    // Create the server
    const server = new McpServer({
      name: 'DEVONthink MCP',
      version: '1.0.0'
    });
    
    // DEVONthink-specific tools
    server.tool(
      'search_devonthink',
      'Search for documents in DEVONthink databases',
      {
        query: z.string().describe('Search query (supports DEVONthink search syntax)'),
        database: z.string().optional().describe('Specific database name to search in (optional)'),
        limit: z.number().optional().default(50).describe('Maximum number of results to return (default: 50)'),
        offset: z.number().optional().default(0).describe('Number of results to skip (default: 0)')
      },
      async ({ query, database, limit = 50, offset = 0 }) => {
        logger.info(`Searching DEVONthink for: ${query}`);
        try {
          const results = await devonthink.search(query, database, limit, offset);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'read_document',
      'Read the content and metadata of a DEVONthink document',
      {
        uuid: z.string().describe('Document UUID'),
        includeContent: z.boolean().optional().describe('Include document content (default: true)')
      },
      async ({ uuid, includeContent = true }) => {
        logger.info(`Reading document: ${uuid}`);
        try {
          const document = await devonthink.readDocument(uuid, includeContent);
          return {
            content: [{ type: 'text', text: JSON.stringify(document, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'create_document',
      'Create a new document in DEVONthink',
      {
        name: z.string().describe('Document name'),
        content: z.string().describe('Document content'),
        type: z.enum(['markdown', 'rtf', 'txt']).optional().describe('Document type'),
        groupPath: z.string().optional().describe('Path to target group (optional)')
      },
      async ({ name, content, type = 'markdown', groupPath }) => {
        logger.info(`Creating document: ${name}`);
        try {
          const document = await devonthink.createDocument(name, content, type, groupPath);
          return {
            content: [{ type: 'text', text: JSON.stringify(document, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'list_databases',
      'List all DEVONthink databases',
      {},
      async () => {
        logger.info('Listing DEVONthink databases');
        try {
          const databases = await devonthink.listDatabases();
          return {
            content: [{ type: 'text', text: JSON.stringify(databases, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Advanced DEVONthink tools
    server.tool(
      'update_tags',
      'Update tags for a DEVONthink document',
      {
        uuid: z.string().describe('Document UUID'),
        tags: z.array(z.string()).describe('Array of tags to set')
      },
      async ({ uuid, tags }) => {
        logger.info(`Updating tags for document: ${uuid}`);
        try {
          const document = await devonthink.updateTags(uuid, tags);
          return {
            content: [{ type: 'text', text: JSON.stringify(document, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'get_related_documents',
      'Get documents related to a specific document using DEVONthink AI',
      {
        uuid: z.string().describe('Document UUID'),
        limit: z.number().optional().describe('Maximum number of related documents (default: 10)')
      },
      async ({ uuid, limit = 10 }) => {
        logger.info(`Getting related documents for: ${uuid}`);
        try {
          const documents = await devonthink.getRelatedDocuments(uuid, limit);
          return {
            content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'create_smart_group',
      'Create a smart group in DEVONthink with search criteria',
      {
        name: z.string().describe('Smart group name'),
        searchQuery: z.string().describe('Search query/predicate for the smart group'),
        database: z.string().optional().describe('Target database name (optional)')
      },
      async ({ name, searchQuery, database }) => {
        logger.info(`Creating smart group: ${name}`);
        try {
          const smartGroup = await devonthink.createSmartGroup(name, searchQuery, database);
          return {
            content: [{ type: 'text', text: JSON.stringify(smartGroup, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'ocr_document',
      'Perform OCR on a PDF or image document in DEVONthink',
      {
        uuid: z.string().describe('Document UUID')
      },
      async ({ uuid }) => {
        logger.info(`Performing OCR on document: ${uuid}`);
        try {
          const result = await devonthink.ocrDocument(uuid);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'batch_search',
      'Search for multiple queries in DEVONthink simultaneously',
      {
        queries: z.array(z.string()).describe('Array of search queries'),
        database: z.string().optional().describe('Specific database name to search in (optional)'),
        maxResultsPerQuery: z.number().optional().default(20).describe('Maximum results per query to prevent overwhelming responses (default: 20)')
      },
      async ({ queries, database, maxResultsPerQuery = 20 }) => {
        logger.info(`Batch searching for ${queries.length} queries`);
        try {
          const results = await devonthink.batchSearch(queries, database, maxResultsPerQuery);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'batch_read_documents',
      'Read multiple documents from DEVONthink simultaneously',
      {
        uuids: z.array(z.string()).describe('Array of document UUIDs'),
        includeContent: z.boolean().optional().describe('Include document content (default: false)')
      },
      async ({ uuids, includeContent = false }) => {
        logger.info(`Batch reading ${uuids.length} documents`);
        try {
          const documents = await devonthink.batchReadDocuments(uuids, includeContent);
          return {
            content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Practical advanced features
    server.tool(
      'find_connections',
      'Find connections between a document and other documents (AI-based, references, etc.)',
      {
        uuid: z.string().describe('Document UUID'),
        maxResults: z.number().optional().describe('Maximum results to return (default: 10)')
      },
      async ({ uuid, maxResults = 10 }) => {
        logger.info(`Finding connections for document: ${uuid}`);
        try {
          const connections = await devonthink.findConnections(uuid, maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify(connections, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'compare_documents',
      'Compare two documents for similarity based on tags and content metrics',
      {
        uuid1: z.string().describe('First document UUID'),
        uuid2: z.string().describe('Second document UUID')
      },
      async ({ uuid1, uuid2 }) => {
        logger.info(`Comparing documents: ${uuid1} and ${uuid2}`);
        try {
          const comparison = await devonthink.compareDocuments(uuid1, uuid2);
          return {
            content: [{ type: 'text', text: JSON.stringify(comparison, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'create_collection',
      'Create a new document collection (research thread) in DEVONthink',
      {
        name: z.string().describe('Collection name'),
        description: z.string().describe('Collection description'),
        database: z.string().optional().describe('Target database name (optional)')
      },
      async ({ name, description, database }) => {
        logger.info(`Creating collection: ${name}`);
        try {
          const collection = await devonthink.createCollection(name, description, database);
          return {
            content: [{ type: 'text', text: JSON.stringify(collection, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'add_to_collection',
      'Add a document to an existing collection',
      {
        collectionUUID: z.string().describe('Collection UUID'),
        documentUUID: z.string().describe('Document UUID to add'),
        notes: z.string().optional().describe('Optional notes about why this document was added')
      },
      async ({ collectionUUID, documentUUID, notes = '' }) => {
        logger.info(`Adding document ${documentUUID} to collection ${collectionUUID}`);
        try {
          const result = await devonthink.addToCollection(collectionUUID, documentUUID, notes);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Knowledge Graph Features
    server.tool(
      'build_knowledge_graph',
      'Build a knowledge graph showing document relationships with depth control',
      {
        uuid: z.string().describe('Starting document UUID'),
        maxDepth: z.number().optional().describe('Maximum traversal depth (default: 3)')
      },
      async ({ uuid, maxDepth = 3 }) => {
        logger.info(`Building knowledge graph from document: ${uuid} with depth: ${maxDepth}`);
        try {
          const graph = await devonthink.buildKnowledgeGraph(uuid, maxDepth);
          return {
            content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'find_shortest_path',
      'Find the shortest connection path between two documents',
      {
        startUUID: z.string().describe('Starting document UUID'),
        targetUUID: z.string().describe('Target document UUID'),
        maxDepth: z.number().optional().describe('Maximum search depth (default: 5)')
      },
      async ({ startUUID, targetUUID, maxDepth = 5 }) => {
        logger.info(`Finding shortest path from ${startUUID} to ${targetUUID}`);
        try {
          const path = await devonthink.findShortestPath(startUUID, targetUUID, maxDepth);
          return {
            content: [{ type: 'text', text: JSON.stringify(path, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'detect_knowledge_clusters',
      'Detect clusters of related documents based on tags and connections',
      {
        searchQuery: z.string().optional().describe('Search query to find documents (empty = use current selection)'),
        maxDocuments: z.number().optional().describe('Maximum documents to analyze (default: 50)'),
        minClusterSize: z.number().optional().describe('Minimum cluster size (default: 3)')
      },
      async ({ searchQuery = '', maxDocuments = 50, minClusterSize = 3 }) => {
        logger.info(`Detecting knowledge clusters for: ${searchQuery || 'current selection'}`);
        try {
          const clusters = await devonthink.detectKnowledgeClusters(searchQuery, maxDocuments, minClusterSize);
          return {
            content: [{ type: 'text', text: JSON.stringify(clusters, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Phase 2: Research Automation
    server.tool(
      'automate_research',
      'Run automated research workflows to explore topics and organize findings',
      {
        workflowType: z.enum(['explore_topic', 'expand_research', 'organize_findings']).describe('Type of research workflow to run'),
        queryOrUUID: z.string().describe('Search query for explore/organize, or document UUID for expand')
      },
      async ({ workflowType, queryOrUUID }) => {
        logger.info(`Running research workflow: ${workflowType} with ${queryOrUUID}`);
        try {
          const result = await devonthink.automateResearch(workflowType, queryOrUUID);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Organize findings workflow
    server.tool(
      'organize_findings',
      'Organize search results by relevance with performance optimization',
      {
        searchQuery: z.string().describe('Search query to organize results for'),
        maxResults: z.number().optional().describe('Maximum results to process (default: 50)')
      },
      async ({ searchQuery, maxResults = 50 }) => {
        logger.info(`Organizing findings for: ${searchQuery} with max ${maxResults} results`);
        try {
          const result = await devonthink.automateResearchOptimized(searchQuery, maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Phase 3: Document Intelligence
    server.tool(
      'analyze_document',
      'Analyze document complexity, readability, and extract key information',
      {
        uuid: z.string().describe('Document UUID')
      },
      async ({ uuid }) => {
        logger.info(`Analyzing document: ${uuid}`);
        try {
          const analysis = await devonthink.analyzeDocument(uuid);
          return {
            content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'analyze_document_similarity',
      'Compare multiple documents for similarity based on content and metadata (performance-optimized)',
      {
        uuids: z.array(z.string()).min(2).describe('Array of document UUIDs to compare (minimum 2)')
      },
      async ({ uuids }) => {
        logger.info(`Analyzing similarity between ${uuids.length} documents`);
        try {
          const analysis = await devonthink.analyzeDocumentSimilarity(uuids);
          return {
            content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    // Phase 4: Knowledge Synthesis
    server.tool(
      'synthesize_documents',
      'Create intelligent synthesis from multiple documents (performance-optimized with automatic fallback)',
      {
        documentUUIDs: z.array(z.string()).min(1).describe('Array of document UUIDs to synthesize'),
        synthesisType: z.enum(['summary', 'consensus', 'insights']).optional().describe('Type of synthesis (default: summary)')
      },
      async ({ documentUUIDs, synthesisType = 'summary' }) => {
        logger.info(`Synthesizing ${documentUUIDs.length} documents with type: ${synthesisType}`);
        try {
          const synthesis = await devonthink.synthesizeDocuments(documentUUIDs, synthesisType);
          return {
            content: [{ type: 'text', text: JSON.stringify(synthesis, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'extract_themes',
      'Extract common themes and topics from document collections (legacy - use classify_document for better results)',
      {
        documentUUIDs: z.array(z.string()).min(1).describe('Array of document UUIDs to analyze for themes')
      },
      async ({ documentUUIDs }) => {
        logger.info(`Extracting themes from ${documentUUIDs.length} documents`);
        try {
          const themes = await devonthink.extractThemes(documentUUIDs);
          return {
            content: [{ type: 'text', text: JSON.stringify(themes, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'classify_document',
      'Use DEVONthink\'s native AI to classify a document and get AI-powered organizational suggestions',
      {
        uuid: z.string().describe('Document UUID to classify using DEVONthink AI')
      },
      async ({ uuid }) => {
        logger.info(`Classifying document ${uuid} using DEVONthink AI`);
        try {
          const classification = await devonthink.classifyDocument(uuid);
          return {
            content: [{ type: 'text', text: JSON.stringify(classification, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'get_similar_documents',
      'Find documents similar to a given document using DEVONthink\'s native AI classification',
      {
        uuid: z.string().describe('Source document UUID to find similar documents for'),
        limit: z.number().optional().default(10).describe('Maximum number of similar documents to return (default: 10)')
      },
      async ({ uuid, limit = 10 }) => {
        logger.info(`Finding similar documents for ${uuid} using DEVONthink AI`);
        try {
          const similarDocs = await devonthink.getSimilarDocuments(uuid, limit);
          return {
            content: [{ type: 'text', text: JSON.stringify(similarDocs, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'create_multi_level_summary',
      'Create summaries at different levels of detail',
      {
        documentUUIDs: z.array(z.string()).min(1).describe('Array of document UUIDs to summarize'),
        summaryLevel: z.enum(['brief', 'detailed', 'full']).optional().describe('Level of detail (default: brief)')
      },
      async ({ documentUUIDs, summaryLevel = 'brief' }) => {
        logger.info(`Creating ${summaryLevel} summary for ${documentUUIDs.length} documents`);
        try {
          const summary = await devonthink.createMultiLevelSummary(documentUUIDs, summaryLevel);
          return {
            content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'track_topic_evolution',
      'Track how a topic has evolved over time',
      {
        topic: z.string().describe('Topic or keyword to track'),
        timeRange: z.enum(['week', 'month', 'year', 'all']).optional().describe('Time range to analyze (default: month)')
      },
      async ({ topic, timeRange = 'month' }) => {
        logger.info(`Tracking evolution of topic: ${topic} over ${timeRange}`);
        try {
          const evolution = await devonthink.trackTopicEvolution(topic, timeRange);
          return {
            content: [{ type: 'text', text: JSON.stringify(evolution, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'create_knowledge_timeline',
      'Create a chronological timeline of documents showing knowledge evolution',
      {
        documentUUIDs: z.array(z.string()).min(1).describe('Array of document UUIDs to create timeline from')
      },
      async ({ documentUUIDs }) => {
        logger.info(`Creating knowledge timeline from ${documentUUIDs.length} documents`);
        try {
          const timeline = await devonthink.createKnowledgeTimeline(documentUUIDs);
          return {
            content: [{ type: 'text', text: JSON.stringify(timeline, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'identify_trends',
      'Identify trending topics in recent documents',
      {
        databaseName: z.string().optional().describe('Specific database to analyze (optional, searches all if not provided)')
      },
      async ({ databaseName = '' }) => {
        logger.info(`Identifying trends in ${databaseName || 'all databases'}`);
        try {
          const trends = await devonthink.identifyTrends(databaseName);
          return {
            content: [{ type: 'text', text: JSON.stringify(trends, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'advanced_search',
      'Perform advanced search with DEVONthink\'s full syntax and operators. Supports Boolean operators (AND, OR, NOT), field searches (name:, tag:, comment:), wildcards (*), fuzzy search (~), exact phrases (""), and advanced filtering by scope, sorting, and result limits.',
      {
        query: z.string().describe('Search query with DEVONthink operators: AND/OR/NOT, name:term, tag:term, comment:term, kind:pdf, date:YYYY-MM-DD, wildcards (*), fuzzy (~), "exact phrases"'),
        database: z.string().optional().describe('Specific database name to search in (optional)'),
        searchIn: z.enum(['all', 'selected', 'current']).optional().default('all').describe('Search scope: all documents, selected documents, or current document'),
        maxResults: z.number().optional().default(100).describe('Maximum number of results to return (default: 100)'),
        sortBy: z.enum(['relevance', 'date', 'name', 'size']).optional().default('relevance').describe('Sort results by relevance, date (newest first), name (alphabetical), or size (largest first)'),
        searchScope: z.enum(['content', 'name', 'comment', 'all']).optional().default('content').describe('Limit search to content, name, comment, or all fields')
      },
      async ({ query, database = '', searchIn = 'all', maxResults = 100, sortBy = 'relevance', searchScope = 'content' }) => {
        logger.info(`Advanced search: "${query}" in ${database || 'all databases'}`);
        try {
          const results = await devonthink.advancedSearch(query, database, searchIn, maxResults, sortBy, searchScope);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );

    server.tool(
      'list_smart_groups',
      'List all smart groups in DEVONthink databases. Smart groups are dynamic collections that automatically organize documents based on search criteria. This tool provides direct access to DEVONthink\'s organizational features.',
      {
        database: z.string().optional().describe('Specific database name to list smart groups from (optional, lists from all databases if not provided)'),
        limit: z.number().optional().default(100).describe('Maximum number of smart groups to return (default: 100)'),
        offset: z.number().optional().default(0).describe('Number of smart groups to skip (default: 0)')
      },
      async ({ database = '', limit = 100, offset = 0 }) => {
        logger.info(`Listing smart groups in ${database || 'all databases'}`);
        try {
          const results = await devonthink.listSmartGroups(database, limit, offset);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }]
          };
        }
      }
    );
    
    // Meta tool: Help system for AI clients
    server.tool(
      'get_tool_help',
      `Get detailed help and examples for using DEVONthink MCP tools.
      
      This meta-tool helps AI clients understand how to use other tools effectively.
      
      USAGE PATTERNS:
      - List all tools: {"toolName": "list"}
      - Get specific help: {"toolName": "search_devonthink"}
      - Get parameter examples: {"toolName": "synthesize_documents", "examples": true}
      
      BENEFITS FOR AI:
      - Understand when to use each tool
      - See parameter formats and examples
      - Learn about error scenarios
      - Discover tool combinations`,
      {
        toolName: z.string().describe('Tool name to get help for, or "list" for all tools'),
        examples: z.boolean().optional().describe('Include usage examples')
      },
      async ({ toolName, examples = false }) => {
        logger.info(`Getting help for tool: ${toolName}`);
        
        if (toolName === 'list') {
          const toolList = Object.keys(toolDescriptions).map(name => {
            const desc = toolDescriptions[name];
            return `- ${name}: ${desc.brief}`;
          }).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Available DEVONthink MCP Tools:\n\n${toolList}\n\nUse get_tool_help with a specific tool name for detailed information.`
            }]
          };
        }
        
        const desc = toolDescriptions[toolName];
        if (!desc) {
          return {
            content: [{
              type: 'text',
              text: `Unknown tool: ${toolName}. Use {"toolName": "list"} to see all available tools.`
            }]
          };
        }
        
        let helpText = `# ${toolName}\n\n${desc.brief}\n\n## Details\n${desc.detailed}\n\n`;
        
        if (Object.keys(desc.parameterHelp).length > 0) {
          helpText += `## Parameters\n`;
          for (const [param, help] of Object.entries(desc.parameterHelp)) {
            helpText += `- **${param}**: ${help}\n`;
          }
        }
        
        if (examples && toolName in exampleUsage) {
          helpText += `\n## Examples\n${exampleUsage[toolName]}`;
        }
        
        return {
          content: [{ type: 'text', text: helpText }]
        };
      }
    );
    
    // Register system prompts for AI clients
    server.prompt(
      'devonthink_guide',
      'Comprehensive guide for using DEVONthink MCP tools effectively',
      {},
      async () => {
        return {
          content: [{
            type: 'text',
            text: systemPrompt
          }]
        };
      }
    );
    
    server.prompt(
      'research_workflow',
      'Best practices for research workflows with DEVONthink',
      {},
      async () => {
        return {
          content: [{
            type: 'text',
            text: contextPrompts.research
          }]
        };
      }
    );
    
    server.prompt(
      'analysis_workflow',
      'Guide for document analysis tasks',
      {},
      async () => {
        return {
          content: [{
            type: 'text',
            text: contextPrompts.analysis
          }]
        };
      }
    );
    
    server.prompt(
      'organization_workflow',
      'Tips for organizing knowledge in DEVONthink',
      {},
      async () => {
        return {
          content: [{
            type: 'text',
            text: contextPrompts.organization
          }]
        };
      }
    );
    
    // Use STDIO transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('DEVONthink MCP server started and ready to receive requests');
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
main(); 