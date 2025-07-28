#!/usr/bin/env python3
"""
Comprehensive Global Test Suite for DEVONthink MCP Server
Tests all 25+ tools across all 4 phases of implementation
"""

import subprocess
import json
import sys
import time
from typing import Dict, List, Optional, Tuple

class DEVONthinkMCPTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        self.test_results = {}
        
    def run_tool(self, tool_name: str, params: Dict) -> Tuple[bool, Optional[Dict]]:
        """Run an MCP tool and return success status and result"""
        try:
            cmd = [
                'node',
                'tests/test_mcp_tool.js',
                tool_name,
                json.dumps(params)
            ]
            
            # Use longer timeout for research automation tools
            timeout_seconds = 120 if tool_name in ['automate_research', 'detect_knowledge_clusters', 'build_knowledge_graph'] else 60
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds)
            
            if result.returncode != 0:
                return False, {"error": result.stderr}
            
            try:
                data = json.loads(result.stdout)
                return True, data
            except json.JSONDecodeError:
                return False, {"error": "Invalid JSON response"}
                
        except subprocess.TimeoutExpired:
            return False, {"error": "Tool timed out"}
        except Exception as e:
            return False, {"error": str(e)}
    
    def test_tool(self, tool_name: str, params: Dict, description: str) -> bool:
        """Test a single tool and record results"""
        print(f"Testing {tool_name}: {description}...")
        
        success, result = self.run_tool(tool_name, params)
        
        # Check if result contains an error field, even if subprocess succeeded
        if success and isinstance(result, dict) and 'error' in result:
            success = False
            
        self.test_results[tool_name] = {
            "description": description,
            "success": success,
            "result": result
        }
        
        if success:
            print(f"  ✅ PASSED")
            self.passed += 1
            return True
        else:
            error_msg = result.get("error", "Unknown error") if result else "No result"
            print(f"  ❌ FAILED: {error_msg}")
            self.errors.append(f"{tool_name}: {error_msg}")
            self.failed += 1
            return False
    
    def test_response_format(self, tool_name: str, params: Dict, description: str) -> bool:
        """Test tool execution and validate response format consistency"""
        print(f"Testing {tool_name}: {description}...")
        
        success, result = self.run_tool(tool_name, params)
        
        # Check if result contains an error field
        if success and isinstance(result, dict) and 'error' in result:
            success = False
        
        # Additional validation for response format consistency
        format_valid = True
        format_error = ""
        
        if success and isinstance(result, dict):
            # Check for standardized format: {status: "success", data: ..., metadata: ...}
            if 'status' in result:
                if result['status'] != 'success':
                    format_valid = False
                    format_error = f"Expected status='success', got status='{result['status']}'"
                elif 'data' not in result:
                    format_valid = False
                    format_error = "Response with status='success' should have 'data' field"
            # Legacy format check: if it has {success: true}, it's inconsistent
            elif 'success' in result:
                format_valid = False
                format_error = "Found legacy format with 'success' field instead of standardized 'status' field"
            # If neither format, it might be a direct data response (acceptable for some tools)
            
        # Update success based on both tool execution and format consistency
        final_success = success and format_valid
        
        self.test_results[f"{tool_name}_format_check"] = {
            "description": f"{description} (with response format validation)",
            "success": final_success,
            "result": result,
            "format_valid": format_valid,
            "format_error": format_error
        }
        
        if final_success:
            print(f"  ✅ PASSED (response format consistent)")
            self.passed += 1
            return True
        else:
            if not success:
                error_msg = result.get("error", "Unknown error") if result else "No result"
                print(f"  ❌ FAILED: {error_msg}")
                self.errors.append(f"{tool_name}: {error_msg}")
            else:
                print(f"  ❌ FAILED: {format_error}")
                self.errors.append(f"{tool_name} response format: {format_error}")
            self.failed += 1
            return False

    def test_timeline_sorting(self, tool_name: str, params: Dict, description: str) -> bool:
        """Test timeline-based tools and validate chronological sorting"""
        print(f"Testing {tool_name}: {description}...")
        
        success, result = self.run_tool(tool_name, params)
        
        # Check if result contains an error field
        if success and isinstance(result, dict) and 'error' in result:
            success = False
        
        # Additional validation for timeline sorting if the tool succeeded
        timeline_sorted = True
        sort_error = ""
        
        if success and isinstance(result, dict) and 'timeline' in result:
            timeline = result['timeline']
            if timeline and len(timeline) > 1:
                # Parse dates and check if sorted
                try:
                    prev_date = None
                    for i, entry in enumerate(timeline):
                        if 'period' in entry:
                            # Parse period like "January 2024"
                            period = entry['period']
                            parts = period.split()
                            if len(parts) >= 2:
                                month_name = parts[0]
                                year = int(parts[1])
                                
                                # Map month names to numbers
                                month_map = {
                                    'January': 1, 'February': 2, 'March': 3, 'April': 4,
                                    'May': 5, 'June': 6, 'July': 7, 'August': 8,
                                    'September': 9, 'October': 10, 'November': 11, 'December': 12
                                }
                                
                                if month_name in month_map:
                                    current_date = year * 100 + month_map[month_name]
                                    
                                    if prev_date is not None and current_date < prev_date:
                                        timeline_sorted = False
                                        sort_error = f"Timeline not sorted: {timeline[i-1]['period']} comes before {period}"
                                        break
                                    
                                    prev_date = current_date
                except Exception as e:
                    sort_error = f"Error validating timeline sort order: {str(e)}"
                    timeline_sorted = False
        
        # Update success based on both tool execution and timeline sorting
        final_success = success and timeline_sorted
        
        self.test_results[f"{tool_name}_timeline_sort"] = {
            "description": f"{description} (with timeline sorting validation)",
            "success": final_success,
            "result": result,
            "timeline_sorted": timeline_sorted,
            "sort_error": sort_error
        }
        
        if final_success:
            print(f"  ✅ PASSED (timeline correctly sorted)")
            self.passed += 1
            return True
        else:
            if not success:
                error_msg = result.get("error", "Unknown error") if result else "No result"
                print(f"  ❌ FAILED: {error_msg}")
                self.errors.append(f"{tool_name}: {error_msg}")
            else:
                print(f"  ❌ FAILED: {sort_error}")
                self.errors.append(f"{tool_name} timeline sorting: {sort_error}")
            self.failed += 1
            return False
    
    def run_phase_1_tests(self):
        """Test Phase 1: Knowledge Graph & Relationships"""
        print("\n🧠 PHASE 1: Knowledge Graph & Relationships Tests")
        print("=" * 60)
        
        # Get some test documents first
        success, search_result = self.run_tool('search_devonthink', {'query': 'machine learning'})
        if not success or not search_result or 'documents' not in search_result or len(search_result['documents']) == 0:
            print("⚠️  Warning: No documents found for Phase 1 tests")
            return
        
        docs = search_result['documents'][:3]  # Use first 3 documents
        test_uuid = docs[0]['uuid']
        
        # Test knowledge graph
        self.test_tool(
            'build_knowledge_graph',
            {'uuid': test_uuid, 'maxDepth': 2},
            "Build knowledge graph with depth control"
        )
        
        # Test shortest path (if we have 2+ docs)
        if len(docs) >= 2:
            self.test_tool(
                'find_shortest_path',
                {'startUUID': docs[0]['uuid'], 'targetUUID': docs[1]['uuid']},
                "Find shortest path between documents"
            )
        
        # Test knowledge clusters
        self.test_tool(
            'detect_knowledge_clusters',
            {'searchQuery': 'machine learning', 'maxDocuments': 20},
            "Detect knowledge clusters"
        )
        
        # Test document connections
        self.test_tool(
            'find_connections',
            {'uuid': test_uuid, 'maxResults': 5},
            "Find document connections"
        )
        
        # Test document comparison
        if len(docs) >= 2:
            self.test_tool(
                'compare_documents',
                {'uuid1': docs[0]['uuid'], 'uuid2': docs[1]['uuid']},
                "Compare two documents"
            )
    
    def run_phase_2_tests(self):
        """Test Phase 2: Research Automation"""
        print("\n🔬 PHASE 2: Research Automation Tests")
        print("=" * 60)
        
        # Test research workflows with a limit for faster testing
        # Note: In production, automate_research would process up to 20 docs by default
        self.test_tool(
            'automate_research',
            {'workflowType': 'explore_topic', 'queryOrUUID': 'machine learning'},
            "Explore topic research workflow (limited to 5 docs for testing)"
        )
        
        # Test optimized organize findings
        self.test_tool(
            'organize_findings',
            {'searchQuery': 'machine learning', 'maxResults': 10},
            "Optimized organize findings workflow"
        )
        
        # Test collection creation
        self.test_tool(
            'create_collection',
            {'name': 'Test Collection', 'description': 'Automated test collection'},
            "Create research collection"
        )
    
    def run_phase_3_tests(self):
        """Test Phase 3: Document Intelligence"""
        print("\n📊 PHASE 3: Document Intelligence Tests")  
        print("=" * 60)
        
        # Get test document
        success, search_result = self.run_tool('search_devonthink', {'query': 'test'})
        if not success or not search_result or 'documents' not in search_result or len(search_result['documents']) == 0:
            print("⚠️  Warning: No documents found for Phase 3 tests")
            return
        
        test_doc = search_result['documents'][0]
        
        # Test document analysis
        self.test_tool(
            'analyze_document',
            {'uuid': test_doc['uuid']},
            "Analyze document complexity and readability"
        )
        
        # Test document similarity (if multiple docs available)
        docs = search_result['documents'][:3]
        if len(docs) >= 2:
            uuids = [doc['uuid'] for doc in docs]
            self.test_tool(
                'analyze_document_similarity',
                {'uuids': uuids},
                "Analyze multi-document similarity"
            )
    
    def run_phase_4_tests(self):
        """Test Phase 4: Knowledge Synthesis"""
        print("\n🔬 PHASE 4: Knowledge Synthesis Tests")
        print("=" * 60)
        
        # Get test documents
        success, search_result = self.run_tool('search_devonthink', {'query': 'machine learning'})
        if not success or not search_result or 'documents' not in search_result or len(search_result['documents']) == 0:
            print("⚠️  Warning: No documents found for Phase 4 tests")
            return
        
        docs = search_result['documents'][:3]
        uuids = [doc['uuid'] for doc in docs]
        
        # Test document synthesis
        self.test_tool(
            'synthesize_documents',
            {'documentUUIDs': uuids, 'synthesisType': 'summary'},
            "Synthesize multiple documents"
        )
        
        # Test theme extraction
        self.test_tool(
            'extract_themes',
            {'documentUUIDs': uuids},
            "Extract themes from document collection"
        )
        
        # Test multi-level summary
        self.test_tool(
            'create_multi_level_summary',
            {'documentUUIDs': uuids, 'summaryLevel': 'brief'},
            "Create multi-level summary"
        )
        
        # Test topic evolution with timeline sorting validation
        self.test_timeline_sorting(
            'track_topic_evolution',
            {'topic': 'machine learning', 'timeRange': 'month'},
            "Track topic evolution over time"
        )
        
        # Test knowledge timeline
        self.test_tool(
            'create_knowledge_timeline',
            {'documentUUIDs': uuids},
            "Create knowledge timeline"
        )
        
        # Test trend identification
        self.test_tool(
            'identify_trends',
            {},
            "Identify trending topics"
        )
    
    def run_core_tests(self):
        """Test Core DEVONthink Operations"""
        print("\n🔍 CORE: Basic DEVONthink Operations Tests")
        print("=" * 60)
        
        # Test basic search
        self.test_tool(
            'search_devonthink',
            {'query': 'test'},
            "Basic document search"
        )
        
        # Test search with database parameter
        self.test_tool(
            'search_devonthink',
            {'query': 'test', 'database': 'Sims'},
            "Search within specific database"
        )
        
        # Test database listing
        self.test_tool(
            'list_databases',
            {},
            "List DEVONthink databases"
        )
        
        # Test document reading
        success, search_result = self.run_tool('search_devonthink', {'query': 'test'})
        if success and search_result and len(search_result) > 0 and 'documents' in search_result and len(search_result['documents']) > 0:
            test_uuid = search_result['documents'][0]['uuid']
            self.test_tool(
                'read_document',
                {'uuid': test_uuid, 'includeContent': False},
                "Read document metadata"
            )
        
        # Test batch search
        self.test_tool(
            'batch_search',
            {'queries': ['test', 'machine learning']},
            "Batch search multiple queries"
        )
    
    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 DEVONthink MCP Server - Comprehensive Test Suite")
        print("=" * 70)
        print("Testing all 25+ tools across 4 implementation phases...")
        
        start_time = time.time()
        
        # Run all test phases
        self.run_core_tests()
        self.run_phase_1_tests()
        self.run_phase_2_tests() 
        self.run_phase_3_tests()
        self.run_phase_4_tests()
        
        # Calculate results
        total_tests = self.passed + self.failed
        success_rate = (self.passed / total_tests * 100) if total_tests > 0 else 0
        duration = time.time() - start_time
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.passed} ✅")
        print(f"Failed: {self.failed} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.1f}s")
        
        if self.failed > 0:
            print("\n❌ FAILED TESTS:")
            for error in self.errors:
                print(f"  • {error}")
        
        # Save detailed results
        self.save_test_results()
        
        # Return exit code
        return 0 if self.failed == 0 else 1
    
    def save_test_results(self):
        """Save detailed test results to file"""
        results = {
            "summary": {
                "total_tests": self.passed + self.failed,
                "passed": self.passed,
                "failed": self.failed,
                "success_rate": (self.passed / (self.passed + self.failed) * 100) if (self.passed + self.failed) > 0 else 0
            },
            "tests": self.test_results,
            "errors": self.errors
        }
        
        with open('test_results_comprehensive.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: test_results_comprehensive.json")

def main():
    """Main test runner"""
    tester = DEVONthinkMCPTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)

if __name__ == '__main__':
    main()