#!/usr/bin/env python3
"""
Quick analysis of search results to verify database coverage
"""

import subprocess
import json

# Run a search
cmd = ['node', 'test_mcp_tool.js', 'search_devonthink', '{"query": "kind:any"}']
result = subprocess.run(cmd, capture_output=True, text=True)
docs = json.loads(result.stdout)

print("Search Results Analysis")
print("=" * 50)
print(f"Total documents found: {len(docs)}")

# Analyze databases
databases = {}
for doc in docs:
    db_path = doc.get('path', '')
    if '/Databases/' in db_path:
        db_name = db_path.split('/Databases/')[1].split('/')[0]
        databases[db_name] = databases.get(db_name, 0) + 1

print(f"\nDocuments by database:")
for db, count in sorted(databases.items()):
    print(f"  - {db}: {count} documents")

# Analyze locations (not paths, but the document structure)
inbox_count = 0
for doc in docs:
    path = doc.get('path', '').lower()
    if 'inbox' in path:
        inbox_count += 1

print(f"\nInbox analysis:")
print(f"  - Documents in paths containing 'inbox': {inbox_count}")
print(f"  - Documents in other locations: {len(docs) - inbox_count}")
print(f"  - Percentage NOT in inbox: {(len(docs) - inbox_count) / len(docs) * 100:.1f}%")

# Show document types
types = {}
for doc in docs:
    doc_type = doc.get('type', 'unknown')
    types[doc_type] = types.get(doc_type, 0) + 1

print(f"\nDocument types found:")
for doc_type, count in sorted(types.items(), key=lambda x: x[1], reverse=True):
    print(f"  - {doc_type}: {count}")

# Sample paths to show variety
print(f"\nSample document paths (first 10):")
for doc in docs[:10]:
    print(f"  - {doc.get('name', 'Unnamed')}")
    print(f"    {doc.get('path', 'No path')}")