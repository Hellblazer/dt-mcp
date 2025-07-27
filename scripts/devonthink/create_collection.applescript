-- Create a document collection (research thread)
-- Groups related documents for focused research

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing collection name or description\"}"
    end if
    
    set collectionName to item 1 of argv
    set collectionDescription to item 2 of argv
    set targetDatabase to ""
    
    if (count of argv) > 2 then
        set targetDatabase to item 3 of argv
    end if
    
    tell application id "DNtp"
        try
            -- Determine target database
            if targetDatabase is "" then
                set targetDB to current database
            else
                set targetDB to database targetDatabase
            end if
            
            if targetDB is missing value then
                return "{\"error\":\"Database not found\"}"
            end if
            
            -- Create collection group
            set collectionGroup to create record with {name:collectionName, type:group, comment:collectionDescription} in targetDB
            
            -- Create metadata document
            set metadataContent to "# Research Collection: " & collectionName & return & return
            set metadataContent to metadataContent & "**Description:** " & collectionDescription & return
            set metadataContent to metadataContent & "**Created:** " & (current date as string) & return & return
            set metadataContent to metadataContent & "## Documents" & return & return
            set metadataContent to metadataContent & "Documents will be added to this collection as research progresses." & return
            
            set metadataDoc to create record with {name:"README", type:markdown, content:metadataContent} in collectionGroup
            
            -- Return collection info
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & (uuid of collectionGroup) & "\","
            set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(collectionName) & "\","
            set jsonOutput to jsonOutput & "\"description\":\"" & my escapeString(collectionDescription) & "\","
            set jsonOutput to jsonOutput & "\"database\":\"" & my escapeString(name of targetDB) & "\","
            set jsonOutput to jsonOutput & "\"created\":\"" & (current date as string) & "\","
            set jsonOutput to jsonOutput & "\"metadataUUID\":\"" & (uuid of metadataDoc) & "\""
            set jsonOutput to jsonOutput & "}"
            
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