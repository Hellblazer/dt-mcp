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
    set outputFormat to "text"
    if (count of argv) > 1 then set outputFormat to item 2 of argv
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document with UUID '" & documentUUID & "' not found\"}"
            end if
        on error errMsg
            return "{\"error\":\"Document with UUID '" & documentUUID & "' not found: " & my escapeString(errMsg) & "\"}"
        end try
        
        set recordInfo to my recordToJSON(theRecord)
        
        if outputFormat is "metadata" then
            return recordInfo
        else
            set docContent to ""
            set docType to type of theRecord as string
            
            if docType contains "PDF" then
                set docContent to plain text of theRecord
            else if docType contains "RTF" or docType contains "RTFD" then
                set docContent to plain text of theRecord
            else if docType contains "markdown" then
                set docContent to plain text of theRecord
            else
                try
                    set docContent to plain text of theRecord
                on error
                    set docContent to "[Content not available for this document type]"
                end try
            end if
            
            -- Build JSON response
            set jsonResponse to "{"
            set jsonResponse to jsonResponse & "\"metadata\":" & recordInfo & ","
            set jsonResponse to jsonResponse & "\"content\":\"" & my escapeString(docContent) & "\""
            set jsonResponse to jsonResponse & "}"
            
            return jsonResponse
        end if
    end tell
end run