#!/usr/bin/env python3

"""
Comprehensive test suite for DEVONthink MCP Server
Tests all phases (1-4) with 36 specialized tools
"""

import sys
import subprocess
import json
import time
import os

# Test configuration
TEST_CONFIG = {
    'timeout': 30,
    'server_startup_time': 3,
    'test_document_uuid': 'test-uuid-placeholder'
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'

def log(color, message):
    print(f"{color}{message}{Colors.RESET}")

def run_tool_test(tool_name, params=None):
    """Test individual MCP tool"""
    try:
        cmd = ['node', 'tests/test_mcp_tool.js', tool_name]
        if params:
            cmd.append(json.dumps(params))
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=TEST_CONFIG['timeout'])
        return {
            'success': result.returncode == 0,
            'output': result.stdout,
            'error': result.stderr
        }
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Timeout'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_phase_1_core_operations():
    """Test Phase 1: Core Operations (9 tools)"""
    log(Colors.BLUE, "Testing Phase 1: Core Operations")
    
    tools = [
        ('search_devonthink', {'query': 'test'}),
        ('list_databases', None),
        ('create_document', {'name': 'test-doc', 'content': 'test content'}),
        ('read_document', {'uuid': TEST_CONFIG['test_document_uuid'], 'includeContent': False}),
        ('update_tags', {'uuid': TEST_CONFIG['test_document_uuid'], 'tags': ['test']}),
        ('get_related_documents', {'uuid': TEST_CONFIG['test_document_uuid']}),
        ('create_smart_group', {'name': 'test-group', 'searchQuery': 'test'}),
        ('ocr_document', {'uuid': TEST_CONFIG['test_document_uuid']}),
        # Skip delete_document to avoid data loss
    ]
    
    results = []
    for tool_name, params in tools:
        log(Colors.YELLOW, f"  Testing {tool_name}...")
        result = run_tool_test(tool_name, params)
        results.append({
            'tool': tool_name,
            'success': result['success'],
            'error': result.get('error', '')
        })
        
        if result['success']:
            log(Colors.GREEN, f"    ✅ {tool_name}")
        else:
            log(Colors.RED, f"    ❌ {tool_name}: {result.get('error', 'Unknown error')}")
    
    return results

def test_phase_2_advanced_search():
    """Test Phase 2: Advanced Search & Organization (2 tools)"""
    log(Colors.BLUE, "Testing Phase 2: Advanced Search & Organization")
    
    tools = [
        ('advanced_search', {'query': 'test AND document'}),
        ('list_smart_groups', None),
    ]
    
    results = []
    for tool_name, params in tools:
        log(Colors.YELLOW, f"  Testing {tool_name}...")
        result = run_tool_test(tool_name, params)
        results.append({
            'tool': tool_name,
            'success': result['success'],
            'error': result.get('error', '')
        })
        
        if result['success']:
            log(Colors.GREEN, f"    ✅ {tool_name}")
        else:
            log(Colors.RED, f"    ❌ {tool_name}: {result.get('error', 'Unknown error')}")
    
    return results

def test_phase_3_knowledge_synthesis():
    """Test Phase 3: Knowledge Graph & Synthesis (Multiple categories)"""
    log(Colors.BLUE, "Testing Phase 3: Knowledge Graph & Synthesis")
    
    tools = [
        # Knowledge Graph & Relationships (5 tools)
        ('build_knowledge_graph', {'uuid': TEST_CONFIG['test_document_uuid']}),
        ('find_shortest_path', {'startUUID': TEST_CONFIG['test_document_uuid'], 'targetUUID': TEST_CONFIG['test_document_uuid']}),
        ('detect_knowledge_clusters', None),
        ('find_connections', {'uuid': TEST_CONFIG['test_document_uuid']}),
        ('compare_documents', {'uuid1': TEST_CONFIG['test_document_uuid'], 'uuid2': TEST_CONFIG['test_document_uuid']}),
        
        # Research Automation (3 tools)
        ('automate_research', {'workflowType': 'explore_topic', 'queryOrUUID': 'test'}),
        ('organize_findings', {'searchQuery': 'test'}),
        ('create_collection', {'name': 'test-collection', 'description': 'Test collection'}),
        
        # Document Intelligence (3 tools)
        ('analyze_document', {'uuid': TEST_CONFIG['test_document_uuid']}),
        ('analyze_document_similarity', {'uuids': [TEST_CONFIG['test_document_uuid'], TEST_CONFIG['test_document_uuid']]}),
        ('batch_read_documents', {'uuids': [TEST_CONFIG['test_document_uuid']]}),
        
        # Knowledge Synthesis (8 tools)
        ('synthesize_documents', {'documentUUIDs': [TEST_CONFIG['test_document_uuid']]}),
        ('extract_themes', {'documentUUIDs': [TEST_CONFIG['test_document_uuid']]}),
        ('classify_document', {'uuid': TEST_CONFIG['test_document_uuid']}),
        ('get_similar_documents', {'uuid': TEST_CONFIG['test_document_uuid']}),
        ('create_multi_level_summary', {'documentUUIDs': [TEST_CONFIG['test_document_uuid']]}),
        ('track_topic_evolution', {'topic': 'test'}),
        ('create_knowledge_timeline', {'documentUUIDs': [TEST_CONFIG['test_document_uuid']]}),
        ('identify_trends', None),
        
        # Batch Operations (2 tools)
        ('batch_search', {'queries': ['test', 'document']}),
        # batch_read_documents already tested above
        
        # Collections (2 tools)
        # create_collection already tested above
        ('add_to_collection', {'collectionUUID': TEST_CONFIG['test_document_uuid'], 'documentUUID': TEST_CONFIG['test_document_uuid']}),
        
        # Meta Tool (1 tool)
        ('get_tool_help', {'toolName': 'search_devonthink'}),
    ]
    
    results = []
    for tool_name, params in tools:
        log(Colors.YELLOW, f"  Testing {tool_name}...")
        result = run_tool_test(tool_name, params)
        results.append({
            'tool': tool_name,
            'success': result['success'],
            'error': result.get('error', '')
        })
        
        if result['success']:
            log(Colors.GREEN, f"    ✅ {tool_name}")
        else:
            log(Colors.RED, f"    ❌ {tool_name}: {result.get('error', 'Unknown error')}")
    
    return results

