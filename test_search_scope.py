#!/usr/bin/env python3
"""
Quick test to verify search is not limited to inboxes.
"""

import subprocess
import json

def test_search(query, database=None):
    """Run a search and return results"""
    args = {'query': query}
    if database:
        args['database'] = database
    
    cmd = ['node', 'test_mcp_tool.js', 'search_devonthink', json.dumps(args)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {"error": result.stderr}
    except Exception as e:
        return {"error": str(e)}

def main():
    print("DEVONthink Search Scope Test")
    print("=" * 50)
    
    # Test 1: Search all documents
    print("\n1. Searching for all documents (first 100):")
    result = test_search("kind:any")
    
    if 'documents' in result:
        docs = result['documents']
        print(f"   Found {len(docs)} documents")
        
        # Analyze locations
        inbox_count = 0
        other_count = 0
        location_samples = {}
        
        for doc in docs:
            loc = doc.get('location', '').lower()
            if 'inbox' in loc:
                inbox_count += 1
            else:
                other_count += 1
                # Collect samples of non-inbox locations
                parent = '/'.join(doc.get('location', '').split('/')[:-1])
                if parent and parent not in location_samples and len(location_samples) < 10:
                    location_samples[parent] = doc.get('name', 'Unnamed')
        
        print(f"\n   Location Analysis:")
        print(f"   - Inbox documents: {inbox_count}")
        print(f"   - Other locations: {other_count}")
        print(f"   - Percentage in inbox: {inbox_count/len(docs)*100:.1f}%")
        
        if location_samples:
            print(f"\n   Sample non-inbox locations:")
            for loc, name in list(location_samples.items())[:5]:
                print(f"   - {loc}")
                print(f"     Example: {name}")
    
    # Test 2: Explicitly search outside inboxes
    print("\n2. Explicitly searching OUTSIDE inboxes:")
    result = test_search('NOT location:inbox NOT location:Inbox NOT location:"Global Inbox"')
    
    if 'documents' in result:
        print(f"   Found {len(result['documents'])} documents outside inboxes")
        if result['documents']:
            print("\n   First 5 examples:")
            for doc in result['documents'][:5]:
                print(f"   - {doc.get('name', 'Unnamed')}")
                print(f"     Location: {doc.get('location', 'Unknown')}")
    
    # Test 3: Search in specific non-inbox locations
    print("\n3. Testing searches with location filters:")
    
    # Common folder patterns to test
    test_locations = [
        "location:Research",
        "location:Archive", 
        "location:Projects",
        "location:Reference",
        "location:Documents"
    ]
    
    found_any = False
    for loc_query in test_locations:
        result = test_search(loc_query)
        if 'documents' in result and result['documents']:
            print(f"   ✓ {loc_query}: Found {len(result['documents'])} documents")
            found_any = True
    
    if not found_any:
        print("   ⚠️  No documents found in common folder names")
        print("   Your folder structure might use different naming")
    
    # Test 4: Get actual folder structure
    print("\n4. Exploring actual folder structure:")
    result = test_search("kind:group")  # Groups are folders in DEVONthink
    
    if 'documents' in result and result['documents']:
        print(f"   Found {len(result['documents'])} folders/groups")
        print("\n   Sample folder structure:")
        for group in result['documents'][:10]:
            print(f"   - {group.get('location', '/')}{group.get('name', 'Unnamed')}/")
    
    print("\n" + "=" * 50)
    print("CONCLUSION:")
    
    if other_count > inbox_count:
        print("✅ GOOD: Most documents are NOT in inboxes!")
        print(f"   The MCP server has access to your full database structure.")
    elif other_count > 0:
        print("⚠️  PARTIAL: Some non-inbox access, but limited.")
        print(f"   Consider checking DEVONthink permissions and search settings.")
    else:
        print("❌ PROBLEM: Only inbox documents found!")
        print(f"   Check DEVONthink permissions and ensure databases are open.")

if __name__ == "__main__":
    main()