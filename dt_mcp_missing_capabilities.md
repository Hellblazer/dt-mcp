# DEVONthink MCP Server: Missing Capabilities & Implementation Guide

## Executive Summary

This document outlines critical missing capabilities in the DEVONthink MCP server that prevent comprehensive automated research workflows. The analysis is based on real-world usage attempting to set up an Adaptive Resonance Theory (ART) research project, which revealed significant gaps in file import, structure management, and bulk organization capabilities.

## Current Capability Assessment

### ✅ **Existing Strengths**
- Document search and retrieval
- Content analysis and reading
- Smart group creation with search criteria
- Knowledge graph building from existing documents
- Document synthesis and relationship mapping
- Advanced search with DEVONthink operators
- Tagging and classification

### ❌ **Critical Missing Capabilities**

#### 1. **File Import & External Content Integration**
#### 2. **Database Structure Management**  
#### 3. **Bulk Operations & Organization**
#### 4. **Advanced Document Management**

---

## 1. File Import & External Content Integration

### Problem Statement
Currently impossible to programmatically import external content into DEVONthink databases, severely limiting automated research workflows.

### Missing Tools Specification

#### `import_url`
```typescript
interface ImportUrlParams {
  url: string;
  targetGroup?: string;
  database?: string;
  format?: 'auto' | 'pdf' | 'html' | 'webarchive' | 'markdown';
  tags?: string[];
  customName?: string;
}

interface ImportUrlResponse {
  uuid: string;
  name: string;
  path: string;
  format: string;
  size: number;
  success: boolean;
  error?: string;
}
```

**Implementation Notes:**
- Should use DEVONthink's native URL import functionality
- Support format detection and conversion
- Handle authentication for protected content
- Provide progress feedback for large files

#### `download_paper`
```typescript
interface DownloadPaperParams {
  source: 'arxiv' | 'doi' | 'pubmed' | 'direct_url';
  identifier: string; // arXiv ID, DOI, PMID, or direct URL
  targetGroup?: string;
  database?: string;
  tags?: string[];
  extractMetadata?: boolean;
}

interface DownloadPaperResponse {
  uuid: string;
  title: string;
  authors: string[];
  metadata: PaperMetadata;
  path: string;
  success: boolean;
}
```

**Implementation Notes:**
- Integrate with academic paper APIs (arXiv, CrossRef, PubMed)
- Extract and store metadata (authors, title, abstract, keywords)
- Auto-generate appropriate tags
- Handle rate limiting and authentication

#### `web_import`
```typescript
interface WebImportParams {
  url: string;
  method: 'webarchive' | 'pdf' | 'markdown' | 'html';
  targetGroup?: string;
  database?: string;
  includeAssets?: boolean;
  tags?: string[];
}
```

**Implementation Notes:**
- Use DEVONthink's web import capabilities
- Support different capture methods
- Handle dynamic content and JavaScript rendering
- Preserve formatting and media assets

#### `batch_import`
```typescript
interface BatchImportParams {
  sources: ImportSource[];
  targetStructure: FolderStructure;
  database?: string;
  progressCallback?: boolean;
}

interface ImportSource {
  type: 'url' | 'file' | 'paper';
  source: string;
  targetGroup: string;
  tags?: string[];
  metadata?: any;
}
```

**Implementation Notes:**
- Process multiple imports concurrently
- Provide progress updates
- Handle failures gracefully
- Support rollback on errors

---

## 2. Database Structure Management

### Problem Statement
No capability to programmatically create and manage folder hierarchies, forcing manual database organization.

### Missing Tools Specification

#### `create_group`
```typescript
interface CreateGroupParams {
  name: string;
  parentGroup?: string; // Path like "/Research/ART"
  database?: string;
  description?: string;
  tags?: string[];
}

interface CreateGroupResponse {
  uuid: string;
  name: string;
  path: string;
  parentUuid?: string;
  success: boolean;
}
```

**Implementation Notes:**
- Create nested folder structures
- Handle name conflicts intelligently
- Support batch group creation
- Validate parent group existence

