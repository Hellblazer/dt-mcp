#!/usr/bin/env node

/**
 * Mock API Server for Testing DEVONthink MCP Server External Dependencies
 * Provides realistic mock responses for arXiv, DOI, PubMed, and URL fetch operations
 */

import express from 'express';
import { testFixtures } from './test_fixtures.js';

class MockApiServer {
    constructor(port = 3001) {
        this.app = express();
        this.port = port;
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS for testing
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
        
        // Logging
        this.app.use((req, res, next) => {
            console.log(`[Mock API] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // arXiv API mock endpoints
        this.setupArxivRoutes();
        
        // DOI API mock endpoints
        this.setupDoiRoutes();
        
        // PubMed API mock endpoints
        this.setupPubmedRoutes();
        
        // Generic URL fetch mock endpoints
        this.setupUrlFetchRoutes();
        
        // Error simulation endpoints
        this.setupErrorSimulationRoutes();
    }

    setupArxivRoutes() {
        // arXiv API - Get paper metadata
        this.app.get('/arxiv/abs/:paperId', (req, res) => {
            const { paperId } = req.params;
            
            // Simulate different response scenarios
            if (paperId.startsWith('9999')) {
                return res.status(404).json({
                    error: `Paper ${paperId} not found on arXiv`
                });
            }
            
            if (paperId === 'rate-limit-test') {
                return res.status(429).json({
                    error: 'arXiv API rate limit exceeded. Please try again later.'
                });
            }
            
            // Return mock paper data
            const paperData = testFixtures.mockApiResponses.arxiv.success(paperId);
            res.json(paperData);
        });
        
        // arXiv PDF download endpoint
        this.app.get('/arxiv/pdf/:paperId.pdf', (req, res) => {
            const { paperId } = req.params;
            
            if (paperId.startsWith('9999')) {
                return res.status(404).send('PDF not found');
            }
            
            // Return mock PDF content
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${paperId}.pdf"`);
            res.send(Buffer.from(`Mock PDF content for paper ${paperId}`));
        });
    }

    setupDoiRoutes() {
        // DOI resolution mock
        this.app.get('/doi/:doi(*)', (req, res) => {
            const doi = req.params.doi;
            
            // Simulate not found
            if (doi.includes('notfound')) {
                return res.status(404).json({
                    error: `DOI ${doi} not found`
                });
            }
            
            // Return mock DOI data
            const doiData = testFixtures.mockApiResponses.doi.success(doi);
            res.json(doiData);
        });
    }

    setupPubmedRoutes() {
        // PubMed API mock
        this.app.get('/pubmed/:pmid', (req, res) => {
            const { pmid } = req.params;
            
            if (pmid === '00000000') {
                return res.status(404).json({
                    error: `PubMed article ${pmid} not found`
                });
            }
            
            const pubmedData = testFixtures.mockApiResponses.pubmed.success(pmid);
            res.json(pubmedData);
        });
    }

    setupUrlFetchRoutes() {
        // Generic URL fetch simulation
        this.app.get('/mock-content/*', (req, res) => {
            const url = req.path.replace('/mock-content/', '');
            
            // Simulate different content types and sizes
            if (url.includes('large-file')) {
                // Simulate large file
                const size = 100 * 1024 * 1024; // 100MB
                res.setHeader('Content-Length', size);
                res.setHeader('Content-Type', 'application/octet-stream');
                return res.status(413).json({
                    error: 'File size exceeds maximum allowed'
                });
            }
            
            if (url.includes('timeout')) {
                // Simulate timeout - don't respond
                return;
            }
            
            if (url.includes('forbidden')) {
                return res.status(403).json({
                    error: 'Access forbidden'
                });
            }
            
            if (url.includes('server-error')) {
                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
            
            // Return mock content based on file extension
            const extension = url.split('.').pop();
            
            switch (extension) {
                case 'pdf':
                    res.setHeader('Content-Type', 'application/pdf');
                    res.send(Buffer.from('Mock PDF content'));
                    break;
                    
                case 'html':
                    res.setHeader('Content-Type', 'text/html');
                    res.send('<html><body>Mock HTML content</body></html>');
                    break;
                    
                default:
                    res.setHeader('Content-Type', 'text/plain');
                    res.send('Mock file content');
            }
        });
    }

    setupErrorSimulationRoutes() {
        // Rate limiting simulation
        this.app.get('/simulate/rate-limit', (req, res) => {
            res.status(429).json({
                error: 'Rate limit exceeded',
                retry_after: 60
            });
        });
        
        // Network timeout simulation
        this.app.get('/simulate/timeout', (req, res) => {
            // Don't respond to simulate timeout
        });
        
        // Invalid SSL simulation
        this.app.get('/simulate/ssl-error', (req, res) => {
            res.status(526).json({
                error: 'Invalid SSL certificate'
            });
        });
        
        // Malformed response simulation
        this.app.get('/simulate/malformed', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send('{ malformed json response }');
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Mock API Server running on port ${this.port}`);
                    console.log(`Health check: http://localhost:${this.port}/health`);
                    resolve();
                }
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('Mock API Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = process.argv[2] || 3001;
    const server = new MockApiServer(port);
    
    server.start().then(() => {
        console.log('Mock API server started successfully');
        console.log('\\nAvailable endpoints:');
        console.log('  GET  /health                    - Health check');
        console.log('  GET  /arxiv/abs/:paperId        - arXiv paper metadata');
        console.log('  GET  /arxiv/pdf/:paperId.pdf    - arXiv PDF download');
        console.log('  GET  /doi/:doi                  - DOI resolution');
        console.log('  GET  /pubmed/:pmid              - PubMed article');
        console.log('  GET  /mock-content/*            - Generic content simulation');
        console.log('  GET  /simulate/rate-limit       - Rate limit simulation');
        console.log('  GET  /simulate/timeout          - Timeout simulation');
        console.log('  GET  /simulate/ssl-error        - SSL error simulation');
        console.log('  GET  /simulate/malformed        - Malformed response');
        console.log('\\nPress Ctrl+C to stop');
    }).catch(err => {
        console.error('Failed to start mock API server:', err);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\\nShutting down mock API server...');
        server.stop().then(() => {
            process.exit(0);
        });
    });
}

export default MockApiServer;