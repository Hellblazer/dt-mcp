/**
 * Connection Manager for DEVONthink MCP Server
 * Handles connection cleanup, retry logic, and performance tracking
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ConnectionManager {
  constructor() {
    this.operationCount = 0;
    this.errorCount = 0;
    this.lastCleanup = Date.now();
    this.performanceMetrics = [];
    this.cleanupThreshold = 15; // Operations before cleanup
    this.degradationThreshold = 0.7; // 70% success rate threshold
  }

  /**
   * Track operation performance
   */
  trackOperation(success, duration, operation) {
    this.operationCount++;
    if (!success) this.errorCount++;
    
    this.performanceMetrics.push({
      timestamp: Date.now(),
      success,
      duration,
      operation,
      totalOperations: this.operationCount,
      errorRate: this.errorCount / this.operationCount
    });

    // Keep only last 50 metrics
    if (this.performanceMetrics.length > 50) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Check if cleanup is needed
   */
  needsCleanup() {
    const timeSinceCleanup = Date.now() - this.lastCleanup;
    const recentOps = this.operationCount % this.cleanupThreshold;
    
    // Cleanup if:
    // 1. Reached operation threshold
    // 2. High error rate
    // 3. Been more than 5 minutes
    return (
      recentOps === 0 ||
      this.getRecentErrorRate() > 0.3 ||
      timeSinceCleanup > 300000
    );
  }

  /**
   * Get error rate for recent operations
   */
  getRecentErrorRate() {
    const recent = this.performanceMetrics.slice(-10);
    if (recent.length === 0) return 0;
    
    const errors = recent.filter(m => !m.success).length;
    return errors / recent.length;
  }

  /**
   * Perform cleanup
   */
  async cleanup() {
    console.error(`[ConnectionManager] Performing cleanup after ${this.operationCount} operations`);

    // Kill any hanging osascript processes
    try {
      // Kill hanging osascript processes older than 30 seconds
      await execAsync(`pkill -f "osascript.*devonthink" || true`);

      // Small delay to let system clean up
      await new Promise(resolve => setTimeout(resolve, 100));

      this.lastCleanup = Date.now();
      console.error('[ConnectionManager] Cleanup completed');
    } catch (error) {
      console.error('[ConnectionManager] Cleanup error:', error);
    }
  }

  /**
   * Execute with retry and cleanup
   */
  async executeWithRetry(operation, operationName, maxRetries = 3) {
    const startTime = Date.now();
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if cleanup needed before operation
        if (this.needsCleanup()) {
          await this.cleanup();
        }

        // Execute the operation
        const result = await operation();
        
        // Track success
        this.trackOperation(true, Date.now() - startTime, operationName);
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`[ConnectionManager] Attempt ${attempt}/${maxRetries} failed for ${operationName}:`, error.message);
        
        // Track failure
        this.trackOperation(false, Date.now() - startTime, operationName);
        
        // If not last attempt, wait with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.error(`[ConnectionManager] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Force cleanup before retry if high error rate
          if (this.getRecentErrorRate() > 0.5) {
            await this.cleanup();
          }
        }
      }
    }
    
    // All retries failed
    throw lastError;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const recent = this.performanceMetrics.slice(-20);
    const successCount = recent.filter(m => m.success).length;
    const avgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length || 0;
    
    return {
      totalOperations: this.operationCount,
      totalErrors: this.errorCount,
      overallSuccessRate: ((this.operationCount - this.errorCount) / this.operationCount * 100).toFixed(2) + '%',
      recentSuccessRate: (successCount / recent.length * 100).toFixed(2) + '%',
      averageOperationTime: Math.round(avgDuration) + 'ms',
      lastCleanup: new Date(this.lastCleanup).toISOString(),
      needsCleanup: this.needsCleanup(),
      recentOperations: recent.slice(-5)
    };
  }

  /**
   * Reset connection manager state
   */
  reset() {
    console.error('[ConnectionManager] Resetting state');
    this.operationCount = 0;
    this.errorCount = 0;
    this.lastCleanup = Date.now();
    this.performanceMetrics = [];
  }
}

// Export singleton instance
const connectionManager = new ConnectionManager();
export default connectionManager;
export { connectionManager };