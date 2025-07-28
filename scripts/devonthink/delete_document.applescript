-- Delete Document in DEVONthink
-- IMPORTANT: This operation is destructive and cannot be undone
-- Use with extreme caution

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing required parameter: uuid\"}"
    end if
    
    set documentUUID to item 1 of argv
    set confirmDelete to true
    
    -- Optional confirmation parameter
    if (count of argv) > 1 then
        set confirmParam to item 2 of argv
        if confirmParam is "false" then
            set confirmDelete to false
        end if
    end if
    
    tell application id "DNtp"
        try
            -- Find the document
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document with UUID '" & documentUUID & "' not found\"}"
            end if
            
            -- Get document info before deletion for confirmation
            set docName to name of theRecord
            set docPath to path of theRecord
            set docType to type of theRecord as string
            
            -- Safety check: require confirmation for deletion
            if confirmDelete then
                set deleteConfirmation to display dialog "Are you sure you want to delete this document?" & return & return & "Name: " & docName & return & "Path: " & docPath & return & return & "This action cannot be undone." buttons {"Cancel", "Delete"} default button "Cancel" with icon caution
                
                if button returned of deleteConfirmation is "Cancel" then
                    return "{\"error\":\"Deletion cancelled by user\"}"
                end if
            end if
            
            -- Perform deletion
            delete record theRecord
            
            -- Return success response with deleted document info
            set jsonResponse to "{"
            set jsonResponse to jsonResponse & "\"status\":\"success\","
            set jsonResponse to jsonResponse & "\"data\":{"
            set jsonResponse to jsonResponse & "\"message\":\"Document deleted successfully\","
            set jsonResponse to jsonResponse & "\"deletedDocument\":{"
            set jsonResponse to jsonResponse & "\"uuid\":\"" & documentUUID & "\","
            set jsonResponse to jsonResponse & "\"name\":\"" & my escapeString(docName) & "\","
            set jsonResponse to jsonResponse & "\"path\":\"" & my escapeString(docPath) & "\","
            set jsonResponse to jsonResponse & "\"type\":\"" & docType & "\""
            set jsonResponse to jsonResponse & "},"
            set jsonResponse to jsonResponse & "\"timestamp\":\"" & (current date as string) & "\""
            set jsonResponse to jsonResponse & "}}"
            
            return jsonResponse
            
        on error errMsg
            return "{\"error\":\"Failed to delete document with UUID '" & documentUUID & "': " & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Helper: Escape string for JSON
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
    
    set AppleScript's text item delimiters to ASCII character 10
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 13
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\r"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ""
    
    return inputString
end escapeString