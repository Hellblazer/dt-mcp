/**
 * Enhanced tool registration helper that provides rich documentation for AI clients
 */

import { toolDescriptions } from './tool-descriptions.js';

/**
 * Register a tool with enhanced descriptions for AI understanding
 */
export function registerEnhancedTool(server, toolName, schema, handler) {
  const description = toolDescriptions[toolName];
  
  if (!description) {
    // Fallback to basic registration if no enhanced description
    server.tool(toolName, toolName, schema, handler);
    return;
  }
  
  // Enhance schema with detailed parameter descriptions
  const enhancedSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (description.parameterHelp[key]) {
      enhancedSchema[key] = value.describe(description.parameterHelp[key]);
    } else {
      enhancedSchema[key] = value;
    }
  }
  
  // Register with enhanced description
  server.tool(
    toolName,
    description.brief + '\n\n' + description.detailed,
    enhancedSchema,
    handler
  );
}

/**
 * Get formatted help text for a tool
 */
export function getToolHelp(toolName) {
  const desc = toolDescriptions[toolName];
  if (!desc) return `No detailed help available for ${toolName}`;
  
  let help = `# ${toolName}\n\n`;
  help += `${desc.brief}\n\n`;
  help += `## Details\n${desc.detailed}\n\n`;
  
  if (Object.keys(desc.parameterHelp).length > 0) {
    help += `## Parameters\n`;
    for (const [param, paramHelp] of Object.entries(desc.parameterHelp)) {
      help += `- **${param}**: ${paramHelp}\n`;
    }
  }
  
  return help;
}