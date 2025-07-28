# DEVONthink MCP Server Test Suite

This directory contains the automated test suite for the DEVONthink MCP Server, focusing on validating parameter handling, error messages, and the fixes implemented from the comprehensive testing report.

## Test Files

### Core Test Suites

1. **`test-parameter-validation.js`** - CI-friendly static code analysis tests
   - Validates parameter handling without requiring DEVONthink
   - Checks error message accuracy
   - Verifies empty array handling
   - Confirms default parameter values

2. **`automated-test-suite.js`** - Full integration tests
   - Requires DEVONthink to be installed
   - Tests actual tool execution
   - Validates runtime behavior
   - Checks error responses

3. **`run-all-tests.js`** - Master test runner
   - Runs all available test suites
   - Generates comprehensive reports
   - CI/local environment detection
   - JSON and Markdown report generation

### Python Test Suites

4. **`test_comprehensive.py`** - Original comprehensive test suite
   - Tests all 30+ MCP tools
   - Requires DEVONthink installation
   - Extensive parameter validation

5. **`test_mcp_tool.js`** - Helper utility
   - Used by other test suites to execute individual tools
   - Handles MCP protocol communication

## Running Tests

### Quick Commands

```bash
# Run CI-friendly validation tests (no DEVONthink required)
npm run test:ci

# Run parameter validation tests only
npm run test:validation

# Run full automated test suite (requires DEVONthink)
npm run test:automated

# Run all available tests
npm run test:all

# Run comprehensive Python tests
npm run test:comprehensive
```

### CI/CD Integration

The test suite is integrated with GitHub Actions:
- **CI Mode**: Automatically detected via `CI=true` environment variable
- **No DEVONthink Required**: CI tests use static analysis
- **Multi-Node Testing**: Tests run on Node.js 18.x and 20.x

### Local Development

For local testing with DEVONthink installed:
```bash
# Run everything
npm run test:all

# Run specific test suite
node tests/automated-test-suite.js

# Test individual tool
npm run test:tool build_knowledge_graph '{"uuid": "TEST-UUID", "maxDepth": 3}'
```

## Test Coverage

### Parameter Validation Fixes
- ✅ `build_knowledge_graph` - maxDepth parameter name in errors
- ✅ `update_tags` - Empty array handling
- ✅ `batch_search` - Empty queries array handling
- ✅ `batch_read_documents` - Empty UUIDs array handling
- ✅ `ocr_document` - Document type pre-validation

### Default Parameters
- ✅ All optional parameters have `.default()` values
- ✅ Descriptions include default values
- ✅ Zod schema validation

### Error Handling
- ✅ Consistent error response format
- ✅ Descriptive error messages
- ✅ Proper parameter names in errors

## Test Reports

After running tests, reports are generated:
- `test-report.json` - Detailed JSON report with all test results
- `test-report.md` - Markdown report suitable for GitHub
- `test-results.json` - Individual test suite results

## Adding New Tests

To add new tests:

1. **For static validation** - Add to `test-parameter-validation.js`:
```javascript
tester.test('Your test name', () => {
  // Read source files and validate code structure
  const content = readFileSync(path, 'utf8');
  if (!content.includes('expected pattern')) {
    throw new Error('Validation failed');
  }
});
```

2. **For integration tests** - Add to `automated-test-suite.js`:
```javascript
runner.test('Your test name', 'Category', async (runTool, assert) => {
  const result = await runTool('tool_name', { param: 'value' });
  assert.equal(result.something, 'expected');
});
```

## Troubleshooting

### Common Issues

1. **"DEVONthink not running"** - Start DEVONthink before running integration tests
2. **"Tool timed out"** - Increase timeout in test configuration
3. **"Invalid JSON response"** - Check that MCP server is starting correctly

### Debug Mode

Run tests with debug output:
```bash
LOG_LEVEL=DEBUG npm run test:all
```

## CI/CD Considerations

- Tests automatically adapt to CI environment
- Static validation always runs
- Integration tests are skipped if DEVONthink is not available
- Exit codes: 0 for success, 1 for any failures