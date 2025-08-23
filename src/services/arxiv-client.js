/**
 * arXiv API Client for DEVONthink MCP Server
 * Handles paper metadata fetching, PDF downloads, and format validation
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { XMLParser } from 'fast-xml-parser';
import { NetworkError, ValidationError, withErrorTracking } from '../utils/enhanced-errors.js';

export class ArXivClient {
  constructor() {
    this.baseURL = 'http://export.arxiv.org/api/query';
    this.pdfBaseURL = 'https://arxiv.org/pdf';
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    // Create axios instance with timeout and retries
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'DEVONthink-MCP-Server/2.1.0 (mailto:research@example.com)'
      }
    });

    // Setup retry logic
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.config && !error.config.__isRetryRequest && error.response?.status >= 500) {
          error.config.__isRetryRequest = true;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Validate arXiv identifier format
   */
  validateIdentifier(identifier) {
    // Modern format: YYMM.NNNNN[vN] (e.g., 2308.04889, 2308.04889v2)
    const modernFormat = /^(\d{4})\.(\d{4,5})(v\d+)?$/;
    
    // Legacy format: subject-class/YYMMnnn (e.g., hep-th/9901001)
    const legacyFormat = /^[a-z-]+(\.[A-Z]{2})?\/\d{7}$/;
    
    if (!modernFormat.test(identifier) && !legacyFormat.test(identifier)) {
      throw new ValidationError(
        `Invalid arXiv identifier format: ${identifier}`,
        'identifier',
        identifier,
        {
          operation: 'validate_arxiv_id',
          expectedFormats: [
            'YYMM.NNNNN (e.g., 2308.04889)',
            'YYMM.NNNNNvN (e.g., 2308.04889v2)',
            'subject-class/YYMMnnn (legacy, e.g., hep-th/9901001)'
          ]
        }
      );
    }

    return identifier;
  }

  /**
   * Fetch paper metadata from arXiv API
   */
  async fetchMetadata(identifier) {
    return withErrorTracking('arxiv_fetch_metadata', { identifier })(async (tracker) => {
      tracker.step('validate_identifier');
      const validId = this.validateIdentifier(identifier);

      tracker.step('construct_query');
      const queryURL = `${this.baseURL}?id_list=${encodeURIComponent(validId)}&max_results=1`;

      tracker.step('fetch_xml', { url: queryURL });
      let response;
      try {
        response = await this.client.get(queryURL);
      } catch (error) {
        if (error.code === 'ENOTFOUND') {
          tracker.error('Network connection failed - check internet connectivity', NetworkError, {
            url: queryURL,
            originalError: error.message
          });
        }
        tracker.error(`Failed to fetch from arXiv API: ${error.message}`, NetworkError, {
          url: queryURL,
          statusCode: error.response?.status,
          originalError: error.message
        });
      }

      tracker.step('parse_xml');
      let parsedData;
      try {
        parsedData = this.xmlParser.parse(response.data);
      } catch (error) {
        tracker.error(`Failed to parse arXiv API response: ${error.message}`, NetworkError, {
          url: queryURL,
          originalError: error.message
        });
      }

      tracker.step('validate_response');
      const feed = parsedData.feed;
      if (!feed || !feed.entry) {
        tracker.error(`Paper not found: ${identifier}`, ValidationError, {
          identifier,
          apiResponse: feed?.title?.['#text'] || 'No response data'
        });
      }

      const entry = Array.isArray(feed.entry) ? feed.entry[0] : feed.entry;

      tracker.step('extract_metadata');
      const metadata = this.extractMetadata(entry, identifier);
      
      return { metadata, identifier: validId };
    });
  }

  /**
   * Extract structured metadata from arXiv API response
   */
  extractMetadata(entry, identifier) {
    // Handle missing or invalid entry
    if (!entry || typeof entry !== 'object') {
      return {
        id: identifier,
        title: `arXiv:${identifier}`,
        abstract: 'Paper not found or invalid identifier',
        authors: [],
        published: 'Unknown',
        updated: 'Unknown',
        categories: [],
        primaryCategory: 'unknown',
        pdfUrl: this.getPdfUrl(identifier),
        arxivUrl: `https://arxiv.org/abs/${identifier}`,
        doi: null,
        error: 'Paper not found in arXiv database'
      };
    }

    const authors = this.parseAuthors(entry.author);
    const categories = this.parseCategories(entry.category);
    
    return {
      id: identifier,
      title: entry.title?.replace(/\s+/g, ' ').trim() || `arXiv:${identifier}`,
      abstract: entry.summary?.replace(/\s+/g, ' ').trim() || 'No abstract available',
      authors,
      published: entry.published || 'Unknown',
      updated: entry.updated || entry.published || 'Unknown',
      categories,
      primaryCategory: categories[0] || 'unknown',
      pdfUrl: this.getPdfUrl(identifier),
      arxivUrl: `https://arxiv.org/abs/${identifier}`,
      doi: this.extractDOI(entry),
      comment: entry.comment || null,
      journalRef: entry.journal_ref || null
    };
  }

  /**
   * Parse author information
   */
  parseAuthors(authorData) {
    if (!authorData) return [];
    const authors = Array.isArray(authorData) ? authorData : [authorData];
    return authors.map(author => ({
      name: (author && author.name) || 'Unknown Author',
      affiliation: (author && author.affiliation) || null
    }));
  }

  /**
   * Parse category information
   */
  parseCategories(categoryData) {
    if (!categoryData) return ['unknown'];
    const categories = Array.isArray(categoryData) ? categoryData : [categoryData];
    return categories.map(cat => cat['@_term']).filter(Boolean);
  }

  /**
   * Extract DOI from entry
   */
  extractDOI(entry) {
    if (!entry) return null;
    // Sometimes DOI is in the comment or journal reference
    const text = (entry.comment || '') + ' ' + (entry.journal_ref || '');
    const doiMatch = text.match(/10\.\d{4,}\/[^\s]+/);
    return doiMatch ? doiMatch[0] : null;
  }

  /**
   * Get PDF URL for identifier
   */
  getPdfUrl(identifier) {
    return `${this.pdfBaseURL}/${identifier}.pdf`;
  }

  /**
   * Download PDF file
   */
  async downloadPDF(identifier, metadata = null) {
    return withErrorTracking('arxiv_download_pdf', { identifier })(async (tracker) => {
      if (!metadata) {
        tracker.step('fetch_metadata');
        const result = await this.fetchMetadata(identifier);
        metadata = result.result.metadata;
      }

      // Check if metadata indicates an error (invalid paper)
      if (metadata.error) {
        tracker.error(`Cannot download PDF: ${metadata.error}`, ValidationError, {
          identifier,
          reason: metadata.error
        });
      }

      const pdfUrl = metadata.pdfUrl;
      tracker.step('prepare_download', { pdfUrl });

      // Create temporary file with safe title
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arxiv-download-'));
      const safeTitle = metadata.title ? metadata.title.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_') : 'paper';
      const filename = `${identifier.replace('/', '_')}_${safeTitle}.pdf`;
      const tempPath = path.join(tempDir, filename);

      tracker.step('download_file', { tempPath, size: 'unknown' });
      
      try {
        const response = await this.client.get(pdfUrl, {
          responseType: 'stream',
          timeout: 60000 // 60 second timeout for large PDFs
        });

        const writer = await fs.open(tempPath, 'w');
        const fileStream = writer.createWriteStream();
        response.data.pipe(fileStream);

        await new Promise((resolve, reject) => {
          fileStream.on('finish', resolve);
          fileStream.on('error', reject);
        });

        await writer.close();

      } catch (error) {
        // Clean up on error
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

        if (error.code === 'ENOTFOUND') {
          tracker.error('Network connection failed during PDF download', NetworkError, {
            url: pdfUrl,
            originalError: error.message
          });
        }

        tracker.error(`PDF download failed: ${error.message}`, NetworkError, {
          url: pdfUrl,
          statusCode: error.response?.status,
          originalError: error.message
        });
      }

      tracker.step('verify_download');
      try {
        const stats = await fs.stat(tempPath);
        if (stats.size < 1000) {
          // File too small, might be error page
          const content = await fs.readFile(tempPath, 'utf8');
          if (content.includes('404') || content.includes('Not Found')) {
            tracker.error(`PDF not available for paper: ${identifier}`, NetworkError, {
              url: pdfUrl,
              reason: 'Paper may not have public PDF access'
            });
          }
        }

        return {
          tempPath,
          tempDir,
          filename,
          size: stats.size,
          metadata
        };
      } catch (error) {
        tracker.error(`Failed to verify downloaded PDF: ${error.message}`, NetworkError, {
          tempPath,
          originalError: error.message
        });
      }
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error.message);
    }
  }

  /**
   * Search for papers
   */
  async search(query, maxResults = 10) {
    return withErrorTracking('arxiv_search', { query, maxResults })(async (tracker) => {
      tracker.step('construct_search_query');
      const searchURL = `${this.baseURL}?search_query=${encodeURIComponent(query)}&max_results=${maxResults}&sortBy=lastUpdatedDate&sortOrder=descending`;

      tracker.step('execute_search', { url: searchURL });
      let response;
      try {
        response = await this.client.get(searchURL);
      } catch (error) {
        tracker.error(`arXiv search failed: ${error.message}`, NetworkError, {
          url: searchURL,
          statusCode: error.response?.status,
          originalError: error.message
        });
      }

      tracker.step('parse_search_results');
      const parsedData = this.xmlParser.parse(response.data);
      const feed = parsedData.feed;
      
      if (!feed || !feed.entry) {
        return { results: [], total: 0 };
      }

      const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
      const results = entries.map(entry => {
        const id = entry.id?.split('/abs/')?.[1] || 'unknown';
        return this.extractMetadata(entry, id);
      });

      return { 
        results, 
        total: results.length,
        query,
        searchURL 
      };
    });
  }
}

export default ArXivClient;