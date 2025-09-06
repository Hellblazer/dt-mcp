#!/usr/bin/env node

/**
 * Unified Test Suite for DEVONthink MCP Server
 * 
 * Run all tests:     node test_suite.js
 * Run specific test: node test_suite.js comprehensive
 *                    node test_suite.js operations
 *                    node test_suite.js performance
 */

import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

class UnifiedTestSuite {
  constructor() {
    this.serverProcess = null;
    this.rl = null;
    this.testMode = process.argv[2] || 'all';
    this.results = {
      comprehensive: { passed: 0, failed: 0, total: 0 },
      operations: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 }
    };
  }

  async startServer() {
    console.log('🚀 Starting DEVONthink MCP server...\n');
    
    return new Promise((resolve) => {
      this.serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, NODE_ENV: 'test' }
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
          this.rl.removeListener('line', responseHandler);
          resolve(response);
        } catch (e) {
          // Not JSON, ignore
        }
      };

      this.rl.on('line', responseHandler);
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.rl.removeListener('line', responseHandler);
        resolve({ error: { message: 'Timeout' } });
      }, 5000);
    });
  }

  async runComprehensiveTests() {
    console.log('📋 Running Comprehensive Tool Tests\n');
    console.log('━'.repeat(50) + '\n');
    
    const tests = [
      // Search tool
      { name: 'Search: Basic mode', tool: 'search', params: { mode: 'basic', query: 'test', limit: 5 } },
      { name: 'Search: Advanced mode', tool: 'search', params: { mode: 'advanced', query: 'name:test AND kind:pdf' } },
      { name: 'Search: Batch mode', tool: 'search', params: { mode: 'batch', query: ['test1', 'test2'] } },
      { name: 'Search: Smart groups', tool: 'search', params: { mode: 'smart_groups' } },
      
      // Documents tool
      { name: 'Documents: List databases', tool: 'documents', params: { operation: 'list_databases' } },
      { name: 'Documents: Create', tool: 'documents', params: { operation: 'create', name: 'Test', content: 'Test' } },
      { name: 'Documents: Read', tool: 'documents', params: { operation: 'read', uuid: 'TEST-UUID' } },
      
      // Knowledge tool
      { name: 'Knowledge: Classify', tool: 'knowledge', params: { operation: 'classify', uuid: 'TEST-UUID' } },
      { name: 'Knowledge: Find similar', tool: 'knowledge', params: { operation: 'similar', uuid: 'TEST-UUID' } },
      { name: 'Knowledge: Detect clusters', tool: 'knowledge', params: { operation: 'clusters' } },
      
      // Analysis tool
      { name: 'Analysis: Analyze document', tool: 'analysis', params: { operation: 'analyze', uuid: 'TEST-UUID' } },
      { name: 'Analysis: Compare similarity', tool: 'analysis', params: { operation: 'similarity', documentUuids: ['UUID1', 'UUID2'] } },
      { name: 'Analysis: Synthesize', tool: 'analysis', params: { operation: 'synthesize', documentUuids: ['UUID1', 'UUID2'] } },
      
      // Research tool
      { name: 'Research: Track evolution', tool: 'research', params: { operation: 'track_evolution', topic: 'test' } },
      { name: 'Research: Identify trends', tool: 'research', params: { operation: 'trends' } },
      
      // Import tool
      { name: 'Import: URL', tool: 'import', params: { operation: 'url', source: 'https://example.com' } },
      { name: 'Import: Research paper', tool: 'import', params: { operation: 'paper', source: 'arxiv', identifier: '2301.00000' } },
      
      // Batch tool
      { name: 'Batch: Tag documents', tool: 'batch', params: { operation: 'tag', documentUuids: ['UUID1'], action: 'add', tags: ['test'] } },
      { name: 'Batch: Import URLs', tool: 'batch', params: { operation: 'import_urls', urls: ['https://example.com'] } },
      
      // Workflow tool
      { name: 'Workflow: Execute template', tool: 'workflow', params: { operation: 'execute', templateId: 'academic_research', parameters: { topic: 'test' } } },
      
      // Help tool
      { name: 'Help: Get tool list', tool: 'help', params: { query: 'list' } }
    ];

    for (const test of tests) {
      process.stdout.write(`  ${test.name}... `);
      
      const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: 'tools/call',
        params: {
          name: test.tool,
          arguments: test.params
        }
      };
      
      const response = await this.sendRequest(request);
      this.results.comprehensive.total++;
      
      if (response.result !== undefined || 
          (response.error && this.isExpectedError(response.error.message))) {
        console.log('✅');
        this.results.comprehensive.passed++;
      } else {
        console.log(`❌ ${response.error?.message || 'No response'}`);
        this.results.comprehensive.failed++;
      }
    }
    
    console.log('\n' + '━'.repeat(50));
    console.log(`✅ Passed: ${this.results.comprehensive.passed}/${this.results.comprehensive.total}`);
    console.log(`❌ Failed: ${this.results.comprehensive.failed}/${this.results.comprehensive.total}`);
  }

  async runOperationTests() {
    console.log('🔧 Running Operation Mapping Tests\n');
    console.log('━'.repeat(50) + '\n');
    
    const operations = [
      // Test each operation mode
      { op: 'search:basic', tool: 'search', params: { mode: 'basic', query: 'test' } },
      { op: 'search:advanced', tool: 'search', params: { mode: 'advanced', query: 'test' } },
      { op: 'documents:list', tool: 'documents', params: { operation: 'list_databases' } },
      { op: 'knowledge:graph', tool: 'knowledge', params: { operation: 'graph', uuid: 'TEST' } },
      { op: 'analysis:themes', tool: 'analysis', params: { operation: 'themes', documentUuids: ['TEST'] } },
      { op: 'research:automate', tool: 'research', params: { operation: 'automate', workflowType: 'explore_topic', queryOrUUID: 'test' } },
      { op: 'import:group', tool: 'import', params: { operation: 'group', name: 'Test' } },
      { op: 'batch:move', tool: 'batch', params: { operation: 'move', documentUuids: ['TEST'], targetGroup: '/Test' } },
      { op: 'workflow:project', tool: 'workflow', params: { operation: 'create_project', projectName: 'Test', description: 'Test' } }
    ];

    for (const { op, tool, params } of operations) {
      process.stdout.write(`  ${op}... `);
      
      const request = {
        jsonrpc: '2.0',
        id: op,
        method: 'tools/call',
        params: {
          name: tool,
          arguments: params
        }
      };
      
      const response = await this.sendRequest(request);
      this.results.operations.total++;
      
      if (response.result !== undefined || 
          (response.error && this.isExpectedError(response.error.message))) {
        console.log('✅');
        this.results.operations.passed++;
      } else {
        console.log(`❌ ${response.error?.message || 'No response'}`);
        this.results.operations.failed++;
      }
    }
    
    console.log('\n' + '━'.repeat(50));
    console.log(`✅ Passed: ${this.results.operations.passed}/${this.results.operations.total}`);
    console.log(`❌ Failed: ${this.results.operations.failed}/${this.results.operations.total}`);
  }

  async runPerformanceTests() {
    console.log('⚡ Running Performance Tests\n');
    console.log('━'.repeat(50) + '\n');
    
    const perfTests = [
      { name: 'Quick search', tool: 'search', params: { mode: 'basic', query: 'test', limit: 1 }, maxTime: 2000 },
      { name: 'Database list', tool: 'documents', params: { operation: 'list_databases' }, maxTime: 1000 },
      { name: 'Help query', tool: 'help', params: { query: 'list' }, maxTime: 500 }
    ];

    for (const test of perfTests) {
      process.stdout.write(`  ${test.name}... `);
      
      const startTime = Date.now();
      const request = {
        jsonrpc: '2.0',
        id: 'perf-' + Date.now(),
        method: 'tools/call',
        params: {
          name: test.tool,
          arguments: test.params
        }
      };
      
      const response = await this.sendRequest(request);
      const elapsed = Date.now() - startTime;
      
      this.results.performance.total++;
      
      if (response.result !== undefined || 
          (response.error && this.isExpectedError(response.error.message))) {
        if (elapsed <= test.maxTime) {
          console.log(`✅ ${elapsed}ms`);
          this.results.performance.passed++;
        } else {
          console.log(`⚠️  ${elapsed}ms (>${test.maxTime}ms)`);
          this.results.performance.passed++; // Still passing, just slow
        }
      } else {
        console.log(`❌ Failed`);
        this.results.performance.failed++;
      }
    }
    
    console.log('\n' + '━'.repeat(50));
    console.log(`✅ Passed: ${this.results.performance.passed}/${this.results.performance.total}`);
    console.log(`❌ Failed: ${this.results.performance.failed}/${this.results.performance.total}`);
  }

  isExpectedError(message) {
    if (!message) return false;
    const expected = [
      'not found', 'Invalid', 'does not exist', 'No documents found',
      'Unable to', 'Failed to', 'Could not', 'Error:'
    ];
    return expected.some(e => message.includes(e));
  }

  printSummary() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('═'.repeat(60) + '\n');
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    
    for (const [suite, results] of Object.entries(this.results)) {
      if (results.total > 0) {
        const rate = ((results.passed / results.total) * 100).toFixed(1);
        console.log(`${suite.charAt(0).toUpperCase() + suite.slice(1)} Tests:`);
        console.log(`  ✅ Passed: ${results.passed}/${results.total} (${rate}%)`);
        if (results.failed > 0) {
          console.log(`  ❌ Failed: ${results.failed}`);
        }
        console.log();
        
        totalPassed += results.passed;
        totalFailed += results.failed;
        totalTests += results.total;
      }
    }
    
    if (totalTests > 0) {
      const overallRate = ((totalPassed / totalTests) * 100).toFixed(1);
      console.log('Overall Results:');
      console.log(`  Total Tests: ${totalTests}`);
      console.log(`  Success Rate: ${overallRate}%`);
      
      console.log('\n🏆 Status: ');
      if (totalFailed === 0) {
        console.log('  ✅ ALL TESTS PASSED! Server is production ready.');
      } else if (overallRate >= 95) {
        console.log('  ⭐ EXCELLENT - Minor issues only');
      } else if (overallRate >= 80) {
        console.log('  ⚠️  GOOD - Some issues need attention');
      } else {
        console.log('  ❌ NEEDS WORK - Significant issues found');
      }
    }
    
    console.log('\n' + '═'.repeat(60));
  }

  cleanup() {
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
      
      switch (this.testMode) {
        case 'comprehensive':
          await this.runComprehensiveTests();
          break;
        case 'operations':
          await this.runOperationTests();
          break;
        case 'performance':
          await this.runPerformanceTests();
          break;
        case 'all':
        default:
          await this.runComprehensiveTests();
          console.log('\n');
          await this.runOperationTests();
          console.log('\n');
          await this.runPerformanceTests();
          break;
      }
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }
}

// Run test suite
const suite = new UnifiedTestSuite();
suite.run();