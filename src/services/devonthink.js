import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
        throw new Error(result.message);
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to check DEVONthink status: ${error.message}`);
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
        return JSON.parse(stdout.trim());
      } catch {
        // If not JSON, return as string
        return stdout.trim();
      }
    } catch (error) {
      throw new Error(`AppleScript execution failed: ${error.message}`);
    }
  }

  async search(query, database, limit = 50, offset = 0) {
    const args = database ? [query, database] : [query];
    const allResults = await this.runAppleScript('search', args);
    
    // Apply pagination
    const totalCount = allResults.length;
    const paginatedResults = allResults.slice(offset, offset + limit);
    
    return {
      query,
      database: database || 'all',
      results: paginatedResults,
      pagination: {
        offset,
        limit,
        totalCount,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit < totalCount ? offset + limit : null
      }
    };
  }

  async readDocument(uuid, includeContent = true) {
    const format = includeContent ? 'full' : 'metadata';
    const result = await this.runAppleScript('read_document', [uuid, format]);
    
    if (result.error) {
      throw new Error(result.error);
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
    return await this.runAppleScript('update_tags', [uuid, tags.join(',')]);
  }

  async getRelatedDocuments(uuid, limit = 10) {
    return await this.runAppleScript('get_related', [uuid, limit.toString()]);
  }

  async createSmartGroup(name, searchQuery, database) {
    const args = database ? [name, searchQuery, database] : [name, searchQuery];
    return await this.runAppleScript('create_smart_group', args);
  }

  async ocrDocument(uuid) {
    return await this.runAppleScript('ocr_document', [uuid]);
  }

  async batchSearch(queries, database, maxResultsPerQuery = 20) {
    // Run multiple searches in parallel with result limiting
    const searchPromises = queries.map(async query => {
      const result = await this.search(query, database, maxResultsPerQuery, 0);
      // Return just the results array for batch search (not pagination info)
      return result.results || result;
    });
    const results = await Promise.all(searchPromises);
    return results.reduce((acc, curr, index) => {
      acc[queries[index]] = curr;
      return acc;
    }, {});
  }

  async batchReadDocuments(uuids, includeContent = false) {
    // Read multiple documents in parallel
    const readPromises = uuids.map(uuid => 
      this.readDocument(uuid, includeContent).catch(err => ({ error: err.message, uuid }))
    );
    return await Promise.all(readPromises);
  }

  async findConnections(uuid, maxResults = 10) {
    return await this.runAppleScript('find_connections', [uuid, maxResults.toString()]);
  }

  async compareDocuments(uuid1, uuid2) {
    return await this.runAppleScript('compare_documents', [uuid1, uuid2]);
  }

  async createCollection(name, description, database) {
    const args = database ? [name, description, database] : [name, description];
    return await this.runAppleScript('create_collection', args);
  }

  async addToCollection(collectionUUID, documentUUID, notes = '') {
    return await this.runAppleScript('add_to_collection', [collectionUUID, documentUUID, notes]);
  }

  async buildKnowledgeGraph(uuid, maxDepth = 3) {
    return await this.runAppleScript('build_knowledge_graph', [uuid, maxDepth.toString()]);
  }

  async findShortestPath(startUUID, targetUUID, maxDepth = 5) {
    return await this.runAppleScript('find_shortest_path', [startUUID, targetUUID, maxDepth.toString()]);
  }

  async detectKnowledgeClusters(searchQuery = '', maxDocuments = 50, minClusterSize = 3) {
    // Use native AI classification for clustering instead of manual algorithms
    const args = searchQuery ? [searchQuery, maxDocuments.toString(), minClusterSize.toString()] : ['', maxDocuments.toString(), minClusterSize.toString()];
    return await this.runAppleScript('detect_knowledge_clusters_native', args);
  }

  async automateResearch(workflowType, queryOrUUID) {
    // Pass workflow type and query/UUID to the AppleScript
    const args = [workflowType, queryOrUUID];
    return await this.runAppleScript('automate_research', args);
  }

  async automateResearchOptimized(queryOrUUID, maxResults = 50) {
    return await this.runAppleScript('automate_research_optimized', ['organize_findings', queryOrUUID, maxResults.toString()]);
  }

  async analyzeDocument(uuid, optimized = false) {
    const scriptName = optimized ? 'document_analysis_optimized' : 'document_analysis';
    return await this.runAppleScript(scriptName, [uuid]);
  }

  async analyzeDocumentSimilarity(uuids) {
    return await this.runAppleScript('analyze_document_similarity', uuids);
  }

  async synthesizeDocuments(documentUUIDs, synthesisType = 'summary') {
    // Ensure documentUUIDs is an array
    if (!Array.isArray(documentUUIDs)) {
      throw new Error(`documentUUIDs must be an array, got ${typeof documentUUIDs}: ${JSON.stringify(documentUUIDs)}`);
    }
    // Use native AI classification for synthesis instead of manual word frequency
    const args = [synthesisType, ...documentUUIDs];
    return await this.runAppleScript('synthesize_documents_native', args);
  }

  async extractThemes(documentUUIDs) {
    // Ensure documentUUIDs is an array
    if (!Array.isArray(documentUUIDs)) {
      throw new Error(`documentUUIDs must be an array, got ${typeof documentUUIDs}: ${JSON.stringify(documentUUIDs)}`);
    }
    // Use native AI classification instead of manual word frequency
    return await this.runAppleScript('extract_themes', documentUUIDs);
  }

  async classifyDocument(uuid) {
    // Use DEVONthink's native AI classification
    return await this.runAppleScript('classify_document', [uuid]);
  }

  async getSimilarDocuments(uuid, limit = 10) {
    // Use DEVONthink's native AI to find similar documents
    return await this.runAppleScript('get_similar_documents', [uuid, limit.toString()]);
  }

  async createMultiLevelSummary(documentUUIDs, summaryLevel = 'brief') {
    // Ensure documentUUIDs is an array
    if (!Array.isArray(documentUUIDs)) {
      throw new Error(`documentUUIDs must be an array, got ${typeof documentUUIDs}: ${JSON.stringify(documentUUIDs)}`);
    }
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