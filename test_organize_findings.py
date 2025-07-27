#!/usr/bin/env python3
"""
Test script for the organize_findings workflow
"""
import subprocess
import json
import sys
import time

def test_organize_findings(query):
    """Test the organize_findings workflow with the given query"""
    print(f"\n=== Testing organize_findings with query: '{query}' ===")
    
    cmd = [
        'osascript',
        'scripts/devonthink/automate_research.applescript',
        'organize_findings',
        query
    ]
    
    try:
        # Start the process
        start_time = time.time()
        print(f"Running command: {' '.join(cmd)}")
        print("This may take a while if there are many search results...")
        
        # Run with a longer timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout
        )
        
        end_time = time.time()
        elapsed = end_time - start_time
        print(f"Execution time: {elapsed:.2f} seconds")
        
        if result.returncode != 0:
            print(f"Error: Command failed with return code {result.returncode}")
            if result.stderr:
                print(f"Stderr: {result.stderr}")
            return False
        
        # Parse and display the output
        output = result.stdout.strip()
        if not output:
            print("Error: No output received")
            return False
            
        try:
            data = json.loads(output)
            
            if 'error' in data:
                print(f"Error from workflow: {data['error']}")
                return False
            
            # Display results
            print("\n✓ Success! Results:")
            print(f"  - Workflow: {data.get('workflow', 'N/A')}")
            print(f"  - Query: {data.get('query', 'N/A')}")
            print(f"  - Collection UUID: {data.get('collectionUUID', 'N/A')}")
            print(f"  - Total documents found: {data.get('totalFound', 0)}")
            print(f"  - Documents organized: {data.get('organized', 0)}")
            print(f"  - High relevance group: {data.get('highRelevance', 'N/A')}")
            print(f"  - Medium relevance group: {data.get('mediumRelevance', 'N/A')}")
            print(f"  - Low relevance group: {data.get('lowRelevance', 'N/A')}")
            
            # Pretty print the full JSON
            print("\nFull JSON response:")
            print(json.dumps(data, indent=2))
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"Error: Failed to parse JSON output: {e}")
            print(f"Raw output: {output}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"Error: Command timed out after 60 seconds")
        print("This might indicate too many search results or a DEVONthink issue")
        return False
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    # Test with the requested query
    success = test_organize_findings("machine learning")
    
    # Also test with a simpler query that might return fewer results
    if not success:
        print("\n--- Trying with a simpler query ---")
        test_organize_findings("test")
    
    sys.exit(0 if success else 1)