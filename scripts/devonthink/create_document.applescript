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
    set docName to item 1 of argv
    set docContent to item 2 of argv
    set docType to item 3 of argv -- "markdown", "rtf", "txt"
    set groupPath to ""
    if (count of argv) > 3 then set groupPath to item 4 of argv
    
    tell application id "DNtp"
        set targetGroup to current group
        if groupPath is not "" then
            set targetGroup to get record at groupPath
        end if
        
        if docType is "markdown" then
            set newRecord to create record with {name:docName, type:markdown, content:docContent} in targetGroup
        else if docType is "rtf" then
            set newRecord to create record with {name:docName, type:rtf, rich text:docContent} in targetGroup
        else
            set newRecord to create record with {name:docName, type:txt, plain text:docContent} in targetGroup
        end if
        
        return my recordToJSON(newRecord)
    end tell
end run