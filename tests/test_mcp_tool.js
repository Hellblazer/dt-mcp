#!/usr/bin/env node

/**
 * Individual MCP tool testing utility
 * Usage: node test_mcp_tool.js <tool_name> [parameters_json]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testTool(toolName, parameters = null) {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    
    // Start the MCP server
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'ERROR' } // Minimal logging for testing
    });
    
    let responseData = '';
    let errorData = '';
    let testComplete = false;
    
    const timeout = setTimeout(() => {
      if (!testComplete) {
        serverProcess.kill('SIGKILL');
        reject(new Error('Test timeout'));
      }
    }, 15000);
    
    serverProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      
      // Look for server ready message
      if (data.toString().includes('DEVONthink MCP server started')) {
        // Server is ready, send tool request
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: parameters || {}
          }
        };
        
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
      }
    });
    
    serverProcess.stdout.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            
            if (response.id === 1) {
              testComplete = true;
              clearTimeout(timeout);
              serverProcess.kill('SIGTERM');
              
              if (response.error) {
                resolve({
                  success: false,
                  error: response.error.message || 'Tool error',
                  data: response.error
                });
              } else {
                resolve({
                  success: true,
                  data: response.result,
                  output: responseData
                });
              }
              return;
            }
          } catch (parseError) {
            // Ignore non-JSON lines (server startup messages)
          }
        }
      } catch (error) {
        // Continue processing
      }
    });
    
    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Server error: ${error.message}`));
    });
    
    serverProcess.on('exit', (code) => {
      clearTimeout(timeout);
      if (!testComplete) {
        reject(new Error(`Server exited with code ${code}\nError: ${errorData}`));
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log(colors.red, 'Usage: node test_mcp_tool.js <tool_name> [parameters_json]');
    process.exit(1);
  }
  
  const toolName = args[0];
  let parameters = null;
  
  if (args.length > 1) {
    try {
      parameters = JSON.parse(args[1]);
    } catch (error) {
      log(colors.red, `Invalid JSON parameters: ${error.message}`);
      process.exit(1);
    }
  }
  
  log(colors.blue, `Testing tool: ${toolName}`);
  if (parameters) {
    log(colors.blue, `Parameters: ${JSON.stringify(parameters, null, 2)}`);
  }
  
  try {
    const result = await testTool(toolName, parameters);
    
    if (result.success) {
      log(colors.green, `✅ ${toolName} - SUCCESS`);
      if (result.data) {
        console.log(JSON.stringify(result.data, null, 2));
      }
      process.exit(0);
    } else {
      log(colors.red, `❌ ${toolName} - FAILED`);
      log(colors.red, `Error: ${result.error}`);
      if (result.data) {
        console.log(JSON.stringify(result.data, null, 2));
      }
      process.exit(1);
    }
    
  } catch (error) {
    log(colors.red, `❌ ${toolName} - ERROR`);
    log(colors.red, `Error: ${error.message}`);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\nTest interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nTest terminated');
  process.exit(1);
});

main().catch(error => {
  log(colors.red, `Fatal error: ${error.message}`);
  process.exit(1);
});