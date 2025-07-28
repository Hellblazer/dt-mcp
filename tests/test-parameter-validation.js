#!/usr/bin/env node

/**
 * CI-Friendly Parameter Validation Tests
 * 
 * These tests validate the parameter handling logic without requiring DEVONthink
 * to be installed. They focus on testing the server-side validation logic.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

class ParameterValidationTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`${colors.blue}Running Parameter Validation Tests${colors.reset}\n`);
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`${colors.green}✓${colors.reset} ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`${colors.red}✗${colors.reset} ${test.name}`);
        console.log(`  ${error.message}`);
      }
    }
    
    console.log(`\n${colors.blue}Summary:${colors.reset}`);
    console.log(`  Passed: ${colors.green}${this.passed}${colors.reset}`);
    console.log(`  Failed: ${colors.red}${this.failed}${colors.reset}`);
    
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

const tester = new ParameterValidationTester();

// Test 1: Check that buildKnowledgeGraph uses custom validation
tester.test('buildKnowledgeGraph has custom maxDepth validation', () => {
  const devonthinkPath = path.join(__dirname, '..', 'src', 'services', 'devonthink.js');
  const content = readFileSync(devonthinkPath, 'utf8');
  
  // Check for custom validation code
  if (!content.includes('errorHandlers.invalidParameter(\'maxDepth\'')) {
    throw new Error('buildKnowledgeGraph should have custom maxDepth validation');
  }
  
  if (!content.includes('positive integer between 1 and 10')) {
    throw new Error('maxDepth error message should specify range 1-10');
  }
});

// Test 2: Check empty array handling for updateTags
tester.test('updateTags accepts arrays without validateNonEmptyArray', () => {
  const devonthinkPath = path.join(__dirname, '..', 'src', 'services', 'devonthink.js');
  const content = readFileSync(devonthinkPath, 'utf8');
  
  // Find updateTags method
  const updateTagsMatch = content.match(/async updateTags\([^{]+\{[\s\S]+?\n  \}/);
  if (!updateTagsMatch) {
    throw new Error('Could not find updateTags method');
  }
  
  const updateTagsCode = updateTagsMatch[0];
  
  // Should NOT use validateNonEmptyArray
  if (updateTagsCode.includes('validateNonEmptyArray')) {
    throw new Error('updateTags should not use validateNonEmptyArray');
  }
  
  // Should validate it's an array
  if (!updateTagsCode.includes('Array.isArray(tags)')) {
    throw new Error('updateTags should validate tags is an array');
  }
});

// Test 3: Check batch_search handles empty arrays gracefully
tester.test('batchSearch returns success for empty queries', () => {
  const devonthinkPath = path.join(__dirname, '..', 'src', 'services', 'devonthink.js');
  const content = readFileSync(devonthinkPath, 'utf8');
  
  // Find batchSearch method
  const batchSearchMatch = content.match(/async batchSearch\([^{]+\{[\s\S]+?\n    return createSuccessResponse/);
  if (!batchSearchMatch) {
    throw new Error('Could not find batchSearch method');
  }
  
  const batchSearchCode = batchSearchMatch[0];
  
  // Should handle empty array case
  if (!batchSearchCode.includes('queries.length === 0')) {
    throw new Error('batchSearch should check for empty queries array');
  }
  
  // Should return success response for empty array
  if (!batchSearchCode.includes('No queries provided')) {
    throw new Error('batchSearch should indicate when no queries are provided');
  }
});

// Test 4: Check OCR document type validation
tester.test('ocrDocument has document type pre-validation', () => {
  const devonthinkPath = path.join(__dirname, '..', 'src', 'services', 'devonthink.js');
  const content = readFileSync(devonthinkPath, 'utf8');
  
  // Find ocrDocument method
  const ocrMatch = content.match(/async ocrDocument\([^{]+\{[\s\S]+?return await this\.runAppleScript\('ocr_document'/);
  if (!ocrMatch) {
    throw new Error('Could not find ocrDocument method');
  }
  
  const ocrCode = ocrMatch[0];
  
  // Should check document type
  if (!ocrCode.includes('supportedTypes')) {
    throw new Error('ocrDocument should define supported document types');
  }
  
  // Should read document metadata first
  if (!ocrCode.includes('readDocument')) {
    throw new Error('ocrDocument should read document metadata for type validation');
  }
  
  // Should have proper error handling
  if (!ocrCode.includes('OCR-supported document type')) {
    throw new Error('ocrDocument should have descriptive error for unsupported types');
  }
});

// Test 5: Check default parameter values in server.js
tester.test('Optional parameters have default values defined', () => {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = readFileSync(serverPath, 'utf8');
  
  // Check specific parameters that should have defaults
  const checksums = [
    { param: 'includeContent', default: 'true', desc: 'Include document content (default: true)' },
    { param: 'maxDepth', default: '3', desc: 'Maximum traversal depth (default: 3)' },
    { param: 'synthesisType', default: 'summary', desc: 'Type of synthesis (default: summary)' },
    { param: 'timeRange', default: 'month', desc: 'Time range to analyze (default: month)' }
  ];
  
  for (const check of checksums) {
    // Check for .default() call
    const defaultRegex = new RegExp(`${check.param}:.*\\.default\\(['"]?${check.default}['"]?\\)`);
    if (!defaultRegex.test(content)) {
      throw new Error(`${check.param} should have .default(${check.default})`);
    }
    
    // Check description includes default
    if (!content.includes(check.desc)) {
      throw new Error(`${check.param} description should mention default value`);
    }
  }
});

// Test 6: Error message consistency
tester.test('Error handlers use consistent format', () => {
  const errorsPath = path.join(__dirname, '..', 'src', 'utils', 'errors.js');
  const content = readFileSync(errorsPath, 'utf8');
  
  // Check that validateNonEmptyArray has documentation
  if (!content.includes('Use this validator only for operations that require at least one element')) {
    throw new Error('validateNonEmptyArray should have usage documentation');
  }
  
  // Check error response structure
  if (!content.includes('ErrorTypes')) {
    throw new Error('ErrorTypes should be defined');
  }
  
  if (!content.includes('createSuccessResponse')) {
    throw new Error('createSuccessResponse helper should be defined');
  }
});

// Run all tests
tester.run().catch(error => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error);
  process.exit(1);
});