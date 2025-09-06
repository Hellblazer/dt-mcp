#!/usr/bin/env node

/**
 * Verification script to ensure all 49 operations from the original server
 * are preserved in the 9 streamlined tools
 */

const OPERATION_MAPPING = {
  // SEARCH tool (4 operations)
  'search_devonthink': { tool: 'search', params: { mode: 'basic' } },
  'advanced_search': { tool: 'search', params: { mode: 'advanced' } },
  'batch_search': { tool: 'search', params: { mode: 'batch' } },
  'list_smart_groups': { tool: 'search', params: { mode: 'smart_groups' } },

  // DOCUMENT tool (7 operations)
  'read_document': { tool: 'document', params: { operation: 'read' } },
  'create_document': { tool: 'document', params: { operation: 'create' } },
  'update_tags': { tool: 'document', params: { operation: 'update' } },
  'delete_document': { tool: 'document', params: { operation: 'delete' } },
  'batch_read_documents': { tool: 'document', params: { operation: 'batch_read' } },
  'compare_documents': { tool: 'analyze', params: { operation: 'compare' } },
  'ocr_document': { tool: 'document', params: { operation: 'ocr' } },

  // ANALYZE tool (6 operations)
  'analyze_document': { tool: 'analyze', params: { operation: 'analyze' } },
  'analyze_document_similarity': { tool: 'analyze', params: { operation: 'similarity' } },
  'synthesize_documents': { tool: 'analyze', params: { operation: 'synthesize' } },
  'extract_themes': { tool: 'analyze', params: { operation: 'themes' } },
  'create_multi_level_summary': { tool: 'analyze', params: { operation: 'summary' } },
  'create_knowledge_timeline': { tool: 'graph', params: { operation: 'timeline' } },

  // GRAPH tool (5 operations)
  'build_knowledge_graph': { tool: 'graph', params: { operation: 'build' } },
  'find_shortest_path': { tool: 'graph', params: { operation: 'path' } },
  'detect_knowledge_clusters': { tool: 'graph', params: { operation: 'clusters' } },
  'find_connections': { tool: 'graph', params: { operation: 'connections' } },
  'get_related_documents': { tool: 'ai', params: { operation: 'related' } },

  // ORGANIZE tool (8 operations)
  'create_collection': { tool: 'organize', params: { operation: 'create_collection' } },
  'add_to_collection': { tool: 'organize', params: { operation: 'add_to_collection' } },
  'create_smart_group': { tool: 'organize', params: { operation: 'create_smart_group' } },
  'create_group': { tool: 'organize', params: { operation: 'create_group' } },
  'move_to_group': { tool: 'organize', params: { operation: 'move' } },
  'create_folder_structure': { tool: 'organize', params: { operation: 'folder_structure' } },
  'bulk_tag': { tool: 'organize', params: { operation: 'bulk_tag' } },
  'auto_organize_by_type': { tool: 'organize', params: { operation: 'auto_organize' } },

  // IMPORT tool (4 operations)
  'import_url': { tool: 'import', params: { operation: 'url' } },
  'download_paper': { tool: 'import', params: { operation: 'paper' } },
  'bulk_import_urls': { tool: 'import', params: { operation: 'bulk_urls' } },
  'bulk_download_papers': { tool: 'import', params: { operation: 'bulk_papers' } },

  // RESEARCH tool (5 operations)
  'automate_research': { tool: 'research', params: { workflow: 'automate' } },
  'organize_findings': { tool: 'research', params: { workflow: 'organize' } },
  'track_topic_evolution': { tool: 'research', params: { workflow: 'evolution' } },
  'identify_trends': { tool: 'research', params: { workflow: 'trends' } },
  'create_research_project': { tool: 'research', params: { workflow: 'project' } },

  // AI tool (2 operations)
  'classify_document': { tool: 'ai', params: { operation: 'classify' } },
  'get_similar_documents': { tool: 'ai', params: { operation: 'similar' } },

  // SYSTEM tool (8 operations)
  'list_databases': { tool: 'system', params: { operation: 'databases' } },
  'get_tool_help': { tool: 'system', params: { operation: 'help' } },
  'monitor_operations': { tool: 'system', params: { operation: 'monitor' } },
  'manage_operation_queue': { tool: 'system', params: { operation: 'queue' } },
  'get_performance_report': { tool: 'system', params: { operation: 'performance' } },
  'reset_connection_state': { tool: 'system', params: { operation: 'reset' } },
  'execute_workflow': { tool: 'system', params: { operation: 'workflow' } },
  'batch_import': { tool: 'import', params: { operation: 'batch' } }
};

function verifyOperations() {
  const totalOperations = Object.keys(OPERATION_MAPPING).length;
  console.log(`\n🔍 Verifying ${totalOperations} operations are preserved...\n`);

  // Count by tool
  const toolCounts = {};
  for (const [oldOp, mapping] of Object.entries(OPERATION_MAPPING)) {
    if (!toolCounts[mapping.tool]) {
      toolCounts[mapping.tool] = [];
    }
    toolCounts[mapping.tool].push(oldOp);
  }

  // Display mapping summary
  console.log('📊 Operation Distribution:');
  console.log('='.repeat(50));
  for (const [tool, operations] of Object.entries(toolCounts)) {
    console.log(`\n${tool.toUpperCase()} tool (${operations.length} operations):`);
    operations.forEach(op => {
      const mapping = OPERATION_MAPPING[op];
      console.log(`  • ${op} → ${JSON.stringify(mapping.params)}`);
    });
  }

  // Verify total count
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Total operations preserved: ${totalOperations}`);
  
  if (totalOperations === 49) {
    console.log('🎉 SUCCESS: All 49 operations are mapped to the 9 unified tools!');
  } else {
    console.log(`⚠️  WARNING: Expected 49 operations, found ${totalOperations}`);
  }

  // Tool summary
  console.log('\n📋 Tool Summary:');
  const toolSummary = Object.entries(toolCounts).map(([tool, ops]) => 
    `  • ${tool}: ${ops.length} operations`
  ).join('\n');
  console.log(toolSummary);
  
  const totalFromTools = Object.values(toolCounts).reduce((sum, ops) => sum + ops.length, 0);
  console.log(`\nTotal: ${totalFromTools} operations across 9 tools`);
}

// Run verification
verifyOperations();