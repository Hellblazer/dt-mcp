#!/usr/bin/env python3
"""
Test script specifically for DEVONthink search functionality
Tests both global search and database-specific search
"""

import subprocess
import json
import sys

def run_test(description, tool_name, params):
    """Run a single test and return the result"""
    print(f"\n📍 Testing: {description}")
    print(f"   Tool: {tool_name}")
    print(f"   Params: {json.dumps(params)}")
    
    cmd = ['node', 'test_mcp_tool.js', tool_name, json.dumps(params)]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            try:
                # Parse the JSON output
                output = json.loads(result.stdout)
                
                # Check for errors in the output
                if isinstance(output, dict) and 'error' in output:
                    print(f"   ❌ Error: {output['error']}")
                    return False
                elif isinstance(output, list):
                    print(f"   ✅ Success: Found {len(output)} results")
                    return True
                else:
                    print(f"   ✅ Success")
                    return True
            except json.JSONDecodeError:
                print(f"   ❌ Failed to parse JSON output")
                print(f"   Output: {result.stdout[:200]}...")
                return False
        else:
            print(f"   ❌ Command failed with return code {result.returncode}")
            print(f"   Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"   ❌ Test timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {str(e)}")
        return False

def main():
    print("DEVONthink Search Functionality Test Suite")
    print("==========================================")
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Basic search across all databases
    if run_test("Basic search across all databases", 
                "search_devonthink", 
                {"query": "technology"}):
        tests_passed += 1
    else:
        tests_failed += 1
    
    # Test 2: Search with common word (should still work)
    if run_test("Search with common word", 
                "search_devonthink", 
                {"query": "the"}):
        tests_passed += 1
    else:
        tests_failed += 1
    
    # Test 3: Search in specific database
    if run_test("Search in Sims database", 
                "search_devonthink", 
                {"query": "technology", "database": "Sims"}):
        tests_passed += 1
    else:
        tests_failed += 1
    
    # Test 4: Search in Inbox database
    if run_test("Search in Inbox database", 
                "search_devonthink", 
                {"query": "test", "database": "Inbox"}):
        tests_passed += 1
    else:
        tests_failed += 1
    
    # Test 5: Search with invalid database (should error gracefully)
    if run_test("Search with non-existent database", 
                "search_devonthink", 
                {"query": "test", "database": "NonExistentDB"}):
        tests_failed += 1  # This should fail
    else:
        tests_passed += 1  # Success means it handled the error properly
    
    # Test 6: Complex search query
    if run_test("Complex search with operators", 
                "search_devonthink", 
                {"query": "kind:PDF created:>=2020"}):
        tests_passed += 1
    else:
        tests_failed += 1
    
    # Test 7: Database-specific complex search
    if run_test("Complex search in specific database", 
                "search_devonthink", 
                {"query": "kind:webarchive", "database": "Sims"}):
        tests_passed += 1
    else:
        tests_failed += 1
    
    # Summary
    print("\n" + "="*50)
    print(f"SEARCH TEST SUMMARY")
    print(f"Total tests: {tests_passed + tests_failed}")
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print("="*50)
    
    # Exit with appropriate code
    sys.exit(0 if tests_failed == 0 else 1)

if __name__ == "__main__":
    main()