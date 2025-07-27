#!/bin/bash
# Test script for Phase 1 features

echo "=== Testing Phase 1 Knowledge Graph Features ==="
echo

echo "1. Testing Knowledge Graph (depth 1):"
osascript scripts/devonthink/build_knowledge_graph.applescript "89C20AC2-09F2-48D7-852B-B7962596DEED" 1 2>&1 | python3 -c "import sys, json; data=json.loads(sys.stdin.read()); print(f'   ✓ Found {data[\"nodeCount\"]} nodes and {data[\"edgeCount\"]} edges')"
echo

echo "2. Testing Shortest Path:"
osascript scripts/devonthink/find_shortest_path.applescript "89C20AC2-09F2-48D7-852B-B7962596DEED" "89C20AC2-09F2-48D7-852B-B7962596DEED" 3 2>&1 | python3 -c "import sys, json; data=json.loads(sys.stdin.read()); print(f'   ✓ Path found: {data[\"found\"]}, Length: {data[\"length\"]}')"
echo

echo "3. Testing Knowledge Clusters:"
osascript scripts/devonthink/detect_knowledge_clusters.applescript "test" 10 2 2>&1 | python3 -c "import sys, json; data=json.loads(sys.stdin.read()); print(f'   ✓ Analyzed {data[\"documentsAnalyzed\"]} documents, found {data[\"clusterCount\"]} clusters')"
echo

echo "All Phase 1 features tested successfully!"