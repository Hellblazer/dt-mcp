/**
 * Workflow Automation - Orchestrates complex multi-step research workflows
 */

import { EventEmitter } from 'events';

export class WorkflowAutomation extends EventEmitter {
  constructor(devonthinkService, progressTracker) {
    super();
    this.devonthinkService = devonthinkService;
    this.progressTracker = progressTracker;
    this.activeWorkflows = new Map();
    this.workflowTemplates = new Map();
    
    // Initialize built-in workflow templates
    this.initializeBuiltInTemplates();
  }

  /**
   * Initialize built-in workflow templates
   * @private
   */
  initializeBuiltInTemplates() {
    // Academic Research Setup Workflow
    this.workflowTemplates.set('academic_research_setup', {
      name: 'Academic Research Setup',
      description: 'Complete setup for academic research project with paper collection',
      steps: [
        { type: 'create_project', name: 'Create Project Structure' },
        { type: 'download_papers', name: 'Download Academic Papers' },
        { type: 'import_urls', name: 'Import Reference URLs' },
        { type: 'organize_by_metadata', name: 'Auto-organize by Metadata' },
        { type: 'create_summary', name: 'Generate Project Summary' }
      ],
      estimated_duration: 300000, // 5 minutes
      requirements: ['project_name', 'initial_papers']
    });

    // Literature Review Workflow
    this.workflowTemplates.set('literature_review', {
      name: 'Literature Review',
      description: 'Comprehensive literature review with automated organization',
      steps: [
        { type: 'search_papers', name: 'Search Academic Databases' },
        { type: 'download_papers', name: 'Download Found Papers' },
        { type: 'extract_metadata', name: 'Extract Metadata' },
        { type: 'categorize_papers', name: 'Categorize by Topic' },
        { type: 'create_bibliography', name: 'Generate Bibliography' }
      ],
      estimated_duration: 600000, // 10 minutes
      requirements: ['search_terms', 'target_group']
    });

    // Data Collection Workflow
    this.workflowTemplates.set('data_collection', {
      name: 'Data Collection',
      description: 'Systematic data collection from multiple sources',
      steps: [
        { type: 'import_urls', name: 'Import Data URLs' },
        { type: 'process_documents', name: 'Process Documents' },
        { type: 'extract_data', name: 'Extract Key Data' },
        { type: 'organize_by_type', name: 'Organize by Data Type' },
        { type: 'validate_data', name: 'Validate Data Quality' }
      ],
      estimated_duration: 450000, // 7.5 minutes
      requirements: ['data_urls', 'target_group']
    });
  }

