import axios from 'axios';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * External API service for academic paper access and URL imports
 * Provides rate limiting, error handling, and standardized responses
 */
export class ExternalAPIService {
  constructor() {
    this.setupRateLimiters();
    this.setupAxiosDefaults();
  }

  setupRateLimiters() {
    this.rateLimiters = {
      arxiv: new RateLimiterMemory({
        points: 3, // 3 requests
        duration: 1, // per second
      }),
      crossref: new RateLimiterMemory({
        points: 50, // 50 requests
        duration: 1, // per second
      }),
      pubmed: new RateLimiterMemory({
        points: 10, // 10 requests
        duration: 1, // per second
      })
    };
  }

  setupAxiosDefaults() {
    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'DEVONthink-MCP-Server/2.0.1 (Research Automation; contact@example.com)'
      }
    });
  }

  /**
   * Validate URL for security and format
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Security checks - block dangerous protocols
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return { valid: false, error: 'Invalid protocol - only HTTP/HTTPS allowed' };
      }

      // Block localhost/internal network access for security
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname.startsWith('127.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
        return { valid: false, error: 'Internal network access not allowed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Execute operation with rate limiting
   */
  async executeWithRateLimit(service, operation) {
    const rateLimiter = this.rateLimiters[service];
    
    if (rateLimiter) {
      try {
        await rateLimiter.consume(1);
      } catch (rateLimiterRes) {
        throw new Error(`Rate limit exceeded for ${service}. Try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds`);
      }
    }

    return operation();
  }

  /**
   * Download file from URL with validation
   */
  async downloadFileInfo(url) {
    const validation = this.isValidUrl(url);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // HEAD request to get file info without downloading
      const response = await this.httpClient.head(url);
      
      return {
        success: true,
        url: url,
        contentType: response.headers['content-type'] || 'unknown',
        contentLength: parseInt(response.headers['content-length'] || '0'),
        lastModified: response.headers['last-modified'],
        filename: this.extractFilename(url, response.headers)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to access URL: ${error.message}`,
        url: url
      };
    }
  }

  /**
   * Extract filename from URL or headers
   */
  extractFilename(url, headers) {
    // Try content-disposition header first
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch) {
        return filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Fall back to URL path
    try {
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split('/').pop();
      return filename || 'downloaded_document';
    } catch {
      return 'downloaded_document';
    }
  }

  /**
   * Resolve academic paper metadata from various sources
   */
  async resolveAcademicPaper(source, identifier) {
    switch (source.toLowerCase()) {
      case 'arxiv':
        return this.resolveArxivPaper(identifier);
      case 'doi':
        return this.resolveDOI(identifier);
      case 'pubmed':
        return this.resolvePubmedPaper(identifier);
      default:
        throw new Error(`Unsupported paper source: ${source}`);
    }
  }

  /**
   * Resolve arXiv paper metadata
   */
  async resolveArxivPaper(arxivId) {
    return this.executeWithRateLimit('arxiv', async () => {
      try {
        const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
        const response = await this.httpClient.get(apiUrl);
        
        // Parse XML response (simplified)
        const xmlData = response.data;
        
        // Extract basic information (this is a simplified parser)
        const titleMatch = xmlData.match(/<title>([^<]+)<\/title>/);
        const summaryMatch = xmlData.match(/<summary>([^<]+)<\/summary>/);
        const authorsMatch = xmlData.match(/<author><name>([^<]+)<\/name><\/author>/g);
        
        const title = titleMatch ? titleMatch[1].trim() : `arXiv:${arxivId}`;
        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        const authors = authorsMatch ? 
          authorsMatch.map(match => match.match(/<name>([^<]+)<\/name>/)[1]) : [];

        return {
          success: true,
          source: 'arxiv',
          identifier: arxivId,
          title: title,
          authors: authors,
          abstract: summary,
          pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
          web_url: `https://arxiv.org/abs/${arxivId}`,
          keywords: ['arxiv', 'preprint']
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to resolve arXiv paper ${arxivId}: ${error.message}`
        };
      }
    });
  }

  /**
   * Resolve DOI metadata via CrossRef
   */
  async resolveDOI(doi) {
    return this.executeWithRateLimit('crossref', async () => {
      try {
        const apiUrl = `https://api.crossref.org/works/${doi}`;
        const response = await this.httpClient.get(apiUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });

        const work = response.data.message;
        const title = Array.isArray(work.title) ? work.title[0] : work.title;
        const authors = work.author ? work.author.map(author => 
          `${author.given || ''} ${author.family || ''}`.trim()
        ) : [];

        return {
          success: true,
          source: 'doi',
          identifier: doi,
          title: title,
          authors: authors,
          abstract: work.abstract || '',
          journal: work['container-title'] ? work['container-title'][0] : '',
          year: work.published ? work.published['date-parts'][0][0] : null,
          web_url: `https://doi.org/${doi}`,
          keywords: ['doi', 'published']
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to resolve DOI ${doi}: ${error.message}`
        };
      }
    });
  }

  /**
   * Resolve PubMed paper metadata
   */
  async resolvePubmedPaper(pubmedId) {
    return this.executeWithRateLimit('pubmed', async () => {
      try {
        const apiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pubmedId}&retmode=json`;
        const response = await this.httpClient.get(apiUrl);

        const result = response.data.result[pubmedId];
        if (!result) {
          throw new Error('Paper not found');
        }

        const authors = result.authors ? result.authors.map(author => author.name) : [];

        return {
          success: true,
          source: 'pubmed',
          identifier: pubmedId,
          title: result.title,
          authors: authors,
          abstract: '', // Would need additional API call for abstract
          journal: result.source,
          year: result.pubdate ? parseInt(result.pubdate.split(' ')[0]) : null,
          web_url: `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`,
          keywords: ['pubmed', 'published', 'biomedical']
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to resolve PubMed paper ${pubmedId}: ${error.message}`
        };
      }
    });
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const services = ['arxiv', 'crossref', 'pubmed'];
    const results = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service))
    );

    return services.map((service, index) => ({
      service,
      status: results[index].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      error: results[index].reason?.message
    }));
  }

  async checkServiceHealth(service) {
    const healthChecks = {
      arxiv: () => this.httpClient.get('http://export.arxiv.org/api/query?id_list=1234.5678', { timeout: 5000 }),
      crossref: () => this.httpClient.get('https://api.crossref.org/works/10.1038/nature12373', { timeout: 5000 }),
      pubmed: () => this.httpClient.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=12345678&retmode=json', { timeout: 5000 })
    };

    const healthCheck = healthChecks[service];
    if (!healthCheck) {
      throw new Error(`Unknown service: ${service}`);
    }

    await healthCheck();
    return true;
  }
}