#### `create_folder_structure`
```typescript
interface FolderStructure {
  [folderName: string]: FolderStructure | null;
}

interface CreateFolderStructureParams {
  structure: FolderStructure;
  rootGroup?: string;
  database?: string;
  overwriteExisting?: boolean;
}

interface CreateFolderStructureResponse {
  createdGroups: GroupInfo[];
  skippedGroups: GroupInfo[];
  errors: StructureError[];
  success: boolean;
}
```

**Example Usage:**
```javascript
const artStructure = {
  "ART_Research_Master": {
    "01_Primary_Sources": {
      "Grossberg_Publications": null,
      "Carpenter_Publications": null,
      "Modern_Research": null
    },
    "02_Implementations": {
      "Julia_Packages": null,
      "Python_Libraries": null,
      "Hardware_Platforms": null
    },
    "03_Applications": null
  }
};
```

#### `move_to_group`
```typescript
interface MoveToGroupParams {
  documentUuids: string | string[];
  targetGroup: string;
  createGroupIfMissing?: boolean;
  preserveStructure?: boolean;
}
```

**Implementation Notes:**
- Support single document or batch moves
- Handle duplicate names
- Update references and links
- Validate permissions

#### `organize_database`
```typescript
interface OrganizeDatabaseParams {
  database?: string;
  template: OrganizationTemplate;
  rules: OrganizationRule[];
  dryRun?: boolean;
}

interface OrganizationRule {
  criteria: SearchCriteria;
  action: 'move' | 'copy' | 'tag' | 'rename';
  target: string;
  priority: number;
}
```

**Implementation Notes:**
- Apply organizational rules automatically
- Support templates for common structures
- Provide dry-run capability
- Generate organization reports

---

## 3. Bulk Operations & Organization

### Problem Statement
No support for bulk operations on documents, making large-scale organization inefficient.

### Missing Tools Specification

#### `bulk_tag`
```typescript
interface BulkTagParams {
  documentUuids: string[];
  action: 'add' | 'remove' | 'replace';
  tags: string[];
  conditions?: TagCondition[];
}

interface TagCondition {
  field: 'content' | 'name' | 'type' | 'size';
  operator: 'contains' | 'equals' | 'regex' | 'greater' | 'less';
  value: string | number;
}
```

#### `auto_organize_by_type`
```typescript
interface AutoOrganizeParams {
  searchCriteria?: string;
  database?: string;
  organizationRules: TypeOrganizationRule[];
  targetStructure: string; // Base path for organization
}

interface TypeOrganizationRule {
  documentType: string;
  contentPattern?: string;
  targetFolder: string;
  tags?: string[];
}
```

#### `batch_metadata_update`
```typescript
interface BatchMetadataUpdateParams {
  documentUuids: string[];
  updates: MetadataUpdate[];
  preserveExisting?: boolean;
}

interface MetadataUpdate {
  field: 'name' | 'comment' | 'url' | 'tags' | 'custom';
  value: string | string[];
  operation: 'set' | 'append' | 'prepend' | 'remove';
}
```

---

## 4. Advanced Document Management

### Missing Tools Specification

#### `merge_documents`
```typescript
interface MergeDocumentsParams {
  sourceUuids: string[];
  targetName: string;
  targetGroup?: string;
  format: 'pdf' | 'rtf' | 'markdown';
  preserveOriginals?: boolean;
  includeToc?: boolean;
}
```

#### `split_document`
```typescript
interface SplitDocumentParams {
  sourceUuid: string;
  splitCriteria: SplitCriteria;
  targetGroup?: string;
  namingPattern: string;
}

interface SplitCriteria {
  method: 'page_count' | 'bookmark' | 'text_pattern';
  value: number | string;
}
```

#### `duplicate_detection`
```typescript
interface DuplicateDetectionParams {
  searchScope?: string;
  database?: string;
  similarityThreshold: number; // 0.0 - 1.0
  compareFields: ('content' | 'name' | 'size' | 'metadata')[];
}

interface DuplicateDetectionResponse {
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
  spaceSavings: number;
}
```

#### `export_collection`
```typescript
interface ExportCollectionParams {
  collectionUuid?: string;
  searchCriteria?: string;
  format: 'zip' | 'folder' | 'pdf' | 'epub';
  targetPath: string;
  includeMetadata?: boolean;
  preserveStructure?: boolean;
}
```

---

## Implementation Priority & Roadmap

