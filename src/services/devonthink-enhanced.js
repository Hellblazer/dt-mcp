/**
 * Enhanced downloadPaper method with arXiv client integration
 * This replaces the existing method with improved error handling and arXiv support
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Helper method to import PDF file to DEVONthink
 */
export async function importPDFFile(filePath, title, targetGroup = null, extractMetadata = false, tags = null, database = null) {
  // This would typically use AppleScript to import the file
  // For now, let's create a simplified version
  
  const importScript = `
    tell application id "DNtp"
      set theDatabase to current database
      ${database ? `set theDatabase to database named "${database}"` : ''}
      ${targetGroup ? `set theGroup to create location "${targetGroup}" in theDatabase` : 'set theGroup to root of theDatabase'}
      
      set theRecord to import "${filePath}" to theGroup
      set name of theRecord to "${title.replace(/"/g, '\\"')}"
      
      ${tags && tags.length > 0 ? `set tags of theRecord to {${tags.map(tag => `"${tag.replace(/"/g, '\\"')}"`).join(', ')}}` : ''}
      
      return {success:true, uuid:uuid of theRecord, name:name of theRecord, path:path of theRecord}
    end tell
  `;
  
  // Execute the AppleScript (this would be handled by runAppleScript in the actual implementation)
  try {
    const result = await execAsync(`osascript -e '${importScript}'`);
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Failed to import PDF: ${error.message}`);
  }
}

/**
 * Enhanced downloadPaper method with arXiv client
 */
export async function enhancedDownloadPaper(devonthinkService, source, identifier, targetGroup = null, extractMetadata = false, tags = null, database = null) {
  const sourceType = source.toLowerCase();
  
  // Use specialized client for arXiv papers
  if (sourceType === 'arxiv') {
    return await downloadArXivPaper(devonthinkService, identifier, targetGroup, extractMetadata, tags, database);
  }
  
  // For other sources, use the existing generic method
  return await downloadPaperGeneric(devonthinkService, sourceType, identifier, targetGroup, extractMetadata, tags, database);
}

/**
 * Download arXiv paper using dedicated arXiv client
 */
async function downloadArXivPaper(devonthinkService, identifier, targetGroup = null, extractMetadata = false, tags = null, database = null) {
  let tempDir = null;
  try {
    const arxivClient = devonthinkService.arxivClient;
    
    // Step 1: Fetch metadata
    const metadataResult = await arxivClient.fetchMetadata(identifier);
    const metadata = metadataResult.metadata;
    
    // Step 2: Download PDF
    const downloadResult = await arxivClient.downloadPDF(identifier, metadata);
    tempDir = downloadResult.tempDir;
    
    // Step 3: Import to DEVONthink using AppleScript
    const importResult = await importPDFToDevonThink(
      devonthinkService,
      downloadResult.tempPath,
      metadata.title,
      targetGroup,
      extractMetadata,
      [...(tags || []), 'arXiv', `arXiv:${identifier}`, ...metadata.categories],
      database
    );
    
    // Step 4: Enhance with arXiv metadata
    const enhancedResult = {
      ...importResult,
      source: 'arxiv',
      identifier,
      metadata: {
        ...importResult.metadata,
        arxiv: metadata,
        downloadedFrom: metadata.pdfUrl,
        fileSize: downloadResult.size
      },
      timestamp: new Date().toISOString()
    };
    
    return {
      success: true,
      data: enhancedResult,
      message: 'arXiv paper downloaded and imported successfully'
    };
    
  } catch (error) {
    throw error; // Re-throw enhanced errors from arXiv client
  } finally {
    // Cleanup temporary files
    if (tempDir && devonthinkService.arxivClient) {
      await devonthinkService.arxivClient.cleanup(tempDir);
    }
  }
}

/**
 * Import PDF to DEVONthink via AppleScript
 */
async function importPDFToDevonThink(devonthinkService, filePath, title, targetGroup, extractMetadata, tags, database) {
  const params = {
    filePath,
    title,
    targetGroup: targetGroup || '',
    extractMetadata: extractMetadata || false,
    tags: tags ? JSON.stringify(tags) : '',
    database: database || ''
  };
  
  // Use the existing runAppleScript infrastructure
  const result = await devonthinkService.runAppleScript('import_pdf_file', [JSON.stringify(params)]);
  
  if (result.error) {
    throw new Error(`PDF import failed: ${result.error}`);
  }
  
  if (!result.success || !result.uuid) {
    throw new Error('PDF import failed - no document UUID returned');
  }
  
  return result;
}

/**
 * Generic download for non-arXiv sources
 */
async function downloadPaperGeneric(devonthinkService, source, identifier, targetGroup, extractMetadata, tags, database) {
  // Use existing external API + AppleScript fallback logic
  let paperMetadata = null;
  let importUrl = null;

  // Try to resolve paper metadata using external APIs first
  try {
    const metadataResult = await devonthinkService.externalAPIs.resolveAcademicPaper(source, identifier);
    
    if (metadataResult.success) {
      paperMetadata = metadataResult;
      importUrl = metadataResult.pdf_url;
      
      // Add paper-specific tags
      const paperTags = [...(tags || []), ...metadataResult.keywords];
      tags = [...new Set(paperTags)]; // Remove duplicates
      
      // If we have a PDF URL, import it directly
      if (importUrl) {
        const importResult = await devonthinkService.importUrl(
          importUrl,
          targetGroup,
          true, // Always extract metadata for academic papers
          tags,
          paperMetadata.title // Use paper title as custom name
        );
        
        // Enhance the result with academic paper metadata
        return {
          success: true,
          data: {
            uuid: importResult.data.uuid,
            name: paperMetadata.title,
            path: importResult.data.path,
            source: source.toLowerCase(),
            identifier: identifier.trim(),
            metadata: {
              ...importResult.data.metadata,
              academic: paperMetadata,
              resolvedViaAPI: true
            },
            importedFrom: importUrl,
            timestamp: new Date().toISOString()
          },
          message: 'Paper downloaded and imported successfully'
        };
      }
    }
  } catch (apiError) {
    // Continue to fallback
  }

  // Fallback to AppleScript implementation
  const params = {
    source: source.toLowerCase(),
    identifier: identifier.trim(),
    targetGroup: targetGroup || '',
    extractMetadata: extractMetadata || false,
    tags: tags ? JSON.stringify(tags) : '',
    database: database || ''
  };

  const result = await devonthinkService.runAppleScript('download_paper', [source.toLowerCase(), JSON.stringify(params)]);

  // Validate result
  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.success || !result.uuid) {
    throw new Error('Download failed - no document UUID returned');
  }

  // Merge external API metadata if available
  const enhancedMetadata = paperMetadata ? 
    { ...result.metadata, academic: paperMetadata, resolvedViaAPI: true } : 
    result.metadata;

  return {
    success: true,
    data: {
      uuid: result.uuid,
      name: result.name,
      path: result.path,
      source: result.source,
      identifier: result.identifier,
      metadata: enhancedMetadata || null,
      method: paperMetadata ? 'api_enhanced' : 'applescript_only',
      timestamp: new Date().toISOString()
    },
    message: 'Paper downloaded successfully'
  };
}