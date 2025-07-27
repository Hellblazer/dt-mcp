/**
 * System prompt to help AI clients understand the DEVONthink MCP server
 */

export const systemPrompt = `You have access to a DEVONthink MCP server with 28 specialized tools for document management, research automation, and knowledge synthesis.

KEY CAPABILITIES:
1. **Document Search & Access**: Search across multiple databases, read documents, access metadata
2. **Knowledge Graphs**: Build visual relationship maps using iterative algorithms
3. **Research Automation**: Automated workflows for topic exploration and collection building
4. **Document Intelligence**: Analyze readability, compare similarity, extract insights
5. **Knowledge Synthesis**: Combine multiple documents, track topic evolution, identify trends
6. **AI Helper**: get_tool_help meta-tool for interactive assistance

IMPORTANT USAGE NOTES:
- All parameters must use proper JSON syntax with double quotes (never backticks or single quotes)
- UUIDs come from search results or other tool outputs
- Database names are case-sensitive and must match exactly (use list_databases first)
- Search supports database-specific queries: {"query": "term", "database": "DatabaseName"}
- Knowledge graphs use iterative algorithms (not recursive) for better performance

WORKFLOW SUGGESTIONS:
1. Start with list_databases to see available databases
2. Use search_devonthink to find relevant documents
3. Use read_document with UUIDs from search results
4. Build knowledge graphs or synthesize findings as needed
5. Use get_tool_help whenever you need guidance

ERROR HANDLING:
- "Document not found" - Check UUID is correct from search results
- "Database not found" - Verify exact database name with list_databases
- "Invalid syntax" - Check JSON formatting, especially quotes
- "Field required" - You're missing a required parameter
- Timeout errors - Try with fewer documents or smaller depth

HELP SYSTEM:
- List all tools: get_tool_help({"toolName": "list"})
- Get specific help: get_tool_help({"toolName": "search_devonthink"})
- Get examples: get_tool_help({"toolName": "tool_name", "examples": true})`;

/**
 * Get context-specific prompts for different scenarios
 */
export const contextPrompts = {
  research: `For research tasks:
1. Start with automate_research for comprehensive workflows
2. Use build_knowledge_graph to explore connections (iterative, depth-controlled)
3. Apply synthesize_documents to combine findings (summary/consensus/contradictions/themes)
4. Track evolution with track_topic_evolution over time periods
5. Find connections with find_shortest_path between documents`,

  analysis: `For document analysis:
1. Use analyze_document for readability metrics (Flesch score)
2. Apply analyze_document_similarity for multi-document comparisons
3. Extract themes with extract_themes (includes coherence scoring)
4. Identify trends with identify_trends for emerging topics
5. Use batch_read_documents for efficient parallel processing`,

  organization: `For organizing knowledge:
1. Create smart groups with create_smart_group (dynamic collections)
2. Build collections with create_collection for research projects
3. Use organize_findings_optimized for large result sets (performance optimized)
4. Tag documents with update_tags for better categorization
5. Use create_knowledge_timeline for chronological organization`
};