-- Simplified Document Analysis
-- Debug version to find the issue

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing required parameter: document UUID\"}"
    end if
    
    set documentUUID to item 1 of argv
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Get basic info
            set docName to name of theRecord
            set docType to type of theRecord as string
            
            -- Get text content carefully
            set docText to ""
            try
                set docText to plain text of theRecord
            on error
                set docText to ""
            end try
            
            if docText = "" or docText is missing value then
                set docText to "empty document"
            end if
            
            -- Count words without using 'words of'
            set wordCount to 0
            try
                set AppleScript's text item delimiters to {" ", tab, return, ASCII character 10}
                set wordList to text items of docText
                repeat with aWord in wordList
                    if length of aWord > 0 then
                        set wordCount to wordCount + 1
                    end if
                end repeat
                set AppleScript's text item delimiters to ""
            on error
                set wordCount to 0
            end try
            
            -- Count characters
            set charCount to 0
            try
                set charCount to count characters of docText
            on error
                set charCount to 0
            end try
            
            -- Build simple JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & documentUUID & "\","
            set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(docName) & "\","
            set jsonOutput to jsonOutput & "\"type\":\"" & docType & "\","
            set jsonOutput to jsonOutput & "\"wordCount\":" & wordCount & ","
            set jsonOutput to jsonOutput & "\"characterCount\":" & charCount & ","
            set jsonOutput to jsonOutput & "\"textSample\":\"" & my escapeString(text 1 through (my getMinimum(50, length of docText)) of docText) & "\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Simple escape function
on escapeString(inputString)
    set inputString to inputString as string
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set outputString to textItems as text
    set AppleScript's text item delimiters to ""
    return outputString
end escapeString

-- Helper for minimum
on getMinimum(a, b)
    if a < b then
        return a
    else
        return b
    end if
end getMinimum