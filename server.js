#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { z } from 'zod';
import { DEVONthinkService } from './src/services/devonthink.js';
import { DEVONthinkEnhancedService } from './src/services/devonthink_enhanced.js';
import { getEnhancedDescription, getParameterDescriptions, toolDescriptions, exampleUsage } from './src/tool-descriptions.js';
// System prompt functionality removed during cleanup
import { formatErrorResponse, formatResponse } from './src/utils/errors.js';
import { 
  detectClient, 
  applyClientLimits, 
  truncateResponse, 
  getClientLimits,
  logLimitApplication,
  enhanceToolDescription 
} from './src/utils/client-limits.js';

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
console.error('DEBUG: About to create enhanced service...');
const enhancedDevonthink = new DEVONthinkEnhancedService({
  maxConcurrent: 3,
  resourceMonitorOptions: { autoStart: false }
});
console.error('DEBUG: Enhanced service created successfully:', enhancedDevonthink.constructor.name);
console.error('DEBUG: Enhanced service has createResearchProject?', typeof enhancedDevonthink.createResearchProject === 'function');

// Helper function to format errors consistently across all tools
function formatToolError(error, toolName, context = {}) {
  const errorMessage = error?.message || error?.error?.message || error?.toString() || 'Unknown error occurred';
  const errorDetails = {
    tool: toolName,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  logger.error(`${toolName} error: ${errorMessage}`);
  
  return {
    content: [{ 
      type: 'text', 
      text: JSON.stringify({
        error: errorMessage,
        details: errorDetails
      }, null, 2) 
    }]
  };
}

// Helper function to apply client limits and format responses
function formatClientAwareResponse(toolName, response, originalParams, clientType = null) {
  const limits = getClientLimits(toolName, clientType);
  
  // Check and potentially truncate response
  const { response: finalResponse, truncated, metadata } = truncateResponse(response, limits);
  
  // Add client context to response
  const clientAwareResponse = {
    ...finalResponse,
    _clientInfo: {
      clientType: limits.clientType,
      clientName: limits.name,
      appliedLimits: {
        maxResults: limits.maxResults,
        maxResponseSize: limits.maxResponseSize,
        responseSize: JSON.stringify(finalResponse).length
      },
      truncated,
      metadata
    }
  };
  
  return {
    content: [{ 
      type: 'text', 
      text: JSON.stringify(clientAwareResponse, null, 2) 
    }]
  };
}


async function main() {
  logger.info('Starting DEVONthink MCP server');
  
  try {
    // Create the server
    const server = new McpServer({
      name: 'DEVONthink MCP',
      version: '2.1.0'
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
        const originalParams = { query, database, limit, offset };
        
        // Apply client-aware limits
        const adjustedParams = applyClientLimits('search_devonthink', originalParams);
        const finalLimit = adjustedParams.limit;
        const clientType = adjustedParams._clientLimits.clientType;
        
        logger.info(`Searching DEVONthink for: ${query} (limit: ${limit} → ${finalLimit} for ${clientType})`);
        logLimitApplication('search_devonthink', originalParams, adjustedParams, adjustedParams._clientLimits.appliedLimits);
        
        try {
          const results = await devonthink.search(query, database, finalLimit, offset);
          return formatClientAwareResponse('search_devonthink', results, originalParams, clientType);
        } catch (error) {
          return formatToolError(error, 'search_devonthink', { query, database, limit: finalLimit, offset });
        }
      }
    );

    server.tool(
      'read_document',
      'Read the content and metadata of a DEVONthink document',
      {
        uuid: z.string().describe('Document UUID'),
        includeContent: z.boolean().optional().default(true).describe('Include document content (default: true)')
      },
      async ({ uuid, includeContent = true }) => {
        logger.info(`Reading document: ${uuid}`);
        try {
          const document = await devonthink.readDocument(uuid, includeContent);
          return {
            content: [{ type: 'text', text: JSON.stringify(document, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'read_document', { uuid, includeContent });
        }
      }
    );

    server.tool(
      'create_document',
      'Create a new document in DEVONthink',
      {
        name: z.string().describe('Document name'),
        content: z.string().describe('Document content'),
        type: z.enum(['markdown', 'rtf', 'txt']).optional().default('markdown').describe('Document type (default: markdown)'),
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
          return formatToolError(error, 'create_document');
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
          return formatToolError(error, 'list_databases');
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
          return formatToolError(error, 'update_tags');
        }
      }
    );

    server.tool(
      'delete_document',
      'Delete a document from DEVONthink (DESTRUCTIVE OPERATION - USE WITH CAUTION)',
      {
        uuid: z.string().describe('Document UUID to delete'),
        confirmDelete: z.boolean().optional().default(true).describe('Whether to show confirmation dialog (default: true)')
      },
      async ({ uuid, confirmDelete = true }) => {
        logger.warn(`DELETE REQUEST for document: ${uuid} (confirm: ${confirmDelete})`);
        try {
          const result = await devonthink.deleteDocument(uuid, confirmDelete);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'delete_document', { uuid, confirmDelete });
        }
      }
    );

    server.tool(
      'get_related_documents',
      'Get documents related to a specific document using DEVONthink AI',
      {
        uuid: z.string().describe('Document UUID'),
        limit: z.number().optional().default(10).describe('Maximum number of related documents (default: 10)')
      },
      async ({ uuid, limit = 10 }) => {
        logger.info(`Getting related documents for: ${uuid}`);
        try {
          const documents = await devonthink.getRelatedDocuments(uuid, limit);
          return {
            content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'get_related_documents');
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
          return formatToolError(error, 'create_smart_group');
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
          return formatToolError(error, 'ocr_document');
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
          return formatToolError(error, 'batch_search');
        }
      }
    );

    server.tool(
      'batch_read_documents',
      'Read multiple documents from DEVONthink simultaneously',
      {
        uuids: z.array(z.string()).describe('Array of document UUIDs'),
        includeContent: z.boolean().optional().default(false).describe('Include document content (default: false)')
      },
      async ({ uuids, includeContent = false }) => {
        logger.info(`Batch reading ${uuids.length} documents`);
        try {
          const documents = await devonthink.batchReadDocuments(uuids, includeContent);
          return {
            content: [{ type: 'text', text: JSON.stringify(documents, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'batch_read_documents');
        }
      }
    );

    // Practical advanced features
    server.tool(
      'find_connections',
      'Find connections between a document and other documents (AI-based, references, etc.)',
      {
        uuid: z.string().describe('Document UUID'),
        maxResults: z.number().optional().default(10).describe('Maximum results to return (default: 10)')
      },
      async ({ uuid, maxResults = 10 }) => {
        logger.info(`Finding connections for document: ${uuid}`);
        try {
          const connections = await devonthink.findConnections(uuid, maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify(connections, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'find_connections');
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
          return formatToolError(error, 'compare_documents');
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
          return formatToolError(error, 'create_collection');
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
          return formatToolError(error, 'add_to_collection');
        }
      }
    );

    // Knowledge Graph Features
    server.tool(
      'build_knowledge_graph',
      'Build a knowledge graph showing document relationships with depth control',
      {
        uuid: z.string().describe('Starting document UUID'),
        maxDepth: z.number().optional().default(3).describe('Maximum traversal depth (default: 3)')
      },
      async ({ uuid, maxDepth = 3 }) => {
        logger.info(`Building knowledge graph from document: ${uuid} with depth: ${maxDepth}`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
        };
        
        try {
          const graph = await devonthink.buildKnowledgeGraph(uuid, maxDepth, progressCallback);
          return {
            content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'build_knowledge_graph');
        }
      }
    );

    server.tool(
      'find_shortest_path',
      'Find the shortest connection path between two documents',
      {
        startUUID: z.string().describe('Starting document UUID'),
        targetUUID: z.string().describe('Target document UUID'),
        maxDepth: z.number().optional().default(5).describe('Maximum search depth (default: 5)')
      },
      async ({ startUUID, targetUUID, maxDepth = 5 }) => {
        logger.info(`Finding shortest path from ${startUUID} to ${targetUUID}`);
        try {
          const path = await devonthink.findShortestPath(startUUID, targetUUID, maxDepth);
          return {
            content: [{ type: 'text', text: JSON.stringify(path, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'find_shortest_path');
        }
      }
    );

    server.tool(
      'detect_knowledge_clusters',
      'Detect clusters of related documents based on tags and connections',
      {
        searchQuery: z.string().optional().default('').describe('Search query to find documents (default: empty - uses current selection)'),
        maxDocuments: z.number().optional().default(50).describe('Maximum documents to analyze (default: 50)'),
        minClusterSize: z.number().optional().default(3).describe('Minimum cluster size (default: 3)')
      },
      async ({ searchQuery = '', maxDocuments = 50, minClusterSize = 3 }) => {
        logger.info(`Detecting knowledge clusters for: ${searchQuery || 'current selection'}`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
        };
        
        try {
          const clusters = await devonthink.detectKnowledgeClusters(searchQuery, maxDocuments, minClusterSize, progressCallback);
          return {
            content: [{ type: 'text', text: JSON.stringify(clusters, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'detect_knowledge_clusters');
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
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
          if (progress.details) {
            logger.debug(`Details: ${JSON.stringify(progress.details)}`);
          }
        };
        
        try {
          const result = await devonthink.automateResearch(workflowType, queryOrUUID, progressCallback);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'automate_research');
        }
      }
    );

    // Organize findings workflow
    server.tool(
      'organize_findings',
      'Organize search results by relevance with performance optimization',
      {
        searchQuery: z.string().describe('Search query to organize results for'),
        maxResults: z.number().optional().default(50).describe('Maximum results to process (default: 50)')
      },
      async ({ searchQuery, maxResults = 50 }) => {
        logger.info(`Organizing findings for: ${searchQuery} with max ${maxResults} results`);
        try {
          const result = await devonthink.automateResearchOptimized(searchQuery, maxResults);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'organize_findings');
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
          return formatToolError(error, 'analyze_document');
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
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
        };
        
        try {
          const analysis = await devonthink.analyzeDocumentSimilarity(uuids, progressCallback);
          return {
            content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'analyze_document_similarity');
        }
      }
    );

    // Phase 4: Knowledge Synthesis
    server.tool(
      'synthesize_documents',
      'Create intelligent synthesis from multiple documents (performance-optimized with automatic fallback)',
      {
        documentUUIDs: z.array(z.string()).min(1).describe('Array of document UUIDs to synthesize'),
        synthesisType: z.enum(['summary', 'consensus', 'insights']).optional().default('summary').describe('Type of synthesis (default: summary)')
      },
      async ({ documentUUIDs, synthesisType = 'summary' }) => {
        logger.info(`Synthesizing ${documentUUIDs.length} documents with type: ${synthesisType}`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
          if (progress.details) {
            logger.debug(`Details: ${JSON.stringify(progress.details)}`);
          }
        };
        
        try {
          const synthesis = await devonthink.synthesizeDocuments(documentUUIDs, synthesisType, progressCallback);
          return {
            content: [{ type: 'text', text: JSON.stringify(synthesis, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'synthesize_documents');
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
          return formatToolError(error, 'extract_themes');
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
          return formatToolError(error, 'classify_document');
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
          return formatToolError(error, 'get_similar_documents');
        }
      }
    );

    server.tool(
      'create_multi_level_summary',
      'Create summaries at different levels of detail',
      {
        documentUUIDs: z.array(z.string()).min(1).describe('Array of document UUIDs to summarize'),
        summaryLevel: z.enum(['brief', 'detailed', 'full']).optional().default('brief').describe('Level of detail (default: brief)')
      },
      async ({ documentUUIDs, summaryLevel = 'brief' }) => {
        logger.info(`Creating ${summaryLevel} summary for ${documentUUIDs.length} documents`);
        try {
          const summary = await devonthink.createMultiLevelSummary(documentUUIDs, summaryLevel);
          return {
            content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'create_multi_level_summary');
        }
      }
    );

    server.tool(
      'track_topic_evolution',
      'Track how a topic has evolved over time',
      {
        topic: z.string().describe('Topic or keyword to track'),
        timeRange: z.enum(['week', 'month', 'year', 'all']).optional().default('month').describe('Time range to analyze (default: month)')
      },
      async ({ topic, timeRange = 'month' }) => {
        logger.info(`Tracking evolution of topic: ${topic} over ${timeRange}`);
        try {
          const evolution = await devonthink.trackTopicEvolution(topic, timeRange);
          return {
            content: [{ type: 'text', text: JSON.stringify(evolution, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'track_topic_evolution');
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
          return formatToolError(error, 'create_knowledge_timeline');
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
          return formatToolError(error, 'identify_trends');
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
          return formatToolError(error, 'advanced_search');
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
          return formatToolError(error, 'list_smart_groups');
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
        examples: z.boolean().optional().default(false).describe('Include usage examples (default: false)')
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

    // Phase 1 Infrastructure Tools - Critical Research Automation Capabilities
    server.tool(
      'import_url',
      'Import a URL into DEVONthink with security validation and metadata extraction',
      {
        url: z.string().url().describe('URL to import (must be valid HTTP/HTTPS)'),
        name: z.string().optional().describe('Custom name for the imported document (optional)'),
        targetGroup: z.string().optional().describe('Target group path (optional)'),
        extractMetadata: z.boolean().optional().default(false).describe('Extract metadata from imported content'),
        tags: z.array(z.string()).optional().describe('Tags to apply to imported document')
      },
      async ({ url, name, targetGroup, extractMetadata = false, tags = [] }) => {
        logger.info(`Importing URL: ${url} to group: ${targetGroup || 'default'}`);
        try {
          const result = await devonthink.importUrl(url, targetGroup, extractMetadata, tags, name);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'import_url');
        }
      }
    );

    server.tool(
      'create_group',
      'Create hierarchical groups/folders in DEVONthink for project organization',
      {
        name: z.string().min(1).describe('Group name (required, non-empty)'),
        parentGroup: z.string().optional().describe('Parent group path (optional)'),
        description: z.string().optional().describe('Group description'),
        tags: z.array(z.string()).optional().describe('Tags for the group')
      },
      async ({ name, parentGroup, description, tags = [] }) => {
        logger.info(`Creating group: ${name} under parent: ${parentGroup || 'root'}`);
        try {
          const result = await devonthink.createGroup(name, parentGroup, description, tags);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'create_group');
        }
      }
    );

    server.tool(
      'download_paper',
      'Download academic papers from arXiv, DOI, or PubMed with automatic metadata extraction',
      {
        source: z.enum(['arxiv', 'doi', 'pubmed']).describe('Academic source type'),
        identifier: z.string().min(1).describe('Paper identifier (arXiv ID, DOI, or PubMed ID)'),
        targetGroup: z.string().optional().describe('Target group for downloaded paper'),
        extractMetadata: z.boolean().optional().default(true).describe('Extract paper metadata'),
        tags: z.array(z.string()).optional().describe('Tags to apply to downloaded paper')
      },
      async ({ source, identifier, targetGroup, extractMetadata = true, tags = [] }) => {
        logger.info(`Downloading ${source} paper: ${identifier} to group: ${targetGroup || 'default'}`);
        try {
          const result = await devonthink.downloadPaper(source, identifier, targetGroup, extractMetadata, tags);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'download_paper');
        }
      }
    );

    server.tool(
      'move_to_group',
      'Move documents to different groups with batch support and failure tracking',
      {
        documentUuids: z.union([z.string(), z.array(z.string())]).describe('Document UUID(s) to move'),
        targetGroup: z.string().min(1).describe('Target group path (required)')
      },
      async ({ documentUuids, targetGroup }) => {
        const uuids = Array.isArray(documentUuids) ? documentUuids : [documentUuids];
        logger.info(`Moving ${uuids.length} documents to group: ${targetGroup}`);
        try {
          const result = await devonthink.moveToGroup(uuids, targetGroup);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'move_to_group');
        }
      }
    );

    server.tool(
      'create_folder_structure',
      'Create nested folder hierarchies with batch support and conflict handling',
      {
        structure: z.record(z.any()).describe('Nested object representing folder structure (use null for leaf folders)'),
        rootGroup: z.string().optional().describe('Root group path for the structure'),
        database: z.string().optional().describe('Target database name'),
        overwriteExisting: z.boolean().optional().default(false).describe('Whether to update existing groups')
      },
      async ({ structure, rootGroup, database, overwriteExisting }) => {
        logger.info(`Creating folder structure with ${Object.keys(structure).length} top-level folders`);
        try {
          const result = await devonthink.createFolderStructure(structure, rootGroup, database, overwriteExisting);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'create_folder_structure');
        }
      }
    );

    server.tool(
      'bulk_tag',
      'Apply tag operations to multiple documents efficiently',
      {
        documentUuids: z.array(z.string()).describe('Array of document UUIDs to process'),
        action: z.enum(['add', 'remove', 'replace']).describe('Tag action to perform'),
        tags: z.array(z.string()).describe('Array of tags to apply')
      },
      async ({ documentUuids, action, tags }) => {
        try {
          const result = await devonthink.bulkTag(documentUuids, action, tags);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'bulk_tag');
        }
      }
    );

    server.tool(
      'batch_import',
      'Process multiple import sources concurrently with progress tracking',
      {
        sources: z.array(z.object({
          type: z.enum(['url', 'file', 'paper']).describe('Import source type'),
          source: z.string().describe('Source identifier (URL, file path, or paper ID)'),
          targetGroup: z.string().describe('Target group for imported content'),
          tags: z.array(z.string()).optional().describe('Tags to apply to imported document'),
          metadata: z.any().optional().describe('Additional metadata for the import')
        })).describe('Array of import sources to process'),
        database: z.string().optional().describe('Target database name'),
        progressCallback: z.boolean().optional().default(false).describe('Whether to provide progress updates')
      },
      async ({ sources, database, progressCallback = false }) => {
        try {
          const result = await devonthink.batchImport(sources, database, progressCallback);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'batch_import');
        }
      }
    );

    server.tool(
      'auto_organize_by_type',
      'Automatically organize documents by type with smart categorization and folder creation',
      {
        sourceGroupUuid: z.string().optional().default('').describe('Source group UUID to organize (empty for current selection or all documents)'),
        organizationMode: z.enum(['type', 'date', 'size', 'content']).optional().default('type').describe('Organization mode: type (by file extension), date (by creation date), size (by file size), or content (by document type)'),
        createSubfolders: z.boolean().optional().default(true).describe('Whether to create subfolders for organization categories')
      },
      async ({ sourceGroupUuid = '', organizationMode = 'type', createSubfolders = true }) => {
        try {
          const result = await devonthink.autoOrganizeByType(sourceGroupUuid, organizationMode, createSubfolders);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'auto_organize_by_type');
        }
      }
    );

    // Phase 4: Advanced Research Automation - Bulk Operations & Workflow Orchestration
    server.tool(
      'bulk_import_urls',
      'Import multiple URLs concurrently with progress tracking and resource monitoring',
      {
        urls: z.array(z.string().url()).describe('Array of URLs to import'),
        targetGroup: z.string().optional().describe('Target group path for imported documents'),
        maxConcurrent: z.number().optional().default(3).describe('Maximum concurrent imports (default: 3)'),
        extractMetadata: z.boolean().optional().default(true).describe('Extract metadata from imported content'),
        tags: z.array(z.string()).optional().describe('Tags to apply to all imported documents')
      },
      async ({ urls, targetGroup, maxConcurrent = 3, extractMetadata = true, tags = [] }) => {
        logger.info(`Bulk importing ${urls.length} URLs with concurrency: ${maxConcurrent}`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
        };
        
        try {
          const result = await enhancedDevonthink.bulkImportUrls(
            urls, 
            { targetGroup, extractMetadata, tags }, 
            progressCallback
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'bulk_import_urls');
        }
      }
    );

    server.tool(
      'bulk_download_papers',
      'Download multiple academic papers concurrently with metadata extraction',
      {
        papers: z.array(z.object({
          source: z.enum(['arxiv', 'doi', 'pubmed']).describe('Academic source type'),
          identifier: z.string().describe('Paper identifier'),
          targetGroup: z.string().optional().describe('Target group for this paper')
        })).describe('Array of papers to download'),
        defaultTargetGroup: z.string().optional().describe('Default target group for papers without specific group'),
        maxConcurrent: z.number().optional().default(2).describe('Maximum concurrent downloads (default: 2)'),
        extractMetadata: z.boolean().optional().default(true).describe('Extract paper metadata'),
        tags: z.array(z.string()).optional().describe('Tags to apply to all downloaded papers')
      },
      async ({ papers, defaultTargetGroup, maxConcurrent = 2, extractMetadata = true, tags = [] }) => {
        logger.info(`Bulk downloading ${papers.length} papers with concurrency: ${maxConcurrent}`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
        };
        
        try {
          const result = await enhancedDevonthink.bulkDownloadPapers(
            papers, 
            { defaultTargetGroup, extractMetadata, tags }, 
            progressCallback
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'bulk_download_papers');
        }
      }
    );

    server.tool(
      'create_research_project',
      'Create comprehensive research project structure with automated organization',
      {
        projectName: z.string().min(1).describe('Research project name'),
        description: z.string().describe('Project description'),
        initialSources: z.array(z.object({
          type: z.enum(['url', 'paper', 'search']).describe('Source type'),
          source: z.string().describe('Source identifier'),
          metadata: z.any().optional().describe('Additional metadata')
        })).optional().describe('Initial sources to import'),
        database: z.string().optional().describe('Target database name'),
        organizationStructure: z.enum(['topic-based', 'chronological', 'source-based']).optional().default('topic-based').describe('Organization structure')
      },
      async ({ projectName, description, initialSources = [], database, organizationStructure = 'topic-based' }) => {
        logger.info(`Creating research project: ${projectName} with ${initialSources.length} initial sources`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
          if (progress.details) {
            logger.debug(`Details: ${JSON.stringify(progress.details)}`);
          }
        };
        
        try {
          const config = {
            projectName,
            description,
            database,
            initialPapers: initialSources?.filter(s => s.type === 'paper') || [],
            initialUrls: initialSources?.filter(s => s.type === 'url') || [],
            organizationStructure
          };
          logger.info(`DEBUG: Calling createResearchProject with config: ${JSON.stringify(config, null, 2)}`);
          console.error('DEBUG: About to call enhancedDevonthink.createResearchProject with config:', JSON.stringify(config, null, 2));
          const result = await enhancedDevonthink.createResearchProject(config);
          console.error('DEBUG: createResearchProject returned result:', JSON.stringify(result, null, 2));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          console.error('DEBUG: createResearchProject threw error:', error);
          console.error('DEBUG: Error message:', error.message);
          console.error('DEBUG: Error stack:', error.stack);
          return formatToolError(error, 'create_research_project');
        }
      }
    );

    server.tool(
      'execute_workflow',
      'Execute predefined research workflows with multi-step orchestration',
      {
        templateId: z.enum(['academic_research', 'literature_review', 'data_collection']).describe('Workflow template ID'),
        parameters: z.object({
          topic: z.string().optional().describe('Research topic'),
          targetGroup: z.string().optional().describe('Target group for results'),
          maxResults: z.number().optional().describe('Maximum results per step'),
          databases: z.array(z.string()).optional().describe('Databases to search'),
          timeRange: z.string().optional().describe('Time range for searches'),
          additionalMetadata: z.any().optional().describe('Additional workflow metadata')
        }).describe('Workflow parameters'),
        options: z.object({
          maxConcurrent: z.number().optional().default(3).describe('Maximum concurrent operations'),
          timeout: z.number().optional().default(300000).describe('Workflow timeout in milliseconds'),
          saveProgress: z.boolean().optional().default(true).describe('Save workflow progress')
        }).optional().describe('Execution options')
      },
      async ({ templateId, parameters, options = {} }) => {
        logger.info(`Executing workflow: ${templateId} with topic: ${parameters.topic || 'unspecified'}`);
        
        const progressCallback = (progress) => {
          logger.debug(`Progress: ${progress.operation} - ${progress.stage} (${progress.progress}%)`);
          if (progress.details) {
            logger.debug(`Details: ${JSON.stringify(progress.details)}`);
          }
        };
        
        try {
          const result = await enhancedDevonthink.workflowAutomation.executeWorkflow(
            templateId,
            parameters,
            { ...options, progressCallback }
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'execute_workflow');
        }
      }
    );

    server.tool(
      'monitor_operations',
      'Monitor active operations and system resources with real-time status',
      {
        includeCompleted: z.boolean().optional().default(false).describe('Include completed operations'),
        includeResourceMetrics: z.boolean().optional().default(true).describe('Include resource usage metrics')
      },
      async ({ includeCompleted = false, includeResourceMetrics = true }) => {
        logger.info('Monitoring operations and system resources');
        
        try {
          const operationStatus = enhancedDevonthink.operationQueue.getStatus();
          const progressInfo = enhancedDevonthink.progressTracker.getAllOperations();
          
          let result = {
            operations: operationStatus,
            progress: progressInfo,
            timestamp: new Date().toISOString()
          };
          
          if (includeResourceMetrics) {
            result.resources = enhancedDevonthink.resourceMonitor.getCurrentMetrics();
          }
          
          if (includeCompleted) {
            result.completedOperations = enhancedDevonthink.operationQueue.getCompletedOperations();
          }
          
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'monitor_operations');
        }
      }
    );

    server.tool(
      'manage_operation_queue',
      'Manage the operation queue with priority control and resource limits',
      {
        action: z.enum(['pause', 'resume', 'clear', 'set_concurrency', 'cancel_operation']).describe('Queue management action'),
        operationId: z.string().optional().describe('Specific operation ID (for cancel_operation)'),
        maxConcurrent: z.number().optional().describe('New concurrency limit (for set_concurrency)'),
        priority: z.number().optional().describe('Priority level for queue operations')
      },
      async ({ action, operationId, maxConcurrent, priority }) => {
        logger.info(`Managing operation queue: ${action} ${operationId ? 'for ' + operationId : ''}`);
        
        try {
          let result;
          
          switch (action) {
            case 'pause':
              enhancedDevonthink.operationQueue.pause();
              result = { action: 'paused', status: 'success' };
              break;
              
            case 'resume':
              enhancedDevonthink.operationQueue.resume();
              result = { action: 'resumed', status: 'success' };
              break;
              
            case 'clear':
              enhancedDevonthink.operationQueue.clear();
              result = { action: 'cleared', status: 'success' };
              break;
              
            case 'set_concurrency':
              if (maxConcurrent) {
                enhancedDevonthink.operationQueue.setMaxConcurrent(maxConcurrent);
                result = { action: 'concurrency_set', maxConcurrent, status: 'success' };
              } else {
                throw new Error('maxConcurrent parameter required for set_concurrency action');
              }
              break;
              
            case 'cancel_operation':
              if (operationId) {
                await enhancedDevonthink.operationQueue.cancelOperation(operationId);
                result = { action: 'operation_cancelled', operationId, status: 'success' };
              } else {
                throw new Error('operationId parameter required for cancel_operation action');
              }
              break;
              
            default:
              throw new Error(`Unknown action: ${action}`);
          }
          
          result.queueStatus = enhancedDevonthink.operationQueue.getStatus();
          
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          return formatToolError(error, 'manage_operation_queue');
        }
      }
    );
    
    // Register system prompt for client guidance
    server.prompt(
      'devonthink_research_assistant',
      'DEVONthink Research Assistant - Expert guidance for academic research and knowledge management',
      [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are a DEVONthink Research Assistant with access to 47 specialized tools for advanced research automation. You help users conduct comprehensive research, organize knowledge, and automate complex academic workflows.

## Your Capabilities

**Phase 4: Advanced Research Automation** (Current System)
- 🔄 **Bulk Operations**: Import 100+ URLs, download academic papers in batches
- 🤖 **Workflow Automation**: Execute multi-step research pipelines
- 📊 **Progress Monitoring**: Real-time tracking of long-running operations
- 🧠 **AI-Powered Organization**: Native DEVONthink AI for classification and similarity

## Tool Categories (47 Tools Total)

### 🔍 **Core Operations** (8 tools)
\`search_devonthink\`, \`read_document\`, \`create_document\`, \`list_databases\`, \`update_tags\`, \`delete_document\`, \`get_related_documents\`, \`ocr_document\`

### 📚 **Advanced Search** (2 tools)  
\`advanced_search\` (Boolean, field searches), \`list_smart_groups\` (organizational features)

### 🕸️ **Knowledge Graphs** (5 tools)
\`build_knowledge_graph\`, \`find_shortest_path\`, \`detect_knowledge_clusters\`, \`find_connections\`, \`compare_documents\`

### 🔬 **Research Automation** (3 tools)
\`automate_research\`, \`organize_findings\`, \`create_collection\`

### 🧠 **Document Intelligence** (3 tools)
\`analyze_document\`, \`analyze_document_similarity\`, \`batch_read_documents\`

### 🎯 **Knowledge Synthesis** (8 tools)
\`synthesize_documents\`, \`extract_themes\`, \`classify_document\`, \`get_similar_documents\`, \`create_multi_level_summary\`, \`track_topic_evolution\`, \`create_knowledge_timeline\`, \`identify_trends\`

### ⚡ **Phase 4: Bulk Operations** (9 tools)
\`import_url\`, \`create_group\`, \`download_paper\`, \`move_to_group\`, \`create_folder_structure\`, \`bulk_tag\`, \`batch_import\`, \`auto_organize_by_type\`, \`create_smart_group\`

### 🚀 **Phase 4: Advanced Automation** (6 tools)
\`bulk_import_urls\`, \`bulk_download_papers\`, \`create_research_project\`, \`execute_workflow\`, \`monitor_operations\`, \`manage_operation_queue\`

### 📊 **Batch Processing** (2 tools)
\`batch_search\`, \`batch_read_documents\`

### 🗂️ **Collections** (2 tools)
\`create_collection\`, \`add_to_collection\`

## Research Workflow Patterns

### 🎓 **Academic Research Pipeline**
1. \`create_research_project\` → Set up complete project structure
2. \`bulk_download_papers\` → Collect literature from arXiv, PubMed, DOI
3. \`synthesize_documents\` → Generate insights and consensus
4. \`track_topic_evolution\` → Analyze research trends
5. \`create_multi_level_summary\` → Generate reports

### 📖 **Literature Review Workflow**
1. \`advanced_search\` → Complex queries with Boolean operators
2. \`detect_knowledge_clusters\` → Group related documents
3. \`build_knowledge_graph\` → Map relationships
4. \`create_knowledge_timeline\` → Chronological analysis
5. \`automate_research\` → Automated workflow execution

### 🌐 **Content Curation Pipeline**
1. \`bulk_import_urls\` → Import reading lists and bookmarks
2. \`auto_organize_by_type\` → AI-powered organization  
3. \`bulk_tag\` → Batch categorization
4. \`create_smart_group\` → Dynamic collections

## Performance Guidelines

### ⚡ **Optimized Operations**
- \`synthesize_documents\`: 30x faster with intelligent sampling
- \`analyze_document_similarity\`: 120x faster with 100-word sampling
- \`bulk_import_urls\`: Concurrent processing of 10-50 URLs
- \`bulk_download_papers\`: Parallel downloads with metadata extraction

### 📏 **Recommended Limits**
- Batch operations: 10-50 items for optimal performance
- Document synthesis: 2-15 documents recommended, 50 maximum
- Knowledge graphs: Depth 3-5 for comprehensive exploration
- URL imports: 10-50 URLs per batch, 100 maximum

## AI Integration

### 🤖 **Native DEVONthink AI**
- \`classify_document\`: Pre-trained classification models
- \`get_similar_documents\`: Semantic similarity detection
- \`detect_knowledge_clusters\`: AI-powered document grouping
- Uses DEVONthink 4's trained AI rather than reimplementation

## Best Practices

### 🎯 **Tool Selection**
- Use \`get_tool_help\` to explore available tools and examples
- Start with \`list_databases\` to understand available data
- Use \`advanced_search\` for complex queries with operators
- Prefer bulk operations for efficiency (\`bulk_import_urls\`, \`bulk_download_papers\`)

### 📊 **Monitoring & Management**
- Use \`monitor_operations\` to track long-running processes
- Use \`manage_operation_queue\` to control resource usage
- Check progress regularly with real-time status updates

### 🔍 **Search Strategies**
- Boolean operators: "AI AND (ethics OR safety)"
- Field searches: "kind:PDF tag:research created:>=2023"
- Fuzzy matching: "~quantum" for approximate matches
- Date ranges: "modified:<=7days" for recent documents

Your goal is to help users conduct thorough, efficient research while leveraging DEVONthink's native AI capabilities and the advanced automation features of Phase 4.`
          }
        }
      ]
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