-- Find connections between documents
-- Returns related documents with connection types

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing document UUID\"}"
    end if
    
    set documentUUID to item 1 of argv
    set maxResults to 10
    if (count of argv) > 1 then
        set maxResults to item 2 of argv as integer
    end if
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Get different types of connections
            -- Get AI-based related documents using compare
            set relatedList to {}
            try
                set relatedList to compare record theRecord
            end try
            set incomingList to incoming references of theRecord
            set outgoingList to outgoing references of theRecord
            
            -- Build connections array
            set jsonOutput to "{\"documentUUID\":\"" & documentUUID & "\","
            set jsonOutput to jsonOutput & "\"documentName\":\"" & my escapeString(name of theRecord) & "\","
            set jsonOutput to jsonOutput & "\"connections\":["
            
            set connectionCount to 0
            set addedComma to false
            
            -- Add AI-based related connections
            repeat with relatedRecord in relatedList
                if connectionCount < maxResults then
                    if addedComma then set jsonOutput to jsonOutput & ","
                    set jsonOutput to jsonOutput & "{"
                    set jsonOutput to jsonOutput & "\"uuid\":\"" & (uuid of relatedRecord) & "\","
                    set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(name of relatedRecord) & "\","
                    set jsonOutput to jsonOutput & "\"type\":\"ai_related\","
                    set jsonOutput to jsonOutput & "\"score\":0.9"
                    set jsonOutput to jsonOutput & "}"
                    set connectionCount to connectionCount + 1
                    set addedComma to true
                end if
            end repeat
            
            -- Add incoming references
            repeat with linkingRecord in incomingList
                if connectionCount < maxResults then
                    if addedComma then set jsonOutput to jsonOutput & ","
                    set jsonOutput to jsonOutput & "{"
                    set jsonOutput to jsonOutput & "\"uuid\":\"" & (uuid of linkingRecord) & "\","
                    set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(name of linkingRecord) & "\","
                    set jsonOutput to jsonOutput & "\"type\":\"referenced_by\","
                    set jsonOutput to jsonOutput & "\"score\":1.0"
                    set jsonOutput to jsonOutput & "}"
                    set connectionCount to connectionCount + 1
                    set addedComma to true
                end if
            end repeat
            
            -- Add outgoing references
            repeat with linkedRecord in outgoingList
                if connectionCount < maxResults then
                    if addedComma then set jsonOutput to jsonOutput & ","
                    set jsonOutput to jsonOutput & "{"
                    set jsonOutput to jsonOutput & "\"uuid\":\"" & (uuid of linkedRecord) & "\","
                    set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(name of linkedRecord) & "\","
                    set jsonOutput to jsonOutput & "\"type\":\"references\","
                    set jsonOutput to jsonOutput & "\"score\":1.0"
                    set jsonOutput to jsonOutput & "}"
                    set connectionCount to connectionCount + 1
                    set addedComma to true
                end if
            end repeat
            
            set jsonOutput to jsonOutput & "],"
            set jsonOutput to jsonOutput & "\"connectionCount\":" & connectionCount & "}"
            
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