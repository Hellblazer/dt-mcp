# DEVONthink MCP Import Tool - Usage Guide

**Status**: ✅ **WORKING** (Bug Fixed October 10, 2025)

---

## Quick Reference

The import tool now works correctly with all parameter combinations. Use the `source` parameter (not `url`) to specify what to import.

## Tool Schema

```javascript
{
  type: 'url' | 'paper' | 'batch',     // Required
  source: string | string[],            // Required - URL(s) or identifier(s)
  paperSource: 'arxiv' | 'doi' | 'pubmed',  // For papers only
  targetGroup: string,                  // Optional - DEVONthink group path
  tags: string[],                       // Optional - tags to apply
  extractMetadata: boolean,             // Optional - default: true
  maxConcurrent: number                 // Optional - default: 3
}
```

## Usage Examples

### 1. Import Single URL

```javascript
await mcp__devonthink__import({
  type: "url",
  source: "https://example.com/document.pdf",
  targetGroup: "/Research Papers",
  tags: ["research", "example"],
  extractMetadata: true
})
```

**Result**:
- Downloads the URL
- Imports into `/Research Papers` folder
- Applies tags: `research`, `example`
- Extracts document metadata

---

### 2. Import Multiple URLs (Batch)

```javascript
await mcp__devonthink__import({
  type: "url",
  source: [
    "https://example.com/paper1.pdf",
    "https://example.com/paper2.pdf",
    "https://example.com/paper3.pdf"
  ],
  targetGroup: "/Research/Batch Import",
  tags: ["batch", "research"],
  extractMetadata: true,
  maxConcurrent: 3
})
```

**Result**:
- Imports 3 URLs concurrently (max 3 at a time)
- All documents go to same target group
- Same tags applied to all documents

---

### 3. Download ArXiv Paper

```javascript
await mcp__devonthink__import({
  type: "paper",
  source: "2301.00001",
  paperSource: "arxiv",
  targetGroup: "/Papers/ArXiv",
  tags: ["arxiv", "machine-learning"],
  extractMetadata: true
})
```

**Result**:
- Fetches metadata from arXiv API
- Downloads PDF from arXiv
- Imports with full academic metadata
- Applies combined tags (your tags + keywords from paper)

---

### 4. Download Multiple Papers

```javascript
await mcp__devonthink__import({
  type: "paper",
  source: [
    "2301.00001",
    "2301.00002",
    "2301.00003"
  ],
  paperSource: "arxiv",
  targetGroup: "/Papers/Recent ArXiv",
  tags: ["arxiv", "2025"],
  extractMetadata: true,
  maxConcurrent: 2
})
```

**Result**:
- Downloads 3 arXiv papers
- Processes 2 at a time (rate limiting for academic APIs)
- Enriches with full metadata

---

### 5. Download DOI Paper

```javascript
await mcp__devonthink__import({
  type: "paper",
  source: "10.1038/nature12345",
  paperSource: "doi",
  targetGroup: "/Papers/Nature",
  tags: ["nature", "peer-reviewed"],
  extractMetadata: true
})
```

---

### 6. Download PubMed Paper

```javascript
await mcp__devonthink__import({
  type: "paper",
  source: "12345678",
  paperSource: "pubmed",
  targetGroup: "/Papers/Medical",
  tags: ["pubmed", "medical"],
  extractMetadata: true
})
```

---

### 7. Batch Import Mixed Sources

```javascript
await mcp__devonthink__import({
  type: "batch",
  source: [
    "https://example.com/doc1.pdf",
    "https://example.com/doc2.pdf",
    "/path/to/local/file.pdf"
  ],
  targetGroup: "/Mixed Import",
  extractMetadata: true
})
```

**Note**: The tool auto-detects URL vs file path based on the `http` prefix.

---

## Response Format

All successful imports return:

```json
{
  "status": "success",
  "data": {
    "uuid": "ABC-123-DEF-456",
    "name": "Document Name",
    "path": "/Research Papers/Document Name.pdf",
    "metadata": {
      "academic": {
        "title": "...",
        "authors": [...],
        "abstract": "...",
        "pdf_url": "...",
        "keywords": [...]
      }
    },
    "importedFrom": "https://example.com/document.pdf",
    "timestamp": "2025-10-10T00:17:05.782Z"
  }
}
```

For bulk operations:

