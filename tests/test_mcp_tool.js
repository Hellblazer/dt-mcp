#!/usr/bin/env node

// Comprehensive test harness for all MCP tools
import { DEVONthinkService } from '../src/services/devonthink.js';

async function main() {
  if (process.argv.length < 4) {
    console.error('Usage: node test_mcp_tool.js <tool_name> <params_json>');
    process.exit(1);
  }

  const toolName = process.argv[2];
  const params = JSON.parse(process.argv[3]);
  
  const devonthink = new DEVONthinkService();
  
  try {
    let result;
    
    switch (toolName) {
      // Core operations
      case 'search_devonthink':
        result = await devonthink.search(params.query, params.database);
        break;
      
      case 'read_document':
        result = await devonthink.readDocument(params.uuid, params.includeContent);
        break;
        
      case 'create_document':
        result = await devonthink.createDocument(params.name, params.content, params.type, params.groupPath, params.database, params.tags);
        break;
        
      case 'list_databases':
        result = await devonthink.listDatabases();
        break;
        
      case 'update_tags':
        result = await devonthink.updateTags(params.uuid, params.tags);
        break;
        
      case 'get_related_documents':
        result = await devonthink.getRelatedDocuments(params.uuid, params.limit);
        break;
        
      case 'create_smart_group':
        result = await devonthink.createSmartGroup(params.name, params.searchQuery, params.database);
        break;
        
      case 'ocr_document':
        result = await devonthink.ocrDocument(params.uuid);
        break;
      
      case 'batch_search':
        result = await devonthink.batchSearch(params.queries, params.database);
        break;
      
      // Knowledge graph tools (Phase 1)
      case 'build_knowledge_graph':
        result = await devonthink.buildKnowledgeGraph(params.uuid, params.maxDepth);
        break;
        
      case 'find_shortest_path':
        result = await devonthink.findShortestPath(params.fromUuid, params.toUuid);
        break;
        
      case 'detect_knowledge_clusters':
        result = await devonthink.detectKnowledgeClusters(params.searchQuery, params.maxDocuments, params.minClusterSize);
        break;
        
      case 'find_connections':
        result = await devonthink.findConnections(params.uuid1, params.uuid2, params.maxDepth);
        break;
        
      case 'compare_documents':
        result = await devonthink.compareDocuments(params.uuid1, params.uuid2);
        break;
      
      // Research automation (Phase 2)
      case 'automate_research':
        result = await devonthink.automateResearch(params.workflowType, params.queryOrUUID);
        break;
        
      case 'organize_findings':
        result = await devonthink.automateResearchOptimized(params.searchQuery, params.maxResults);
        break;
        
      case 'create_collection':
        result = await devonthink.createCollection(params.name, params.description || '', params.database);
        break;
        
      case 'add_to_collection':
        result = await devonthink.addToCollection(params.collectionUuid, params.documentUuids);
        break;
      
      // Document intelligence (Phase 3)
      case 'analyze_document':
        result = await devonthink.analyzeDocument(params.uuid);
        break;
        
      case 'analyze_document_similarity':
        result = await devonthink.analyzeDocumentSimilarity(params.uuids);
        break;
        
      case 'batch_read_documents':
        result = await devonthink.batchReadDocuments(params.uuids, params.includeContent);
        break;
      
      // Knowledge synthesis (Phase 4)
      case 'synthesize_documents':
        result = await devonthink.synthesizeDocuments(params.documentUUIDs, params.synthesisType);
        break;
        
      case 'extract_themes':
        result = await devonthink.extractThemes(params.documentUUIDs);
        break;
        
      case 'classify_document':
        result = await devonthink.classifyDocument(params.uuid);
        break;
        
      case 'get_similar_documents':
        result = await devonthink.getSimilarDocuments(params.uuid, params.limit);
        break;
        
      case 'identify_trends':
        result = await devonthink.identifyTrends(params.databaseName);
        break;
        
      case 'create_multi_level_summary':
        result = await devonthink.createMultiLevelSummary(params.documentUUIDs, params.summaryLevel);
        break;
        
      case 'track_topic_evolution':
        result = await devonthink.trackTopicEvolution(params.topic, params.timeRange);
        break;
        
      case 'create_knowledge_timeline':
        result = await devonthink.createKnowledgeTimeline(params.documentUUIDs);
        break;
        
      case 'advanced_search':
        result = await devonthink.advancedSearch(params.query, params.database, params.searchIn, params.maxResults, params.sortBy, params.searchScope);
        break;
        
      case 'list_smart_groups':
        result = await devonthink.listSmartGroups(params.database, params.limit, params.offset);
        break;
        
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    // Check if result contains an error and exit with error code if so
    if (result && typeof result === 'object' && 'error' in result) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(1); // Exit with error code for tool errors
    }
    
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();