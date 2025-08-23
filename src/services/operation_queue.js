/**
 * Operation Queue - Manages concurrent operations with priority and resource control
 */

import { EventEmitter } from 'events';

export class OperationQueue extends EventEmitter {
  constructor(maxConcurrent = 3) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.activeOperations = new Map();
    this.pendingOperations = [];
    this.completedOperations = new Map();
    this.operationCounter = 0;
    
    // Setup cleanup interval (can be disabled for testing)
    this.setupCleanupInterval();
  }

  /**
   * Add operation to queue with priority
   * @param {Function} operation - Async function to execute
   * @param {Object} options - Operation options
   * @returns {Promise} Operation result promise
   */
  async enqueue(operation, options = {}) {
    var operationId = this.generateOperationId();
    var { priority = 0, description = 'Unknown operation', timeout = 300000 } = options;

    return new Promise((resolve, reject) => {
      var queuedOperation = {
        id: operationId,
        operation,
        priority,
        description,
        timeout,
        resolve,
        reject,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        status: 'queued',
        error: null,
        result: null
      };

      this.pendingOperations.push(queuedOperation);
      this.pendingOperations.sort((a, b) => b.priority - a.priority);
      
      this.emit('operation_queued', { operationId, description, priority });
      this.processQueue();
    });
  }

  /**
   * Get operation status by ID
   */
  getOperationStatus(operationId) {
    // Check active operations
    if (this.activeOperations.has(operationId)) {
      var operation = this.activeOperations.get(operationId);
      return {
        id: operationId,
        status: operation.status,
        description: operation.description,
        progress: operation.progress || 0,
        startedAt: operation.startedAt,
        elapsedMs: operation.startedAt ? Date.now() - operation.startedAt : 0
      };
    }

    // Check completed operations
    if (this.completedOperations.has(operationId)) {
      var operation = this.completedOperations.get(operationId);
      return {
        id: operationId,
        status: operation.status,
        description: operation.description,
        startedAt: operation.startedAt,
        completedAt: operation.completedAt,
        durationMs: operation.completedAt - operation.startedAt,
        error: operation.error
      };
    }

    // Check pending operations
    var pendingOp = this.pendingOperations.find(op => op.id === operationId);
    if (pendingOp) {
      return {
        id: operationId,
        status: 'queued',
        description: pendingOp.description,
        queuePosition: this.pendingOperations.indexOf(pendingOp) + 1,
        createdAt: pendingOp.createdAt
      };
    }

    return null;
  }

  /**
   * Cancel pending or active operation
   */
  async cancelOperation(operationId) {
    // Cancel pending operation
    var pendingIndex = this.pendingOperations.findIndex(op => op.id === operationId);
    if (pendingIndex !== -1) {
      var operation = this.pendingOperations.splice(pendingIndex, 1)[0];
      operation.reject(new Error('Operation cancelled'));
      this.emit('operation_cancelled', { operationId, status: 'queued' });
      return { success: true, status: 'cancelled_from_queue' };
    }

    // Cancel active operation
    if (this.activeOperations.has(operationId)) {
      var operation = this.activeOperations.get(operationId);
      operation.status = 'cancelling';
      operation.cancelled = true;
      
      // Set timeout for force cancellation
      setTimeout(() => {
        if (this.activeOperations.has(operationId)) {
          var op = this.activeOperations.get(operationId);
          op.reject(new Error('Operation force cancelled'));
          this.activeOperations.delete(operationId);
          this.emit('operation_cancelled', { operationId, status: 'force_cancelled' });
        }
      }, 10000); // 10 second grace period
      
      this.emit('operation_cancelled', { operationId, status: 'cancelling' });
      return { success: true, status: 'cancelling' };
    }

    return { success: false, error: 'Operation not found' };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      active: this.activeOperations.size,
      pending: this.pendingOperations.length,
      maxConcurrent: this.maxConcurrent,
      completed: this.completedOperations.size,
      activeOperations: Array.from(this.activeOperations.values()).map(op => ({
        id: op.id,
        description: op.description,
        status: op.status,
        startedAt: op.startedAt,
        elapsedMs: Date.now() - op.startedAt
      })),
      pendingOperations: this.pendingOperations.map((op, index) => ({
        id: op.id,
        description: op.description,
        priority: op.priority,
        queuePosition: index + 1,
        createdAt: op.createdAt
      }))
    };
  }

  /**
   * Process the operation queue
   */
  async processQueue() {
    while (this.activeOperations.size < this.maxConcurrent && 
           this.pendingOperations.length > 0) {
      
      var queuedOp = this.pendingOperations.shift();
      this.executeOperation(queuedOp);
    }
  }

  /**
   * Execute a queued operation
   */
  async executeOperation(queuedOp) {
    queuedOp.status = 'running';
    queuedOp.startedAt = Date.now();
    this.activeOperations.set(queuedOp.id, queuedOp);

    this.emit('operation_started', { 
      operationId: queuedOp.id, 
      description: queuedOp.description 
    });

    var timeoutHandle = setTimeout(() => {
      if (this.activeOperations.has(queuedOp.id)) {
        queuedOp.status = 'timeout';
        queuedOp.error = new Error(`Operation timed out after ${queuedOp.timeout}ms`);
        this.completeOperation(queuedOp);
      }
    }, queuedOp.timeout);

    try {
      // Check for cancellation before execution
      if (queuedOp.cancelled) {
        throw new Error('Operation cancelled');
      }

      var result = await queuedOp.operation();
      
      clearTimeout(timeoutHandle);
      queuedOp.status = 'completed';
      queuedOp.result = result;
      queuedOp.resolve(result);
      
    } catch (error) {
      clearTimeout(timeoutHandle);
      queuedOp.status = queuedOp.cancelled ? 'cancelled' : 'failed';
      queuedOp.error = error;
      queuedOp.reject(error);
    } finally {
      this.completeOperation(queuedOp);
    }
  }

  /**
   * Complete operation and clean up
   */
  completeOperation(operation) {
    operation.completedAt = Date.now();
    this.activeOperations.delete(operation.id);
    this.completedOperations.set(operation.id, operation);
    
    this.emit('operation_completed', {
      operationId: operation.id,
      status: operation.status,
      duration: operation.completedAt - operation.startedAt,
      error: operation.error?.message
    });
    
    // Continue processing queue
    this.processQueue();
  }

  /**
   * Clean up old completed operations
   */
  cleanupCompletedOperations() {
    var cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour
    var toDelete = [];
    
    for (var [id, operation] of this.completedOperations) {
      if (operation.completedAt < cutoffTime) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.completedOperations.delete(id));
    
    if (toDelete.length > 0) {
      this.emit('operations_cleaned', { count: toDelete.length });
    }
  }

  /**
   * Setup cleanup interval
   */
  setupCleanupInterval() {
    this.cleanupInterval = setInterval(() => this.cleanupCompletedOperations(), 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate unique operation ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${++this.operationCounter}`;
  }
}