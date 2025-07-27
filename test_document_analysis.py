#!/usr/bin/env python3
"""Test document analysis features of the DEVONthink MCP server"""

import subprocess
import json
import sys

def run_mcp_tool(tool_name, params):
    """Run an MCP tool via the test harness"""
    cmd = [
        'node',
        'test_mcp_tool.js',
        tool_name,
        json.dumps(params)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"Error running {tool_name}: {result.stderr}")
            return None
        
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON output: {result.stdout}")
            return None
    except subprocess.TimeoutExpired:
        print(f"Tool {tool_name} timed out")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_analyze_document():
    """Test the analyze_document tool"""
    print("=== Testing Document Analysis ===\n")
    
    # First, search for a document to analyze
    print("1. Searching for documents about 'machine learning'...")
    search_result = run_mcp_tool('search_devonthink', {'query': 'machine learning'})
    
    if not search_result or not search_result.get('documents'):
        print("No documents found to analyze")
        return
    
    # Take the first document
    first_doc = search_result['documents'][0]
    doc_uuid = first_doc['uuid']
    doc_name = first_doc['name']
    
    print(f"\n2. Analyzing document: {doc_name}")
    print(f"   UUID: {doc_uuid}")
    
    # Analyze the document
    analysis = run_mcp_tool('analyze_document', {'uuid': doc_uuid})
    
    if analysis:
        print("\n3. Document Analysis Results:")
        print(json.dumps(analysis, indent=2))
        
        if 'metrics' in analysis:
            metrics = analysis['metrics']
            print(f"\n4. Key Metrics:")
            print(f"   - Word Count: {metrics.get('wordCount', 'N/A')}")
            print(f"   - Readability Score: {metrics.get('readabilityScore', 'N/A'):.1f}")
            print(f"   - Readability Level: {metrics.get('readabilityLevel', 'N/A')}")
            print(f"   - Avg Sentence Length: {metrics.get('avgSentenceLength', 'N/A'):.1f} words")
        
        if 'keySentences' in analysis and analysis['keySentences']:
            print(f"\n5. Key Sentences ({len(analysis['keySentences'])} found):")
            for i, sentence in enumerate(analysis['keySentences'][:3], 1):
                print(f"   {i}. {sentence[:100]}...")
    else:
        print("Document analysis failed")

def test_document_similarity():
    """Test the analyze_document_similarity tool"""
    print("\n\n=== Testing Document Similarity ===\n")
    
    # Search for documents about two related topics
    print("1. Searching for documents...")
    ml_result = run_mcp_tool('search_devonthink', {'query': 'machine learning'})
    ai_result = run_mcp_tool('search_devonthink', {'query': 'artificial intelligence'})
    
    if not ml_result or not ai_result:
        print("Failed to find documents for comparison")
        return
    
    ml_docs = ml_result.get('documents', [])[:2]  # First 2 ML docs
    ai_docs = ai_result.get('documents', [])[:1]  # First AI doc
    
    if len(ml_docs) < 2 or len(ai_docs) < 1:
        print("Not enough documents found for comparison")
        return
    
    # Collect UUIDs for comparison
    uuids = [ml_docs[0]['uuid'], ml_docs[1]['uuid'], ai_docs[0]['uuid']]
    names = [ml_docs[0]['name'], ml_docs[1]['name'], ai_docs[0]['name']]
    
    print("\n2. Comparing documents:")
    for i, (uuid, name) in enumerate(zip(uuids, names), 1):
        print(f"   {i}. {name[:60]}...")
        print(f"      UUID: {uuid}")
    
    # Compare documents
    print("\n3. Running similarity analysis...")
    similarity = run_mcp_tool('analyze_document_similarity', {'uuids': uuids})
    
    if similarity:
        print("\n4. Similarity Results:")
        print(json.dumps(similarity, indent=2))
        
        if 'comparisons' in similarity:
            print(f"\n5. Pairwise Comparisons ({len(similarity['comparisons'])} pairs):")
            for comp in similarity['comparisons']:
                print(f"   - Documents {comp['document1'][:8]}... vs {comp['document2'][:8]}...")
                print(f"     Similarity: {comp['similarity']:.2%}")
                print(f"     Common words: {comp['commonWords']}")
                print(f"     Common tags: {comp['commonTags']}")
    else:
        print("Document similarity analysis failed")

if __name__ == '__main__':
    # Test document analysis first
    test_analyze_document()
    
    # Then test similarity comparison
    test_document_similarity()