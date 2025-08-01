// Standardized error handling for DEVONthink MCP Server

// Error types
export const ErrorTypes = {
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  DATABASE_NOT_FOUND: 'DATABASE_NOT_FOUND',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DEVONTHINK_NOT_RUNNING: 'DEVONTHINK_NOT_RUNNING',
  SCRIPT_EXECUTION_FAILED: 'SCRIPT_EXECUTION_FAILED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  TRUNCATION_WARNING: 'TRUNCATION_WARNING',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE'
};

// Create standardized error response
export function createError(type, message, field = null, details = {}) {
  return {
    error: {
      code: type,
      message: message,
      field: field,
      ...details,
      timestamp: new Date().toISOString()
    }
  };
}

// Format error for MCP response
export function formatErrorResponse(error) {
  // If it's already a standardized error, return it
  if (error.error && error.error.code) {
    return JSON.stringify(error, null, 2);
  }
  
  // Otherwise, create a generic error
  const errorObj = createError(
    ErrorTypes.OPERATION_FAILED,
    error.message || 'Unknown error occurred',
    null,
    { originalError: error.toString() }
  );
  
  return JSON.stringify(errorObj, null, 2);
}

// Standardized success response
export function createSuccessResponse(data, metadata = {}) {
  return {
    status: 'success',
    data: data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

// Format any response for consistency
export function formatResponse(result, metadata = {}) {
  // If it's an error
  if (result.error || result instanceof Error) {
    return {
      status: 'error',
      error: result.error || {
        code: ErrorTypes.OPERATION_FAILED,
        message: result.message || 'Unknown error'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }
  
  // Otherwise it's a success
  return createSuccessResponse(result, metadata);
}

// Parameter validation helpers
export const validators = {
  validateLimit: (limit, defaultValue = 50, max = 1000) => {
    if (limit === undefined || limit === null) return defaultValue;
    const num = parseInt(limit);
    if (isNaN(num) || num < 1) {
      throw errorHandlers.invalidParameter('limit', limit, `positive integer between 1 and ${max}`);
    }
    return Math.min(num, max);
  },
  
  validateOffset: (offset, defaultValue = 0) => {
    if (offset === undefined || offset === null) return defaultValue;
    const num = parseInt(offset);
    if (isNaN(num) || num < 0) {
      throw errorHandlers.invalidParameter('offset', offset, 'non-negative integer');
    }
    return num;
  },
  
  validateUUID: (uuid, paramName = 'uuid') => {
    const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
    if (!uuid || !uuidRegex.test(uuid)) {
      throw errorHandlers.invalidParameter(paramName, uuid, 'valid UUID format (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)');
    }
    return uuid;
  },
  
  validateNonEmptyArray: (array, paramName) => {
    // Use this validator only for operations that require at least one element
    // For operations that can handle empty arrays gracefully (like batch_search),
    // implement custom validation instead
    if (!Array.isArray(array) || array.length === 0) {
      throw errorHandlers.invalidParameter(paramName, array, 'non-empty array');
    }
    return array;
  },
  
  validateNonEmptyString: (str, paramName) => {
    if (typeof str !== 'string' || str.trim() === '') {
      throw errorHandlers.invalidParameter(paramName, str, 'non-empty string');
    }
    return str.trim();
  }
};

// Common error handlers
export const errorHandlers = {
  invalidParameter: (paramName, value, expected) => {
    return createError(
      ErrorTypes.INVALID_PARAMETER,
      `Invalid value for parameter '${paramName}': ${value}. Expected: ${expected}`,
      paramName
    );
  },
  
  databaseNotFound: (databaseName) => {
    return createError(
      ErrorTypes.DATABASE_NOT_FOUND,
      `Database '${databaseName}' not found`,
      'database',
      { requestedDatabase: databaseName }
    );
  },
  
  documentNotFound: (uuid) => {
    return createError(
      ErrorTypes.DOCUMENT_NOT_FOUND,
      `Document with UUID '${uuid}' not found`,
      'uuid',
      { requestedUUID: uuid }
    );
  },
  
  devonthinkNotRunning: () => {
    return createError(
      ErrorTypes.DEVONTHINK_NOT_RUNNING,
      'DEVONthink is not running. Please start DEVONthink and try again.'
    );
  },
  
  scriptExecutionFailed: (scriptName, details) => {
    return createError(
      ErrorTypes.SCRIPT_EXECUTION_FAILED,
      `Failed to execute AppleScript: ${scriptName}`,
      null,
      { script: scriptName, details: details }
    );
  },
  
  truncationWarning: (totalResults, returnedResults) => {
    return createError(
      ErrorTypes.TRUNCATION_WARNING,
      `Results were truncated. Total found: ${totalResults}, returned: ${returnedResults}`,
      null,
      { totalResults, returnedResults }
    );
  }
};

// Progress tracking utilities
export function createProgressUpdate(operation, stage, progress, details = {}) {
  return {
    type: 'progress',
    operation: operation,
    stage: stage,
    progress: progress, // 0-100 percentage
    timestamp: new Date().toISOString(),
    details: details
  };
}

// Long operation wrapper with progress callbacks
export async function withProgress(operation, operationName, progressCallback = null) {
  const startTime = Date.now();
  
  try {
    if (progressCallback) {
      progressCallback(createProgressUpdate(operationName, 'starting', 0, { startTime }));
    }
    
    const result = await operation();
    
    if (progressCallback) {
      const duration = Date.now() - startTime;
      progressCallback(createProgressUpdate(operationName, 'completed', 100, { 
        duration,
        success: true 
      }));
    }
    
    return result;
  } catch (error) {
    if (progressCallback) {
      const duration = Date.now() - startTime;
      progressCallback(createProgressUpdate(operationName, 'failed', -1, { 
        duration,
        error: error.message,
        success: false 
      }));
    }
    throw error;
  }
}

// Timeout wrapper with progress updates
export function withTimeout(promise, timeoutMs, operationName, progressCallback = null) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        if (progressCallback) {
          progressCallback(createProgressUpdate(operationName, 'timeout', -1, { 
            timeoutMs,
            reason: 'Operation exceeded maximum allowed time'
          }));
        }
        reject(errorHandlers.timeoutError(operationName, timeoutMs));
      }, timeoutMs);
    })
  ]);
}

// Timeout error handler
errorHandlers.timeoutError = (operationName, timeoutMs) => {
  return createError(
    ErrorTypes.TIMEOUT_ERROR,
    `Operation '${operationName}' timed out after ${timeoutMs}ms`,
    null,
    { operation: operationName, timeout: timeoutMs }
  );
};