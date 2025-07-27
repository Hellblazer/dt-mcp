#!/bin/bash
# Minimal test for organize_findings workflow

echo "Testing organize_findings workflow with a specific query..."
echo

# Try with a very specific query that should return fewer results
query="machine learning algorithm"

echo "Query: '$query'"
echo "Running AppleScript..."

# Run with timeout command to prevent hanging
timeout 30 osascript scripts/devonthink/automate_research.applescript "organize_findings" "$query" 2>&1

exit_code=$?

if [ $exit_code -eq 124 ]; then
    echo
    echo "Error: Command timed out after 30 seconds"
    echo "This likely means:"
    echo "1. The search returned too many results to process efficiently"
    echo "2. DEVONthink may be unresponsive"
    echo "3. The database might be very large"
    echo
    echo "Try with a more specific query or check DEVONthink's status"
elif [ $exit_code -ne 0 ]; then
    echo
    echo "Error: Command failed with exit code $exit_code"
else
    echo
    echo "Success! Check DEVONthink for the organized collection."
fi