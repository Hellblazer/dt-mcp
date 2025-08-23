/**
 * Enhanced error handling system for DEVONthink MCP operations
 * Provides detailed error context, step tracking, and actionable solutions
 */

export class MCPError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'MCPError';
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.operation = context.operation || 'unknown';
    this.step = context.step || 'unknown';
    this.details = context.details || {};
  }

  toJSON() {
    return {
      error: this.message,
      operation: this.operation,
      step: this.step,
      timestamp: this.timestamp,
      details: this.details,
      context: this.context
    };
  }
}

export class NetworkError extends MCPError {
  constructor(message, url, statusCode = null, context = {}) {
    super(message, { ...context, url, statusCode });
    this.name = 'NetworkError';
    this.url = url;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends MCPError {
  constructor(message, field, value, context = {}) {
    super(message, { ...context, field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class TimeoutError extends MCPError {
  constructor(message, duration, context = {}) {
    super(message, { ...context, duration });
    this.name = 'TimeoutError';
    this.duration = duration;
  }
}

export class AppleScriptError extends MCPError {
  constructor(message, script, osascriptError, context = {}) {
    super(message, { ...context, script, osascriptError });
    this.name = 'AppleScriptError';
    this.script = script;
    this.osascriptError = osascriptError;
  }
}

/**
 * Error handler with context tracking and solution suggestions
 */
export class OperationTracker {
  constructor(operation, context = {}) {
    this.operation = operation;
    this.context = context;
    this.steps = [];
    this.startTime = Date.now();
  }

  step(name, details = {}) {
    this.currentStep = name;
    this.steps.push({
      name,
      details,
      timestamp: Date.now() - this.startTime
    });
    return this;
  }

  error(message, errorClass = MCPError, additionalContext = {}) {
    const fullContext = {
      operation: this.operation,
      step: this.currentStep,
      steps: this.steps,
      duration: Date.now() - this.startTime,
      ...this.context,
      ...additionalContext
    };

    throw new errorClass(message, fullContext);
  }

  success(result = {}) {
    return {
      success: true,
      operation: this.operation,
      duration: Date.now() - this.startTime,
      steps: this.steps,
      result
    };
  }
}

/**
 * Specific error handlers for common operations
 */
export const ErrorHandlers = {
  
  arXivDownload(identifier, step, originalError) {
    const solutions = {
      'fetch_metadata': [
        'Check arXiv identifier format (e.g., 2308.04889)',
        'Verify network connectivity to arxiv.org',
        'Check if paper exists on arXiv'
      ],
      'resolve_pdf': [
        'Paper may not have public PDF access',
        'Try alternative DOI resolution',
        'Check arXiv API rate limits'
      ],
      'download_file': [
        'Check disk space for PDF download',
        'Verify write permissions to temp directory',
        'Check firewall/proxy settings'
      ],
      'import_devonthink': [
        'Ensure DEVONthink is running',
        'Check database is open and writable',
        'Verify AppleScript permissions'
      ]
    };

    return new NetworkError(
      `arXiv download failed at step: ${step}`,
      `https://arxiv.org/abs/${identifier}`,
      null,
      {
        operation: 'download_paper',
        step,
        identifier,
        solutions: solutions[step] || ['Contact support with error details'],
        originalError: originalError?.message
      }
    );
  },

  urlImport(url, step, originalError) {
    const solutions = {
      'fetch_content': [
        'Check URL is accessible in browser',
        'Verify website allows programmatic access',
        'Check for CAPTCHA or authentication requirements'
      ],
      'extract_metadata': [
        'Website may have non-standard metadata format',
        'Try alternative metadata extraction',
        'Manual import may be required'
      ],
      'create_document': [
        'Check DEVONthink database permissions',
        'Verify sufficient disk space',
        'Try importing to different database'
      ]
    };

    return new NetworkError(
      `URL import failed at step: ${step}`,
      url,
      null,
      {
        operation: 'import_url',
        step,
        url,
        solutions: solutions[step] || ['Try manual import or contact support'],
        originalError: originalError?.message
      }
    );
  },

  synthesis(documentCount, step, originalError) {
    const solutions = {
      'prepare_documents': [
        'Reduce number of documents for synthesis',
        'Check all document UUIDs are valid',
        'Ensure documents contain text content'
      ],
      'ai_processing': [
        'Try with fewer documents (5-10 max)',
        'Ensure DEVONthink AI features are enabled',
        'Check available system memory'
      ],
      'generate_output': [
        'Synthesis may have timed out - try again',
        'Break into smaller synthesis batches',
        'Check DEVONthink database integrity'
      ]
    };

    return new TimeoutError(
      `Document synthesis failed at step: ${step}`,
      30000,
      {
        operation: 'synthesize_documents',
        step,
        documentCount,
        solutions: solutions[step] || ['Reduce scope and try again'],
        originalError: originalError?.message
      }
    );
  },

  appleScript(scriptName, osascriptError) {
    const commonSolutions = [
      'Enable "System Events" in Security & Privacy → Automation',
      'Grant DEVONthink automation permissions',
      'Restart DEVONthink and try again',
      'Check macOS version compatibility'
    ];

    return new AppleScriptError(
      `AppleScript execution failed: ${scriptName}`,
      scriptName,
      osascriptError,
      {
        operation: 'applescript_execution',
        step: 'execute_script',
        solutions: commonSolutions,
        troubleshooting: {
          permissions: 'System Preferences → Security & Privacy → Privacy → Automation',
          devonthink: 'Ensure DEVONthink 4+ is installed and running',
          script_location: '/path/to/dt-mcp/scripts/devonthink/'
        }
      }
    );
  }
};

/**
 * Format error for MCP response
 */
export function formatMCPError(error) {
  if (error instanceof MCPError) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(error.toJSON(), null, 2)
      }]
    };
  }

  // Legacy error handling
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: error?.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        type: 'legacy_error'
      }, null, 2)
    }]
  };
}

/**
 * Wrap async operations with enhanced error handling
 */
export function withErrorTracking(operation, context = {}) {
  return async (fn) => {
    const tracker = new OperationTracker(operation, context);
    try {
      const result = await fn(tracker);
      return tracker.success(result);
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      // Convert generic errors to MCPError
      tracker.error(error.message, MCPError, { originalError: error });
    }
  };
}