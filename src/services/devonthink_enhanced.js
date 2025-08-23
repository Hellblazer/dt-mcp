/**
 * Enhanced DEVONthink Service - Integrates with Phase 4 infrastructure for bulk operations
 */

import { DEVONthinkService } from './devonthink.js';
import { OperationQueue } from './operation_queue.js';
import { ProgressTracker } from './progress_tracker.js';
import { ResourceMonitor } from './resource_monitor.js';
import { ExternalAPIService } from './external_apis.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DEVONthinkEnhancedService extends DEVONthinkService {
  constructor(options = {}) {
    super();
    
    // Initialize Phase 4 infrastructure
    this.operationQueue = new OperationQueue(options.maxConcurrent || 3);
    this.progressTracker = new ProgressTracker();
    this.resourceMonitor = new ResourceMonitor(options.resourceMonitorOptions);
    this.externalAPIs = new ExternalAPIService();
    
    // Enhanced options
    this.options = {
      batchSize: options.batchSize || 10,
      progressReporting: options.progressReporting !== false,
      resourceMonitoring: options.resourceMonitoring !== false,
      operationTimeout: options.operationTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      ...options
    };

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for infrastructure components
   * @private
   */
  setupEventHandlers() {
    // Operation Queue events
    this.operationQueue.on('operation_started', (data) => {
      console.log(`Operation started: ${data.operationId} - ${data.description}`);
    });

    this.operationQueue.on('operation_completed', (data) => {
      console.log(`Operation completed: ${data.operationId} (${data.duration}ms)`);
    });

    // Resource Monitor events
    this.resourceMonitor.on('alert', (alert) => {
      console.warn(`Resource alert: ${alert.type}`, alert.data);
    });

    // Progress Tracker events
    this.progressTracker.on('operation_completed', (data) => {
      if (data.status === 'failed') {
        console.error(`Operation failed: ${data.operationId}`);
      }
    });
  }

  /**
   * Bulk import URLs with progress tracking and resource monitoring
   * @param {Array} urls - Array of URLs to import
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Bulk import results
   */
  async bulkImportUrls(urls, options = {}) {
    var operationId = this.progressTracker.startOperation(
      `bulk_import_${Date.now()}`,
      urls.length + 1, // +1 for validation step
      'Bulk URL Import',
      { urlCount: urls.length, options }
    );

    this.resourceMonitor.recordOperationStart(operationId, 'bulk_import_urls', { urlCount: urls.length });

    try {
      // Step 1: Validate URLs
      this.progressTracker.updateProgress(operationId, 1, 'Validating URLs');
      var validUrls = [];
      var invalidUrls = [];

      for (var url of urls) {
        try {
          if (this.isValidUrl(url)) {
            validUrls.push(url);
          } else {
            invalidUrls.push({ url, error: 'Invalid URL format' });
          }
        } catch (error) {
          invalidUrls.push({ url, error: error.message });
        }
      }

      var results = {
        successful: [],
        failed: [],
        summary: {
          total: urls.length,
          validUrls: validUrls.length,
          invalidUrls: invalidUrls.length,
          completed: 0,
          errors: 0
        }
      };

      // Add invalid URLs to failed results
      results.failed.push(...invalidUrls);

      // Process valid URLs in batches
      var batchSize = options.batchSize || this.options.batchSize;
      var batches = this.createBatches(validUrls, batchSize);

      for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var batchDescription = `Processing batch ${i + 1}/${batches.length} (${batch.length} URLs)`;
        
        this.progressTracker.updateProgress(operationId, i + 2, batchDescription);

        // Process batch concurrently
        var batchPromises = batch.map(url => 
          this.operationQueue.enqueue(
            () => this.importUrlWithRetry(url, options),
            {
              priority: options.priority || 0,
              description: `Import URL: ${this.truncateUrl(url)}`,
              timeout: this.options.operationTimeout
            }
          )
        );

        try {
          var batchResults = await Promise.allSettled(batchPromises);
          
          // Process batch results
          for (var j = 0; j < batchResults.length; j++) {
            var result = batchResults[j];
            var url = batch[j];

            if (result.status === 'fulfilled' && result.value.success) {
              results.successful.push({
                url,
                document: result.value.document,
                metadata: result.value.metadata
              });
              results.summary.completed++;
            } else {
              results.failed.push({
                url,
                error: result.reason?.message || result.value?.error || 'Unknown error'
              });
              results.summary.errors++;
            }
          }

        } catch (error) {
          // Handle batch-level errors
          for (var url of batch) {
            results.failed.push({
              url,
              error: `Batch processing error: ${error.message}`
            });
            results.summary.errors++;
          }
        }

        // Small delay between batches to prevent overwhelming the system
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.progressTracker.completeOperation(operationId, { success: true });
      this.resourceMonitor.recordOperationEnd(operationId, true, results);

      return {
        success: true,
        operationId,
        results,
        performance: {
          totalDuration: Date.now() - this.progressTracker.getOperationProgress(operationId).startTime,
          batchCount: batches.length,
          averageBatchSize: Math.ceil(validUrls.length / batches.length)
        }
      };

    } catch (error) {
      this.progressTracker.completeOperation(operationId, { success: false, error: error.message });
      this.resourceMonitor.recordOperationEnd(operationId, false, { error: error.message });
      
      return {
        success: false,
        error: error.message,
        operationId,
        results: results || { successful: [], failed: [], summary: { total: urls.length, completed: 0, errors: urls.length } }
      };
    }
  }

  /**
   * Bulk download academic papers with external API integration
   * @param {Array} papers - Array of paper identifiers { source, identifier }
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Bulk download results
   */
  async bulkDownloadPapers(papers, options = {}) {
    var operationId = this.progressTracker.startOperation(
      `bulk_download_${Date.now()}`,
      papers.length + 1, // +1 for validation step
      'Bulk Paper Download',
      { paperCount: papers.length, options }
    );

    this.resourceMonitor.recordOperationStart(operationId, 'bulk_download_papers', { paperCount: papers.length });

    try {
      // Step 1: Validate paper identifiers
      this.progressTracker.updateProgress(operationId, 1, 'Validating paper identifiers');
      var validPapers = [];
      var invalidPapers = [];

      for (var paper of papers) {
        if (this.isValidPaperIdentifier(paper)) {
          validPapers.push(paper);
        } else {
          invalidPapers.push({ 
            paper, 
            error: 'Invalid paper identifier format' 
          });
        }
      }

      var results = {
        successful: [],
        failed: [],
        metadata: [],
        summary: {
          total: papers.length,
          validPapers: validPapers.length,
          invalidPapers: invalidPapers.length,
          downloaded: 0,
          errors: 0
        }
      };

      // Add invalid papers to failed results
      results.failed.push(...invalidPapers);

      // Process valid papers in batches
      var batchSize = Math.min(options.batchSize || 5, 5); // Smaller batches for API calls
      var batches = this.createBatches(validPapers, batchSize);

      for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var batchDescription = `Downloading batch ${i + 1}/${batches.length} (${batch.length} papers)`;
        
        this.progressTracker.updateProgress(operationId, i + 2, batchDescription);

        // Process batch with API rate limiting consideration
        var batchPromises = batch.map(paper => 
          this.operationQueue.enqueue(
            () => this.downloadPaperEnhanced(paper, options),
            {
              priority: options.priority || 1, // Higher priority for academic papers
              description: `Download paper: ${paper.source}:${paper.identifier}`,
              timeout: this.options.operationTimeout * 2 // Longer timeout for downloads
            }
          )
        );

        try {
          var batchResults = await Promise.allSettled(batchPromises);
          
          // Process batch results
          for (var j = 0; j < batchResults.length; j++) {
            var result = batchResults[j];
            var paper = batch[j];

            if (result.status === 'fulfilled' && result.value.success) {
              results.successful.push({
                paper,
                document: result.value.document,
                metadata: result.value.metadata
              });
              
              if (result.value.metadata) {
                results.metadata.push(result.value.metadata);
              }
              
              results.summary.downloaded++;
            } else {
              results.failed.push({
                paper,
                error: result.reason?.message || result.value?.error || 'Unknown error'
              });
              results.summary.errors++;
            }
          }

        } catch (error) {
          // Handle batch-level errors
          for (var paper of batch) {
            results.failed.push({
              paper,
              error: `Batch processing error: ${error.message}`
            });
            results.summary.errors++;
          }
        }

        // Longer delay between batches for API rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      this.progressTracker.completeOperation(operationId, { success: true });
      this.resourceMonitor.recordOperationEnd(operationId, true, results);

      return {
        success: true,
        operationId,
        results,
        performance: {
          totalDuration: Date.now() - this.progressTracker.getOperationProgress(operationId).startTime,
          batchCount: batches.length,
          averageBatchSize: Math.ceil(validPapers.length / batches.length),
          apiCallsEstimate: validPapers.length
        }
      };

    } catch (error) {
      this.progressTracker.completeOperation(operationId, { success: false, error: error.message });
      this.resourceMonitor.recordOperationEnd(operationId, false, { error: error.message });
      
      return {
        success: false,
        error: error.message,
        operationId,
        results: results || { successful: [], failed: [], summary: { total: papers.length, downloaded: 0, errors: papers.length } }
      };
    }
  }

  /**
   * Create a complete research project with organized folder structure
   * @param {Object} projectConfig - Project configuration
   * @returns {Promise<Object>} Project creation results
   */
  async createResearchProject(projectConfig) {
    var { name, description, database, structure, initialPapers = [], initialUrls = [] } = projectConfig;
    
    var operationId = this.progressTracker.startOperation(
      `project_${Date.now()}`,
      6, // Steps: validate, create main folder, create structure, import papers, import URLs, finalize
      `Creating Research Project: ${name}`,
      { projectConfig }
    );

    this.resourceMonitor.recordOperationStart(operationId, 'create_research_project', { projectConfig });

    try {
      var results = {
        projectFolder: null,
        createdFolders: [],
        importedPapers: [],
        importedUrls: [],
        summary: {
          foldersCreated: 0,
          papersImported: 0,
          urlsImported: 0,
          errors: []
        }
      };

      // Step 1: Validate project configuration
      this.progressTracker.updateProgress(operationId, 1, 'Validating project configuration');
      this.validateProjectConfig(projectConfig);

      // Step 2: Create main project folder
      this.progressTracker.updateProgress(operationId, 2, 'Creating main project folder');
      var mainFolderResult = await this.createGroup({
        name,
        description: description || `Research project: ${name}`,
        database
      });
      
      if (!mainFolderResult.success) {
        throw new Error(`Failed to create main project folder: ${mainFolderResult.error}`);
      }
      
      results.projectFolder = mainFolderResult.group;
      results.createdFolders.push(mainFolderResult.group);
      results.summary.foldersCreated++;

      // Step 3: Create folder structure
      this.progressTracker.updateProgress(operationId, 3, 'Creating folder structure');
      if (structure && structure.length > 0) {
        for (var folder of structure) {
          var folderResult = await this.createGroup({
            name: folder.name,
            description: folder.description || `${folder.name} folder`,
            parentGroup: results.projectFolder.uuid,
            database
          });
          
          if (folderResult.success) {
            results.createdFolders.push(folderResult.group);
            results.summary.foldersCreated++;
          } else {
            results.summary.errors.push(`Failed to create folder ${folder.name}: ${folderResult.error}`);
          }
        }
      }

      // Step 4: Import initial papers
      this.progressTracker.updateProgress(operationId, 4, 'Importing initial papers');
      if (initialPapers.length > 0) {
        var papersResult = await this.bulkDownloadPapers(initialPapers, {
          targetGroup: results.projectFolder.uuid,
          extractMetadata: true,
          batchSize: 3 // Smaller batches for project setup
        });
        
        results.importedPapers = papersResult.results?.successful || [];
        results.summary.papersImported = results.importedPapers.length;
        
        if (papersResult.results?.failed?.length > 0) {
          results.summary.errors.push(`Failed to import ${papersResult.results.failed.length} papers`);
        }
      }

      // Step 5: Import initial URLs
      this.progressTracker.updateProgress(operationId, 5, 'Importing initial URLs');
      if (initialUrls.length > 0) {
        var urlsResult = await this.bulkImportUrls(initialUrls, {
          targetGroup: results.projectFolder.uuid,
          batchSize: 5
        });
        
        results.importedUrls = urlsResult.results?.successful || [];
        results.summary.urlsImported = results.importedUrls.length;
        
        if (urlsResult.results?.failed?.length > 0) {
          results.summary.errors.push(`Failed to import ${urlsResult.results.failed.length} URLs`);
        }
      }

      // Step 6: Finalize project
      this.progressTracker.updateProgress(operationId, 6, 'Finalizing project setup');
      
      // Add project metadata tags
      if (results.projectFolder) {
        await this.updateTags(results.projectFolder.uuid, [
          `project:${name}`,
          'research-project',
          `created:${new Date().toISOString().split('T')[0]}`
        ]);
      }

      this.progressTracker.completeOperation(operationId, { success: true });
      this.resourceMonitor.recordOperationEnd(operationId, true, results);

      return {
        success: true,
        operationId,
        project: results.projectFolder,
        results,
        performance: {
          totalDuration: Date.now() - this.progressTracker.getOperationProgress(operationId).startTime
        }
      };

    } catch (error) {
      this.progressTracker.completeOperation(operationId, { success: false, error: error.message });
      this.resourceMonitor.recordOperationEnd(operationId, false, { error: error.message });
      
      return {
        success: false,
        error: error.message,
        operationId,
        results
      };
    }
  }

  /**
   * Monitor active operations
   * @returns {Object} Current operation status
   */
  getOperationStatus(operationId = null) {
    if (operationId) {
      return {
        queue: this.operationQueue.getOperationStatus(operationId),
        progress: this.progressTracker.getOperationProgress(operationId),
        resources: this.resourceMonitor.getOperationStats()
      };
    }

    return {
      queue: this.operationQueue.getQueueStatus(),
      progress: this.progressTracker.getAllActiveOperations(),
      resources: this.resourceMonitor.getResourceStatus(),
      summary: this.getSystemSummary()
    };
  }

  /**
   * Cancel an active operation
   * @param {string} operationId - Operation to cancel
   * @returns {Object} Cancellation result
   */
  async cancelOperation(operationId) {
    var queueResult = await this.operationQueue.cancelOperation(operationId);
    var progressResult = this.progressTracker.cancelOperation(operationId);
    
    return {
      success: queueResult.success || progressResult,
      operationId,
      cancelledFrom: queueResult.status,
      message: queueResult.success ? 'Operation cancelled successfully' : 'Operation not found or already completed'
    };
  }

  /**
   * Helper methods
   * @private
   */
  
  createBatches(items, batchSize) {
    var batches = [];
    for (var i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async importUrlWithRetry(url, options) {
    var attempts = 0;
    var maxAttempts = this.options.retryAttempts;

    while (attempts < maxAttempts) {
      try {
        return await this.importUrl({
          url,
          targetGroup: options.targetGroup,
          customName: options.customName,
          tags: options.tags,
          database: options.database
        });
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
      }
    }
  }

  async downloadPaperEnhanced(paper, options) {
    // Try external API first, fallback to AppleScript
    try {
      var metadata = await this.externalAPIs.resolveAcademicPaper(paper.source, paper.identifier);
      
      if (metadata.success && metadata.pdf_url) {
        return await this.importUrl({
          url: metadata.pdf_url,
          targetGroup: options.targetGroup,
          customName: metadata.title,
          tags: [...(options.tags || []), ...metadata.keywords],
          database: options.database
        });
      }
    } catch (error) {
      console.warn(`API resolution failed for ${paper.source}:${paper.identifier}, falling back to AppleScript`);
    }

    // Fallback to existing AppleScript method
    return await this.downloadPaper(
      paper.source,
      paper.identifier,
      options.targetGroup,
      options.extractMetadata,
      options.tags,
      options.database
    );
  }

  isValidUrl(url) {
    try {
      var urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  isValidPaperIdentifier(paper) {
    if (!paper || typeof paper !== 'object') return false;
    if (!paper.source || !paper.identifier) return false;
    
    var validSources = ['arxiv', 'doi', 'pubmed'];
    return validSources.includes(paper.source.toLowerCase()) && 
           typeof paper.identifier === 'string' && 
           paper.identifier.trim().length > 0;
  }

  validateProjectConfig(config) {
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Project name is required and must be a string');
    }
    
    if (config.structure && !Array.isArray(config.structure)) {
      throw new Error('Project structure must be an array');
    }
    
    if (config.initialPapers && !Array.isArray(config.initialPapers)) {
      throw new Error('Initial papers must be an array');
    }
    
    if (config.initialUrls && !Array.isArray(config.initialUrls)) {
      throw new Error('Initial URLs must be an array');
    }
  }

  truncateUrl(url, maxLength = 50) {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }

  getSystemSummary() {
    return {
      timestamp: Date.now(),
      version: '2.1.0-phase4',
      infrastructure: {
        operationQueue: {
          active: this.operationQueue.getQueueStatus().active,
          pending: this.operationQueue.getQueueStatus().pending
        },
        progressTracker: {
          active: this.progressTracker.getAllActiveOperations().length
        },
        resourceMonitor: {
          status: this.resourceMonitor.getResourceStatus().memory.status,
          uptime: process.uptime()
        }
      }
    };
  }
}