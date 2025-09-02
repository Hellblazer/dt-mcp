# Client-Aware Limit System

The DEVONthink MCP server now includes a comprehensive client-aware limit system that automatically adjusts response sizes and limits based on the capabilities of different MCP clients.

## Problem Solved

Previously, large search results (50+ documents) could cause hangs in Claude Desktop due to client-side JSON parsing and UI rendering limitations. The server would return 50KB+ responses that overwhelmed the client.

## Solution Overview

The system automatically detects the client type and applies appropriate limits to prevent performance issues while maintaining functionality.

## Client Profiles

### Claude Desktop
- **Max Results**: 10 (conservative for UI performance)
- **Max Response Size**: 25KB (prevents UI hangs)
- **Timeout**: 20 seconds
- **Concurrency**: 2 operations
- **Features**: truncation, pagination

### Claude Code CLI
- **Max Results**: 100 (CLI can handle more data)
- **Max Response Size**: 500KB (CLI has better performance)
- **Timeout**: 60 seconds
- **Concurrency**: 8 operations
- **Features**: truncation, pagination, streaming, batch

### Default (Unknown Client)
- **Max Results**: 25 (balanced approach)
- **Max Response Size**: 75KB
- **Timeout**: 30 seconds
- **Concurrency**: 3 operations
- **Features**: truncation, pagination

## Tool-Specific Overrides

Some tools have additional restrictions for performance-critical operations:

### search_devonthink
- **Claude Desktop**: 10 results max, 25KB response limit
- **Default**: 20 results max, 50KB response limit

### batch_search
- **Claude Desktop**: 5 results max, 15KB response limit
- **Default**: 10 results max, 30KB response limit

### synthesize_documents
- **Claude Desktop**: 8 documents max, 20KB response limit
- **Default**: 15 documents max, 40KB response limit

### build_knowledge_graph
- **Claude Desktop**: 6 nodes max, 18KB response limit
- **Default**: 12 nodes max, 35KB response limit

## How It Works

### 1. Client Detection

The system detects clients using multiple methods:

```javascript
// Environment variables
MCP_CLIENT="claude-desktop" or "claude-code"

// User agent strings
"Claude Desktop" or "Claude Code"

// TTY detection for CLI environments
process.stdout.isTTY && !process.env.DISPLAY
```

### 2. Automatic Limit Application

When a tool is called:

1. **Parameter Adjustment**: Original `limit` parameter is reduced if it exceeds client maximums
2. **Response Monitoring**: Response size is checked before sending
3. **Intelligent Truncation**: Large responses are truncated while preserving structure
4. **Client Information**: Response includes metadata about applied limits

### 3. Response Format

All responses now include client information:

```json
{
  "results": [...],  // Actual data
  "truncated": false,
  "_clientInfo": {
    "clientType": "claude-desktop",
    "clientName": "Claude Desktop",
    "appliedLimits": {
      "maxResults": 10,
      "maxResponseSize": 25000,
      "responseSize": 15234
    },
    "truncated": false,
    "metadata": {
      "responseSize": 15234
    }
  }
}
```

## Usage Examples

### Original Query (Would Cause Hang)
```json
{
  "query": "adaptive resonance theory OR ART OR Grossberg",
  "limit": 50
}
```

### With Client Limits (Claude Desktop)
```json
// Automatically adjusted to:
{
  "query": "adaptive resonance theory OR ART OR Grossberg", 
  "limit": 10  // Reduced from 50
}

// Response includes:
{
  "results": [...],  // Only 10 results
  "_clientInfo": {
    "clientType": "claude-desktop",
    "appliedLimits": {
      "maxResults": 10,
      "originalLimit": 50,
      "adjustedLimit": 10
    }
  }
}
```

## Benefits

### For Users
- **No More Hangs**: Claude Desktop users won't experience hangs on large responses
- **Optimal Performance**: Each client gets limits tuned for its capabilities
- **Transparency**: Clear information about applied limits
- **Consistent Experience**: Predictable behavior across different clients

### For Developers
- **Automatic**: No manual limit setting required
- **Extensible**: Easy to add new client profiles
- **Configurable**: Tool-specific overrides for special cases
- **Debuggable**: Comprehensive logging of limit application

## Best Practices

### For Users
1. **Start Small**: Use smaller limits (5-10) for exploratory queries
2. **Iterate**: Use multiple smaller queries instead of one large query
3. **Be Specific**: More specific search terms = fewer results = better performance
4. **Use Pagination**: Use `offset` parameter for large datasets

### For Tool Authors
1. **Check Limits**: Always check what limits were applied
2. **Design for Truncation**: Ensure tools work with truncated responses
3. **Provide Alternatives**: Offer pagination or streaming for large datasets
4. **Monitor Performance**: Watch response sizes and adjust defaults

## Configuration

### Environment Variables
```bash
# Set client type explicitly
export MCP_CLIENT="claude-code"

# Enable debug logging to see limit application
export LOG_LEVEL=DEBUG
```

### Custom Client Detection

The system can be extended with new client profiles by modifying `src/utils/client-limits.js`:

```javascript
const CLIENT_PROFILES = {
  'new-client': {
    name: 'New MCP Client',
    maxResults: 50,
    maxResponseSize: 100000,
    // ... other settings
  }
};
```

## Troubleshooting

### Responses Seem Truncated
- Check the `_clientInfo.truncated` field
- Increase specificity of search terms
- Use pagination with `offset` parameter
- Switch to a more capable client (e.g., Claude Code)

### Still Getting Hangs
- Verify client detection with `LOG_LEVEL=DEBUG`
- Check for extremely large individual documents
- Consider reducing query scope further

### Tool Returning Fewer Results Than Expected
- Check `_clientInfo.appliedLimits` for automatic adjustments
- Original limit shown in `originalLimit` field
- Adjusted limit shown in `adjustedLimit` field

## Performance Impact

### Before Client Limits
- Search query: `"adaptive resonance theory OR ART OR Grossberg"` with `limit: 50`
- Response size: ~50KB (77+ documents)
- Claude Desktop: **HANGS** (no response)
- Time to hang: 30+ seconds

### After Client Limits
- Same query automatically adjusted to `limit: 10`
- Response size: ~15KB (10 documents + metadata)
- Claude Desktop: **Works perfectly**
- Response time: 2-3 seconds

## Implementation Details

### Files Added
- `src/utils/client-limits.js` - Core limit management system
- `CLIENT-LIMITS.md` - This documentation file

### Files Modified
- `server.js` - Added client-aware response formatting
- Tool implementations updated to use limit system

### Key Functions
- `detectClient()` - Identifies client type
- `applyClientLimits()` - Adjusts parameters
- `truncateResponse()` - Intelligent response truncation
- `formatClientAwareResponse()` - Adds client metadata

## Future Enhancements

1. **Dynamic Limits**: Adjust limits based on actual client performance
2. **User Preferences**: Allow users to override default limits
3. **Streaming Responses**: For very large datasets
4. **Progressive Loading**: Load additional data on demand
5. **Client Capability Negotiation**: Let clients advertise their capabilities

---

This client-aware system ensures optimal performance across all MCP clients while maintaining full functionality and providing transparency about applied limitations.