#!/usr/bin/env python3
import subprocess
import json

# Test with a very specific query
query = "machine learning algorithm implementation"
print(f"Testing organize_findings with query: '{query}'")
print("Note: This may take a while if many documents match...")

try:
    result = subprocess.run(
        ['osascript', 'scripts/devonthink/automate_research.applescript', 'organize_findings', query],
        capture_output=True,
        text=True,
        timeout=45
    )
    
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            if 'error' in data:
                print(f"\nError: {data['error']}")
            else:
                print("\n✓ Success!")
                print(f"Total found: {data.get('totalFound', 0)} documents")
                print(f"Organized: {data.get('organized', 0)} documents")
                print(f"Collection created: {data.get('collectionUUID', 'N/A')}")
        except json.JSONDecodeError:
            print(f"\nRaw output: {result.stdout}")
    else:
        print("\nNo output received")
        
except subprocess.TimeoutExpired:
    print("\nTimeout: The search is taking too long (>45s)")
    print("This usually means too many search results.")
    print("Try a more specific query or check DEVONthink performance.")
except Exception as e:
    print(f"\nError: {e}")