### Phase 1: Critical Infrastructure (High Priority)
1. **`import_url`** - Essential for automated research workflows
2. **`create_group`** - Required for any programmatic organization
3. **`move_to_group`** - Basic document management
4. **`download_paper`** - Academic research automation

### Phase 2: Organization & Efficiency (Medium Priority)
5. **`create_folder_structure`** - Large-scale organization
6. **`bulk_tag`** - Efficient metadata management
7. **`batch_import`** - Scalable content acquisition
8. **`auto_organize_by_type`** - Intelligent organization

### Phase 3: Advanced Features (Lower Priority)
9. **`merge_documents`** - Advanced document manipulation
10. **`duplicate_detection`** - Database optimization
11. **`export_collection`** - Data portability
12. **`split_document`** - Specialized document processing

---

## Technical Implementation Guidance

### DEVONthink AppleScript Integration

Most missing functionality can be implemented using DEVONthink's AppleScript interface:

```applescript
-- Example: Create group structure
tell application "DEVONthink 3"
    set theDatabase to current database
    set parentGroup to create record with {name:"ART Research", type:group} in theDatabase
    set subGroup to create record with {name:"Primary Sources", type:group} in parentGroup
end tell

-- Example: Import URL
tell application "DEVONthink 3"
    set theRecord to create record with {name:"Paper Title", type:unknown, URL:"https://arxiv.org/pdf/2503.07641.pdf"} in group "Research Papers"
end tell
```

### Error Handling Strategy

```typescript
interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
}
```

### Progress Reporting

For long-running operations:

```typescript
interface ProgressUpdate {
  operation: string;
  current: number;
  total: number;
  status: string;
  eta?: number;
}
```

### Configuration Management

```typescript
interface DTMCPConfig {
  defaultDatabase?: string;
  importSettings: {
    autoTag: boolean;
    extractMetadata: boolean;
    defaultFormat: string;
  };
  organizationRules: OrganizationRule[];
  retrySettings: {
    maxRetries: number;
    retryDelay: number;
  };
}
```

---

## Testing Strategy

### Unit Tests Required
- Each new tool function
- Parameter validation
- Error handling
- AppleScript integration

### Integration Tests Required
- End-to-end research workflow
- Bulk operation performance
- Database integrity after operations
- Cross-platform compatibility

### Performance Benchmarks
- Import speed for various file types
- Bulk operation scalability
- Memory usage for large operations
- Database responsiveness during operations

---

## Example Implementation: `import_url`

```typescript
async function import_url(params: ImportUrlParams): Promise<ImportUrlResponse> {
  try {
    // Validate parameters
    if (!params.url || !isValidUrl(params.url)) {
      throw new Error('Invalid URL provided');
    }

    // Prepare AppleScript command
    const script = `
      tell application "DEVONthink 3"
        set theDatabase to ${params.database ? `database "${params.database}"` : 'current database'}
        set targetGroup to ${params.targetGroup ? `group "${params.targetGroup}"` : 'root of theDatabase'}
        
        set theRecord to create record with {
          name: "${params.customName || 'Imported Document'}",
          type: unknown,
          URL: "${params.url}"
        } in targetGroup
        
        ${params.tags ? `set tags of theRecord to {${params.tags.map(t => `"${t}"`).join(', ')}}` : ''}
        
        return {uuid of theRecord, name of theRecord, path of theRecord, size of theRecord}
      end tell
    `;

    // Execute AppleScript
    const result = await executeAppleScript(script);
    
    return {
      uuid: result.uuid,
      name: result.name,
      path: result.path,
      format: params.format || 'auto',
      size: result.size,
      success: true
    };

  } catch (error) {
    return {
      uuid: '',
      name: '',
      path: '',
      format: '',
      size: 0,
      success: false,
      error: error.message
    };
  }
}
```

---

## Conclusion

These missing capabilities represent critical gaps that prevent the DEVONthink MCP server from supporting advanced research workflows. Implementing these tools would transform DEVONthink from a passive document repository into an active research partner capable of:

- Automated content acquisition and organization
- Intelligent document management
- Scalable research project setup
- Comprehensive knowledge base construction

The proposed implementation approach leverages DEVONthink's existing AppleScript capabilities while providing a clean, typed interface for MCP integration.