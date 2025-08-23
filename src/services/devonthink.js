import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ErrorTypes, createError, errorHandlers, validators, formatResponse, createSuccessResponse, withProgress, withTimeout, createProgressUpdate } from '../utils/errors.js';
import { ExternalAPIService } from './external_apis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

export class DEVONthinkService {
  constructor() {
    this.scriptsPath = path.join(__dirname, '../../scripts/devonthink');
    this.externalAPIs = new ExternalAPIService();
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
    // Validate required parameters
    const validatedName = validators.validateNonEmptyString(name, 'name');
    const validatedContent = validators.validateNonEmptyString(content, 'content');
    
    const args = groupPath ? [validatedName, validatedContent, type, groupPath] : [validatedName, validatedContent, type];
    return await this.runAppleScript('create_document', args);
  }

  async listDatabases() {
    return await this.runAppleScript('list_databases');
  }

  async updateTags(uuid, tags) {
    validators.validateUUID(uuid, 'uuid');
    
    // Handle empty array gracefully - clear all tags
    if (!Array.isArray(tags)) {
      throw errorHandlers.invalidParameter('tags', tags, 'array of tag strings');
    }
    
    return await this.runAppleScript('update_tags', [uuid, tags.join(',')]);
  }
  
  async deleteDocument(uuid, confirmDelete = true) {
    // Validate UUID
    validators.validateUUID(uuid, 'uuid');
    
    const args = [uuid, confirmDelete ? 'true' : 'false'];
    return await this.runAppleScript('delete_document', args);
  }

  async getRelatedDocuments(uuid, limit = 10) {
    validators.validateUUID(uuid, 'uuid');
    const validatedLimit = validators.validateLimit(limit, 10, 100);
    return await this.runAppleScript('get_related', [uuid, validatedLimit.toString()]);
  }

  async createSmartGroup(name, searchQuery, database) {
    // Validate required parameters
    const validatedName = validators.validateNonEmptyString(name, 'name');
    const validatedSearchQuery = validators.validateNonEmptyString(searchQuery, 'searchQuery');
    
    const args = database ? [validatedName, validatedSearchQuery, database] : [validatedName, validatedSearchQuery];
    return await this.runAppleScript('create_smart_group', args);
  }

  async ocrDocument(uuid) {
    validators.validateUUID(uuid, 'uuid');
    
    // Pre-validate document type
    try {
      const metadata = await this.readDocument(uuid, false);
      const documentType = metadata.type || metadata.kind || '';
      const supportedTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'tiff', 'image'];
      
      // Check if document type is supported for OCR
      const typeStr = documentType.toLowerCase();
      const isSupported = supportedTypes.some(supported => 
        typeStr.includes(supported) || typeStr === supported
      );
      
      if (!isSupported) {
        throw errorHandlers.invalidParameter('document type', documentType, 
          `OCR-supported document type. Supported types: ${supportedTypes.join(', ')}`);
      }
    } catch (error) {
      // Re-throw if it's our validation error
      if (error.error && error.error.code === ErrorTypes.INVALID_PARAMETER) {
        throw error;
      }
      // Otherwise continue with OCR attempt (document might exist but metadata read failed)
    }
    
