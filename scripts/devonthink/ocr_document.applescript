-- Include utility functions
on escapeString(inputString)
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set escapedString to textItems as string
    set AppleScript's text item delimiters to ""
    return escapedString
end escapeString

on run argv
    set documentUUID to item 1 of argv
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Check if it's a PDF or image
            set docType to type of theRecord as string
            if docType does not contain "PDF" and docType does not contain "image" then
                return "{\"error\":\"Document is not a PDF or image. Type: " & docType & "\"}"
            end if
            
            -- Perform OCR
            convert image record theRecord
            
            -- Return success with document info
            set jsonResponse to "{"
            set jsonResponse to jsonResponse & "\"status\":\"success\","
            set jsonResponse to jsonResponse & "\"data\":{"
            set jsonResponse to jsonResponse & "\"message\":\"OCR processing initiated\","
            set jsonResponse to jsonResponse & "\"uuid\":\"" & uuid of theRecord & "\","
            set jsonResponse to jsonResponse & "\"name\":\"" & my escapeString(name of theRecord) & "\","
            set jsonResponse to jsonResponse & "\"type\":\"" & (type of theRecord as string) & "\""
            set jsonResponse to jsonResponse & "}}"
            
            return jsonResponse
        on error errMsg
            return "{\"error\":\"OCR failed: " & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run