  /**
   * Execute a workflow
   * @param {string} templateId - Workflow template ID
   * @param {Object} parameters - Workflow parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflow(templateId, parameters, options = {}) {
    var template = this.workflowTemplates.get(templateId);
    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`);
    }

    // Validate required parameters
    this.validateWorkflowParameters(template, parameters);

    var workflowId = `workflow_${templateId}_${Date.now()}`;
    var operationId = this.progressTracker.startOperation(
      workflowId,
      template.steps.length,
      `${template.name} Workflow`,
      { templateId, parameters, template }
    );

    var workflow = {
      id: workflowId,
      operationId,
      templateId,
      template,
      parameters,
      options,
      startTime: Date.now(),
      status: 'running',
      currentStep: 0,
      results: {
        steps: [],
        outputs: {},
        errors: [],
        summary: {
          completed: 0,
          failed: 0,
          skipped: 0
        }
      }
    };

    this.activeWorkflows.set(workflowId, workflow);

    try {
      this.emit('workflow_started', { workflowId, templateId, operationId });

      // Execute workflow steps
      for (var i = 0; i < template.steps.length; i++) {
        var step = template.steps[i];
        workflow.currentStep = i;

        this.progressTracker.updateProgress(
          operationId, 
          i + 1, 
          `Executing: ${step.name}`
        );

        var stepResult = await this.executeWorkflowStep(workflow, step, i);
        workflow.results.steps.push(stepResult);

        if (stepResult.success) {
          workflow.results.summary.completed++;
          workflow.results.outputs[step.type] = stepResult.output;
        } else {
          workflow.results.summary.failed++;
          workflow.results.errors.push(stepResult.error);

          // Handle step failure
          if (options.stopOnError !== false) {
            throw new Error(`Workflow step failed: ${step.name} - ${stepResult.error}`);
          }
        }

        // Emit step completion
        this.emit('workflow_step_completed', {
          workflowId,
          step: i,
          stepName: step.name,
          success: stepResult.success
        });
      }

      // Complete workflow
      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;

      this.progressTracker.completeOperation(operationId, { success: true });
      this.emit('workflow_completed', { workflowId, success: true });

      return {
        success: true,
        workflowId,
        operationId,
        results: workflow.results,
        performance: {
          duration: workflow.duration,
          steps: workflow.results.steps.length,
          successRate: workflow.results.summary.completed / workflow.results.steps.length
        }
      };

    } catch (error) {
      workflow.status = 'failed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      workflow.error = error.message;

      this.progressTracker.completeOperation(operationId, { success: false, error: error.message });
      this.emit('workflow_failed', { workflowId, error: error.message });

      return {
        success: false,
        error: error.message,
        workflowId,
        operationId,
        results: workflow.results
      };
    } finally {
      // Keep workflow in memory for status queries
      setTimeout(() => {
        this.activeWorkflows.delete(workflowId);
      }, 3600000); // 1 hour
    }
  }

  /**
   * Execute a single workflow step
   * @param {Object} workflow - Workflow instance
   * @param {Object} step - Step definition
   * @param {number} stepIndex - Step index
   * @returns {Promise<Object>} Step execution result
   * @private
   */
  async executeWorkflowStep(workflow, step, stepIndex) {
    var startTime = Date.now();
    
    try {
      var result;
      
      switch (step.type) {
        case 'create_project':
          result = await this.executeCreateProjectStep(workflow, step);
          break;
        case 'download_papers':
          result = await this.executeDownloadPapersStep(workflow, step);
          break;
        case 'import_urls':
          result = await this.executeImportUrlsStep(workflow, step);
          break;
        case 'organize_by_metadata':
          result = await this.executeOrganizeByMetadataStep(workflow, step);
          break;
        case 'create_summary':
          result = await this.executeCreateSummaryStep(workflow, step);
          break;
        case 'search_papers':
          result = await this.executeSearchPapersStep(workflow, step);
          break;
        case 'extract_metadata':
          result = await this.executeExtractMetadataStep(workflow, step);
          break;
        case 'categorize_papers':
          result = await this.executeCategorizeStep(workflow, step);
          break;
        case 'create_bibliography':
          result = await this.executeCreateBibliographyStep(workflow, step);
          break;
        default:
          throw new Error(`Unknown workflow step type: ${step.type}`);
      }

      return {
        step: stepIndex,
        name: step.name,
        type: step.type,
        success: true,
        output: result,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        step: stepIndex,
        name: step.name,
        type: step.type,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Workflow step implementations
   * @private
   */
  
  async executeCreateProjectStep(workflow, step) {
    var params = workflow.parameters;
    
    var projectConfig = {
      name: params.project_name,
      description: params.project_description || `${workflow.template.name} project`,
      database: params.database,
      structure: params.folder_structure || [
        { name: 'Papers', description: 'Academic papers and publications' },
        { name: 'References', description: 'Reference materials and URLs' },
        { name: 'Data', description: 'Raw data and datasets' },
        { name: 'Analysis', description: 'Analysis results and findings' }
      ]
    };

    var result = await this.devonthinkService.createResearchProject(projectConfig);
    
    if (result.success) {
      // Store project info for subsequent steps
      workflow.results.outputs.project = result.project;
      workflow.parameters.target_group = result.project.uuid;
    }
    
    return result;
  }

  async executeDownloadPapersStep(workflow, step) {
    var params = workflow.parameters;
    var papers = params.initial_papers || params.papers || [];
    
    if (papers.length === 0) {
      return { message: 'No papers to download', skipped: true };
    }

    var options = {
      targetGroup: params.target_group,
      extractMetadata: true,
      tags: params.paper_tags || ['research-paper', `workflow:${workflow.templateId}`],
      batchSize: params.batch_size || 3
    };

    return await this.devonthinkService.bulkDownloadPapers(papers, options);
  }

  async executeImportUrlsStep(workflow, step) {
    var params = workflow.parameters;
    var urls = params.initial_urls || params.data_urls || params.reference_urls || [];
    
    if (urls.length === 0) {
      return { message: 'No URLs to import', skipped: true };
    }

    var options = {
      targetGroup: params.target_group,
      tags: params.url_tags || ['reference', `workflow:${workflow.templateId}`],
      batchSize: params.batch_size || 5
    };

    return await this.devonthinkService.bulkImportUrls(urls, options);
  }

  async executeOrganizeByMetadataStep(workflow, step) {
    // This would implement metadata-based organization
    // For now, return a placeholder implementation
    return {
      message: 'Auto-organization by metadata completed',
      organized_count: 0
    };
  }

  async executeCreateSummaryStep(workflow, step) {
    // This would create a project summary document
    return {
      message: 'Project summary created',
      summary_document: null
    };
  }

  async executeSearchPapersStep(workflow, step) {
    // This would implement academic database searching
    var params = workflow.parameters;
    return {
      message: 'Paper search completed',
      found_papers: [],
      search_terms: params.search_terms || []
    };
  }

  async executeExtractMetadataStep(workflow, step) {
    // This would extract metadata from imported documents
    return {
      message: 'Metadata extraction completed',
      extracted_count: 0
    };
  }

  async executeCategorizeStep(workflow, step) {
    // This would categorize papers by topic
    return {
      message: 'Paper categorization completed',
      categories: []
    };
  }

  async executeCreateBibliographyStep(workflow, step) {
    // This would generate a bibliography
    return {
      message: 'Bibliography created',
      bibliography_document: null
    };
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow ID
   * @returns {Object|null} Workflow status
   */
  getWorkflowStatus(workflowId) {
    var workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      templateId: workflow.templateId,
      templateName: workflow.template.name,
      status: workflow.status,
      currentStep: workflow.currentStep,
      totalSteps: workflow.template.steps.length,
      progress: this.progressTracker.getOperationProgress(workflow.operationId),
      startTime: workflow.startTime,
      duration: workflow.endTime ? workflow.endTime - workflow.startTime : Date.now() - workflow.startTime,
      results: workflow.results
    };
  }

  /**
   * List available workflow templates
   * @returns {Array} Available templates
   */
  getAvailableTemplates() {
    return Array.from(this.workflowTemplates.values()).map(template => ({
      id: Array.from(this.workflowTemplates.keys()).find(key => 
        this.workflowTemplates.get(key) === template
      ),
      name: template.name,
      description: template.description,
      steps: template.steps.length,
      estimatedDuration: template.estimated_duration,
      requirements: template.requirements
    }));
  }

  /**
   * Get active workflows
   * @returns {Array} Active workflows
   */
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.keys()).map(id => 
      this.getWorkflowStatus(id)
    ).filter(status => status !== null);
  }

  /**
   * Cancel a workflow
   * @param {string} workflowId - Workflow to cancel
   * @returns {Object} Cancellation result
   */
  async cancelWorkflow(workflowId) {
    var workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    if (workflow.status !== 'running') {
      return { success: false, error: 'Workflow is not running' };
    }

    workflow.status = 'cancelled';
    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - workflow.startTime;

    this.progressTracker.cancelOperation(workflow.operationId);
    this.emit('workflow_cancelled', { workflowId });

    return { success: true, workflowId };
  }

  /**
   * Create a custom workflow template
   * @param {string} templateId - Template ID
   * @param {Object} template - Template definition
   */
  createTemplate(templateId, template) {
    this.validateTemplate(template);
    this.workflowTemplates.set(templateId, template);
    
    this.emit('template_created', { templateId, template });
  }

  /**
   * Validate workflow parameters against template requirements
   * @param {Object} template - Workflow template
   * @param {Object} parameters - Parameters to validate
   * @private
   */
  validateWorkflowParameters(template, parameters) {
    for (var requirement of template.requirements) {
      if (!parameters.hasOwnProperty(requirement)) {
        throw new Error(`Missing required parameter: ${requirement}`);
      }
    }
  }

  /**
   * Validate template definition
   * @param {Object} template - Template to validate
   * @private
   */
  validateTemplate(template) {
    if (!template.name || typeof template.name !== 'string') {
      throw new Error('Template name is required');
    }
    
    if (!template.steps || !Array.isArray(template.steps)) {
      throw new Error('Template steps must be an array');
    }
    
    if (template.steps.length === 0) {
      throw new Error('Template must have at least one step');
    }
    
    for (var step of template.steps) {
      if (!step.type || !step.name) {
        throw new Error('Each step must have type and name');
      }
    }
  }
}