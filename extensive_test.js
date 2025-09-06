#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';

class ExtensiveTestSuite {
  constructor() {
    this.serverProcess = null;
    this.rl = null;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async startServer() {
    console.log('🚀 Starting DEVONthink MCP server for extensive testing...\n');
    
    return new Promise((resolve) => {
      this.serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, LOG_LEVEL: 'INFO' }
      });

      this.rl = readline.createInterface({
        input: this.serverProcess.stdout,
        output: process.stdout
      });

      // Give server time to start
      setTimeout(resolve, 2000);
    });
  }

  async sendRequest(request) {
    return new Promise((resolve) => {
      const responseHandler = (line) => {
        try {
          const response = JSON.parse(line);
          if (response.jsonrpc === '2.0') {
            this.rl.removeListener('line', responseHandler);
            resolve(response);
          }
        } catch (e) {
          // Not JSON or not complete, continue
        }
      };

      this.rl.on('line', responseHandler);
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
      
      setTimeout(() => {
        this.rl.removeListener('line', responseHandler);
        resolve({ error: { message: 'Timeout waiting for response' } });
      }, 5000);
    });
  }

  async testTool(toolName, params, description) {
    this.results.total++;
    console.log(`Testing: ${description}...`);
    
    const request = {
      jsonrpc: '2.0',
      id: this.results.total,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    try {
      const response = await this.sendRequest(request);
      
      if (response.error) {
        console.log(`  ❌ Failed: ${response.error.message || JSON.stringify(response.error)}`);
        this.results.failed++;
        this.results.errors.push({ tool: toolName, params, error: response.error });
      } else {
        console.log(`  ✅ Passed`);
        this.results.passed++;
        
        // Show partial response for validation
        if (response.result?.content?.[0]?.text) {
          const text = response.result.content[0].text;
          const preview = text.substring(0, 100) + (text.length > 100 ? '...' : '');
          console.log(`     Response preview: ${preview}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      this.results.failed++;
      this.results.errors.push({ tool: toolName, params, error: error.message });
    }
    
    console.log();
  }

  async runExtensiveTests() {
    console.log('=' .repeat(70));
    console.log('📋 EXTENSIVE DEVONTHINK MCP SERVER TEST SUITE');
    console.log('=' .repeat(70));
    console.log();

    // 1. SYSTEM TOOL TESTS
    console.log('🔧 SYSTEM TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('system', { operation: 'databases' }, 'List all databases');
    await this.testTool('system', { operation: 'monitor' }, 'Monitor operations');
    await this.testTool('system', { operation: 'performance' }, 'Get performance report');
    await this.testTool('system', { operation: 'help', toolName: 'search' }, 'Get help for search tool');
    await this.testTool('system', { operation: 'help', includeExamples: true }, 'Get help with examples');

    // 2. SEARCH TOOL TESTS
    console.log('🔍 SEARCH TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('search', { mode: 'basic', query: 'test', limit: 5 }, 'Basic search');
    await this.testTool('search', { mode: 'basic', query: 'document' }, 'Basic search for "document"');
    await this.testTool('search', { mode: 'advanced', query: 'kind:pdf', limit: 3 }, 'Advanced search for PDFs');
    await this.testTool('search', { mode: 'batch', query: ['test', 'document', 'research'] }, 'Batch search multiple queries');
    await this.testTool('search', { mode: 'smart_groups', limit: 10 }, 'List smart groups');

    // 3. DOCUMENT TOOL TESTS
    console.log('📄 DOCUMENT TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('document', { 
      operation: 'create', 
      name: 'Test Document', 
      content: 'This is a test document created by the extensive test suite.', 
      type: 'markdown' 
    }, 'Create new markdown document');
    
    // 4. ANALYZE TOOL TESTS
    console.log('🧠 ANALYZE TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('analyze', { 
      operation: 'themes', 
      documentUuids: ['test-uuid-1', 'test-uuid-2'] 
    }, 'Extract themes from documents');
    
    // 5. GRAPH TOOL TESTS
    console.log('🕸️ GRAPH TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('graph', { 
      operation: 'clusters', 
      searchQuery: 'research', 
      minClusterSize: 2 
    }, 'Detect knowledge clusters');
    
    // 6. ORGANIZE TOOL TESTS
    console.log('📁 ORGANIZE TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('organize', { 
      operation: 'create_group', 
      name: 'Test Group', 
      description: 'Created by test suite' 
    }, 'Create new group');
    
    // 7. IMPORT TOOL TESTS
    console.log('⬇️ IMPORT TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('import', { 
      type: 'url', 
      source: 'https://example.com/test', 
      tags: ['test', 'import'] 
    }, 'Import URL');
    
    // 8. RESEARCH TOOL TESTS
    console.log('🔬 RESEARCH TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('research', { 
      workflow: 'explore', 
      query: 'artificial intelligence', 
      maxResults: 10 
    }, 'Explore research topic');
    await this.testTool('research', { 
      workflow: 'trends' 
    }, 'Identify research trends');
    
    // 9. AI TOOL TESTS
    console.log('🤖 AI TOOL TESTS');
    console.log('-'.repeat(50));
    await this.testTool('ai', { 
      operation: 'similar', 
      uuid: 'test-uuid', 
      limit: 5 
    }, 'Find similar documents');

    // Edge cases and error handling
    console.log('🔴 ERROR HANDLING TESTS');
    console.log('-'.repeat(50));
    await this.testTool('search', { mode: 'invalid_mode', query: 'test' }, 'Invalid search mode');
    await this.testTool('document', { operation: 'read' }, 'Read without UUID');
    await this.testTool('graph', { operation: 'path' }, 'Path without required parameters');
  }

  displayResults() {
    console.log();
    console.log('=' .repeat(70));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(70));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Failed Tests Details:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. Tool: ${error.tool}`);
        console.log(`   Params: ${JSON.stringify(error.params)}`);
        console.log(`   Error: ${JSON.stringify(error.error)}`);
      });
    }
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test_results_extensive_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Detailed results saved to: ${filename}`);
  }

  async cleanup() {
    if (this.rl) {
      this.rl.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }

  async run() {
    try {
      await this.startServer();
      await this.runExtensiveTests();
      this.displayResults();
    } catch (error) {
      console.error('Fatal error:', error);
    } finally {
      await this.cleanup();
      process.exit(this.results.failed > 0 ? 1 : 0);
    }
  }
}

// Run the extensive test suite
const suite = new ExtensiveTestSuite();
suite.run();
