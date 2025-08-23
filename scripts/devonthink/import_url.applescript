#!/usr/bin/osascript

on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"URL parameter required\"}"
    end if
    
    set urlString to item 1 of argv
    set extractMetadata to false
    
    -- Parse additional parameters if provided
    if (count of argv) > 1 then
        try
            set paramsJson to item 2 of argv
            if paramsJson contains "\"extractMetadata\":true" then
                set extractMetadata to true
            end if
        end try
    end if
    
    try
        -- Security validation
        if not (urlString starts with "http://" or urlString starts with "https://") then
            return "{\"error\": \"Invalid URL format - must start with http:// or https://\", \"code\": \"INVALID_URL\"}"
        end if
        
        tell application id "DNtp"
            set targetDb to current database
            
            -- Create unique temp file name
            set tempFileName to "url_import_" & ((current date) as string)
            set tempFileName to my replaceString(tempFileName, ":", "_")
            set tempFileName to my replaceString(tempFileName, " ", "_")
            set posixTempFile to "/tmp/" & tempFileName & ".html"
            
            -- Download with curl
            set curlCommand to "curl -L -o " & quoted form of posixTempFile & " " & quoted form of urlString
            try
                do shell script curlCommand
            on error curlErr
                return "{\"error\": \"Failed to download URL: " & curlErr & "\", \"code\": \"DOWNLOAD_FAILED\"}"
            end try
            
            -- Check if file was downloaded
            tell application "System Events"
                if not (exists file posixTempFile) then
                    return "{\"error\": \"Download failed - file not created\", \"code\": \"DOWNLOAD_FAILED\"}"
                end if
            end tell
            
            -- Import the downloaded file
            try
                set importedRecord to import posixTempFile to targetDb
                
                if importedRecord is missing value then
                    -- Clean up temp file
                    try
                        do shell script "rm " & quoted form of posixTempFile
                    end try
                    return "{\"error\": \"Failed to import downloaded content\", \"code\": \"IMPORT_FAILED\"}"
                end if
                
                -- Set the URL as the document's URL
                try
                    set URL of importedRecord to urlString
                end try
                
                -- Clean up temp file
                try
                    do shell script "rm " & quoted form of posixTempFile
                end try
                
                -- Build success result
                set docUUID to uuid of importedRecord
                set docName to name of importedRecord
                set docPath to location of importedRecord
                
                set resultJson to "{\"success\": true"
                set resultJson to resultJson & ", \"uuid\": \"" & docUUID & "\""
                set resultJson to resultJson & ", \"name\": \"" & my escapeJsonString(docName) & "\""
                set resultJson to resultJson & ", \"path\": \"" & my escapeJsonString(docPath) & "\""
                set resultJson to resultJson & ", \"url\": \"" & my escapeJsonString(urlString) & "\""
                set resultJson to resultJson & "}"
                
                return resultJson
                
            on error importErr
                -- Clean up temp file
                try
                    do shell script "rm " & quoted form of posixTempFile
                end try
                return "{\"error\": \"Import failed: " & importErr & "\", \"code\": \"IMPORT_FAILED\"}"
            end try
        end tell
        
    on error errMsg number errNum
        return "{\"error\": \"" & my escapeJsonString(errMsg) & "\", \"code\": \"APPLESCRIPT_ERROR\", \"number\": " & errNum & "}"
    end try
end run

-- JSON string escaping
on escapeJsonString(str)
    set str to my replaceString(str, "\\", "\\\\")
    set str to my replaceString(str, "\"", "\\\"")
    set str to my replaceString(str, return, "\\n")
    set str to my replaceString(str, "\r", "\\r")
    set str to my replaceString(str, "	", "\\t")
    return str
end escapeJsonString

-- String replacement utility
on replaceString(str, searchStr, replaceStr)
    set AppleScript's text item delimiters to searchStr
    set stringParts to text items of str
    set AppleScript's text item delimiters to replaceStr
    set newString to stringParts as string
    set AppleScript's text item delimiters to ""
    return newString
end replaceString