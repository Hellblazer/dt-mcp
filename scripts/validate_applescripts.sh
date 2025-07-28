#!/bin/bash
# Validate all AppleScript files in the project

echo "🔍 Validating AppleScript files..."
echo "================================"

# Track validation results
failed=0
passed=0
total=0

# Find all .applescript files
for script in scripts/devonthink/*.applescript; do
    if [ -f "$script" ]; then
        total=$((total + 1))
        echo -n "Checking $(basename "$script")... "
        
        # Use osacompile to validate syntax
        # -o /dev/null outputs to nowhere, we just want syntax check
        if osacompile -o /dev/null "$script" 2>/dev/null; then
            echo "✅ PASSED"
            passed=$((passed + 1))
        else
            echo "❌ FAILED"
            # Show the error
            echo "  Error details:"
            osacompile -o /dev/null "$script" 2>&1 | sed 's/^/    /'
            failed=$((failed + 1))
        fi
    fi
done

echo "================================"
echo "📊 Validation Summary:"
echo "  Total scripts: $total"
echo "  Passed: $passed ✅"
echo "  Failed: $failed ❌"

# Exit with error code if any scripts failed
if [ $failed -gt 0 ]; then
    echo ""
    echo "⚠️  Some scripts have syntax errors! Fix them before proceeding."
    exit 1
else
    echo ""
    echo "✨ All AppleScript files are valid!"
    exit 0
fi