    return await this.runAppleScript('ocr_document', [uuid]);
  }

  async batchSearch(queries, database, maxResultsPerQuery = 20) {
    // Validate queries array
    if (!Array.isArray(queries)) {
      throw errorHandlers.invalidParameter('queries', queries, 'array of search queries');
    }
    
    // Handle empty array gracefully
    if (queries.length === 0) {
      return createSuccessResponse({
        queries: [],
        database: database || 'all',
        results: {},
        maxResultsPerQuery: maxResultsPerQuery,
        message: 'No queries provided'
      });
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
    if (!Array.isArray(uuids)) {
      throw errorHandlers.invalidParameter('uuids', uuids, 'array of document UUIDs');
    }
    
    // Handle empty array gracefully
    if (uuids.length === 0) {
      return createSuccessResponse({
        documents: [],
        successful: [],
        failed: [],
        message: 'No UUIDs provided'
      }, {
        tool: 'batch_read_documents',
        totalRequested: 0,
        successCount: 0,
        failureCount: 0
      });
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
    
    // Custom validation for maxDepth to use correct parameter name
    if (maxDepth === undefined || maxDepth === null) {
      maxDepth = 3;
    }
    const depth = parseInt(maxDepth);
    if (isNaN(depth) || depth < 1 || depth > 10) {
      throw errorHandlers.invalidParameter('maxDepth', maxDepth, 'positive integer between 1 and 10');
    }
    const validatedDepth = depth;
    
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

  async automateResearch(workflowType, queryOrUUID, progressCallback = null, maxResults = null) {
    // Pass workflow type and query/UUID to the AppleScript
    const args = [workflowType, queryOrUUID];
    
    // Add optional maxResults parameter for performance control
    if (maxResults !== null) {
      args.push(maxResults.toString());
    }
    
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

  // ===== PHASE 1 TOOLS: Critical Infrastructure =====

  /**
   * Import URL - Download and import content from URLs with security validation
   * @param {string} url - URL to import
   * @param {string} [targetGroup] - Target group path
   * @param {boolean} [extractMetadata] - Whether to extract document metadata
   * @param {string[]} [tags] - Tags to apply to imported document
   * @param {string} [database] - Target database name
   * @returns {Promise<Object>} Import result with document UUID and metadata
   */
  async importUrl(url, targetGroup = null, extractMetadata = false, tags = null, database = null) {
    try {
      // Validate parameters
      validators.validateNonEmptyString(url, 'url');
      
      // Security validation - check for dangerous protocols
      const blockedProtocols = ['javascript:', 'data:', 'file:', 'ftp:', 'chrome:', 'about:'];
      const urlLower = url.toLowerCase();
      
      for (const protocol of blockedProtocols) {
        if (urlLower.startsWith(protocol)) {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Blocked protocol: ${protocol}`);
        }
      }
      
      // Basic URL format validation
      if (!url.match(/^https?:\/\/.+/)) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Invalid URL format - must start with http:// or https://');
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = ['<script', 'javascript', 'vbscript', 'onload=', 'onerror='];
      for (const pattern of suspiciousPatterns) {
        if (url.toLowerCase().includes(pattern)) {
          throw createError(ErrorTypes.VALIDATION_ERROR, 'Suspicious URL content detected');
        }
      }

      // Build parameters object
      const params = {
        url,
        targetGroup: targetGroup || '',
        extractMetadata: extractMetadata || false,
        tags: tags ? JSON.stringify(tags) : '',
        database: database || ''
      };

      // Execute import with timeout
      const result = await withTimeout(
        this.runAppleScript('import_url', [url, JSON.stringify(params)]),
        30000, // 30 second timeout for network operations
        'URL import operation timed out'
      );

      // Validate result
      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success || !result.uuid) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Import failed - no document UUID returned');
      }

      return createSuccessResponse('URL imported successfully', {
        uuid: result.uuid,
        name: result.name,
        path: result.path,
        metadata: result.metadata || null,
        importedFrom: url,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.error) throw error; // Re-throw formatted errors
      throw createError(ErrorTypes.OPERATION_ERROR, `Import URL failed: ${error.message}`);
    }
  }

  /**
   * Create Group - Create hierarchical folder structure
   * @param {string} name - Group name
   * @param {string} [parentGroup] - Parent group path
   * @param {string} [description] - Group description
   * @param {string[]} [tags] - Tags to apply to group
   * @param {string} [database] - Target database name
   * @returns {Promise<Object>} Created group with UUID and path
   */
  async createGroup(name, parentGroup = null, description = null, tags = null, database = null) {
    try {
      // Validate parameters
      validators.validateNonEmptyString(name, 'name');
      
      if (!name.trim()) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Group name cannot be empty');
      }

      // Build parameters
      const params = {
        name: name.trim(),
        parentGroup: parentGroup || '',
        description: description || '',
        tags: tags ? JSON.stringify(tags) : '',
        database: database || ''
      };

      const result = await this.runAppleScript('create_group', [name, JSON.stringify(params)]);

      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success || !result.uuid) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Group creation failed - no UUID returned');
      }

      return createSuccessResponse('Group created successfully', {
        uuid: result.uuid,
        name: result.name,
        path: result.path,
        description: description,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.error) throw error;
      throw createError(ErrorTypes.OPERATION_ERROR, `Create group failed: ${error.message}`);
    }
  }

  /**
   * Move to Group - Move documents to target group
   * @param {string|string[]} documentUuids - Document UUID(s) to move
   * @param {string} targetGroup - Target group path
   * @param {string} [database] - Target database name
   * @returns {Promise<Object>} Move operation result
   */
  async moveToGroup(documentUuids, targetGroup, database = null) {
    try {
      // Validate parameters
      validators.validateNonEmptyString(targetGroup, 'targetGroup');
      
      if (!documentUuids) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Document UUIDs are required');
      }

      // Normalize to array
      const uuids = Array.isArray(documentUuids) ? documentUuids : [documentUuids];
      
      if (uuids.length === 0) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'At least one document UUID is required');
      }

      // Validate UUIDs
      for (const uuid of uuids) {
        if (!uuid || typeof uuid !== 'string' || !uuid.trim()) {
          throw createError(ErrorTypes.VALIDATION_ERROR, 'Invalid document UUID provided');
        }
      }

      const params = {
        documentUuids: uuids,
        targetGroup,
        database: database || ''
      };

      const result = await this.runAppleScript('move_to_group', [JSON.stringify(params)]);

      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Move operation failed');
      }

      return createSuccessResponse('Documents moved successfully', {
        movedDocuments: result.movedDocuments || uuids.length,
        targetGroup,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.error) throw error;
      throw createError(ErrorTypes.OPERATION_ERROR, `Move to group failed: ${error.message}`);
    }
  }

  /**
   * Download Paper - Download academic papers from various sources with enhanced API integration
   * @param {string} source - Source type (arxiv, doi, pubmed)
   * @param {string} identifier - Paper identifier
   * @param {string} [targetGroup] - Target group path
   * @param {boolean} [extractMetadata] - Whether to extract document metadata
   * @param {string[]} [tags] - Tags to apply to downloaded document
   * @param {string} [database] - Target database name
   * @returns {Promise<Object>} Download result with document UUID and metadata
   */
  async downloadPaper(source, identifier, targetGroup = null, extractMetadata = false, tags = null, database = null) {
    try {
      // Validate parameters
      validators.validateNonEmptyString(source, 'source');
      validators.validateNonEmptyString(identifier, 'identifier');
      
      // Validate source type
      const validSources = ['arxiv', 'doi', 'pubmed'];
      if (!validSources.includes(source.toLowerCase())) {
        throw createError(ErrorTypes.VALIDATION_ERROR, `Invalid source type: ${source}. Valid sources: ${validSources.join(', ')}`);
      }

      // Basic identifier validation
      if (!identifier.trim()) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Identifier cannot be empty');
      }

      let paperMetadata = null;
      let importUrl = null;

      // Try to resolve paper metadata using external APIs first
      try {
        const metadataResult = await this.externalAPIs.resolveAcademicPaper(source, identifier);
        
        if (metadataResult.success) {
          paperMetadata = metadataResult;
          importUrl = metadataResult.pdf_url;
          
          // Add paper-specific tags
          const paperTags = [...(tags || []), ...metadataResult.keywords];
          tags = [...new Set(paperTags)]; // Remove duplicates
          
          // If we have a PDF URL, import it directly
          if (importUrl) {
            const importResult = await this.importUrl(
              importUrl,
              targetGroup,
              true, // Always extract metadata for academic papers
              tags,
              database
            );
            
            // Enhance the result with academic paper metadata
            return createSuccessResponse('Paper downloaded and imported successfully', {
              uuid: importResult.data.uuid,
              name: paperMetadata.title,
              path: importResult.data.path,
              source: source.toLowerCase(),
              identifier: identifier.trim(),
              metadata: {
                ...importResult.data.metadata,
                academic: paperMetadata,
                resolvedViaAPI: true
              },
              importedFrom: importUrl,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          // External API failed, continue to fallback
        }
      } catch (apiError) {
        // External API error, continue to fallback
      }

      // Fallback to AppleScript implementation
      
      // Build parameters object for AppleScript
      const params = {
        source: source.toLowerCase(),
        identifier: identifier.trim(),
        targetGroup: targetGroup || '',
        extractMetadata: extractMetadata || false,
        tags: tags ? JSON.stringify(tags) : '',
        database: database || ''
      };

      // Execute download with extended timeout for network operations
      const result = await withTimeout(
        this.runAppleScript('download_paper', [source.toLowerCase(), JSON.stringify(params)]),
        60000, // 60 second timeout for paper downloads
        'Paper download operation timed out'
      );

      // Validate result
      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success || !result.uuid) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Download failed - no document UUID returned');
      }

      // Merge external API metadata if available
      const enhancedMetadata = paperMetadata ? 
        { ...result.metadata, academic: paperMetadata, resolvedViaAPI: true } : 
        result.metadata;

      return createSuccessResponse('Paper downloaded successfully', {
        uuid: result.uuid,
        name: result.name,
        path: result.path,
        source: result.source,
        identifier: result.identifier,
        metadata: enhancedMetadata || null,
        method: paperMetadata ? 'api_enhanced' : 'applescript_only',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.error) throw error; // Re-throw formatted errors
      throw createError(ErrorTypes.OPERATION_ERROR, `Download paper failed: ${error.message}`);
    }
  }

  /**
   * Create Folder Structure - Create nested folder hierarchies with batch support
   * @param {Object} structure - Nested object representing folder structure
   * @param {string} [rootGroup] - Root group path for the structure
   * @param {string} [database] - Target database name
   * @param {boolean} [overwriteExisting] - Whether to update existing groups
   * @returns {Promise<Object>} Structure creation result with created/skipped groups
   */
  async createFolderStructure(structure, rootGroup = null, database = null, overwriteExisting = false) {
    try {
      // Validate parameters
      if (!structure || typeof structure !== 'object' || Object.keys(structure).length === 0) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Folder structure is required and must be a non-empty object');
      }

      // Validate structure format recursively
      this.validateFolderStructure(structure);

      // Build parameters object
      const params = {
        structure: structure,
        rootGroup: rootGroup || '',
        database: database || '',
        overwriteExisting: overwriteExisting || false
      };

      // Execute working folder structure creation
      const result = await withTimeout(
        this.runAppleScript('create_folder_structure_working', []),
        120000, // 2 minute timeout for complex structures
        'Folder structure creation operation timed out'
      );

      // Validate result
      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Folder structure creation failed');
      }

      return createSuccessResponse('Folder structure created successfully', {
        createdGroups: result.createdGroups || [],
        skippedGroups: result.skippedGroups || [],
        errors: result.errors || [],
        summary: result.summary || { created: 0, skipped: 0, errors: 0 },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.error) throw error; // Re-throw formatted errors
      throw createError(ErrorTypes.OPERATION_ERROR, `Create folder structure failed: ${error.message}`);
    }
  }

  /**
   * Validate folder structure format recursively
   * @param {Object} structure - Structure to validate
   * @param {string} [path] - Current path for error reporting
   */
  validateFolderStructure(structure, path = '') {
    if (typeof structure !== 'object' || structure === null) {
      throw createError(ErrorTypes.VALIDATION_ERROR, `Invalid structure at ${path}: must be an object`);
    }

    for (const [folderName, subStructure] of Object.entries(structure)) {
      const currentPath = path ? `${path}/${folderName}` : folderName;
      
      // Validate folder name
      if (typeof folderName !== 'string' || folderName.trim() === '') {
        throw createError(ErrorTypes.VALIDATION_ERROR, `Invalid folder name at ${currentPath}: must be a non-empty string`);
      }

      // Check for invalid characters in folder names
      const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
      for (const char of invalidChars) {
        if (folderName.includes(char)) {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Invalid folder name at ${currentPath}: contains invalid character '${char}'`);
        }
      }

      // Validate substructure
      if (subStructure !== null && subStructure !== undefined) {
        if (typeof subStructure === 'object') {
          this.validateFolderStructure(subStructure, currentPath);
        } else {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Invalid substructure at ${currentPath}: must be null or an object`);
        }
      }
    }
  }

  /**
   * Apply tag operations to multiple documents efficiently
   * @param {string[]} documentUuids - Array of document UUIDs to process
   * @param {string} action - Tag action: 'add', 'remove', or 'replace'
   * @param {string[]} tags - Array of tags to apply
   * @returns {Promise<Object>} Result with processed documents and any errors
   */
  async bulkTag(documentUuids, action, tags) {
    try {
      // Validate parameters
      if (!Array.isArray(documentUuids) || documentUuids.length === 0) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Document UUIDs array is required and must not be empty');
      }

      if (!action || typeof action !== 'string') {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Action is required and must be a string');
      }

      if (!['add', 'remove', 'replace'].includes(action)) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Action must be "add", "remove", or "replace"');
      }

      if (!Array.isArray(tags) || tags.length === 0) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Tags array is required and must not be empty');
      }

      // Validate UUIDs
      for (const uuid of documentUuids) {
        if (!uuid || typeof uuid !== 'string' || uuid.trim().length === 0) {
          throw createError(ErrorTypes.VALIDATION_ERROR, 'All document UUIDs must be non-empty strings');
        }
      }

      // Validate tags
      for (const tag of tags) {
        if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
          throw createError(ErrorTypes.VALIDATION_ERROR, 'All tags must be non-empty strings');
        }
      }

      // Prepare parameters for AppleScript
      const uuidString = documentUuids.join(',');
      const tagString = tags.join(',');

      // Execute working bulk tagging operation
      const result = await withTimeout(
        this.runAppleScript('bulk_tag_working_v3', [JSON.stringify(documentUuids), action, JSON.stringify(tags)]),
        60000, // 1 minute timeout for bulk operations
        'Bulk tag operation timed out'
      );

      // Validate result
      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Bulk tag operation failed');
      }

      return createSuccessResponse('Bulk tag operation completed successfully', {
        processed: result.processed || [],
        errors: result.errors || [],
        summary: result.summary || { processed: 0, errors: 0 }
      });

    } catch (error) {
      if (error.type) {
        throw error;
      }
      throw createError(ErrorTypes.OPERATION_ERROR, `Bulk tag operation failed: ${error.message}`);
    }
  }

  /**
   * Process multiple import sources concurrently with progress tracking
   * @param {Array} sources - Array of import sources with type, source, targetGroup, etc.
   * @param {string} [database] - Target database name
   * @param {boolean} [progressCallback] - Whether to provide progress updates
   * @returns {Promise<Object>} Result with imported documents and any errors
   */
  async batchImport(sources, database = null, progressCallback = false) {
    try {
      // Validate parameters
      if (!Array.isArray(sources) || sources.length === 0) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'Sources array is required and must not be empty');
      }

      // Validate each source
      for (const [index, source] of sources.entries()) {
        if (!source || typeof source !== 'object') {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Source ${index} must be an object`);
        }

        if (!source.type || !['url', 'file', 'paper'].includes(source.type)) {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Source ${index} type must be 'url', 'file', or 'paper'`);
        }

        if (!source.source || typeof source.source !== 'string') {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Source ${index} source must be a non-empty string`);
        }

        if (!source.targetGroup || typeof source.targetGroup !== 'string') {
          throw createError(ErrorTypes.VALIDATION_ERROR, `Source ${index} targetGroup must be a non-empty string`);
        }
      }

      // Prepare parameters for AppleScript
      const params = {
        sources,
        database: database || '',
        progressCallback: progressCallback || false
      };

      // Execute working batch import operation
      const result = await withTimeout(
        this.runAppleScript('batch_import_working', []),
        180000, // 3 minute timeout for batch import operations
        'Batch import operation timed out'
      );

      // Validate result
      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Batch import operation failed');
      }

      return createSuccessResponse('Batch import operation completed successfully', {
        imported: result.imported || [],
        errors: result.errors || [],
        summary: result.summary || { imported: 0, errors: 0 }
      });

    } catch (error) {
      if (error.type) {
        throw error;
      }
      throw createError(ErrorTypes.OPERATION_ERROR, `Batch import operation failed: ${error.message}`);
    }
  }

  async autoOrganizeByType(sourceGroupUuid = '', organizationMode = 'type', createSubfolders = true) {
    try {
      // Parameter validation
      if (sourceGroupUuid && typeof sourceGroupUuid !== 'string') {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'sourceGroupUuid must be a string');
      }

      if (!['type', 'date', 'size', 'content'].includes(organizationMode)) {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'organizationMode must be one of: type, date, size, content');
      }

      if (typeof createSubfolders !== 'boolean') {
        throw createError(ErrorTypes.VALIDATION_ERROR, 'createSubfolders must be a boolean');
      }

      // Execute simplified AppleScript
      const result = await this.runAppleScript('auto_organize_by_type_working', []);

      // Validate result
      if (result.error) {
        throw createError(ErrorTypes.OPERATION_ERROR, result.error);
      }

      if (!result.success) {
        throw createError(ErrorTypes.OPERATION_ERROR, 'Auto-organize operation failed');
      }

      return createSuccessResponse('Documents organized by type successfully', {
        organizedCount: result.organizedCount || 0,
        processedDocuments: result.processedDocuments || 0,
        createdFolders: result.createdFolders || 0,
        organizationResults: result.organizationResults || []
      });

    } catch (error) {
      if (error.type) {
        throw error;
      }
      throw createError(ErrorTypes.OPERATION_ERROR, `Auto-organize operation failed: ${error.message}`);
    }
  }
}