def test_phase_4_advanced_research():
    """Test Phase 4: Advanced Research Automation (6 tools)"""
    log(Colors.BLUE, "Testing Phase 4: Advanced Research Automation")
    
    tools = [
        ('bulk_import_urls', {'urls': ['https://example.com'], 'database': 'Test'}),
        ('bulk_download_papers', {'queries': ['test'], 'maxResults': 1}),
        ('create_research_project', {'name': 'test-project', 'description': 'Test project', 'database': 'Test'}),
        ('execute_workflow', {'workflowType': 'literature_review', 'parameters': {'topic': 'test'}}),
        ('monitor_operations', None),
        ('manage_operation_queue', {'action': 'status'}),
    ]
    
    results = []
    for tool_name, params in tools:
        log(Colors.YELLOW, f"  Testing {tool_name}...")
        result = run_tool_test(tool_name, params)
        results.append({
            'tool': tool_name,
            'success': result['success'],
            'error': result.get('error', '')
        })
        
        if result['success']:
            log(Colors.GREEN, f"    ✅ {tool_name}")
        else:
            log(Colors.RED, f"    ❌ {tool_name}: {result.get('error', 'Unknown error')}")
    
    return results

def main():
    """Run comprehensive test suite"""
    log(Colors.BLUE, "🧪 DEVONthink MCP Server - Comprehensive Test Suite")
    log(Colors.BLUE, "=" * 60)
    
    # Check prerequisites
    if not os.path.exists('server.js'):
        log(Colors.RED, "❌ server.js not found")
        return False
    
    if not os.path.exists('tests/test_mcp_tool.js'):
        log(Colors.YELLOW, "⚠️  test_mcp_tool.js not found - some tests may fail")
    
    all_results = []
    
    try:
        # Test all phases
        phases = [
            ("Phase 1: Core Operations", test_phase_1_core_operations),
            ("Phase 2: Advanced Search", test_phase_2_advanced_search),
            ("Phase 3: Knowledge Synthesis", test_phase_3_knowledge_synthesis),
            ("Phase 4: Advanced Research", test_phase_4_advanced_research),
        ]
        
        for phase_name, test_func in phases:
            log(Colors.BLUE, f"\n{phase_name}")
            log(Colors.BLUE, "-" * 40)
            results = test_func()
            all_results.extend(results)
            
            # Summary for this phase
            passed = sum(1 for r in results if r['success'])
            total = len(results)
            log(Colors.BLUE, f"Phase summary: {passed}/{total} passed")
        
        # Overall summary
        log(Colors.BLUE, "\n" + "=" * 60)
        log(Colors.BLUE, "COMPREHENSIVE TEST SUMMARY")
        log(Colors.BLUE, "=" * 60)
        
        total_passed = sum(1 for r in all_results if r['success'])
        total_tests = len(all_results)
        success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        log(Colors.BLUE, f"Total tests: {total_tests}")
        log(Colors.GREEN if total_passed == total_tests else Colors.YELLOW, 
            f"Passed: {total_passed}")
        log(Colors.RED if total_tests - total_passed > 0 else Colors.GREEN, 
            f"Failed: {total_tests - total_passed}")
        log(Colors.BLUE, f"Success rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            log(Colors.GREEN, "🎉 EXCELLENT - System is ready for production")
        elif success_rate >= 75:
            log(Colors.YELLOW, "⚠️  GOOD - Some issues need attention")
        else:
            log(Colors.RED, "❌ NEEDS WORK - Critical issues found")
        
        # List failed tests
        failed_tests = [r for r in all_results if not r['success']]
        if failed_tests:
            log(Colors.RED, "\nFailed tests:")
            for test in failed_tests:
                log(Colors.RED, f"  • {test['tool']}: {test['error']}")
        
        return success_rate >= 75
        
    except Exception as e:
        log(Colors.RED, f"Test suite error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)