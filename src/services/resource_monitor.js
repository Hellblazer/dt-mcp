/**
 * Resource Monitor - Tracks system resources and operation performance
 */

import { EventEmitter } from 'events';

export class ResourceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxMemoryMB: options.maxMemoryMB || 500,
      maxOperationTimeMS: options.maxOperationTimeMS || 300000, // 5 minutes
      maxErrorRate: options.maxErrorRate || 0.05, // 5%
      monitoringInterval: options.monitoringInterval || 30000, // 30 seconds
      historyRetention: options.historyRetention || 3600000, // 1 hour
      alertThresholds: {
        memoryWarning: options.memoryWarningMB || 400,
        memoryCritical: options.memoryCriticalMB || 480,
        errorRateWarning: options.errorRateWarning || 0.03,
        operationTimeWarning: options.operationTimeWarning || 240000, // 4 minutes
        ...options.alertThresholds
      }
    };

    this.metrics = {
      memoryUsage: [],
      operationTimes: new Map(),
      apiCallCounts: new Map(),
      errorRates: new Map(),
      systemMetrics: [],
      performanceHistory: []
    };

    this.activeOperations = new Set();
    this.alertHistory = [];
    this.lastCleanup = Date.now();
    
    // Start monitoring (can be disabled for testing)
    if (options.autoStart !== false) {
      this.startMonitoring();
    }
  }

  /**
   * Start the monitoring process
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkThresholds();
      this.cleanupOldData();
    }, this.options.monitoringInterval);

    this.emit('monitoring_started', { 
      interval: this.options.monitoringInterval,
      thresholds: this.options.alertThresholds 
    });
  }

  /**
   * Stop the monitoring process
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit('monitoring_stopped');
    }
  }

  /**
   * Record the start of an operation
   * @param {string} operationId - Unique operation identifier
   * @param {string} operationType - Type of operation
   * @param {Object} metadata - Additional metadata
   */
  recordOperationStart(operationId, operationType, metadata = {}) {
    var now = Date.now();
    var memoryUsage = process.memoryUsage();
    
    var operation = {
      id: operationId,
      type: operationType,
      startTime: now,
      memoryStart: memoryUsage.heapUsed,
      metadata
    };

    this.metrics.operationTimes.set(operationId, operation);
    this.activeOperations.add(operationId);

    this.emit('operation_started', { 
      operationId, 
      operationType, 
      memoryUsage: memoryUsage.heapUsed / (1024 * 1024) 
    });
  }

  /**
   * Record the end of an operation
   * @param {string} operationId - Operation identifier
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} result - Operation result or error
   */
  recordOperationEnd(operationId, success, result = {}) {
    var operation = this.metrics.operationTimes.get(operationId);
    if (!operation) {
      return;
    }

    var now = Date.now();
    var memoryUsage = process.memoryUsage();
    var duration = now - operation.startTime;
    var memoryDelta = memoryUsage.heapUsed - operation.memoryStart;

    // Update operation record
    operation.endTime = now;
    operation.duration = duration;
    operation.memoryEnd = memoryUsage.heapUsed;
    operation.memoryDelta = memoryDelta;
    operation.success = success;
    operation.result = result;

    // Record metrics
    this.metrics.memoryUsage.push({
      timestamp: now,
      usage: memoryUsage.heapUsed / (1024 * 1024), // MB
      operationId,
      operationType: operation.type
    });

    // Record performance data
    this.metrics.performanceHistory.push({
      timestamp: now,
      operationType: operation.type,
      duration,
      memoryDelta: memoryDelta / (1024 * 1024), // MB
      success
    });

    // Update error rates
    this.updateErrorRate(operation.type, success);
    
    // Update API call counts
    this.updateAPICallCount(operation.type);

    // Check thresholds for this specific operation
    this.checkOperationThresholds(operation);

    // Clean up
    this.activeOperations.delete(operationId);

    this.emit('operation_completed', {
      operationId,
      operationType: operation.type,
      duration,
      memoryDelta: memoryDelta / (1024 * 1024),
      success
    });
  }

  /**
   * Record API call statistics
   * @param {string} apiName - Name of the API
   * @param {boolean} success - Whether call succeeded
   * @param {number} responseTime - Response time in ms
   */
  recordAPICall(apiName, success, responseTime) {
    var now = Date.now();
    
    if (!this.metrics.apiCallCounts.has(apiName)) {
      this.metrics.apiCallCounts.set(apiName, {
        total: 0,
        successful: 0,
        failed: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastCall: now
      });
    }

    var stats = this.metrics.apiCallCounts.get(apiName);
    stats.total++;
    stats.totalResponseTime += responseTime;
    stats.averageResponseTime = stats.totalResponseTime / stats.total;
    stats.lastCall = now;

    if (success) {
      stats.successful++;
    } else {
      stats.failed++;
    }

    this.emit('api_call_recorded', {
      apiName,
      success,
      responseTime,
      stats: { ...stats }
    });
  }

  /**
   * Get current resource status
   * @returns {Object} Current resource status
   */
  getResourceStatus() {
    var memoryUsage = process.memoryUsage();
    var currentMemoryMB = memoryUsage.heapUsed / (1024 * 1024);
    
    return {
      timestamp: Date.now(),
      memory: {
        used: currentMemoryMB,
        total: memoryUsage.heapTotal / (1024 * 1024),
        external: memoryUsage.external / (1024 * 1024),
        rss: memoryUsage.rss / (1024 * 1024),
        status: this.getMemoryStatus(currentMemoryMB)
      },
      operations: {
        active: this.activeOperations.size,
        completed: this.metrics.operationTimes.size - this.activeOperations.size,
        longestRunning: this.getLongestRunningOperation()
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      },
      errorRates: this.getErrorRateSummary(),
      performance: this.getPerformanceSummary(),
      alerts: this.getRecentAlerts(5)
    };
  }

  /**
   * Get current resource metrics (alias for getResourceStatus for compatibility)
   * @returns {Object} Current resource metrics
   */
  getCurrentMetrics() {
    return this.getResourceStatus();
  }

  /**
   * Get detailed operation statistics
   * @param {string} operationType - Optional filter by operation type
   * @returns {Object} Operation statistics
   */
  getOperationStats(operationType = null) {
    var operations = Array.from(this.metrics.operationTimes.values());
    
    if (operationType) {
      operations = operations.filter(op => op.type === operationType);
    }

    var completed = operations.filter(op => op.endTime);
    var totalDuration = completed.reduce((sum, op) => sum + op.duration, 0);
    var successful = completed.filter(op => op.success).length;

    return {
      operationType,
      total: operations.length,
      completed: completed.length,
      active: operations.length - completed.length,
      successful,
      failed: completed.length - successful,
      successRate: completed.length > 0 ? successful / completed.length : 0,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      totalDuration,
      memoryImpact: this.calculateMemoryImpact(completed)
    };
  }

  /**
   * Get API call statistics
   * @returns {Object} API call statistics
   */
  getAPIStats() {
    var stats = {};
    
    for (var [apiName, apiStats] of this.metrics.apiCallCounts) {
      stats[apiName] = {
        ...apiStats,
        successRate: apiStats.total > 0 ? apiStats.successful / apiStats.total : 0,
        errorRate: apiStats.total > 0 ? apiStats.failed / apiStats.total : 0
      };
    }
    
    return stats;
  }

  /**
   * Create a performance report
   * @returns {Object} Comprehensive performance report
   */
  generatePerformanceReport() {
    var now = Date.now();
    var oneHourAgo = now - 3600000;
    
    var recentOperations = Array.from(this.metrics.operationTimes.values())
      .filter(op => op.startTime > oneHourAgo);

    return {
      generatedAt: now,
      timeRange: { from: oneHourAgo, to: now },
      summary: {
        totalOperations: recentOperations.length,
        completedOperations: recentOperations.filter(op => op.endTime).length,
        successRate: this.calculateSuccessRate(recentOperations),
        averageDuration: this.calculateAverageDuration(recentOperations),
        memoryTrend: this.getMemoryTrend()
      },
      alerts: this.alertHistory.filter(alert => alert.timestamp > oneHourAgo),
      topPerformingOperations: this.getTopPerformingOperations(),
      slowestOperations: this.getSlowestOperations(),
      resourceUtilization: this.getResourceUtilization(),
      apiPerformance: this.getAPIStats(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Collect system metrics
   * @private
   */
  collectSystemMetrics() {
    var memoryUsage = process.memoryUsage();
    var now = Date.now();
    
    this.metrics.systemMetrics.push({
      timestamp: now,
      memory: {
        heapUsed: memoryUsage.heapUsed / (1024 * 1024),
        heapTotal: memoryUsage.heapTotal / (1024 * 1024),
        external: memoryUsage.external / (1024 * 1024),
        rss: memoryUsage.rss / (1024 * 1024)
      },
      uptime: process.uptime(),
      activeOperations: this.activeOperations.size
    });
  }

  /**
   * Check all thresholds and emit alerts
   * @private
   */
  checkThresholds() {
    var memoryUsage = process.memoryUsage();
    var currentMemoryMB = memoryUsage.heapUsed / (1024 * 1024);
    
    // Memory thresholds
    if (currentMemoryMB > this.options.alertThresholds.memoryCritical) {
      this.emitAlert('memory_critical', {
        current: currentMemoryMB,
        threshold: this.options.alertThresholds.memoryCritical,
        severity: 'critical'
      });
    } else if (currentMemoryMB > this.options.alertThresholds.memoryWarning) {
      this.emitAlert('memory_warning', {
        current: currentMemoryMB,
        threshold: this.options.alertThresholds.memoryWarning,
        severity: 'warning'
      });
    }

    // Error rate thresholds
    for (var [operationType, errorInfo] of this.metrics.errorRates) {
      if (errorInfo.rate > this.options.alertThresholds.errorRateWarning) {
        this.emitAlert('error_rate_high', {
          operationType,
          current: errorInfo.rate,
          threshold: this.options.alertThresholds.errorRateWarning,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Check thresholds for specific operation
   * @private
   */
  checkOperationThresholds(operation) {
    var durationMs = operation.duration;
    var memoryMB = operation.memoryDelta / (1024 * 1024);

    // Operation time threshold
    if (durationMs > this.options.alertThresholds.operationTimeWarning) {
      this.emitAlert('operation_slow', {
        operationId: operation.id,
        operationType: operation.type,
        duration: durationMs,
        threshold: this.options.alertThresholds.operationTimeWarning,
        severity: 'warning'
      });
    }

    // Memory usage threshold for single operation
    if (Math.abs(memoryMB) > 50) { // 50MB change
      this.emitAlert('operation_memory_impact', {
        operationId: operation.id,
        operationType: operation.type,
        memoryDelta: memoryMB,
        severity: 'info'
      });
    }
  }

  /**
   * Update error rate for operation type
   * @private
   */
  updateErrorRate(operationType, success) {
    if (!this.metrics.errorRates.has(operationType)) {
      this.metrics.errorRates.set(operationType, {
        total: 0,
        failed: 0,
        rate: 0
      });
    }

    var errorInfo = this.metrics.errorRates.get(operationType);
    errorInfo.total++;
    
    if (!success) {
      errorInfo.failed++;
    }
    
    errorInfo.rate = errorInfo.failed / errorInfo.total;
  }

  /**
   * Update API call count
   * @private
   */
  updateAPICallCount(operationType) {
    // This is handled in recordAPICall, but we keep this for consistency
  }

  /**
   * Emit an alert
   * @private
   */
  emitAlert(alertType, data) {
    var alert = {
      type: alertType,
      timestamp: Date.now(),
      severity: data.severity || 'info',
      data
    };

    this.alertHistory.push(alert);
    this.emit('alert', alert);

    // Keep only recent alerts
    var oneHourAgo = Date.now() - 3600000;
    this.alertHistory = this.alertHistory.filter(a => a.timestamp > oneHourAgo);
  }

  /**
   * Clean up old data
   * @private
   */
  cleanupOldData() {
    var cutoffTime = Date.now() - this.options.historyRetention;
    
    // Clean up memory usage history
    this.metrics.memoryUsage = this.metrics.memoryUsage
      .filter(record => record.timestamp > cutoffTime);
    
    // Clean up system metrics
    this.metrics.systemMetrics = this.metrics.systemMetrics
      .filter(record => record.timestamp > cutoffTime);
    
    // Clean up performance history
    this.metrics.performanceHistory = this.metrics.performanceHistory
      .filter(record => record.timestamp > cutoffTime);
    
    // Clean up completed operations
    for (var [id, operation] of this.metrics.operationTimes) {
      if (operation.endTime && operation.endTime < cutoffTime) {
        this.metrics.operationTimes.delete(id);
      }
    }
    
    this.lastCleanup = Date.now();
  }

  /**
   * Helper methods
   * @private
   */
  getMemoryStatus(memoryMB) {
    if (memoryMB > this.options.alertThresholds.memoryCritical) {
      return 'critical';
    } else if (memoryMB > this.options.alertThresholds.memoryWarning) {
      return 'warning';
    }
    return 'normal';
  }

  getLongestRunningOperation() {
    var longest = null;
    var maxDuration = 0;
    
    for (var operationId of this.activeOperations) {
      var operation = this.metrics.operationTimes.get(operationId);
      if (operation) {
        var duration = Date.now() - operation.startTime;
        if (duration > maxDuration) {
          maxDuration = duration;
          longest = {
            id: operationId,
            type: operation.type,
            duration
          };
        }
      }
    }
    
    return longest;
  }

  getErrorRateSummary() {
    var summary = {};
    for (var [operationType, errorInfo] of this.metrics.errorRates) {
      summary[operationType] = {
        rate: errorInfo.rate,
        total: errorInfo.total,
        failed: errorInfo.failed
      };
    }
    return summary;
  }

  getPerformanceSummary() {
    var recent = this.metrics.performanceHistory.slice(-100); // Last 100 operations
    
    if (recent.length === 0) {
      return { averageDuration: 0, successRate: 0, operationCount: 0 };
    }

    var totalDuration = recent.reduce((sum, op) => sum + op.duration, 0);
    var successful = recent.filter(op => op.success).length;
    
    return {
      averageDuration: totalDuration / recent.length,
      successRate: successful / recent.length,
      operationCount: recent.length
    };
  }

  getRecentAlerts(limit = 10) {
    return this.alertHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getMemoryTrend() {
    var recent = this.metrics.memoryUsage.slice(-20); // Last 20 readings
    if (recent.length < 2) return 'stable';
    
    var first = recent[0].usage;
    var last = recent[recent.length - 1].usage;
    var change = ((last - first) / first) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  calculateMemoryImpact(operations) {
    if (operations.length === 0) return 0;
    
    var totalImpact = operations.reduce((sum, op) => 
      sum + Math.abs(op.memoryDelta || 0), 0);
    
    return totalImpact / (1024 * 1024); // Convert to MB
  }

  calculateSuccessRate(operations) {
    var completed = operations.filter(op => op.endTime);
    if (completed.length === 0) return 0;
    
    var successful = completed.filter(op => op.success).length;
    return successful / completed.length;
  }

  calculateAverageDuration(operations) {
    var completed = operations.filter(op => op.endTime && op.duration);
    if (completed.length === 0) return 0;
    
    var totalDuration = completed.reduce((sum, op) => sum + op.duration, 0);
    return totalDuration / completed.length;
  }

  getTopPerformingOperations(limit = 5) {
    return Array.from(this.metrics.operationTimes.values())
      .filter(op => op.endTime && op.success)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, limit)
      .map(op => ({
        id: op.id,
        type: op.type,
        duration: op.duration
      }));
  }

  getSlowestOperations(limit = 5) {
    return Array.from(this.metrics.operationTimes.values())
      .filter(op => op.endTime)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(op => ({
        id: op.id,
        type: op.type,
        duration: op.duration,
        success: op.success
      }));
  }

  getResourceUtilization() {
    var recent = this.metrics.systemMetrics.slice(-10); // Last 10 readings
    if (recent.length === 0) return {};
    
    var avgMemory = recent.reduce((sum, metric) => 
      sum + metric.memory.heapUsed, 0) / recent.length;
    
    return {
      averageMemoryMB: avgMemory,
      memoryTrend: this.getMemoryTrend(),
      averageActiveOperations: recent.reduce((sum, metric) => 
        sum + metric.activeOperations, 0) / recent.length
    };
  }

  generateRecommendations() {
    var recommendations = [];
    var status = this.getResourceStatus();
    
    if (status.memory.status === 'critical') {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'Memory usage is critical. Consider reducing concurrent operations or restarting the service.'
      });
    }
    
    if (status.operations.active > 5) {
      recommendations.push({
        type: 'operations',
        priority: 'medium',
        message: 'High number of active operations. Consider implementing operation queuing.'
      });
    }
    
    var errorRates = this.getErrorRateSummary();
    for (var [operationType, stats] of Object.entries(errorRates)) {
      if (stats.rate > 0.1) {
        recommendations.push({
          type: 'errors',
          priority: 'high',
          message: `High error rate for ${operationType}: ${(stats.rate * 100).toFixed(1)}%`
        });
      }
    }
    
    return recommendations;
  }
}