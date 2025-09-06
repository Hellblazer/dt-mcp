#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { z } from 'zod';
import { DEVONthinkService } from './src/services/devonthink.js';
import { DEVONthinkEnhancedService } from './src/services/devonthink_enhanced.js';
import connectionManager from './src/utils/connection-manager.js';
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
const enhancedDevonthink = new DEVONthinkEnhancedService({
  maxConcurrent: 3,
  resourceMonitorOptions: { autoStart: false }
});

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
      version: '3.0.0'
    });
    
    // ===== UNIFIED SEARCH TOOL =====
    server.tool(
      'search',
      'Unified search: basic, advanced, batch, smart groups. Use mode parameter.',
      {
        mode: z.enum(['basic', 'advanced', 'batch', 'smart_groups']).default('basic')
          .describe('Search mode'),
        query: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Query string(s) - array for batch mode, not needed for smart_groups'),
        database: z.string().optional().describe('Database name'),
        limit: z.number().optional().default(50).describe('Max results'),
        offset: z.number().optional().default(0).describe('Skip results'),
        // Advanced search params
        searchIn: z.enum(['all', 'selected', 'current']).optional(),
        searchScope: z.enum(['content', 'name', 'comment', 'all']).optional(),
        sortBy: z.enum(['relevance', 'date', 'name', 'size']).optional()
      },
      async (params) => {
        const { mode, query, database, limit = 50, offset = 0 } = params;
        
        try {
          // Validate query requirement based on mode
          if (mode !== 'smart_groups' && !query) {
            throw new Error(`Query is required for ${mode} mode`);
          }
          
          switch (mode) {
            case 'basic':
              const adjustedParams = applyClientLimits('search', params);
              const results = await devonthink.search(query, database, adjustedParams.limit, offset);
              return formatClientAwareResponse('search', results, params);
              
            case 'advanced':
              const advResults = await devonthink.advancedSearch({
                query, database, 
                maxResults: limit,
                searchIn: params.searchIn,
                searchScope: params.searchScope,
                sortBy: params.sortBy
              });
              return formatClientAwareResponse('search', advResults, params);
              
            case 'batch':
              if (!Array.isArray(query)) throw new Error('Batch mode requires array of queries');
              const batchResults = await devonthink.batchSearch(query, database, Math.min(20, limit));
              return formatClientAwareResponse('search', batchResults, params);
              
            case 'smart_groups':
              const smartGroups = await devonthink.listSmartGroups(database, limit, offset);
              return formatClientAwareResponse('search', smartGroups, params);
              
            default:
              throw new Error(`Unknown search mode: ${mode}`);
          }
        } catch (error) {
          return formatToolError(error, 'search', params);
        }
      }
    );

    // ===== DOCUMENT OPERATIONS TOOL =====
    server.tool(
      'document',
      'Document operations: read, create, update, delete, OCR',
      {
        operation: z.enum(['read', 'create', 'update', 'delete', 'ocr', 'batch_read'])
          .describe('Operation type'),
        // Common params
        uuid: z.union([z.string(), z.array(z.string())]).optional()
          .describe('Document UUID(s)'),
        // Create params
        name: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(['markdown', 'rtf', 'txt']).optional().default('markdown'),
        groupPath: z.string().optional(),
        // Update params
        tags: z.array(z.string()).optional(),
        // Read params
        includeContent: z.boolean().optional().default(true),
        // Delete params
        confirmDelete: z.boolean().optional().default(true)
      },
      async (params) => {
        const { operation } = params;
        
        try {
          switch (operation) {
            case 'read':
              if (Array.isArray(params.uuid)) {
                // Batch read
                const docs = await devonthink.batchReadDocuments(params.uuid, params.includeContent);
                return { content: [{ type: 'text', text: JSON.stringify(docs, null, 2) }] };
              }
              const doc = await devonthink.readDocument(params.uuid, params.includeContent);
              return { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }] };
              
            case 'create':
              const newDoc = await devonthink.createDocument(
                params.name, params.content, params.type, params.groupPath
              );
              return { content: [{ type: 'text', text: JSON.stringify(newDoc, null, 2) }] };
              
            case 'update':
              const updated = await devonthink.updateTags(params.uuid, params.tags);
              return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
              
            case 'delete':
              const deleted = await devonthink.deleteDocument(params.uuid, params.confirmDelete);
              return { content: [{ type: 'text', text: JSON.stringify(deleted, null, 2) }] };
              
            case 'ocr':
              const ocr = await devonthink.ocrDocument(params.uuid);
              return { content: [{ type: 'text', text: JSON.stringify(ocr, null, 2) }] };
              
            case 'batch_read':
              if (!Array.isArray(params.uuid)) throw new Error('Batch read requires array of UUIDs');
              const batchDocs = await devonthink.batchReadDocuments(params.uuid, params.includeContent);
              return { content: [{ type: 'text', text: JSON.stringify(batchDocs, null, 2) }] };
              
            default:
              throw new Error(`Unknown document operation: ${operation}`);
          }
        } catch (error) {
          return formatToolError(error, 'document', params);
        }
      }
    );

    // ===== SYNTHESIS & ANALYSIS TOOL =====
    server.tool(
      'analyze',
      'Document analysis & synthesis: summarize, extract themes, compare, classify',
      {
        operation: z.enum([
          'synthesize', 'themes', 'summary', 'similarity', 
          'classify', 'analyze', 'compare'
        ]).describe('Analysis operation'),
        documentUuids: z.union([z.string(), z.array(z.string())])
          .describe('Document UUID(s) to analyze'),
        // Synthesis params
        synthesisType: z.enum(['summary', 'consensus', 'insights']).optional().default('summary'),
        summaryLevel: z.enum(['brief', 'detailed', 'full']).optional().default('brief'),
        // Comparison params
        maxResults: z.number().optional().default(10)
      },
      async (params) => {
        const { operation, documentUuids } = params;
        const uuids = Array.isArray(documentUuids) ? documentUuids : [documentUuids];
        
        try {
          switch (operation) {
            case 'synthesize':
              const synthesis = await devonthink.synthesizeDocuments(
                uuids, params.synthesisType
              );
              return { content: [{ type: 'text', text: JSON.stringify(synthesis, null, 2) }] };
              
            case 'themes':
              const themes = await devonthink.extractThemes(uuids);
              return { content: [{ type: 'text', text: JSON.stringify(themes, null, 2) }] };
              
            case 'summary':
              const summary = await devonthink.createMultiLevelSummary(
                uuids, params.summaryLevel
              );
              return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
              
            case 'similarity':
              const similarity = await devonthink.analyzeDocumentSimilarity(uuids);
              return { content: [{ type: 'text', text: JSON.stringify(similarity, null, 2) }] };
              
            case 'classify':
              const classification = await devonthink.classifyDocument(uuids[0]);
              return { content: [{ type: 'text', text: JSON.stringify(classification, null, 2) }] };
              
            case 'analyze':
              const analysis = await devonthink.analyzeDocument(uuids[0]);
              return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] };
              
            case 'compare':
              if (uuids.length < 2) throw new Error('Compare requires at least 2 documents');
              const comparison = await devonthink.compareDocuments(uuids[0], uuids[1]);
              return { content: [{ type: 'text', text: JSON.stringify(comparison, null, 2) }] };
              
            default:
              throw new Error(`Unknown analysis operation: ${operation}`);
          }
        } catch (error) {
          return formatToolError(error, 'analyze', params);
        }
      }
    );

    // ===== KNOWLEDGE GRAPH TOOL =====
    server.tool(
      'graph',
      'Knowledge graph operations: build, find paths, detect clusters, connections',
      {
        operation: z.enum(['build', 'path', 'clusters', 'connections', 'timeline'])
          .describe('Graph operation'),
        uuid: z.string().optional().describe('Starting document UUID'),
        targetUuid: z.string().optional().describe('Target UUID for pathfinding'),
        maxDepth: z.number().optional().default(3).describe('Max traversal depth'),
        searchQuery: z.string().optional().describe('Query for cluster detection'),
        minClusterSize: z.number().optional().default(3)
      },
      async (params) => {
        const { operation } = params;
        
        try {
          switch (operation) {
            case 'build':
              const graph = await devonthink.buildKnowledgeGraph(params.uuid, params.maxDepth);
              return { content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }] };
              
            case 'path':
              if (!params.uuid || !params.targetUuid) {
                throw new Error('Path finding requires both uuid and targetUuid');
              }
              const path = await devonthink.findShortestPath(
                params.uuid, params.targetUuid, params.maxDepth || 5
              );
              return { content: [{ type: 'text', text: JSON.stringify(path, null, 2) }] };
              
            case 'clusters':
              const clusters = await devonthink.detectKnowledgeClusters(
                params.searchQuery || '', 50, params.minClusterSize
              );
              return { content: [{ type: 'text', text: JSON.stringify(clusters, null, 2) }] };
              
            case 'connections':
              const connections = await devonthink.findConnections(params.uuid, 10);
              return { content: [{ type: 'text', text: JSON.stringify(connections, null, 2) }] };
              
            case 'timeline':
              // Assuming we have document UUIDs to build timeline from
              const timeline = await devonthink.createKnowledgeTimeline([params.uuid]);
              return { content: [{ type: 'text', text: JSON.stringify(timeline, null, 2) }] };
              
            default:
              throw new Error(`Unknown graph operation: ${operation}`);
          }
        } catch (error) {
          return formatToolError(error, 'graph', params);
        }
      }
    );

    // ===== ORGANIZATION TOOL =====
    server.tool(
      'organize',
      'Organization: groups, collections, tags, auto-organize',
      {
        operation: z.enum([
          'create_group', 'create_collection', 'move', 'bulk_tag', 
          'auto_organize', 'folder_structure'
        ]).describe('Organization operation'),
        name: z.string().optional(),
        description: z.string().optional(),
        path: z.string().optional(),
        documentUuids: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        tagAction: z.enum(['add', 'remove', 'replace']).optional().default('add'),
        targetGroup: z.string().optional(),
        structure: z.object({}).passthrough().optional(),
        organizationMode: z.enum(['type', 'date', 'size', 'content']).optional().default('type')
      },
      async (params) => {
        const { operation } = params;
        
        try {
          switch (operation) {
            case 'create_group':
              const group = await enhancedDevonthink.createGroup({
                name: params.name,
                description: params.description,
                parentGroup: params.path,
                tags: params.tags
              });
              return { content: [{ type: 'text', text: JSON.stringify(group, null, 2) }] };
              
            case 'create_collection':
              const collection = await devonthink.createCollection(
                params.name, params.description
              );
              return { content: [{ type: 'text', text: JSON.stringify(collection, null, 2) }] };
              
            case 'move':
              const moved = await enhancedDevonthink.moveToGroup(
                params.documentUuids, params.targetGroup
              );
              return { content: [{ type: 'text', text: JSON.stringify(moved, null, 2) }] };
              
            case 'bulk_tag':
              const tagged = await enhancedDevonthink.bulkTag(
                params.documentUuids, params.tagAction, params.tags
              );
              return { content: [{ type: 'text', text: JSON.stringify(tagged, null, 2) }] };
              
            case 'auto_organize':
              const organized = await enhancedDevonthink.autoOrganizeByType({
                sourceGroupUuid: params.path,
                organizationMode: params.organizationMode,
                createSubfolders: true
              });
              return { content: [{ type: 'text', text: JSON.stringify(organized, null, 2) }] };
              
            case 'folder_structure':
              const folders = await enhancedDevonthink.createFolderStructure({
                structure: params.structure,
                rootGroup: params.path,
                overwriteExisting: false
              });
              return { content: [{ type: 'text', text: JSON.stringify(folders, null, 2) }] };
              
            default:
              throw new Error(`Unknown organization operation: ${operation}`);
          }
        } catch (error) {
          return formatToolError(error, 'organize', params);
        }
      }
    );

    // ===== IMPORT/EXPORT TOOL =====
    server.tool(
      'import',
      'Import content: URLs, papers, batch import',
      {
        type: z.enum(['url', 'paper', 'batch']).describe('Import type'),
        source: z.union([z.string(), z.array(z.string())])
          .describe('URL(s) or paper identifier(s)'),
        paperSource: z.enum(['arxiv', 'doi', 'pubmed']).optional(),
        targetGroup: z.string().optional(),
        tags: z.array(z.string()).optional(),
        extractMetadata: z.boolean().optional().default(true),
        maxConcurrent: z.number().optional().default(3)
      },
      async (params) => {
        const { type, source } = params;
        
        try {
          switch (type) {
            case 'url':
              if (Array.isArray(source)) {
                const urls = await enhancedDevonthink.bulkImportUrls({
                  urls: source,
                  targetGroup: params.targetGroup,
                  tags: params.tags,
                  extractMetadata: params.extractMetadata,
                  maxConcurrent: params.maxConcurrent
                });
                return { content: [{ type: 'text', text: JSON.stringify(urls, null, 2) }] };
              }
              const url = await enhancedDevonthink.importUrl({
                url: source,
                targetGroup: params.targetGroup,
                tags: params.tags,
                extractMetadata: params.extractMetadata
              });
              return { content: [{ type: 'text', text: JSON.stringify(url, null, 2) }] };
              
            case 'paper':
              if (Array.isArray(source)) {
                const papers = await enhancedDevonthink.bulkDownloadPapers({
                  papers: source.map(id => ({
                    source: params.paperSource,
                    identifier: id,
                    targetGroup: params.targetGroup
                  })),
                  tags: params.tags,
                  extractMetadata: params.extractMetadata,
                  maxConcurrent: Math.min(params.maxConcurrent, 2)
                });
                return { content: [{ type: 'text', text: JSON.stringify(papers, null, 2) }] };
              }
              const paper = await enhancedDevonthink.downloadPaper({
                source: params.paperSource,
                identifier: source,
                targetGroup: params.targetGroup,
                tags: params.tags,
                extractMetadata: params.extractMetadata
              });
              return { content: [{ type: 'text', text: JSON.stringify(paper, null, 2) }] };
              
            case 'batch':
              // Generic batch import
              const batch = await enhancedDevonthink.batchImport({
                sources: Array.isArray(source) ? source.map(s => ({
                  type: s.startsWith('http') ? 'url' : 'file',
                  source: s,
                  targetGroup: params.targetGroup
                })) : []
              });
              return { content: [{ type: 'text', text: JSON.stringify(batch, null, 2) }] };
              
            default:
              throw new Error(`Unknown import type: ${type}`);
          }
        } catch (error) {
          return formatToolError(error, 'import', params);
        }
      }
    );

    // ===== RESEARCH WORKFLOW TOOL =====
    server.tool(
      'research',
      'Research workflows: explore topic, organize findings, track evolution',
      {
        workflow: z.enum([
          'explore', 'organize', 'track_evolution', 'trends', 
          'create_project', 'automate'
        ]).describe('Research workflow type'),
        query: z.string().optional().describe('Topic or search query'),
        projectName: z.string().optional(),
        description: z.string().optional(),
        timeRange: z.enum(['week', 'month', 'year', 'all']).optional().default('month'),
        maxResults: z.number().optional().default(50)
      },
      async (params) => {
        const { workflow } = params;
        
        try {
          switch (workflow) {
            case 'explore':
              const exploration = await devonthink.automateResearch('explore_topic', params.query);
              return { content: [{ type: 'text', text: JSON.stringify(exploration, null, 2) }] };
              
            case 'organize':
              const organized = await devonthink.organizeFindings(params.query, params.maxResults);
              return { content: [{ type: 'text', text: JSON.stringify(organized, null, 2) }] };
              
            case 'track_evolution':
              const evolution = await devonthink.trackTopicEvolution(params.query, params.timeRange);
              return { content: [{ type: 'text', text: JSON.stringify(evolution, null, 2) }] };
              
            case 'trends':
              const trends = await devonthink.identifyTrends();
              return { content: [{ type: 'text', text: JSON.stringify(trends, null, 2) }] };
              
            case 'create_project':
              const project = await enhancedDevonthink.createResearchProject({
                projectName: params.projectName,
                description: params.description,
                organizationStructure: 'topic-based'
              });
              return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
              
            case 'automate':
              const automated = await devonthink.automateResearch('explore_topic', params.query);
              return { content: [{ type: 'text', text: JSON.stringify(automated, null, 2) }] };
              
            default:
              throw new Error(`Unknown research workflow: ${workflow}`);
          }
        } catch (error) {
          return formatToolError(error, 'research', params);
        }
      }
    );

    // ===== AI OPERATIONS TOOL =====
    server.tool(
      'ai',
      'AI operations: classify, find similar, get related documents',
      {
        operation: z.enum(['classify', 'similar', 'related']).describe('AI operation'),
        uuid: z.string().describe('Document UUID'),
        limit: z.number().optional().default(10).describe('Max results')
      },
      async (params) => {
        const { operation, uuid, limit } = params;
        
        try {
          switch (operation) {
            case 'classify':
              const classification = await devonthink.classifyDocument(uuid);
              return { content: [{ type: 'text', text: JSON.stringify(classification, null, 2) }] };
              
            case 'similar':
              const similar = await devonthink.getSimilarDocuments(uuid, limit);
              return { content: [{ type: 'text', text: JSON.stringify(similar, null, 2) }] };
              
            case 'related':
              const related = await devonthink.getRelatedDocuments(uuid, limit);
              return { content: [{ type: 'text', text: JSON.stringify(related, null, 2) }] };
              
            default:
              throw new Error(`Unknown AI operation: ${operation}`);
          }
        } catch (error) {
          return formatToolError(error, 'ai', params);
        }
      }
    );

    // ===== SYSTEM TOOL =====
    server.tool(
      'system',
      'System operations: list databases, monitor, performance, help',
      {
        operation: z.enum(['databases', 'monitor', 'performance', 'reset', 'help'])
          .describe('System operation'),
        toolName: z.string().optional().describe('Tool name for help'),
        includeExamples: z.boolean().optional().default(false)
      },
      async (params) => {
        const { operation } = params;
        
        try {
          switch (operation) {
            case 'databases':
              const databases = await devonthink.listDatabases();
              return { content: [{ type: 'text', text: JSON.stringify(databases, null, 2) }] };
              
            case 'monitor':
              const monitor = await enhancedDevonthink.monitorOperations();
              return { content: [{ type: 'text', text: JSON.stringify(monitor, null, 2) }] };
              
            case 'performance':
              const perf = await enhancedDevonthink.getPerformanceReport();
              return { content: [{ type: 'text', text: JSON.stringify(perf, null, 2) }] };
              
            case 'reset':
              const reset = await enhancedDevonthink.resetConnectionState();
              return { content: [{ type: 'text', text: JSON.stringify(reset, null, 2) }] };
              
            case 'help':
              const help = await devonthink.getToolHelp(
                params.toolName || 'list', 
                params.includeExamples
              );
              return { content: [{ type: 'text', text: JSON.stringify(help, null, 2) }] };
              
            default:
              throw new Error(`Unknown system operation: ${operation}`);
          }
        } catch (error) {
          return formatToolError(error, 'system', params);
        }
      }
    );

    // Register system prompt for AI guidance
    server.prompt(
      'devonthink_assistant',
      'DEVONthink Research Assistant - 9 powerful unified tools for knowledge management',
      [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are a DEVONthink Research Assistant with 9 powerful unified tools for knowledge management.

## Quick Reference - 9 Unified Tools

🔍 **search** - Find documents (modes: basic, advanced, batch, smart_groups)
📄 **document** - Manage documents (operations: read, create, update, delete, ocr, batch_read)  
🧠 **analyze** - Analyze & synthesize (operations: analyze, similarity, synthesize, themes, summary, compare)
🕸️ **graph** - Knowledge graphs (operations: build, path, clusters, connections, timeline)
📁 **organize** - Organization (operations: create_group, create_collection, move, bulk_tag, auto_organize, folder_structure)
⬇️ **import** - Import content (operations: url, paper, bulk_urls, bulk_papers, batch)
🔬 **research** - Research workflows (workflows: automate, organize, evolution, trends, project)
🤖 **ai** - AI features (operations: classify, similar, related)
⚙️ **system** - System & help (operations: databases, help, monitor, queue, performance, reset, workflow)

## Example Usage Patterns

**Basic Search:**
search { mode: 'basic', query: 'quantum physics', limit: 10 }

**Create Document:**
document { operation: 'create', name: 'Notes', content: '...', type: 'markdown' }

**Build Knowledge Graph:**
graph { operation: 'build', uuid: 'doc-uuid', maxDepth: 3 }

**Bulk Import Papers:**
import { operation: 'bulk_papers', papers: [...], extractMetadata: true }

## Best Practices
• Use operation/mode/workflow parameters to select specific functions
• All additional parameters are context-dependent
• Check system { operation: 'help', toolName: 'search' } for detailed tool help
• Batch operations available for efficiency (batch_read, bulk_tag, bulk_import)

Your goal: Help users efficiently manage knowledge using these 9 unified tools.`
          }
        }
      ]
    );

    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('DEVONthink MCP server started successfully');
    
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the server
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});