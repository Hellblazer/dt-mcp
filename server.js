#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { z } from 'zod';
import { DEVONthinkService } from './src/services/devonthink.js';

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
        database: z.string().optional().describe('Specific database name to search in (optional)')
      },
      async ({ query, database }) => {
        logger.info(`Searching DEVONthink for: ${query}`);
        try {
          const results = await devonthink.search(query, database);
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
        database: z.string().optional().describe('Specific database name to search in (optional)')
      },
      async ({ queries, database }) => {
        logger.info(`Batch searching for ${queries.length} queries`);
        try {
          const results = await devonthink.batchSearch(queries, database);
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