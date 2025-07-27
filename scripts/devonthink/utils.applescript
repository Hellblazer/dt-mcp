-- DEVONthink MCP Server Utilities
-- Common functions for DEVONthink operations

on isDEVONthinkRunning()
    tell application "System Events"
        return exists process "DEVONthink"
    end tell
end isDEVONthinkRunning

on ensureDEVONthinkRunning()
    if not isDEVONthinkRunning() then
        tell application id "DNtp" to activate
        delay 2
    end if
end ensureDEVONthinkRunning

on escapeString(inputString)
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set escapedString to textItems as string
    set AppleScript's text item delimiters to ""
    return escapedString
end escapeString

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

on tagsToJSON(tagList)
    set jsonTags to ""
    repeat with i from 1 to count of tagList
        set jsonTags to jsonTags & "\"" & my escapeString(item i of tagList) & "\""
        if i < count of tagList then set jsonTags to jsonTags & ","
    end repeat
    return jsonTags
end tagsToJSON