-- Compare two documents for similarity
-- Returns common tags, word count comparison, and basic similarity

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing document UUIDs\"}"
    end if
    
    set uuid1 to item 1 of argv
    set uuid2 to item 2 of argv
    
    tell application id "DNtp"
        try
            set doc1 to get record with uuid uuid1
            set doc2 to get record with uuid uuid2
            
            if doc1 is missing value or doc2 is missing value then
                return "{\"error\":\"One or both documents not found\"}"
            end if
            
            -- Get document properties
            set name1 to name of doc1
            set name2 to name of doc2
            set tags1 to tags of doc1
            set tags2 to tags of doc2
            set text1 to plain text of doc1
            set text2 to plain text of doc2
            set wordCount1 to count words of text1
            set wordCount2 to count words of text2
            
            -- Find common tags
            set commonTags to {}
            repeat with tag1 in tags1
                if tags2 contains tag1 then
                    set end of commonTags to tag1 as string
                end if
            end repeat
            
            -- Calculate basic similarity metrics
            set tagSimilarity to 0.0
            if (count of tags1) > 0 or (count of tags2) > 0 then
                set tagSimilarity to (count of commonTags) * 2.0 / ((count of tags1) + (count of tags2))
            end if
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"document1\":{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & uuid1 & "\","
            set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(name1) & "\","
            set jsonOutput to jsonOutput & "\"wordCount\":" & wordCount1 & ","
            set jsonOutput to jsonOutput & "\"tagCount\":" & (count of tags1)
            set jsonOutput to jsonOutput & "},"
            
            set jsonOutput to jsonOutput & "\"document2\":{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & uuid2 & "\","
            set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(name2) & "\","
            set jsonOutput to jsonOutput & "\"wordCount\":" & wordCount2 & ","
            set jsonOutput to jsonOutput & "\"tagCount\":" & (count of tags2)
            set jsonOutput to jsonOutput & "},"
            
            set jsonOutput to jsonOutput & "\"comparison\":{"
            set jsonOutput to jsonOutput & "\"commonTags\":["
            
            repeat with i from 1 to count of commonTags
                set jsonOutput to jsonOutput & "\"" & (item i of commonTags) & "\""
                if i < count of commonTags then set jsonOutput to jsonOutput & ","
            end repeat
            
            set jsonOutput to jsonOutput & "],"
            set jsonOutput to jsonOutput & "\"commonTagCount\":" & (count of commonTags) & ","
            set jsonOutput to jsonOutput & "\"tagSimilarity\":" & tagSimilarity & ","
            set jsonOutput to jsonOutput & "\"wordCountDifference\":" & (wordCount1 - wordCount2)
            set jsonOutput to jsonOutput & "}}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Utility function to escape special characters
on escapeString(inputString)
    set inputString to inputString as string
    set AppleScript's text item delimiters to "\\"
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\\"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to "/"
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\/"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 10
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 13
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\r"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 9
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\t"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ""
    
    return inputString
end escapeString