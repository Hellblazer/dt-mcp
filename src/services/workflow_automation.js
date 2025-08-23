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
    var params = workflow.parameters;
    var targetGroup = step.targetGroup || params.targetGroup;
    
    try {
      // Get all documents in the target group
      var searchResult = await this.devonthinkService.searchDevonthink('', {
        scope: 'group',
        targetGroup: targetGroup
      });
      
      var documents = searchResult.documents || [];
      var organizedCount = 0;
      var categories = new Map();
      
      // Process each document for metadata organization
      for (var doc of documents) {
        try {
          // Get document metadata and classify it
          var classification = await this.devonthinkService.classifyDocument(doc.uuid);
          
          if (classification.success && classification.categories && classification.categories.length > 0) {
            var primaryCategory = classification.categories[0];
            
            // Create or get category group
            if (!categories.has(primaryCategory)) {
              var categoryResult = await this.devonthinkService.createGroup(
                primaryCategory,
                targetGroup,
                `Auto-generated category: ${primaryCategory}`,
                ['auto-organized', `category:${primaryCategory}`]
              );
              
              if (categoryResult.status === 'success') {
                categories.set(primaryCategory, categoryResult.data.uuid);
              }
            }
            
            // Move document to category folder if category was created
            var categoryGroupUuid = categories.get(primaryCategory);
            if (categoryGroupUuid && doc.location !== categoryGroupUuid) {
              await this.devonthinkService.moveToGroup([doc.uuid], categoryGroupUuid);
              organizedCount++;
            }
          }
        } catch (error) {
          console.warn(`Failed to organize document ${doc.uuid}: ${error.message}`);
        }
      }
      
      return {
        message: `Auto-organization by metadata completed`,
        organized_count: organizedCount,
        categories_created: categories.size,
        total_documents: documents.length,
        categories: Array.from(categories.keys())
      };
      
    } catch (error) {
      throw new Error(`Metadata organization failed: ${error.message}`);
    }
  }

  async executeCreateSummaryStep(workflow, step) {
    var params = workflow.parameters;
    var targetGroup = step.targetGroup || params.targetGroup || params.target_group;
    
    try {
      // Get all documents in the project to summarize
      var searchResult = await this.devonthinkService.searchDevonthink('', {
        scope: 'group',
        targetGroup: targetGroup
      });
      
      var documents = searchResult.documents || [];
      
      if (documents.length === 0) {
        return {
          message: 'No documents found to summarize',
          summary_document: null,
          document_count: 0
        };
      }
      
      // Get the first few documents for synthesis
      var documentsForSummary = documents.slice(0, Math.min(10, documents.length));
      var documentUuids = documentsForSummary.map(doc => doc.uuid);
      
      // Create a multi-level summary using DEVONthink's AI
      var summaryResult = await this.devonthinkService.synthesizeDocuments(
        documentUuids,
        'summary'
      );
      
      // Generate summary content
      var summaryContent = this.generateProjectSummaryContent(workflow, documents, summaryResult);
      
      // Create the summary document
      var summaryDoc = await this.devonthinkService.createDocument(
        `Project Summary - ${params.project_name || workflow.template.name}`,
        summaryContent,
        'markdown',
        targetGroup,
        ['project-summary', `workflow:${workflow.templateId}`, 'auto-generated']
      );
      
      if (summaryDoc.status === 'success') {
        return {
          message: 'Project summary created successfully',
          summary_document: summaryDoc.data,
          document_count: documents.length,
          synthesis_quality: summaryResult.confidence || 'unknown'
        };
      } else {
        throw new Error(`Failed to create summary document: ${summaryDoc.error}`);
      }
      
    } catch (error) {
      throw new Error(`Summary creation failed: ${error.message}`);
    }
  }

  async executeSearchPapersStep(workflow, step) {
    var params = workflow.parameters;
    var searchTerms = params.search_terms || step.search_terms || [];
    var targetGroup = step.targetGroup || params.targetGroup || params.target_group;
    
    if (!searchTerms || searchTerms.length === 0) {
      return {
        message: 'No search terms provided',
        found_papers: [],
        search_terms: [],
        skipped: true
      };
    }
    
    try {
      var allFoundPapers = [];
      var searchResults = [];
      
      // Search DEVONthink databases for academic papers
      for (var term of searchTerms) {
        try {
          // Advanced search for academic papers
          var searchQuery = `(${term}) AND (kind:PDF OR kind:markdown) AND (tag:research OR tag:paper OR tag:academic)`;
          
          var result = await this.devonthinkService.advancedSearch(searchQuery, {
            maxResults: step.maxResults || 20,
            sortBy: 'relevance',
            database: params.database
          });
          
          if (result.success && result.documents) {
            var foundPapers = result.documents.map(doc => ({
              ...doc,
              search_term: term,
              relevance_score: doc.score || 0
            }));
            
            allFoundPapers.push(...foundPapers);
            searchResults.push({
              term: term,
              found_count: foundPapers.length,
              papers: foundPapers.slice(0, 5) // First 5 for summary
            });
          }
        } catch (error) {
          console.warn(`Failed to search for term "${term}": ${error.message}`);
          searchResults.push({
            term: term,
            found_count: 0,
            error: error.message
          });
        }
      }
      
      // Remove duplicates by UUID
      var uniquePapers = [];
      var seenUuids = new Set();
      
      for (var paper of allFoundPapers) {
        if (!seenUuids.has(paper.uuid)) {
          seenUuids.add(paper.uuid);
          uniquePapers.push(paper);
        }
      }
      
      // Sort by relevance score descending
      uniquePapers.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      
      // Store found papers for potential download in next step
      if (workflow.results && workflow.results.outputs) {
        workflow.results.outputs.found_papers = uniquePapers;
      }
      
      return {
        message: `Paper search completed: found ${uniquePapers.length} unique papers`,
        found_papers: uniquePapers,
        search_results: searchResults,
        search_terms: searchTerms,
        unique_papers_count: uniquePapers.length,
        total_results: allFoundPapers.length
      };
      
    } catch (error) {
      throw new Error(`Paper search failed: ${error.message}`);
    }
  }

  async executeExtractMetadataStep(workflow, step) {
    var params = workflow.parameters;
    var targetGroup = step.targetGroup || params.targetGroup || params.target_group;
    
    try {
      // Get all documents in the target group for metadata extraction
      var searchResult = await this.devonthinkService.searchDevonthink('', {
        scope: 'group', 
        targetGroup: targetGroup
      });
      
      var documents = searchResult.documents || [];
      var extractedCount = 0;
      var extractedMetadata = [];
      var errors = [];
      
      if (documents.length === 0) {
        return {
          message: 'No documents found for metadata extraction',
          extracted_count: 0,
          documents_processed: 0
        };
      }
      
      // Process each document for metadata extraction
      for (var doc of documents) {
        try {
          // Use DEVONthink's AI to classify and extract metadata
          var classification = await this.devonthinkService.classifyDocument(doc.uuid);
          
          var metadata = {
            uuid: doc.uuid,
            name: doc.name,
            kind: doc.kind,
            original_tags: doc.tags || [],
            extracted_data: {}
          };
          
          if (classification.success) {
            // Extract AI-generated metadata
            metadata.extracted_data = {
              categories: classification.categories || [],
              topics: classification.topics || [],
              confidence: classification.confidence || 0,
              summary: classification.summary || null,
              keywords: classification.keywords || []
            };
            
            // Create enhanced tags from extracted metadata
            var newTags = [...(doc.tags || [])];
            
            // Add category tags
            if (classification.categories) {
              classification.categories.forEach(category => {
                var categoryTag = `category:${category.toLowerCase().replace(/\s+/g, '-')}`;
                if (!newTags.includes(categoryTag)) {
                  newTags.push(categoryTag);
                }
              });
            }
            
            // Add topic tags
            if (classification.topics) {
              classification.topics.slice(0, 3).forEach(topic => { // Limit to 3 topics
                var topicTag = `topic:${topic.toLowerCase().replace(/\s+/g, '-')}`;
                if (!newTags.includes(topicTag)) {
                  newTags.push(topicTag);
                }
              });
            }
            
            // Add extraction timestamp
            newTags.push(`extracted:${new Date().toISOString().split('T')[0]}`);
            
            // Update document tags with extracted metadata
            await this.devonthinkService.updateTags(doc.uuid, newTags);
            
            metadata.new_tags = newTags;
            extractedCount++;
          } else {
            metadata.extraction_error = classification.error || 'Classification failed';
            errors.push({
              uuid: doc.uuid,
              name: doc.name,
              error: metadata.extraction_error
            });
          }
          
          extractedMetadata.push(metadata);
          
        } catch (error) {
          console.warn(`Failed to extract metadata from document ${doc.uuid}: ${error.message}`);
          errors.push({
            uuid: doc.uuid,
            name: doc.name || 'Unknown',
            error: error.message
          });
        }
      }
      
      // Store extracted metadata for potential use in subsequent steps
      if (workflow.results && workflow.results.outputs) {
        workflow.results.outputs.extracted_metadata = extractedMetadata;
      }
      
      return {
        message: `Metadata extraction completed: processed ${documents.length} documents, extracted ${extractedCount}`,
        extracted_count: extractedCount,
        documents_processed: documents.length,
        success_rate: Math.round((extractedCount / documents.length) * 100),
        extracted_metadata: extractedMetadata,
        errors: errors,
        categories_found: [...new Set(extractedMetadata.flatMap(m => m.extracted_data?.categories || []))],
        topics_found: [...new Set(extractedMetadata.flatMap(m => m.extracted_data?.topics || []))]
      };
      
    } catch (error) {
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }

  async executeCategorizeStep(workflow, step) {
    var params = workflow.parameters;
    var targetGroup = step.targetGroup || params.targetGroup || params.target_group;
    
    try {
      // Use extracted metadata if available from previous step
      var documentsToProcess = [];
      var extractedMetadata = workflow.results?.outputs?.extracted_metadata;
      
      if (extractedMetadata && extractedMetadata.length > 0) {
        // Use previously extracted metadata
        documentsToProcess = extractedMetadata;
      } else {
        // Get documents and extract metadata on the fly
        var searchResult = await this.devonthinkService.searchDevonthink('', {
          scope: 'group',
          targetGroup: targetGroup
        });
        
        var documents = searchResult.documents || [];
        
        for (var doc of documents) {
          try {
            var classification = await this.devonthinkService.classifyDocument(doc.uuid);
            documentsToProcess.push({
              uuid: doc.uuid,
              name: doc.name,
              kind: doc.kind,
              extracted_data: {
                categories: classification.categories || [],
                topics: classification.topics || [],
                confidence: classification.confidence || 0
              }
            });
          } catch (error) {
            console.warn(`Failed to classify document ${doc.uuid}: ${error.message}`);
          }
        }
      }
      
      if (documentsToProcess.length === 0) {
        return {
          message: 'No documents found to categorize',
          categories: [],
          documents_processed: 0
        };
      }
      
      // Aggregate categories and create organization structure
      var categoryMap = new Map();
      var topicMap = new Map();
      var processedCount = 0;
      
      for (var doc of documentsToProcess) {
        if (doc.extracted_data) {
          // Process categories
          var categories = doc.extracted_data.categories || [];
          for (var category of categories) {
            if (!categoryMap.has(category)) {
              categoryMap.set(category, {
                name: category,
                documents: [],
                totalConfidence: 0,
                averageConfidence: 0
              });
            }
            
            var categoryData = categoryMap.get(category);
            categoryData.documents.push({
              uuid: doc.uuid,
              name: doc.name,
              confidence: doc.extracted_data.confidence || 0
            });
            categoryData.totalConfidence += (doc.extracted_data.confidence || 0);
            categoryData.averageConfidence = categoryData.totalConfidence / categoryData.documents.length;
          }
          
          // Process topics
          var topics = doc.extracted_data.topics || [];
          for (var topic of topics) {
            if (!topicMap.has(topic)) {
              topicMap.set(topic, {
                name: topic,
                documents: [],
                count: 0
              });
            }
            
            var topicData = topicMap.get(topic);
            topicData.documents.push({
              uuid: doc.uuid,
              name: doc.name
            });
            topicData.count++;
          }
          
          processedCount++;
        }
      }
      
      // Sort categories by confidence and document count
      var categories = Array.from(categoryMap.values()).sort((a, b) => {
        if (b.documents.length !== a.documents.length) {
          return b.documents.length - a.documents.length; // More documents first
        }
        return b.averageConfidence - a.averageConfidence; // Higher confidence first
      });
      
      // Sort topics by frequency
      var topics = Array.from(topicMap.values()).sort((a, b) => b.count - a.count);
      
      // Create folder structure for top categories if requested
      var createdFolders = [];
      if (step.createFolders !== false && categories.length > 0) {
        var topCategories = categories.slice(0, Math.min(5, categories.length)); // Top 5 categories
        
        for (var category of topCategories) {
          if (category.documents.length >= (step.minDocumentsPerCategory || 2)) {
            try {
              var folderResult = await this.devonthinkService.createGroup(
                category.name,
                targetGroup,
                `Auto-categorized folder: ${category.name} (${category.documents.length} documents)`,
                [`category:${category.name.toLowerCase().replace(/\s+/g, '-')}`, 'auto-categorized']
              );
              
              if (folderResult.status === 'success') {
                createdFolders.push({
                  name: category.name,
                  uuid: folderResult.data.uuid,
                  documentCount: category.documents.length
                });
                
                // Move documents to the category folder
                var documentUuids = category.documents.map(doc => doc.uuid);
                await this.devonthinkService.moveToGroup(documentUuids, folderResult.data.uuid);
              }
            } catch (error) {
              console.warn(`Failed to create category folder for ${category.name}: ${error.message}`);
            }
          }
        }
      }
      
      return {
        message: `Paper categorization completed: ${categories.length} categories, ${topics.length} topics found`,
        categories: categories,
        topics: topics,
        documents_processed: processedCount,
        created_folders: createdFolders,
        summary: {
          top_categories: categories.slice(0, 5).map(c => ({
            name: c.name,
            document_count: c.documents.length,
            confidence: Math.round(c.averageConfidence * 100)
          })),
          top_topics: topics.slice(0, 10).map(t => ({
            name: t.name,
            document_count: t.count
          }))
        }
      };
      
    } catch (error) {
      throw new Error(`Paper categorization failed: ${error.message}`);
    }
  }

  async executeCreateBibliographyStep(workflow, step) {
    try {
      var params = workflow.parameters;
      var targetGroup = step.targetGroup || params.targetGroup;
      var bibliographyStyle = step.style || 'APA'; // APA, MLA, Chicago, etc.
      
      this.emit('stepProgress', {
        workflowId: workflow.id,
        step: 'create_bibliography',
        message: 'Collecting documents for bibliography',
        progress: 0.1
      });
      
      // Get all documents in the target group that could be bibliographic sources
      var searchQuery = `(kind:PDF OR kind:markdown OR kind:rtf) AND (tag:research OR tag:paper OR tag:academic OR tag:article OR tag:book)`;
      var searchResult = await this.devonthinkService.advancedSearch(searchQuery, {
        maxResults: step.maxResults || 100,
        sortBy: 'date',
        searchScope: 'all',
        targetGroup: targetGroup
      });
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        return {
          message: 'No bibliographic sources found',
          bibliography_document: null,
          processed_count: 0
        };
      }
      
      var documents = searchResult.data;
      this.emit('stepProgress', {
        workflowId: workflow.id,
        step: 'create_bibliography',
        message: `Found ${documents.length} potential sources`,
        progress: 0.3
      });
      
      // Extract metadata and generate bibliography entries
      var bibliographyEntries = [];
      var processedCount = 0;
      
      for (var doc of documents) {
        try {
          // Get document metadata
          var docData = await this.devonthinkService.readDocument(doc.uuid, { includeContent: false });
          
          // Use AI to classify and extract bibliographic metadata
          var classification = await this.devonthinkService.classifyDocument(doc.uuid);
          
          var entry = this.generateBibliographyEntry(doc, docData.data, classification, bibliographyStyle);
          if (entry) {
            bibliographyEntries.push(entry);
            processedCount++;
          }
          
          this.emit('stepProgress', {
            workflowId: workflow.id,
            step: 'create_bibliography',
            message: `Processed ${processedCount}/${documents.length} documents`,
            progress: 0.3 + (processedCount / documents.length) * 0.5
          });
          
        } catch (error) {
          console.warn(`Failed to process document ${doc.name} for bibliography: ${error.message}`);
        }
      }
      
      if (bibliographyEntries.length === 0) {
        return {
          message: 'No valid bibliography entries could be generated',
          bibliography_document: null,
          processed_count: processedCount
        };
      }
      
      // Sort bibliography entries alphabetically by author/title
      bibliographyEntries.sort((a, b) => {
        var keyA = a.sortKey || a.citation;
        var keyB = b.sortKey || b.citation;
        return keyA.localeCompare(keyB);
      });
      
      this.emit('stepProgress', {
        workflowId: workflow.id,
        step: 'create_bibliography',
        message: 'Generating bibliography document',
        progress: 0.8
      });
      
      // Generate bibliography content
      var bibliographyContent = this.generateBibliographyContent(workflow, bibliographyEntries, bibliographyStyle);
      
      // Create the bibliography document
      var bibliographyDoc = await this.devonthinkService.createDocument(
        `Bibliography - ${params.project_name || workflow.template.name}`,
        bibliographyContent,
        'markdown',
        targetGroup,
        ['bibliography', `style:${bibliographyStyle.toLowerCase()}`, `workflow:${workflow.templateId}`, 'auto-generated']
      );
      
      this.emit('stepProgress', {
        workflowId: workflow.id,
        step: 'create_bibliography',
        message: 'Bibliography document created',
        progress: 1.0
      });
      
      return {
        message: `Bibliography created with ${bibliographyEntries.length} entries`,
        bibliography_document: bibliographyDoc.success ? bibliographyDoc.data : null,
        processed_count: processedCount,
        entry_count: bibliographyEntries.length,
        style: bibliographyStyle
      };
      
    } catch (error) {
      throw new Error(`Bibliography creation failed: ${error.message}`);
    }
  }

  /**
   * Generate bibliography entry from document metadata
   * @param {Object} doc - Document data
   * @param {Object} docData - Extended document data
   * @param {Object} classification - AI classification result
   * @param {string} style - Bibliography style (APA, MLA, etc.)
   * @returns {Object|null} Bibliography entry
   * @private
   */
  generateBibliographyEntry(doc, docData, classification, style) {
    try {
      var entry = {
        uuid: doc.uuid,
        title: doc.name || 'Untitled',
        type: this.determineBibliographyType(doc, classification),
        style: style,
        metadata: {}
      };

      // Extract metadata from document and classification
      if (docData) {
        entry.metadata.creation_date = docData.creation_date;
        entry.metadata.modification_date = docData.modification_date;
        entry.metadata.tags = docData.tags || [];
        entry.metadata.comment = docData.comment;
        entry.metadata.url = docData.url;
      }

      // Extract AI-derived metadata
      if (classification && classification.success) {
        entry.metadata.categories = classification.categories || [];
        entry.metadata.topics = classification.topics || [];
        entry.metadata.keywords = classification.keywords || [];
        entry.metadata.summary = classification.summary;
      }

      // Generate citation based on style
      entry.citation = this.formatCitation(entry, style);
      entry.sortKey = this.generateSortKey(entry);

      return entry;
    } catch (error) {
      console.warn(`Failed to generate bibliography entry for ${doc.name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Determine bibliography type from document and classification
   * @param {Object} doc - Document data
   * @param {Object} classification - AI classification
   * @returns {string} Bibliography type
   * @private
   */
  determineBibliographyType(doc, classification) {
    // Check document kind
    if (doc.kind === 'PDF') {
      // Use tags to determine if it's a journal article, book, etc.
      var tags = doc.tags || [];
      if (tags.some(tag => tag.includes('journal') || tag.includes('article'))) {
        return 'article';
      }
      if (tags.some(tag => tag.includes('book'))) {
        return 'book';
      }
      return 'document'; // Generic document type
    }
    
    if (doc.kind === 'markdown' || doc.kind === 'rtf') {
      return 'document';
    }
    
    if (doc.url || (doc.tags && doc.tags.some(tag => tag.includes('web')))) {
      return 'website';
    }
    
    return 'misc';
  }

  /**
   * Format citation according to bibliography style
   * @param {Object} entry - Bibliography entry
   * @param {string} style - Citation style
   * @returns {string} Formatted citation
   * @private
   */
  formatCitation(entry, style) {
    var title = entry.title.replace(/\.(pdf|PDF)$/, ''); // Remove .pdf extension
    var date = this.extractYear(entry.metadata.creation_date) || 'n.d.';
    
    // Extract author from title if possible (basic heuristic)
    var author = this.extractAuthorFromTitle(title) || 'Unknown Author';
    
    switch (style.toUpperCase()) {
      case 'APA':
        return `${author} (${date}). *${title}*.`;
      case 'MLA':
        return `${author}. "${title}." ${date}.`;
      case 'CHICAGO':
        return `${author}. "${title}." Accessed ${date}.`;
      default:
        return `${author}. ${title}. ${date}.`;
    }
  }

  /**
   * Generate sort key for bibliography entry
   * @param {Object} entry - Bibliography entry
   * @returns {string} Sort key
   * @private
   */
  generateSortKey(entry) {
    var title = entry.title.toLowerCase();
    var author = this.extractAuthorFromTitle(entry.title) || 'unknown';
    return `${author.toLowerCase()}_${title}`;
  }

  /**
   * Extract year from date string
   * @param {string} dateString - Date string
   * @returns {string|null} Year
   * @private
   */
  extractYear(dateString) {
    if (!dateString) return null;
    var match = dateString.match(/(\d{4})/);
    return match ? match[1] : null;
  }

  /**
   * Basic author extraction from title (heuristic)
   * @param {string} title - Document title
   * @returns {string|null} Extracted author
   * @private
   */
  extractAuthorFromTitle(title) {
    // Look for common patterns like "Author - Title" or "Title by Author"
    var patterns = [
      /^([^-]+)\s*-\s*(.+)$/, // "Author - Title"
      /^(.+)\s+by\s+([^,]+)/i, // "Title by Author"
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)\s*[:\-]\s*(.+)$/ // "Author: Title"
    ];
    
    for (var pattern of patterns) {
      var match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Generate bibliography document content
   * @param {Object} workflow - Workflow instance
   * @param {Array} entries - Bibliography entries
   * @param {string} style - Bibliography style
   * @returns {string} Bibliography content
   * @private
   */
  generateBibliographyContent(workflow, entries, style) {
    var params = workflow.parameters;
    var timestamp = new Date().toISOString().split('T')[0];
    
    var content = `# Bibliography: ${params.project_name || workflow.template.name}\n\n`;
    
    content += `**Generated:** ${timestamp}  \n`;
    content += `**Style:** ${style}  \n`;
    content += `**Entries:** ${entries.length}  \n`;
    content += `**Workflow:** ${workflow.template.name}  \n\n`;
    
    if (params.project_description) {
      content += `## Project Description\n\n${params.project_description}\n\n`;
    }
    
    // Group entries by type
    var entriesByType = new Map();
    entries.forEach(entry => {
      var type = entry.type || 'misc';
      if (!entriesByType.has(type)) {
        entriesByType.set(type, []);
      }
      entriesByType.get(type).push(entry);
    });
    
    // Generate bibliography sections
    var typeNames = {
      'article': 'Journal Articles',
      'book': 'Books',
      'document': 'Documents', 
      'website': 'Web Resources',
      'misc': 'Other Sources'
    };
    
    for (var [type, typeEntries] of entriesByType) {
      if (typeEntries.length > 0) {
        content += `## ${typeNames[type] || type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;
        
        typeEntries.forEach((entry, index) => {
          content += `${index + 1}. ${entry.citation}\n`;
          
          // Add metadata if available
          if (entry.metadata.url) {
            content += `   URL: ${entry.metadata.url}\n`;
          }
          if (entry.metadata.comment) {
            content += `   Note: ${entry.metadata.comment}\n`;
          }
          if (entry.metadata.keywords && entry.metadata.keywords.length > 0) {
            content += `   Keywords: ${entry.metadata.keywords.join(', ')}\n`;
          }
          content += `\n`;
        });
      }
    }
    
    // Add statistics
    content += `## Bibliography Statistics\n\n`;
    content += `- **Total Sources:** ${entries.length}\n`;
    for (var [type, typeEntries] of entriesByType) {
      content += `- **${typeNames[type] || type}:** ${typeEntries.length}\n`;
    }
    content += `\n`;
    
    // Add generation details
    content += `---\n`;
    content += `*This bibliography was automatically generated by DEVONthink MCP Workflow Automation*  \n`;
    content += `*Generation Date:* ${timestamp}  \n`;
    content += `*Citation Style:* ${style}  \n`;
    
    return content;
  }

  /**
   * Generate project summary content from workflow and documents
   * @private
   */
  generateProjectSummaryContent(workflow, documents, summaryResult) {
    var params = workflow.parameters;
    var timestamp = new Date().toISOString().split('T')[0];
    
    var content = `# Project Summary: ${params.project_name || workflow.template.name}\n\n`;
    
    content += `**Generated:** ${timestamp}  \n`;
    content += `**Workflow:** ${workflow.template.name}  \n`;
    content += `**Template ID:** ${workflow.templateId}  \n`;
    content += `**Documents Analyzed:** ${documents.length}  \n\n`;
    
    if (summaryResult && summaryResult.summary) {
      content += `## AI-Generated Summary\n\n${summaryResult.summary}\n\n`;
    }
    
    content += `## Project Overview\n\n`;
    if (params.project_description) {
      content += `${params.project_description}\n\n`;
    }
    
    content += `## Document Inventory\n\n`;
    content += `Total documents processed: **${documents.length}**\n\n`;
    
    // Group documents by type
    var docsByType = new Map();
    documents.forEach(doc => {
      var type = doc.kind || 'Unknown';
      if (!docsByType.has(type)) {
        docsByType.set(type, []);
      }
      docsByType.get(type).push(doc);
    });
    
    for (var [type, docs] of docsByType) {
      content += `### ${type} (${docs.length})\n\n`;
      docs.slice(0, 10).forEach(doc => {  // Limit to first 10 per type
        content += `- **${doc.name}**`;
        if (doc.comment) content += ` - ${doc.comment}`;
        content += `\n`;
      });
      if (docs.length > 10) {
        content += `- ... and ${docs.length - 10} more\n`;
      }
      content += `\n`;
    }
    
    content += `## Workflow Execution Details\n\n`;
    content += `- **Start Time:** ${new Date(workflow.startTime).toLocaleString()}\n`;
    if (workflow.endTime) {
      content += `- **End Time:** ${new Date(workflow.endTime).toLocaleString()}\n`;
      content += `- **Duration:** ${Math.round(workflow.duration / 1000)} seconds\n`;
    }
    content += `- **Steps Completed:** ${workflow.results.summary.completed}/${workflow.template.steps.length}\n`;
    if (workflow.results.summary.failed > 0) {
      content += `- **Steps Failed:** ${workflow.results.summary.failed}\n`;
    }
    content += `\n`;
    
    content += `## Next Steps\n\n`;
    content += `1. Review and organize documents by relevance\n`;
    content += `2. Identify key themes and patterns\n`;
    content += `3. Extract actionable insights\n`;
    content += `4. Plan follow-up research activities\n\n`;
    
    content += `---\n`;
    content += `*This summary was automatically generated by DEVONthink MCP Workflow Automation*\n`;
    
    return content;
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