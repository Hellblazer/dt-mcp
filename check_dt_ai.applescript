-- Check DEVONthink AI capabilities
on run
    tell application id "DNtp"
        -- Get a document to test with
        set searchResults to search "test"
        if (count of searchResults) = 0 then return "No documents found"
        
        set testDoc to item 1 of searchResults
        set output to "Testing: " & (name of testDoc) & "\n\n"
        
        -- 1. Classification (AI-based grouping suggestions)
        try
            set suggestions to classify record testDoc
            set output to output & "✓ Classification: " & (count of suggestions) & " suggestions\n"
            repeat with i from 1 to 3
                if i > (count of suggestions) then exit repeat
                set g to item i of suggestions
                set output to output & "  " & (location of g) & (name of g) & "\n"
            end repeat
        on error errMsg
            set output to output & "✗ Classification: " & errMsg & "\n"
        end try
        
        -- 2. Auto-classification
        try
            set bestGroup to auto classify record testDoc
            if bestGroup is not missing value then
                set output to output & "✓ Auto-classify: " & (name of bestGroup) & "\n"
            else
                set output to output & "✓ Auto-classify: No strong match\n"
            end if
        on error errMsg
            set output to output & "✗ Auto-classify: " & errMsg & "\n"
        end try
        
        -- 3. Word statistics
        try
            set docText to plain text of testDoc
            set wordCount to count words of docText
            set charCount to count characters of docText
            set output to output & "✓ Text analysis: " & wordCount & " words, " & charCount & " chars\n"
        on error
            set output to output & "✗ Text analysis: Not available\n"
        end try
        
        -- 4. Check for related content
        try
            -- Get database for the record
            set theDB to database of testDoc
            -- Search for similar content
            set similarSearch to search (name of testDoc) in theDB
            set output to output & "✓ Similar content: " & ((count of similarSearch) - 1) & " matches\n"
        on error
            set output to output & "✗ Similar content: Not available\n"
        end try
        
        return output
    end tell
end run