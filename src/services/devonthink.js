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
    const escapedArgs = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
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

  async search(query, database) {
    const args = database ? [query, database] : [query];
    return await this.runAppleScript('search', args);
  }

  async readDocument(uuid, includeContent = true) {
    const format = includeContent ? 'full' : 'metadata';
    const result = await this.runAppleScript('read_document', [uuid, format]);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return includeContent ? result : result.metadata;
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

  async batchSearch(queries, database) {
    // Run multiple searches in parallel
    const searchPromises = queries.map(query => this.search(query, database));
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
    const args = searchQuery ? [searchQuery, maxDocuments.toString(), minClusterSize.toString()] : ['', maxDocuments.toString(), minClusterSize.toString()];
    return await this.runAppleScript('detect_knowledge_clusters', args);
  }

  async automateResearch(workflowType, queryOrUUID) {
    return await this.runAppleScript('automate_research', [workflowType, queryOrUUID]);
  }

  async automateResearchOptimized(queryOrUUID, maxResults = 50) {
    return await this.runAppleScript('automate_research_optimized', ['organize_findings_optimized', queryOrUUID, maxResults.toString()]);
  }

  async analyzeDocument(uuid, optimized = false) {
    const scriptName = optimized ? 'document_analysis_optimized' : 'document_analysis';
    return await this.runAppleScript(scriptName, [uuid]);
  }

  async analyzeDocumentSimilarity(uuids) {
    return await this.runAppleScript('analyze_document_similarity', uuids);
  }
}