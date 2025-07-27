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
    set documentUUID to item 1 of argv
    set maxResults to 10
    if (count of argv) > 1 then set maxResults to (item 2 of argv as integer)
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Get related documents using DEVONthink's "See Also" feature
            set relatedRecords to compare record theRecord
            
            set jsonOutput to "["
            set resultCount to 0
            repeat with i from 1 to count of relatedRecords
                if resultCount ≥ maxResults then exit repeat
                set resultCount to resultCount + 1
                
                set jsonOutput to jsonOutput & my recordToJSON(item i of relatedRecords)
                if i < count of relatedRecords and resultCount < maxResults then 
                    set jsonOutput to jsonOutput & ","
                end if
            end repeat
            set jsonOutput to jsonOutput & "]"
            
            return jsonOutput
        on error errMsg
            return "{\"error\":\"Failed to get related documents: " & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run