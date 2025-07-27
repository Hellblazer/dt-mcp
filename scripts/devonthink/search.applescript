-- Include utility functions
on escapeString(inputString)
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set escapedString to textItems as string
    set AppleScript's text item delimiters to ""
    return escapedString
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
    
    tell application id "DNtp"
        try
            if databaseName is "" then
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
            
            set jsonOutput to "["
            repeat with i from 1 to count of searchResults
                set jsonOutput to jsonOutput & my recordToJSON(item i of searchResults)
                if i < count of searchResults then 
                    set jsonOutput to jsonOutput & ","
                end if
            end repeat
            set jsonOutput to jsonOutput & "]"
            
            return jsonOutput
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run