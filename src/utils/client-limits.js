/**
 * Client-aware limit management for MCP tools
 * Automatically adjusts response sizes and limits based on client capabilities
 */

// Client capability profiles
const CLIENT_PROFILES = {
  'claude-desktop': {
    name: 'Claude Desktop',
    maxResults: 15,           // Conservative for UI performance
    maxResponseSize: 30000,   // 30KB - prevents UI hangs
    maxConcurrentOps: 2,      // Limited concurrency
    timeoutMs: 20000,         // 20s timeout
    features: ['truncation', 'pagination', 'streaming']
  },
  'claude-code': {
    name: 'Claude Code CLI',
    maxResults: 100,          // Higher limits for CLI
    maxResponseSize: 500000,  // 500KB - CLI can handle more
    maxConcurrentOps: 8,      // Better concurrency support
    timeoutMs: 60000,         // 60s timeout
    features: ['truncation', 'pagination', 'streaming', 'batch']
  },
  'default': {
    name: 'Unknown Client',
    maxResults: 25,           // Balanced defaults
    maxResponseSize: 75000,   // 75KB
    maxConcurrentOps: 3,      // Moderate concurrency
    timeoutMs: 30000,         // 30s timeout
    features: ['truncation', 'pagination']
  }
};

// Tool-specific overrides for particularly expensive operations
const TOOL_OVERRIDES = {
  'search_devonthink': {
    'claude-desktop': { maxResults: 10, maxResponseSize: 25000 },
    'default': { maxResults: 20, maxResponseSize: 50000 }
  },
  'batch_search': {
    'claude-desktop': { maxResults: 5, maxResponseSize: 15000 },
    'default': { maxResults: 10, maxResponseSize: 30000 }
  },
  'synthesize_documents': {
    'claude-desktop': { maxResults: 8, maxResponseSize: 20000 },
    'default': { maxResults: 15, maxResponseSize: 40000 }
  },
  'build_knowledge_graph': {
    'claude-desktop': { maxResults: 6, maxResponseSize: 18000 },
    'default': { maxResults: 12, maxResponseSize: 35000 }
  }
};

/**
 * Detect client type from MCP context or user agent
 */
export function detectClient(context = {}) {
  const userAgent = context.userAgent || process.env.MCP_CLIENT || '';
  
  if (userAgent.includes('claude-desktop') || userAgent.includes('Claude Desktop')) {
    return 'claude-desktop';
  }
  
  if (userAgent.includes('claude-code') || userAgent.includes('Claude Code')) {
    return 'claude-code';
  }
  
  // Check for common CLI indicators
  if (process.stdout.isTTY && !process.env.DISPLAY) {
    return 'claude-code'; // Assume CLI environment
  }
  
  return 'default';
}

/**
 * Get client limits for a specific tool
 */
export function getClientLimits(toolName, clientType = null) {
  const client = clientType || detectClient();
  const profile = CLIENT_PROFILES[client] || CLIENT_PROFILES.default;
  
  // Apply tool-specific overrides
  const overrides = TOOL_OVERRIDES[toolName]?.[client] || 
                   TOOL_OVERRIDES[toolName]?.['default'] || {};
  
  return {
    ...profile,
    ...overrides,
    clientType: client,
    toolName
  };
}

/**
 * Apply limits to parameters
 */
export function applyClientLimits(toolName, params, clientType = null) {
  const limits = getClientLimits(toolName, clientType);
  const adjustedParams = { ...params };
  
  // Apply result limits
  if (typeof adjustedParams.limit === 'number') {
    adjustedParams.limit = Math.min(adjustedParams.limit, limits.maxResults);
  } else if (!adjustedParams.limit) {
    adjustedParams.limit = Math.min(50, limits.maxResults); // Default with client limit
  }
  
  // Add client context
  adjustedParams._clientLimits = {
    appliedLimits: limits,
    originalLimit: params.limit,
    adjustedLimit: adjustedParams.limit,
    clientType: limits.clientType
  };
  
  return adjustedParams;
}

/**
 * Check if response size is within client limits
 */
export function checkResponseSize(response, limits) {
  const responseSize = JSON.stringify(response).length;
  
  if (responseSize > limits.maxResponseSize) {
    return {
      withinLimits: false,
      currentSize: responseSize,
      maxSize: limits.maxResponseSize,
      compressionNeeded: true
    };
  }
  
  return {
    withinLimits: true,
    currentSize: responseSize,
    maxSize: limits.maxResponseSize
  };
}

/**
 * Truncate response to fit client limits
 */
export function truncateResponse(response, limits, metadata = {}) {
  const sizeCheck = checkResponseSize(response, limits);
  
  if (sizeCheck.withinLimits) {
    return {
      response,
      truncated: false,
      metadata: { ...metadata, responseSize: sizeCheck.currentSize }
    };
  }
  
  // Try to truncate intelligently
  let truncatedResponse = { ...response };
  
  // If it's a search result with results array
  if (response.results && Array.isArray(response.results)) {
    const maxResults = Math.floor(response.results.length * limits.maxResponseSize / sizeCheck.currentSize);
    truncatedResponse.results = response.results.slice(0, Math.max(1, maxResults));
    
    // Update metadata
    truncatedResponse.totalFound = response.totalFound || response.results.length;
    truncatedResponse.truncated = true;
    truncatedResponse.truncatedAt = truncatedResponse.results.length;
    truncatedResponse.reason = 'Client size limits exceeded';
  }
  
  return {
    response: truncatedResponse,
    truncated: true,
    metadata: {
      ...metadata,
      originalSize: sizeCheck.currentSize,
      truncatedSize: JSON.stringify(truncatedResponse).length,
      clientLimits: limits,
      truncationReason: 'Response size exceeded client limits'
    }
  };
}

/**
 * Create client-aware tool description
 */
export function enhanceToolDescription(toolName, baseDescription, clientType = null) {
  const limits = getClientLimits(toolName, clientType);
  
  const limitInfo = `\n\nClient Limits (${limits.name}):
- Max results: ${limits.maxResults}
- Max response size: ${Math.round(limits.maxResponseSize / 1000)}KB
- Timeout: ${limits.timeoutMs / 1000}s
- Features: ${limits.features.join(', ')}`;

  const bestPractices = `\n\nBest Practices:
- Start with smaller limits (5-10) for exploratory queries
- Use specific search terms to reduce result sets
- Consider pagination for large datasets
- Monitor response times and adjust accordingly`;

  return baseDescription + limitInfo + bestPractices;
}

/**
 * Log client limit application for debugging
 */
export function logLimitApplication(toolName, originalParams, adjustedParams, limits) {
  if (process.env.LOG_LEVEL === 'DEBUG') {
    console.error(`CLIENT LIMITS APPLIED:
Tool: ${toolName}
Client: ${limits.clientType} (${limits.name})
Original limit: ${originalParams.limit || 'undefined'}
Applied limit: ${adjustedParams.limit}
Max response size: ${limits.maxResponseSize} bytes
Features: ${limits.features.join(', ')}`);
  }
}

export { CLIENT_PROFILES, TOOL_OVERRIDES };