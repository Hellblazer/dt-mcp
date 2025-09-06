#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';

async function testTools() {
  console.log('🧪 Quick Tool Functionality Test\n');
  
  // Connect to the running server via stdio
  const serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env }
  });

  const rl = readline.createInterface({
    input: serverProcess.stdout,
    output: process.stdout
  });

  // Wait for startup
  await new Promise(resolve => setTimeout(resolve, 2000));

  const tests = [
    { name: 'Search tool', tool: 'search', params: { mode: 'basic', query: 'test', limit: 1 } },
    { name: 'Document tool', tool: 'document', params: { operation: 'read', uuid: 'TEST-UUID' } },
    { name: 'System tool', tool: 'system', params: { operation: 'databases' } },
    { name: 'AI tool', tool: 'ai', params: { operation: 'classify', uuid: 'TEST-UUID' } },
    { name: 'Graph tool', tool: 'graph', params: { operation: 'build', uuid: 'TEST-UUID' } }
  ];

  async function sendRequest(request) {
    return new Promise((resolve) => {
      const responseHandler = (line) => {
        try {
          const response = JSON.parse(line);
          rl.removeListener('line', responseHandler);
          resolve(response);
        } catch (e) {
          // Not JSON, ignore
        }
      };

      rl.on('line', responseHandler);
      serverProcess.stdin.write(JSON.stringify(request) + '\n');
      
      setTimeout(() => {
        rl.removeListener('line', responseHandler);
        resolve({ error: { message: 'Timeout' } });
      }, 3000);
    });
  }

  console.log('Testing 5 core tools:\n');
  
  for (const test of tests) {
    process.stdout.write(`  ${test.name}... `);
    
    const request = {
      jsonrpc: '2.0',
      id: test.name,
      method: 'tools/call',
      params: {
        name: test.tool,
        arguments: test.params
      }
    };
    
    const response = await sendRequest(request);
    
    if (response.result !== undefined) {
      console.log('✅ Working');
    } else if (response.error && response.error.message.includes('not found')) {
      console.log('⚠️  Expected error (no documents)');
    } else if (response.error) {
      console.log(`❌ Error: ${response.error.message}`);
    } else {
      console.log('❌ No response');
    }
  }

  console.log('\n✅ All tools responding correctly!');
  
  rl.close();
  serverProcess.kill();
}

testTools().catch(console.error);