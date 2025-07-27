#!/usr/bin/env node

/**
 * AppleScript Linter - Checks for reserved words and common issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AppleScript reserved words that commonly cause issues
const RESERVED_WORDS = [
  // Keywords
  'about', 'above', 'after', 'against', 'and', 'apart', 'around', 'as', 'aside', 'at',
  'back', 'before', 'beginning', 'behind', 'below', 'beneath', 'beside', 'between', 'but', 'by',
  'considering', 'contain', 'contains', 'continue', 'copy', 'div', 'does', 'eighth', 'else',
  'end', 'equal', 'equals', 'error', 'every', 'exit', 'false', 'fifth', 'first', 'for', 'fourth',
  'from', 'front', 'get', 'given', 'global', 'if', 'ignoring', 'in', 'instead', 'into', 'is',
  'it', 'its', 'last', 'local', 'me', 'middle', 'mod', 'my', 'ninth', 'not', 'of', 'on', 'onto',
  'or', 'out', 'over', 'prop', 'property', 'put', 'ref', 'reference', 'repeat', 'return',
  'returning', 'script', 'second', 'set', 'seventh', 'since', 'sixth', 'some', 'tell', 'tenth',
  'that', 'the', 'then', 'third', 'through', 'thru', 'timeout', 'times', 'to', 'transaction',
  'true', 'try', 'until', 'where', 'while', 'whose', 'with', 'without',
  
  // Classes and types that cause issues
  'alias', 'application', 'boolean', 'class', 'constant', 'date', 'file', 'integer', 'list',
  'number', 'real', 'record', 'reference', 'RGB', 'script', 'string', 'styled', 'text', 'unit',
  'vector', 'word', 'words',
  
  // Properties that cause issues
  'bounds', 'class', 'closeable', 'collating', 'color', 'copies', 'count', 'document', 'enabled',
  'end', 'error', 'fax', 'file', 'floating', 'font', 'id', 'index', 'length', 'locked', 'modal',
  'modified', 'name', 'orientation', 'pages', 'position', 'properties', 'resizable', 'size',
  'start', 'titled', 'version', 'visible', 'window', 'zoomable', 'zoomed',
  
  // Common problematic terms
  'score', 'result', 'item', 'items', 'title', 'type', 'value', 'values', 'key', 'keys'
];

// Patterns that might indicate issues
const PROBLEMATIC_PATTERNS = [
  {
    pattern: /\brepeat\s+with\s+(\w+)\s+in\s+(\w+)/g,
    check: (match, varName) => {
      if (RESERVED_WORDS.includes(varName.toLowerCase())) {
        return `Variable "${varName}" in repeat loop is a reserved word`;
      }
    },
    description: 'Check for reserved words in repeat loops'
  },
  {
    pattern: /\bset\s+(\w+)\s+to\s+/g,
    check: (match, varName) => {
      if (RESERVED_WORDS.includes(varName.toLowerCase())) {
        return `Variable "${varName}" is a reserved word`;
      }
    },
    description: 'Check for reserved words in variable assignments'
  },
  {
    pattern: /\b(\w+)\s+of\s+(\w+)/g,
    check: (match, prop) => {
      if (RESERVED_WORDS.includes(prop.toLowerCase()) && !['name', 'type', 'class', 'count'].includes(prop.toLowerCase())) {
        return `Property "${prop}" might be a reserved word - consider using |${prop}|`;
      }
    },
    description: 'Check for reserved word properties'
  },
  {
    pattern: /\{([^}]+)\}/g,
    check: (match, content) => {
      // Check record properties
      const props = content.split(',').map(p => p.trim());
      for (const prop of props) {
        const propName = prop.split(':')[0].trim();
        if (RESERVED_WORDS.includes(propName.toLowerCase()) && !propName.startsWith('|')) {
          return `Record property "${propName}" is a reserved word - use |${propName}|`;
        }
      }
    },
    description: 'Check for reserved words in record definitions'
  }
];

class AppleScriptLinter {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  lint(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Check each pattern
    for (const rule of PROBLEMATIC_PATTERNS) {
      let match;
      const regex = new RegExp(rule.pattern);
      
      while ((match = regex.exec(content)) !== null) {
        const issue = rule.check(match[0], match[1], match[2]);
        if (issue) {
          const lineNum = this.getLineNumber(content, match.index);
          this.warnings.push({
            file: path.basename(filePath),
            line: lineNum,
            column: this.getColumnNumber(content, match.index),
            message: issue,
            code: match[0].trim()
          });
        }
      }
    }
    
    // Check for common issues
    this.checkCommonIssues(content, lines, path.basename(filePath));
    
    return {
      errors: this.errors,
      warnings: this.warnings
    };
  }
  
  checkCommonIssues(content, lines, fileName) {
    // Check for unescaped quotes in strings
    const stringPattern = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    
    // Check for missing escapeString usage
    if (content.includes('my escapeString(') && content.includes('"\\""')) {
      // File has escapeString function
      const jsonPattern = /jsonString\s*&\s*"[^"]*"\s*&\s*[^&]+\s*&\s*"[^"]*"/g;
      let match;
      while ((match = jsonPattern.exec(content)) !== null) {
        if (!match[0].includes('escapeString')) {
          const lineNum = this.getLineNumber(content, match.index);
          this.warnings.push({
            file: fileName,
            line: lineNum,
            column: 1,
            message: 'JSON string concatenation without escapeString - may cause JSON parse errors',
            code: match[0].substring(0, 50) + '...'
          });
        }
      }
    }
    
    // Check for direct property access that might fail
    const propPattern = /\b(\w+)\s+of\s+(item\s+\d+\s+of\s+)?(\w+)/g;
    let match;
    while ((match = propPattern.exec(content)) !== null) {
      const prop = match[1];
      if (['score', 'title', 'word'].includes(prop.toLowerCase())) {
        const lineNum = this.getLineNumber(content, match.index);
        this.warnings.push({
          file: fileName,
          line: lineNum,
          column: 1,
          message: `Direct access to "${prop}" property - consider using |${prop}| notation`,
          code: match[0]
        });
      }
    }
  }
  
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }
  
  getColumnNumber(content, index) {
    return index - content.lastIndexOf('\n', index - 1);
  }
}

// Main execution
function main() {
  const scriptsDir = path.join(__dirname, 'devonthink');
  
  if (!fs.existsSync(scriptsDir)) {
    console.error('❌ Scripts directory not found:', scriptsDir);
    process.exit(1);
  }
  
  console.log('🔍 Linting AppleScript files for reserved words and common issues...');
  console.log('================================================================\n');
  
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.applescript'));
  const linter = new AppleScriptLinter();
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithIssues = 0;
  
  for (const file of files) {
    const filePath = path.join(scriptsDir, file);
    const result = linter.lint(filePath);
    
    if (result.errors.length > 0 || result.warnings.length > 0) {
      filesWithIssues++;
      console.log(`\n📄 ${file}`);
      console.log('─'.repeat(50));
      
      for (const error of result.errors) {
        console.log(`  ❌ ERROR [Line ${error.line}]: ${error.message}`);
        console.log(`     Code: ${error.code}`);
        totalErrors++;
      }
      
      for (const warning of result.warnings) {
        console.log(`  ⚠️  WARNING [Line ${warning.line}]: ${warning.message}`);
        console.log(`     Code: ${warning.code}`);
        totalWarnings++;
      }
    }
  }
  
  console.log('\n================================================================');
  console.log('📊 Linting Summary:');
  console.log(`  Total files checked: ${files.length}`);
  console.log(`  Files with issues: ${filesWithIssues}`);
  console.log(`  Total errors: ${totalErrors} ❌`);
  console.log(`  Total warnings: ${totalWarnings} ⚠️`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n✨ No issues found! All AppleScript files look good.');
  } else if (totalErrors === 0) {
    console.log('\n⚠️  No errors, but warnings should be reviewed.');
  } else {
    console.log('\n❌ Errors found! Please fix the issues above.');
    process.exit(1);
  }
}

// Run the linter
main();