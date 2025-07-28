-- Include utility functions
on escapeString(inputString)
    set inputString to inputString as string
    
    -- Escape backslashes first
    set AppleScript's text item delimiters to "\\"
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\\"
    set inputString to textItems as string
    
    -- Escape double quotes
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as string
    
    -- Escape newlines
    set AppleScript's text item delimiters to return
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as string
    
    -- Escape line feeds
    set AppleScript's text item delimiters to linefeed
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as string
    
    -- Escape tabs
    set AppleScript's text item delimiters to tab
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\t"
    set inputString to textItems as string
    
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString

on tagsToJSON(tagList)
    set jsonTags to ""
    repeat with i from 1 to count of tagList
        set jsonTags to jsonTags & "\"" & my escapeString(item i of tagList) & "\""
        if i < count of tagList then set jsonTags to jsonTags & ","
    end repeat
    return jsonTags
end tagsToJSON

on recordToJSON(theRecord)
    tell application id "DNtp"
        set recordProps to properties of theRecord
        set jsonString to "{"
        set jsonString to jsonString & "\"uuid\":\"" & uuid of theRecord & "\","
        set jsonString to jsonString & "\"name\":\"" & my escapeString(name of theRecord) & "\","
        set jsonString to jsonString & "\"type\":\"" & (type of theRecord as string) & "\","
        set jsonString to jsonString & "\"path\":\"" & my escapeString(path of theRecord) & "\","
        set jsonString to jsonString & "\"tags\":[" & my tagsToJSON(tags of theRecord) & "],"
        set jsonString to jsonString & "\"size\":" & (size of theRecord) & ","
        set jsonString to jsonString & "\"created\":\"" & (creation date of theRecord as string) & "\","
        set jsonString to jsonString & "\"modified\":\"" & (modification date of theRecord as string) & "\""
        set jsonString to jsonString & "}"
        return jsonString
    end tell
end recordToJSON

on run argv
    set searchQuery to item 1 of argv
    set databaseName to ""
    if (count of argv) > 1 then set databaseName to item 2 of argv
    
    -- Set a reasonable maximum to prevent truncation
    set maxResults to 500
    
    tell application id "DNtp"
        try
            if databaseName is "" then
                -- Search across all databases
                set searchResults to search searchQuery
            else
                -- Try to get the database
                set targetDB to missing value
                repeat with db in databases
                    if name of db is databaseName then
                        set targetDB to db
                        exit repeat
                    end if
                end repeat
                
                if targetDB is missing value then
                    return "{\"error\":\"Database '" & databaseName & "' not found\"}"
                end if
                
                -- Use tell block for database-specific search
                tell targetDB
                    set searchResults to search searchQuery
                end tell
            end if
            
            -- Limit results to prevent truncation
            set resultCount to count of searchResults
            if resultCount > maxResults then
                set searchResults to items 1 thru maxResults of searchResults
                set wasTruncated to true
            else
                set wasTruncated to false
            end if
            
            set jsonOutput to "{\"results\":["
            repeat with i from 1 to count of searchResults
                set jsonOutput to jsonOutput & my recordToJSON(item i of searchResults)
                if i < count of searchResults then 
                    set jsonOutput to jsonOutput & ","
                end if
            end repeat
            set jsonOutput to jsonOutput & "],\"totalFound\":" & resultCount & ",\"truncated\":" & (wasTruncated as string) & "}"
            
            return jsonOutput
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run