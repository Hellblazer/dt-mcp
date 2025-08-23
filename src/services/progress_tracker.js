/**
 * Progress Tracker - Tracks and reports progress for long-running operations
 */

import { EventEmitter } from 'events';

export class ProgressTracker extends EventEmitter {
  constructor() {
    super();
    this.activeOperations = new Map();
    this.progressCallbacks = new Map();
    this.completedOperations = new Map();
    
    // Setup cleanup interval (can be disabled for testing)
    this.setupCleanupInterval();
  }

  /**
   * Start tracking a new operation
   * @param {string} operationId - Unique operation identifier
   * @param {number} totalSteps - Total number of steps expected
   * @param {string} description - Operation description
   * @param {Object} metadata - Additional metadata
   */
  startOperation(operationId, totalSteps, description, metadata = {}) {
    var operation = {
      id: operationId,
      description,
      totalSteps,
      currentStep: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      status: 'running',
      subOperations: new Map(),
      stepHistory: [],
      metadata,
      estimatedTimeRemaining: null,
      averageStepDuration: null
    };

    this.activeOperations.set(operationId, operation);
    
    this.emit('operation_started', {
      operationId,
      description,
      totalSteps,
      metadata
    });

    return operationId;
  }

  /**
   * Update operation progress
   * @param {string} operationId - Operation identifier
   * @param {number} currentStep - Current step number
   * @param {string} stepDescription - Description of current step
   * @param {Object} stepData - Additional step data
   */
  updateProgress(operationId, currentStep, stepDescription, stepData = {}) {
    var operation = this.activeOperations.get(operationId);
    if (!operation) {
      return null;
    }

    var now = Date.now();
    var previousStep = operation.currentStep;
    
    // Update operation state
    operation.currentStep = currentStep;
    operation.lastStepDescription = stepDescription;
    operation.lastUpdate = now;

    // Record step history for performance analysis
    if (currentStep > previousStep) {
      var stepDuration = operation.stepHistory.length > 0 ? 
        now - operation.stepHistory[operation.stepHistory.length - 1].timestamp : 
        now - operation.startTime;

      operation.stepHistory.push({
        step: currentStep,
        description: stepDescription,
        timestamp: now,
        duration: stepDuration,
        data: stepData
      });

      // Calculate average step duration and ETA
      this.calculateETA(operation);
    }

    var progressUpdate = this.buildProgressUpdate(operation);
    
    // Notify callback if registered
    var callback = this.progressCallbacks.get(operationId);
    if (callback) {
      try {
        callback(progressUpdate);
      } catch (error) {
        console.error(`Progress callback error for ${operationId}:`, error);
      }
    }

    this.emit('progress_updated', progressUpdate);
    return progressUpdate;
  }

  /**
   * Add a sub-operation to track
   * @param {string} parentId - Parent operation ID
   * @param {string} subOperationId - Sub-operation ID
   * @param {number} steps - Number of steps in sub-operation
   * @param {string} description - Sub-operation description
   */
  addSubOperation(parentId, subOperationId, steps, description) {
    var parent = this.activeOperations.get(parentId);
    if (parent) {
      parent.subOperations.set(subOperationId, {
        id: subOperationId,
        description,
        steps,
        current: 0,
        status: 'pending',
        startTime: null,
        endTime: null
      });
      
      this.emit('sub_operation_added', {
        parentId,
        subOperationId,
        description,
        steps
      });
    }
  }

  /**
   * Update sub-operation progress
   */
  updateSubOperation(parentId, subOperationId, currentStep, stepDescription) {
    var parent = this.activeOperations.get(parentId);
    if (parent && parent.subOperations.has(subOperationId)) {
      var subOp = parent.subOperations.get(subOperationId);
      subOp.current = currentStep;
      subOp.lastStepDescription = stepDescription;
      subOp.lastUpdate = Date.now();
      
      if (subOp.status === 'pending' && currentStep > 0) {
        subOp.status = 'running';
        subOp.startTime = Date.now();
      }
      
      this.emit('sub_operation_updated', {
        parentId,
        subOperationId,
        current: currentStep,
        description: stepDescription
      });
    }
  }

