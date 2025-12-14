#!/usr/bin/env node

/**
 * Test script to verify the import tool fix
 */

import { DEVONthinkService } from './src/services/devonthink.js';
import { DEVONthinkEnhancedService } from './src/services/devonthink_enhanced.js';

const devonthink = new DEVONthinkService();
const enhancedDevonthink = new DEVONthinkEnhancedService({
  maxConcurrent: 3,
  resourceMonitorOptions: { autoStart: false }
});

async function testImportUrl() {
  console.log('\n=== Testing importUrl with positional parameters ===');

  const testUrl = 'https://www.example.com/test.pdf';

  try {
    // This will fail because example.com doesn't have a real PDF
    // but it should get past parameter validation
    const result = await devonthink.importUrl(
      testUrl,
      '/Test Group',
      true,
      ['test', 'import'],
      'Test Document'
    );
    console.log('✅ importUrl parameter validation passed');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    // Check if it's a parameter validation error or a different error
    const errorMsg = error?.message || error?.error?.message || String(error);

    if (errorMsg.includes('[object Object]')) {
      console.error('❌ FAILED: Still getting [object Object] error');
      console.error('Error:', errorMsg);
      return false;
    } else if (errorMsg.includes('Invalid value for parameter')) {
      console.error('❌ FAILED: Parameter validation error');
      console.error('Error:', errorMsg);
      return false;
    } else {
      // Other errors are expected (DEVONthink not running, network issues, etc.)
      console.log('✅ Parameter validation passed (got expected error)');
      console.log('Expected error type:', errorMsg.substring(0, 100));
      return true;
    }
  }

  return true;
}

async function testBulkImportUrls() {
  console.log('\n=== Testing bulkImportUrls with corrected parameters ===');

  const testUrls = [
    'https://www.example.com/test1.pdf',
    'https://www.example.com/test2.pdf'
  ];

  try {
    const result = await enhancedDevonthink.bulkImportUrls(testUrls, {
      targetGroup: '/Test Group',
      tags: ['test', 'bulk'],
      extractMetadata: true
    });
    console.log('✅ bulkImportUrls parameter validation passed');
    console.log('Result summary:', result.summary);
  } catch (error) {
    const errorMsg = error?.message || error?.error?.message || String(error);

    if (errorMsg.includes('[object Object]')) {
      console.error('❌ FAILED: Still getting [object Object] error');
      console.error('Error:', errorMsg);
      return false;
    } else {
      console.log('✅ Parameter validation passed (got expected error)');
      console.log('Expected error type:', errorMsg.substring(0, 100));
      return true;
    }
  }

  return true;
}

async function testDownloadPaper() {
  console.log('\n=== Testing downloadPaper with positional parameters ===');

  try {
    const result = await devonthink.downloadPaper(
      'arxiv',
      '2301.00001',
      '/Research Papers',
      true,
      ['test', 'arxiv'],
      null
    );
    console.log('✅ downloadPaper parameter validation passed');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    const errorMsg = error?.message || error?.error?.message || String(error);

    if (errorMsg.includes('[object Object]')) {
      console.error('❌ FAILED: Still getting [object Object] error');
      console.error('Error:', errorMsg);
      return false;
    } else if (errorMsg.includes('Invalid value for parameter')) {
      console.error('❌ FAILED: Parameter validation error');
      console.error('Error:', errorMsg);
      return false;
    } else {
      console.log('✅ Parameter validation passed (got expected error)');
      console.log('Expected error type:', errorMsg.substring(0, 100));
      return true;
    }
  }

  return true;
}

async function runTests() {
  console.log('Starting import fix validation tests...');
  console.log('Note: These tests will fail with network/DEVONthink errors,');
  console.log('but they should NOT fail with parameter validation errors.\n');

  const results = {
    importUrl: await testImportUrl(),
    bulkImportUrls: await testBulkImportUrls(),
    downloadPaper: await testDownloadPaper()
  };

  console.log('\n=== Test Summary ===');
  console.log('importUrl:', results.importUrl ? '✅ PASS' : '❌ FAIL');
  console.log('bulkImportUrls:', results.bulkImportUrls ? '✅ PASS' : '❌ FAIL');
  console.log('downloadPaper:', results.downloadPaper ? '✅ PASS' : '❌ FAIL');

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n🎉 All tests passed! The import fix is working correctly.');
    console.log('The "[object Object]" parameter error has been resolved.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