```json
{
  "success": true,
  "results": {
    "successful": [
      { "url": "...", "document": {...}, "metadata": {...} }
    ],
    "failed": [
      { "url": "...", "error": "..." }
    ],
    "summary": {
      "total": 3,
      "completed": 2,
      "errors": 1
    }
  }
}
```

---

## Common Use Cases

### Research Paper Collection

```javascript
// Collect papers for a research project
await mcp__devonthink__import({
  type: "paper",
  source: ["2301.00001", "2301.00002", "2301.00003"],
  paperSource: "arxiv",
  targetGroup: "/Research/Quantum Computing",
  tags: ["quantum", "research", "2025"],
  extractMetadata: true
})
```

### Web Archive

```javascript
// Archive web pages
await mcp__devonthink__import({
  type: "url",
  source: [
    "https://blog.example.com/post1",
    "https://blog.example.com/post2"
  ],
  targetGroup: "/Archive/Blog Posts",
  tags: ["blog", "archive", "2025"]
})
```

### Literature Review

```javascript
// Import papers from mixed sources
await Promise.all([
  mcp__devonthink__import({
    type: "paper",
    source: ["id1", "id2"],
    paperSource: "arxiv",
    targetGroup: "/Literature Review",
    tags: ["review", "arxiv"]
  }),
  mcp__devonthink__import({
    type: "paper",
    source: ["id3", "id4"],
    paperSource: "doi",
    targetGroup: "/Literature Review",
    tags: ["review", "doi"]
  })
])
```

---

## Error Handling

### Parameter Validation Errors
```javascript
// Missing required parameter
{
  "error": "Invalid parameter: type is required"
}

// Invalid paper source
{
  "error": "Invalid source type: invalid. Valid sources: arxiv, doi, pubmed"
}
```

### Import Errors
```javascript
{
  "error": "Import URL failed: Network timeout",
  "details": {
    "tool": "import",
    "timestamp": "2025-10-10T00:17:05.782Z",
    "type": "url",
    "source": "https://example.com/doc.pdf"
  }
}
```

---

## Tips & Best Practices

1. **Use `extractMetadata: true` for academic papers** - Gets full bibliographic data
2. **Set `maxConcurrent: 2` for academic APIs** - Respects rate limits
3. **Use descriptive tags** - Makes finding documents easier later
4. **Organize with `targetGroup`** - Keep documents organized from the start
5. **Batch similar imports** - More efficient than individual calls

---

## Troubleshooting

### Import Fails with Network Error
- Check internet connection
- Verify URL is accessible
- Try reducing `maxConcurrent` to avoid overwhelming servers

### Paper Download Fails
- Verify identifier format is correct
- Check paper exists and is publicly accessible
- ArXiv IDs: format is `YYMM.NNNNN` (e.g., `2301.00001`)
- DOI: starts with `10.` (e.g., `10.1038/nature12345`)
- PubMed: numeric ID (e.g., `12345678`)

### Metadata Not Extracted
- Set `extractMetadata: true` explicitly
- Check document type supports metadata extraction
- Some PDFs may not have embedded metadata

---

## What's Different from Before?

### ❌ Old (Broken)
```javascript
// This used to fail with "[object Object]" error
await mcp__devonthink__import({
  type: "url",
  url: "https://example.com/doc.pdf",  // Wrong parameter name!
  ...
})
```

### ✅ New (Fixed)
```javascript
// Now works correctly
await mcp__devonthink__import({
  type: "url",
  source: "https://example.com/doc.pdf",  // Correct parameter name
  ...
})
```

**Key Change**: Always use `source` parameter, never `url`.

---

## ⚠️ Local Files & file:// URLs

The import tool **blocks `file://` URLs for security reasons**. For importing local files, see:

📖 **[FILE_IMPORT_GUIDE.md](FILE_IMPORT_GUIDE.md)** - Complete guide with 4 workaround methods

**Quick workaround** for PDFs:
```bash
# Copy to DEVONthink inbox (auto-imports)
cp /path/to/file.pdf "$HOME/Library/Application Support/DEVONthink/Inbox.dtBase2/Files.noindex/pdf/"
```

---

## See Also

- `FILE_IMPORT_GUIDE.md` - ⭐ Local file import methods & security workarounds
- `IMPORT_BUG_FIX_SUMMARY.md` - Details of the bug fix
- `test_import_fix.js` - Test examples
- `CLAUDE.md` - Full MCP server documentation

---

**Last Updated**: October 10, 2025
**Status**: ✅ Fully Working
