#!/usr/bin/env node

// Simple test harness for MCP tools
import { DEVONthinkService } from './src/services/devonthink.js';

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
      case 'search_devonthink':
        result = await devonthink.search(params.query, params.database);
        break;
      
      case 'analyze_document':
        result = await devonthink.analyzeDocument(params.uuid);
        break;
        
      case 'analyze_document_similarity':
        result = await devonthink.analyzeDocumentSimilarity(params.uuids);
        break;
        
      case 'organize_findings_optimized':
        result = await devonthink.automateResearchOptimized(params.searchQuery, params.maxResults);
        break;
        
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();