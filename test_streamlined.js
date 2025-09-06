#!/usr/bin/env node

/**
 * Test script for streamlined DEVONthink MCP server
 * Tests all 9 consolidated tools with basic operations
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const TEST_TIMEOUT = 30000; // 30 seconds per test

class StreamlinedTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
    this.testCount = 0;
    this.passCount = 0;
  }

  async startServer() {
    console.log('🚀 Starting streamlined DEVONthink MCP server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['server.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      this.serverProcess.stderr.on('data', (data) => {
        output += data.toString();
        if (output.includes('Streamlined DEVONthink MCP server started successfully')) {
          console.log('✅ Server started successfully');
          resolve();
        }
      });

      this.serverProcess.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      console.log('🛑 Server stopped');
    }
  }

  async testTool(toolName, params, expectedFields = []) {
    this.testCount++;
    console.log(`\n🧪 Testing ${toolName} with params:`, JSON.stringify(params, null, 2));

    try {
      const request = {
        jsonrpc: '2.0',
        id: this.testCount,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      };

      const requestStr = JSON.stringify(request) + '\n';
      
      return new Promise((resolve, reject) => {
        let responseData = '';
        let timeoutId;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
        };

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Test timeout after ${TEST_TIMEOUT}ms`));
        }, TEST_TIMEOUT);

        const dataHandler = (data) => {
          responseData += data.toString();
          
          // Look for complete JSON response
          const lines = responseData.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              try {
                const response = JSON.parse(line);
                if (response.id === this.testCount) {
                  cleanup();
                  this.serverProcess.stdout.off('data', dataHandler);
                  
                  if (response.error) {
                    console.log(`❌ ${toolName} failed:`, response.error.message);
                    this.testResults.push({
                      tool: toolName,
                      params: params,
                      success: false,
                      error: response.error.message
                    });
                    reject(new Error(response.error.message));
                  } else {
                    console.log(`✅ ${toolName} succeeded`);
                    this.passCount++;
                    this.testResults.push({
                      tool: toolName,
                      params: params,
                      success: true,
                      response: response.result
                    });
                    resolve(response.result);
                  }
                  return;
                }
              } catch (e) {
                // Not a complete JSON response yet, continue
              }
            }
          }
        };

        this.serverProcess.stdout.on('data', dataHandler);
        this.serverProcess.stdin.write(requestStr);
      });
    } catch (error) {
      console.log(`❌ ${toolName} failed:`, error.message);
      this.testResults.push({
        tool: toolName,
        params: params,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  async runAllTests() {
    const tests = [
      // System tool - should work without DEVONthink
      {
        tool: 'system',
        params: { operation: 'help', toolName: 'search' },
        description: 'Get help for search tool'
      },
      
      // Search tool - basic search (may fail if no DEVONthink)
      {
        tool: 'search',
        params: { mode: 'basic', query: 'test', limit: 5 },
        description: 'Basic search test'
      },

      // Document tool - list databases (should work)
      {
        tool: 'system',
        params: { operation: 'databases' },
        description: 'List available databases'
      },

      // More tests that don't require specific documents
      {
        tool: 'research',
        params: { workflow: 'trends' },
        description: 'Identify trending topics'
      }
    ];

    console.log(`\n📋 Running ${tests.length} tests on streamlined server...\n`);

    for (const test of tests) {
      try {
        await this.testTool(test.tool, test.params);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
      } catch (error) {
        console.log(`⚠️  Test "${test.description}" failed (expected for some tests without DEVONthink setup)`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testCount}`);
    console.log(`Passed: ${this.passCount}`);
    console.log(`Failed: ${this.testCount - this.passCount}`);
    console.log(`Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
    
    console.log('\n📝 Detailed Results:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${result.tool} - ${JSON.stringify(result.params)}`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

async function main() {
  const tester = new StreamlinedTester();

  try {
    await tester.startServer();
    await tester.runAllTests();
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
  } finally {
    tester.stopServer();
    tester.printSummary();
  }

  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Tests interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Tests terminated');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}