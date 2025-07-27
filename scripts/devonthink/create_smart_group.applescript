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
    set groupName to item 1 of argv
    set searchQuery to item 2 of argv
    set databaseName to ""
    if (count of argv) > 2 then set databaseName to item 3 of argv
    
    tell application id "DNtp"
        try
            if databaseName is "" then
                set targetDB to current database
            else
                set targetDB to database databaseName
            end if
            
            -- Create the smart group with the search predicate
            set newSmartGroup to create record with {name:groupName, type:smart group, search predicates:searchQuery} in targetDB
            
            return my recordToJSON(newSmartGroup)
        on error errMsg
            return "{\"error\":\"Failed to create smart group: " & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run