  /**
   * Complete an operation
   * @param {string} operationId - Operation identifier
   * @param {Object} result - Operation result
   */
  completeOperation(operationId, result) {
    var operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.status = result.success ? 'completed' : 'failed';
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.result = result;
      
      // Complete any remaining sub-operations
      for (var [subId, subOp] of operation.subOperations) {
        if (subOp.status === 'running' || subOp.status === 'pending') {
          subOp.status = operation.status;
          subOp.endTime = operation.endTime;
        }
      }
      
      // Final progress update
      var finalUpdate = this.buildProgressUpdate(operation);
      this.updateProgress(operationId, operation.totalSteps, 
                         operation.status === 'completed' ? 'Completed successfully' : 'Failed');
      
      // Move to completed operations
      this.activeOperations.delete(operationId);
      this.completedOperations.set(operationId, operation);
      
      this.emit('operation_completed', {
        operationId,
        status: operation.status,
        duration: operation.duration,
        result,
        finalUpdate
      });
    }
  }

  /**
   * Register a progress callback for an operation
   * @param {string} operationId - Operation identifier
   * @param {Function} callback - Callback function to receive updates
   */
  registerCallback(operationId, callback) {
    this.progressCallbacks.set(operationId, callback);
  }

  /**
   * Unregister a progress callback
   */
  unregisterCallback(operationId) {
    this.progressCallbacks.delete(operationId);
  }

  /**
   * Get current progress for an operation
   * @param {string} operationId - Operation identifier
   * @returns {Object|null} Progress information or null if not found
   */
  getOperationProgress(operationId) {
    // Check active operations
    var operation = this.activeOperations.get(operationId);
    if (operation) {
      return this.buildProgressUpdate(operation);
    }
    
    // Check completed operations
    operation = this.completedOperations.get(operationId);
    if (operation) {
      return this.buildProgressUpdate(operation);
    }
    
    return null;
  }

  /**
   * Get all active operations
   * @returns {Array} Array of active operation progress updates
   */
  getAllActiveOperations() {
    return Array.from(this.activeOperations.values()).map(op => 
      this.buildProgressUpdate(op)
    );
  }

  /**
   * Get operation statistics
   * @param {string} operationId - Operation identifier
   * @returns {Object|null} Operation statistics
   */
  getOperationStats(operationId) {
    var operation = this.activeOperations.get(operationId) || 
                   this.completedOperations.get(operationId);
    
    if (!operation) {
      return null;
    }

    var totalDuration = operation.duration || (Date.now() - operation.startTime);
    var completedSteps = operation.stepHistory.length;
    
    return {
      operationId,
      totalDuration,
      completedSteps,
      averageStepDuration: operation.averageStepDuration,
      estimatedTimeRemaining: operation.estimatedTimeRemaining,
      stepHistory: operation.stepHistory.map(step => ({
        step: step.step,
        description: step.description,
        duration: step.duration,
        timestamp: step.timestamp
      })),
      subOperations: Array.from(operation.subOperations.values())
    };
  }

  /**
   * Build progress update object
   * @private
   */
  buildProgressUpdate(operation) {
    var percentage = operation.totalSteps > 0 ? 
      (operation.currentStep / operation.totalSteps) * 100 : 0;
    
    return {
      operationId: operation.id,
      description: operation.description,
      current: operation.currentStep,
      total: operation.totalSteps,
      percentage: Math.min(percentage, 100),
      stepDescription: operation.lastStepDescription,
      status: operation.status,
      startTime: operation.startTime,
      lastUpdate: operation.lastUpdate,
      estimatedTimeRemaining: operation.estimatedTimeRemaining,
      averageStepDuration: operation.averageStepDuration,
      subOperations: Array.from(operation.subOperations.values()).map(subOp => ({
        id: subOp.id,
        description: subOp.description,
        current: subOp.current,
        total: subOp.steps,
        percentage: (subOp.current / subOp.steps) * 100,
        status: subOp.status
      })),
      metadata: operation.metadata
    };
  }

  /**
   * Calculate estimated time remaining
   * @private
   */
  calculateETA(operation) {
    if (operation.stepHistory.length < 2) {
      return;
    }

    // Calculate average step duration from recent history
    var recentSteps = operation.stepHistory.slice(-5); // Last 5 steps
    var totalDuration = recentSteps.reduce((sum, step) => sum + step.duration, 0);
    operation.averageStepDuration = totalDuration / recentSteps.length;

    // Estimate remaining time
    var remainingSteps = operation.totalSteps - operation.currentStep;
    operation.estimatedTimeRemaining = remainingSteps * operation.averageStepDuration;
  }

  /**
   * Cleanup old completed operations
   * @private
   */
  cleanupCompletedOperations() {
    var cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour
    var toDelete = [];
    
    for (var [id, operation] of this.completedOperations) {
      if (operation.endTime && operation.endTime < cutoffTime) {
        toDelete.push(id);
        // Also cleanup any associated callbacks
        this.progressCallbacks.delete(id);
      }
    }
    
    toDelete.forEach(id => this.completedOperations.delete(id));
    
    if (toDelete.length > 0) {
      this.emit('operations_cleaned', { 
        type: 'progress_tracker',
        count: toDelete.length 
      });
    }
  }

  /**
   * Cancel an operation's progress tracking
   * @param {string} operationId - Operation identifier
   */
  cancelOperation(operationId) {
    var operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.status = 'cancelled';
      this.completeOperation(operationId, { success: false, error: 'Operation cancelled' });
      return true;
    }
    return false;
  }

  /**
   * Get summary of all tracking activities
   */
  getSummary() {
    return {
      activeOperations: this.activeOperations.size,
      completedOperations: this.completedOperations.size,
      totalCallbacks: this.progressCallbacks.size,
      longestRunningOperation: this.getLongestRunningOperation(),
      recentCompletions: this.getRecentCompletions(5)
    };
  }

  /**
   * Get the longest running active operation
   * @private
   */
  getLongestRunningOperation() {
    var longest = null;
    var maxDuration = 0;
    
    for (var operation of this.activeOperations.values()) {
      var duration = Date.now() - operation.startTime;
      if (duration > maxDuration) {
        maxDuration = duration;
        longest = {
          id: operation.id,
          description: operation.description,
          duration,
          progress: (operation.currentStep / operation.totalSteps) * 100
        };
      }
    }
    
    return longest;
  }

  /**
   * Get recent completions
   * @private
   */
  getRecentCompletions(limit = 5) {
    return Array.from(this.completedOperations.values())
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, limit)
      .map(op => ({
        id: op.id,
        description: op.description,
        status: op.status,
        duration: op.duration,
        endTime: op.endTime
      }));
  }

  /**
   * Setup cleanup interval
   */
  setupCleanupInterval() {
    this.cleanupInterval = setInterval(() => this.cleanupCompletedOperations(), 10 * 60 * 1000);
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
}