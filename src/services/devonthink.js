import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ErrorTypes, createError, errorHandlers, validators, formatResponse, createSuccessResponse, withProgress, withTimeout, createProgressUpdate } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

export class DEVONthinkService {
  constructor() {
    this.scriptsPath = path.join(__dirname, '../../scripts/devonthink');
  }

  async ensureDEVONthinkRunning() {
    const checkScript = path.join(this.scriptsPath, 'check_devonthink.applescript');
    try {
      const { stdout } = await execAsync(`osascript "${checkScript}"`);
      const result = JSON.parse(stdout.trim());
      if (result.status === 'error') {
        throw errorHandlers.devonthinkNotRunning();
      }
      return result;
    } catch (error) {
      if (error.error) throw error;
      throw errorHandlers.devonthinkNotRunning();
    }
  }

  async runAppleScript(scriptName, args = []) {
    // Check if DEVONthink is running first
    await this.ensureDEVONthinkRunning();
    const scriptPath = path.join(this.scriptsPath, `${scriptName}.applescript`);
    const escapedArgs = args.map(arg => {
      // Convert to string and handle undefined/null
      const argStr = String(arg || '');
      return `"${argStr.replace(/"/g, '\\"')}"`;
    }).join(' ');
    const command = `osascript "${scriptPath}" ${escapedArgs}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large documents
      });

      if (stderr) {
        console.error(`AppleScript stderr: ${stderr}`);
      }

      // Parse JSON output
      try {
        const parsed = JSON.parse(stdout.trim());
        // Check if the response has an error field
        if (parsed && parsed.error) {
          throw errorHandlers.scriptExecutionFailed(scriptName, parsed.error);
        }
        return parsed;
      } catch (e) {
        // If JSON parsing failed, return as string
        if (e instanceof SyntaxError) {
          return stdout.trim();
        }
        // Re-throw if it's an actual error
        throw e;
      }
    } catch (error) {
      throw errorHandlers.scriptExecutionFailed(scriptName, error.message);
    }
  }

  async search(query, database, limit = 50, offset = 0) {
    // Validate parameters
    limit = validators.validateLimit(limit);
    offset = validators.validateOffset(offset);
    
    const args = database ? [query, database] : [query];
    
    try {
      const response = await this.runAppleScript('search', args);
      
      // Handle the new response format
      let results, totalFound, wasTruncated;
      
      // If response is a string, try to parse it
      let parsedResponse = response;
      if (typeof response === 'string') {
        try {
          parsedResponse = JSON.parse(response);
        } catch (e) {
          // If parsing fails, treat as error
          results = [];
          totalFound = 0;
          wasTruncated = false;
        }
      }
      
      if (parsedResponse && parsedResponse.results !== undefined) {
        // New format with metadata
        results = parsedResponse.results || [];
        totalFound = parsedResponse.totalFound || results.length;
        wasTruncated = parsedResponse.truncated || false;
      } else if (Array.isArray(parsedResponse)) {
        // Legacy format - just an array
        results = parsedResponse;
        totalFound = results.length;
        wasTruncated = false;
      } else {
        // Error or unexpected format
        results = [];
        totalFound = 0;
        wasTruncated = false;
      }
      
      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);
      
      return createSuccessResponse({
        query,
        database: database || 'all',
        results: paginatedResults,
        pagination: {
          offset,
          limit,
          totalCount: totalFound,
          hasMore: offset + limit < totalFound,
          nextOffset: offset + limit < totalFound ? offset + limit : null,
          wasTruncated
        }
      }, {
        tool: 'search_devonthink',
        resultsReturned: paginatedResults.length
      });
    } catch (error) {
      if (error.error) {
        // Already a structured error
        throw error;
      }
      throw errorHandlers.scriptExecutionFailed('search', {
        originalError: error.message,
        query: query,
        context: 'Document search operation failed'
      });
    }
  }

  async readDocument(uuid, includeContent = true) {
    // Validate UUID
    validators.validateUUID(uuid, 'uuid');
    
    const format = includeContent ? 'full' : 'metadata';
    const result = await this.runAppleScript('read_document', [uuid, format]);
    
    if (result.error) {
      throw errorHandlers.documentNotFound(uuid);
    }
    
    // When format is 'metadata', the AppleScript returns the metadata directly
    // When format is 'full', it returns an object with metadata and content properties
    return includeContent ? result : (result.metadata || result);
  }

  async createDocument(name, content, type = 'markdown', groupPath) {
    const args = groupPath ? [name, content, type, groupPath] : [name, content, type];
    return await this.runAppleScript('create_document', args);
  }

  async listDatabases() {
    return await this.runAppleScript('list_databases');
  }

  async updateTags(uuid, tags) {
    validators.validateUUID(uuid, 'uuid');
    validators.validateNonEmptyArray(tags, 'tags');
    return await this.runAppleScript('update_tags', [uuid, tags.join(',')]);
  }

  async getRelatedDocuments(uuid, limit = 10) {
    validators.validateUUID(uuid, 'uuid');
    const validatedLimit = validators.validateLimit(limit, 10, 100);
    return await this.runAppleScript('get_related', [uuid, validatedLimit.toString()]);
  }

  async createSmartGroup(name, searchQuery, database) {
    const args = database ? [name, searchQuery, database] : [name, searchQuery];
    return await this.runAppleScript('create_smart_group', args);
  }

  async ocrDocument(uuid) {
    validators.validateUUID(uuid, 'uuid');
    return await this.runAppleScript('ocr_document', [uuid]);
  }

  async batchSearch(queries, database, maxResultsPerQuery = 20) {
    // Validate queries array
    if (!Array.isArray(queries) || queries.length === 0) {
      throw errorHandlers.invalidParameter('queries', queries, 'non-empty array of search queries');
    }
    
    // Validate maxResultsPerQuery
    maxResultsPerQuery = validators.validateLimit(maxResultsPerQuery, 20, 100);
    
    // Run multiple searches in parallel with result limiting
    const searchPromises = queries.map(async query => {
      const result = await this.search(query, database, maxResultsPerQuery, 0);
      // Extract data from standardized response
      const searchData = result.data || result;
      return searchData.results || [];
    });
    
    const results = await Promise.all(searchPromises);
    const resultMap = results.reduce((acc, curr, index) => {
      acc[queries[index]] = curr;
      return acc;
    }, {});
    
    return createSuccessResponse({
      queries: queries,
      database: database || 'all',
      results: resultMap,
      maxResultsPerQuery: maxResultsPerQuery
    }, {
      tool: 'batch_search',
      queryCount: queries.length,
      totalResults: Object.values(resultMap).reduce((sum, arr) => sum + arr.length, 0)
    });
  }

  async batchReadDocuments(uuids, includeContent = false) {
    // Validate uuids array
    if (!Array.isArray(uuids) || uuids.length === 0) {
      throw errorHandlers.invalidParameter('uuids', uuids, 'non-empty array of document UUIDs');
    }
    
    // Read multiple documents in parallel
    const readPromises = uuids.map(uuid => 
      this.readDocument(uuid, includeContent)
        .then(result => ({ status: 'success', uuid, document: result }))
        .catch(err => ({ status: 'error', uuid, error: err.message }))
    );
    
    const results = await Promise.all(readPromises);
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    return createSuccessResponse({
      documents: successful.map(r => r.document),
      failures: failed,
      includeContent: includeContent
    }, {
      tool: 'batch_read_documents',
      totalRequested: uuids.length,
      successCount: successful.length,
      failureCount: failed.length
    });
  }

  async findConnections(uuid, maxResults = 10) {
    validators.validateUUID(uuid, 'uuid');
    const validatedMaxResults = validators.validateLimit(maxResults, 10, 100);
    return await this.runAppleScript('find_connections', [uuid, validatedMaxResults.toString()]);
  }

  async compareDocuments(uuid1, uuid2) {
    validators.validateUUID(uuid1, 'uuid1');
    validators.validateUUID(uuid2, 'uuid2');
    return await this.runAppleScript('compare_documents', [uuid1, uuid2]);
  }

  async createCollection(name, description, database) {
    const args = database ? [name, description, database] : [name, description];
    return await this.runAppleScript('create_collection', args);
  }

  async addToCollection(collectionUUID, documentUUID, notes = '') {
    validators.validateUUID(collectionUUID, 'collectionUUID');
    validators.validateUUID(documentUUID, 'documentUUID');
    return await this.runAppleScript('add_to_collection', [collectionUUID, documentUUID, notes]);
  }

  async buildKnowledgeGraph(uuid, maxDepth = 3, progressCallback = null) {
    validators.validateUUID(uuid, 'uuid');
    const validatedDepth = validators.validateLimit(maxDepth, 3, 10);
    
    const operationName = 'build_knowledge_graph';
    
    return await withProgress(async () => {
      return await withTimeout(
        this.runAppleScript('build_knowledge_graph', [uuid, validatedDepth.toString()]),
        45000, // 45 second timeout for deep graphs
        operationName,
        progressCallback
      );
    }, operationName, progressCallback);
  }

  async findShortestPath(startUUID, targetUUID, maxDepth = 5) {
    return await this.runAppleScript('find_shortest_path', [startUUID, targetUUID, maxDepth.toString()]);
  }

  async detectKnowledgeClusters(searchQuery = '', maxDocuments = 50, minClusterSize = 3, progressCallback = null) {
    // Use native AI classification for clustering instead of manual algorithms
    const args = searchQuery ? [searchQuery, maxDocuments.toString(), minClusterSize.toString()] : ['', maxDocuments.toString(), minClusterSize.toString()];
    
    const operationName = 'detect_knowledge_clusters';
    
    return await withProgress(async () => {
      return await withTimeout(
        this.runAppleScript('detect_knowledge_clusters_native', args),
        60000, // 60 second timeout for large clustering operations
        operationName,
        progressCallback
      );
    }, operationName, progressCallback);
  }

  async automateResearch(workflowType, queryOrUUID, progressCallback = null) {
    // Pass workflow type and query/UUID to the AppleScript
    const args = [workflowType, queryOrUUID];
    
    const operationName = `automate_research_${workflowType}`;
    
    return await withProgress(async () => {
      return await withTimeout(
        this.runAppleScript('automate_research', args),
        90000, // 90 second timeout for comprehensive research workflows
        operationName,
        progressCallback
      );
    }, operationName, progressCallback);
  }

  async automateResearchOptimized(queryOrUUID, maxResults = 50) {
    return await this.runAppleScript('automate_research_optimized', ['organize_findings', queryOrUUID, maxResults.toString()]);
  }

  async analyzeDocument(uuid, optimized = false) {
    validators.validateUUID(uuid, 'uuid');
    const scriptName = optimized ? 'document_analysis_optimized' : 'document_analysis';
    return await this.runAppleScript(scriptName, [uuid]);
  }

  async analyzeDocumentSimilarity(uuids, progressCallback = null) {
    // Validate UUIDs array
    validators.validateNonEmptyArray(uuids, 'uuids');
    uuids.forEach((uuid, index) => {
      validators.validateUUID(uuid, `uuids[${index}]`);
    });
    
    const operationName = 'analyze_document_similarity';
    
    return await withProgress(async () => {
      return await withTimeout(
        this.runAppleScript('analyze_document_similarity_optimized', uuids),
        20000, // 20 second timeout
        operationName,
        progressCallback
      );
    }, operationName, progressCallback);
  }

  async synthesizeDocuments(documentUUIDs, synthesisType = 'summary', progressCallback = null) {
    // Validate documentUUIDs array
    validators.validateNonEmptyArray(documentUUIDs, 'documentUUIDs');
    
    // Validate each UUID
    documentUUIDs.forEach((uuid, index) => {
      validators.validateUUID(uuid, `documentUUIDs[${index}]`);
    });
    
    const operationName = `synthesize_documents_${synthesisType}`;
    
    return await withProgress(async () => {
      // Use optimized version for better performance
      const args = [synthesisType, ...documentUUIDs];
      
      if (progressCallback) {
        progressCallback(createProgressUpdate(operationName, 'attempting_optimized', 25, { 
          documentCount: documentUUIDs.length,
          synthesisType 
        }));
      }
      
      // Try optimized version first
      try {
        const result = await withTimeout(
          this.runAppleScript('synthesize_documents_optimized', args),
          15000, // 15 second timeout for optimized version
          `${operationName}_optimized`,
          progressCallback
        );
        
        // Check if we got valid results
        const parsed = JSON.parse(result);
        if (parsed.document_count > 0 && parsed.document_titles && parsed.document_titles.length > 0) {
          if (progressCallback) {
            progressCallback(createProgressUpdate(operationName, 'optimized_success', 100, { 
              method: 'optimized',
              documentsProcessed: parsed.document_count 
            }));
          }
          return result;
        }
        // If no documents processed, fall back to native version
        console.log('Optimized version returned no documents, trying native version');
        
        if (progressCallback) {
          progressCallback(createProgressUpdate(operationName, 'fallback_to_native', 50, { 
            reason: 'optimized_returned_no_documents' 
          }));
        }
      } catch (error) {
        console.warn('Optimized synthesis failed:', error.message);
        
        if (progressCallback) {
          progressCallback(createProgressUpdate(operationName, 'fallback_to_native', 50, { 
            reason: 'optimized_failed',
            error: error.message 
          }));
        }
      }
      
      // Fallback to native version
      return await withTimeout(
        this.runAppleScript('synthesize_documents_native', args),
        30000, // 30 second timeout for native version
        `${operationName}_native`,
        progressCallback
      );
    }, operationName, progressCallback);
  }

  async extractThemes(documentUUIDs) {
    // Validate documentUUIDs array
    validators.validateNonEmptyArray(documentUUIDs, 'documentUUIDs');
    // Validate each UUID
    documentUUIDs.forEach((uuid, index) => {
      validators.validateUUID(uuid, `documentUUIDs[${index}]`);
    });
    // Use native AI classification instead of manual word frequency
    return await this.runAppleScript('extract_themes', documentUUIDs);
  }

  async classifyDocument(uuid) {
    validators.validateUUID(uuid, 'uuid');
    // Use DEVONthink's native AI classification
    return await this.runAppleScript('classify_document', [uuid]);
  }

  async getSimilarDocuments(uuid, limit = 10) {
    validators.validateUUID(uuid, 'uuid');
    const validatedLimit = validators.validateLimit(limit, 10, 100);
    // Use DEVONthink's native AI to find similar documents
    return await this.runAppleScript('get_similar_documents', [uuid, validatedLimit.toString()]);
  }

  async createMultiLevelSummary(documentUUIDs, summaryLevel = 'brief') {
    // Validate documentUUIDs array
    validators.validateNonEmptyArray(documentUUIDs, 'documentUUIDs');
    // Validate each UUID
    documentUUIDs.forEach((uuid, index) => {
      validators.validateUUID(uuid, `documentUUIDs[${index}]`);
    });
    // Use native AI-enhanced version
    const args = [summaryLevel, ...documentUUIDs];
    return await this.runAppleScript('create_multi_level_summary_native', args);
  }

  async trackTopicEvolution(topic, timeRange = 'month') {
    return await this.runAppleScript('track_knowledge_evolution', ['evolution', topic, timeRange]);
  }

  async createKnowledgeTimeline(documentUUIDs) {
    const args = ['timeline', ...documentUUIDs];
    return await this.runAppleScript('track_knowledge_evolution', args);
  }

  async identifyTrends(databaseName = '') {
    const args = ['trends', databaseName];
    return await this.runAppleScript('track_knowledge_evolution', args);
  }

  async advancedSearch(query, database = '', searchIn = 'all', maxResults = 100, sortBy = 'relevance', searchScope = 'content') {
    // Use DEVONthink's full search syntax with advanced operators and filtering
    const args = [query, database, searchIn, maxResults.toString(), sortBy, searchScope];
    return await this.runAppleScript('advanced_search', args);
  }

  async listSmartGroups(database = '', limit = 100, offset = 0) {
    // List all smart groups, optionally filtered by database
    const args = database ? [database] : [];
    const allResults = await this.runAppleScript('list_smart_groups', args);
    
    // Extract smart groups array from the response
    const smartGroups = allResults.smart_groups || allResults;
    const totalCount = smartGroups.length;
    const paginatedGroups = smartGroups.slice(offset, offset + limit);
    
    return {
      database_filter: database,
      smart_groups: paginatedGroups,
      pagination: {
        offset,
        limit,
        totalCount,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit < totalCount ? offset + limit : null
      }
    };
  }
}