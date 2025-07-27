#!/usr/bin/env python3
"""
Test script to verify MCP server accesses full DEVONthink databases, not just inboxes.
This diagnostic tool helps ensure we're searching across all documents.
"""

import subprocess
import json
import sys
from datetime import datetime

def run_mcp_tool(tool_name, args):
    """Execute an MCP tool and return the result"""
    cmd = ['node', 'test_mcp_tool.js', tool_name, json.dumps(args)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"error": f"Invalid JSON: {result.stdout}"}
        else:
            return {"error": f"Command failed: {result.stderr}"}
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out after 30 seconds"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}

def test_database_coverage():
    """Run comprehensive tests to verify full database access"""
    print("DEVONthink Database Coverage Test")
    print("=" * 60)
    print("Testing if MCP server accesses full databases or just inboxes...\n")
    
    # Test 1: List all databases
    print("1. Listing all databases:")
    print("-" * 40)
    databases = run_mcp_tool('list_databases', {})
    
    if 'error' in databases:
        print(f"❌ Error listing databases: {databases['error']}")
        return
    
    if 'databases' in databases:
        db_list = databases['databases']
        print(f"✓ Found {len(db_list)} databases:")
        for db in db_list:
            print(f"  - {db['name']} (UUID: {db['uuid']})")
            if 'itemCount' in db:
                print(f"    Items: {db['itemCount']}")
    else:
        print("❌ No databases found")
        return
    
    print("\n2. Testing search across different locations:")
    print("-" * 40)
    
    # Test various search queries to see document distribution
    test_queries = [
        {
            "query": "*",  # Everything
            "desc": "All documents (limited results)"
        },
        {
            "query": "kind:any",  # All document types
            "desc": "All document types"
        },
        {
            "query": "kind:PDF",
            "desc": "PDF documents only"
        },
        {
            "query": "kind:markdown",
            "desc": "Markdown documents"
        },
        {
            "query": "created:<=1year",
            "desc": "Documents from last year"
        },
        {
            "query": "modified:<=7days", 
            "desc": "Recently modified documents"
        }
    ]
    
    # For each database, test searches
    for db in db_list[:3]:  # Test first 3 databases to avoid overload
        print(f"\nTesting database: {db['name']}")
        
        for test in test_queries:
            print(f"\n  Query: {test['desc']}")
            result = run_mcp_tool('search_devonthink', {
                'query': test['query'],
                'database': db['name']
            })
            
            if 'error' in result:
                print(f"    ❌ Error: {result['error']}")
            elif 'documents' in result:
                docs = result['documents']
                print(f"    ✓ Found {len(docs)} documents")
                
                # Analyze document locations
                locations = {}
                for doc in docs:
                    loc = doc.get('location', 'Unknown')
                    # Extract parent folder
                    parent = '/'.join(loc.split('/')[:-1]) if '/' in loc else 'Root'
                    locations[parent] = locations.get(parent, 0) + 1
                
                # Show distribution
                if locations:
                    print("    Location distribution:")
                    for loc, count in sorted(locations.items())[:5]:
                        print(f"      - {loc}: {count} docs")
                    if len(locations) > 5:
                        print(f"      ... and {len(locations) - 5} more locations")
    
    print("\n3. Testing specific document access patterns:")
    print("-" * 40)
    
    # Test if we can access documents from different groups/folders
    print("\nSearching for documents NOT in inbox:")
    
    # Search for documents excluding common inbox terms
    non_inbox_query = 'NOT (location:inbox OR location:Inbox OR location:"Global Inbox")'
    result = run_mcp_tool('search_devonthink', {'query': non_inbox_query})
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
    elif 'documents' in result:
        docs = result['documents']
        print(f"✓ Found {len(docs)} documents outside of inboxes")
        
        if docs:
            print("\nSample of non-inbox documents:")
            for doc in docs[:5]:
                print(f"  - {doc.get('name', 'Unnamed')}")
                print(f"    Location: {doc.get('location', 'Unknown')}")
                print(f"    Database: {doc.get('database', 'Unknown')}")
    
    print("\n4. Testing group/folder navigation:")
    print("-" * 40)
    
    # For each database, try to explore its structure
    for db in db_list[:2]:  # Test first 2 databases
        print(f"\nExploring structure of: {db['name']}")
        
        # Search for groups/folders
        group_query = 'kind:group'
        result = run_mcp_tool('search_devonthink', {
            'query': group_query,
            'database': db['name']
        })
        
        if 'documents' in result and result['documents']:
            groups = result['documents'][:10]  # Limit to 10 groups
            print(f"  Found {len(result['documents'])} groups/folders")
            print("  Sample groups:")
            for group in groups:
                print(f"    - {group.get('name', 'Unnamed')}")
    
    print("\n5. Document count verification:")
    print("-" * 40)
    
    # Try to estimate total accessible documents
    total_accessible = 0
    for db in db_list:
        # Count documents in each database
        result = run_mcp_tool('search_devonthink', {
            'query': 'kind:any',
            'database': db['name']
        })
        
        if 'documents' in result:
            count = len(result['documents'])
            total_accessible += count
            print(f"  {db['name']}: {count} documents accessible")
    
    print(f"\nTotal accessible documents across all databases: {total_accessible}")
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print("=" * 60)
    
    if total_accessible > 100:
        print("✓ Good news! The MCP server appears to have access to your full databases.")
        print(f"  We found {total_accessible} documents across multiple locations.")
        print("  Documents are distributed across various folders, not just inboxes.")
    else:
        print("⚠️  Warning: Limited document access detected.")
        print(f"  Only {total_accessible} documents found.")
        print("  This might indicate restricted access or search limitations.")
    
    print("\nRecommendations:")
    print("1. If counts seem low, check DEVONthink search preferences")
    print("2. Ensure all databases are open in DEVONthink")
    print("3. Try specific searches for documents you know exist")
    print("4. Check if search indices need rebuilding in DEVONthink")

if __name__ == "__main__":
    test_database_coverage()