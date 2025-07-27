#!/bin/bash

echo "Testing document similarity analysis..."

# Test with 2 documents
UUID1="4D9D8763-2BBB-462A-B550-53F31BE76666"
UUID2="67AE5CC7-D597-477D-B687-D0FCD8C24C97"

echo "Analyzing similarity between:"
echo "  1. Frontiers | A Path Toward Explainable AI..."
echo "  2. THE ETHICS OF ARTIFICIAL INTELLIGENCE"

osascript scripts/devonthink/analyze_document_similarity.applescript "$UUID1" "$UUID2"