-- Add document to a collection (research thread)
-- Replicates document to collection and updates metadata

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing collection UUID or document UUID\"}"
    end if
    
    set collectionUUID to item 1 of argv
    set documentUUID to item 2 of argv
    set notes to ""
    
    if (count of argv) > 2 then
        set notes to item 3 of argv
    end if
    
    tell application id "DNtp"
        try
            set collectionGroup to get record with uuid collectionUUID
            set targetDoc to get record with uuid documentUUID
            
            if collectionGroup is missing value then
                return "{\"error\":\"Collection not found\"}"
            end if
            
            if targetDoc is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Check if document already in collection
            set existingDocs to children of collectionGroup
            repeat with existingDoc in existingDocs
                if uuid of existingDoc is equal to documentUUID then
                    return "{\"error\":\"Document already in collection\"}"
                end if
            end repeat
            
            -- Replicate document to collection
            replicate record targetDoc to collectionGroup
            
            -- Update README if it exists
            set readmeFound to false
            repeat with childItem in (children of collectionGroup)
                if name of childItem is "README" then
                    set readmeDoc to childItem
                    set readmeFound to true
                    exit repeat
                end if
            end repeat
            
            if readmeFound then
                set currentContent to plain text of readmeDoc
                set newEntry to return & "- **" & (name of targetDoc) & "**"
                if notes is not "" then
                    set newEntry to newEntry & " - " & notes
                end if
                set newEntry to newEntry & " (Added: " & (current date as string) & ")"
                set plain text of readmeDoc to currentContent & newEntry
            end if
            
            -- Return success
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"status\":\"success\","
            set jsonOutput to jsonOutput & "\"data\":{"
            set jsonOutput to jsonOutput & "\"collectionUUID\":\"" & collectionUUID & "\","
            set jsonOutput to jsonOutput & "\"documentUUID\":\"" & documentUUID & "\","
            set jsonOutput to jsonOutput & "\"documentName\":\"" & my escapeString(name of targetDoc) & "\","
            set jsonOutput to jsonOutput & "\"added\":\"" & (current date as string) & "\""
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