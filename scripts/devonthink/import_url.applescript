#!/usr/bin/osascript

on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"URL parameter required\"}"
    end if
    
    set urlString to item 1 of argv
    set extractMetadata to false
    set customName to ""
    
    -- Parse additional parameters if provided
    if (count of argv) > 1 then
        try
            set paramsJson to item 2 of argv
            if paramsJson contains "\"extractMetadata\":true" then
                set extractMetadata to true
            end if
            if paramsJson contains "\"name\":" then
                set customName to my extractJsonValue(paramsJson, "name")
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
            
            -- First get content type with HEAD request
            set contentType to ""
            set fileExtension to ""
            try
                set headCommand to "curl -s -I " & quoted form of urlString & " | grep -i 'content-type:' | head -1 | cut -d' ' -f2- | tr -d '\\r\\n'"
                set contentType to do shell script headCommand
            end try
            
            -- Determine file extension based on URL first, then content type
            if urlString ends with ".pdf" or contentType contains "pdf" then
                set fileExtension to ".pdf"
            else if urlString ends with ".png" or contentType contains "image/png" then
                set fileExtension to ".png"
            else if (urlString ends with ".jpg" or urlString ends with ".jpeg") or (contentType contains "image/jpeg" or contentType contains "image/jpg") then
                set fileExtension to ".jpg"
            else if urlString ends with ".gif" or contentType contains "image/gif" then
                set fileExtension to ".gif"
            else if urlString ends with ".webp" or contentType contains "image/webp" then
                set fileExtension to ".webp"
            else if urlString ends with ".txt" or contentType contains "text/plain" then
                set fileExtension to ".txt"
            else if urlString ends with ".json" or contentType contains "application/json" then
                set fileExtension to ".json"
            else if (urlString ends with ".xml" or urlString ends with ".rss") or (contentType contains "application/xml" or contentType contains "text/xml") then
                set fileExtension to ".xml"
            else
                -- Default to html for web content
                set fileExtension to ".html"
            end if
            
            set posixTempFile to "/tmp/" & tempFileName & fileExtension
            
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
                
                -- Try to extract a better title or use custom name
                set finalDocName to ""
                if customName is not "" then
                    set finalDocName to customName
                else
                    -- Try to extract title from content
                    set extractedTitle to my extractTitle(posixTempFile, fileExtension, urlString)
                    if extractedTitle is not "" then
                        set finalDocName to extractedTitle
                    end if
                end if
                
                -- Set the document name if we have a better one
                if finalDocName is not "" then
                    try
                        set name of importedRecord to finalDocName
                    end try
                end if
                
                -- Clean up temp file
                try
                    do shell script "rm " & quoted form of posixTempFile
                end try
                
                -- Build success result (get name after potential rename)
                set docUUID to uuid of importedRecord
                set docName to name of importedRecord
                set docPath to location of importedRecord
                set docType to type of importedRecord
                
                set resultJson to "{\"success\": true"
                set resultJson to resultJson & ", \"uuid\": \"" & docUUID & "\""
                set resultJson to resultJson & ", \"name\": \"" & my escapeJsonString(docName) & "\""
                set resultJson to resultJson & ", \"path\": \"" & my escapeJsonString(docPath) & "\""
                set resultJson to resultJson & ", \"type\": \"" & my escapeJsonString(docType) & "\""
                set resultJson to resultJson & ", \"url\": \"" & my escapeJsonString(urlString) & "\""
                set resultJson to resultJson & ", \"contentType\": \"" & my escapeJsonString(contentType) & "\""
                set resultJson to resultJson & ", \"fileExtension\": \"" & my escapeJsonString(fileExtension) & "\""
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
    try
        if str is missing value or str is "" then
            return ""
        end if
        
        -- Convert to string if needed
        set str to str as string
        
        -- Safe string replacement using different approach
        set str to my safeReplaceString(str, "\\", "\\\\")
        set str to my safeReplaceString(str, "\"", "\\\"")
        set str to my safeReplaceString(str, return, "\\n")
        set str to my safeReplaceString(str, "\r", "\\r")
        set str to my safeReplaceString(str, "	", "\\t")
        return str
    on error
        return ""
    end try
end escapeJsonString

-- Safe string replacement utility
on safeReplaceString(str, searchStr, replaceStr)
    try
        if str is missing value or str is "" then
            return ""
        end if
        
        set oldDelimiters to AppleScript's text item delimiters
        set AppleScript's text item delimiters to searchStr
        set stringParts to text items of str
        set AppleScript's text item delimiters to replaceStr
        set newString to stringParts as string
        set AppleScript's text item delimiters to oldDelimiters
        return newString
    on error
        set AppleScript's text item delimiters to ""
        return str
    end try
end safeReplaceString

-- Legacy function for compatibility
on replaceString(str, searchStr, replaceStr)
    return my safeReplaceString(str, searchStr, replaceStr)
end replaceString

-- Extract title from downloaded content
on extractTitle(filePath, fileExt, urlString)
    try
        if fileExt is ".pdf" then
            -- Try to extract PDF title using mdls
            try
                set titleCommand to "mdls -name kMDItemTitle " & quoted form of filePath & " | cut -d'\"' -f2"
                set pdfTitle to do shell script titleCommand
                if pdfTitle is not "(null)" and pdfTitle is not "" then
                    return pdfTitle
                end if
            end try
            
            -- Try pdfinfo if available
            try
                set titleCommand to "pdfinfo " & quoted form of filePath & " | grep -i '^Title:' | cut -d':' -f2- | sed 's/^ *//'"
                set pdfTitle to do shell script titleCommand
                if pdfTitle is not "" then
                    return pdfTitle
                end if
            end try
            
        else if fileExt is ".html" then
            -- Extract HTML title
            try
                set titleCommand to "grep -i '<title>' " & quoted form of filePath & " | sed 's/<[^>]*>//g' | sed 's/^ *//;s/ *$//' | head -1"
                set htmlTitle to do shell script titleCommand
                if htmlTitle is not "" then
                    return htmlTitle
                end if
            end try
        end if
        
        -- Fall back to extracting a reasonable name from URL
        return my extractNameFromURL(urlString)
        
    on error
        return my extractNameFromURL(urlString)
    end try
end extractTitle

-- Extract a reasonable name from URL
on extractNameFromURL(urlString)
    try
        -- Remove protocol and query parameters
        set cleanUrl to urlString
        if cleanUrl contains "://" then
            set cleanUrl to text ((offset of "://" in cleanUrl) + 3) thru -1 of cleanUrl
        end if
        if cleanUrl contains "?" then
            set cleanUrl to text 1 thru ((offset of "?" in cleanUrl) - 1) of cleanUrl
        end if
        if cleanUrl contains "#" then
            set cleanUrl to text 1 thru ((offset of "#" in cleanUrl) - 1) of cleanUrl
        end if
        
        -- Get the last part of the path (filename or directory)
        set AppleScript's text item delimiters to "/"
        set urlParts to text items of cleanUrl
        set AppleScript's text item delimiters to ""
        
        if (count of urlParts) > 0 then
            set lastName to item -1 of urlParts
            if lastName is not "" then
                -- Remove file extension for cleaner name
                if lastName contains "." then
                    set AppleScript's text item delimiters to "."
                    set nameParts to text items of lastName
                    set AppleScript's text item delimiters to ""
                    if (count of nameParts) > 1 then
                        set lastName to text 1 thru ((count of nameParts) - 1) of nameParts as string
                    end if
                end if
                
                -- Replace URL-encoded characters and cleanup
                set lastName to my safeReplaceString(lastName, "%20", " ")
                set lastName to my safeReplaceString(lastName, "_", " ")
                set lastName to my safeReplaceString(lastName, "-", " ")
                
                if lastName is not "" then
                    return lastName
                end if
            end if
        end if
        
    on error
        -- Final fallback - just return empty to use default naming
    end try
    return ""
end extractNameFromURL

-- Extract JSON value (simplified parser) - handles spaces after colon
on extractJsonValue(jsonString, keyName)
    try
        -- Look for the key with colon (may have spaces)
        set searchKey to "\"" & keyName & "\":"
        set keyPos to (offset of searchKey in jsonString)
        if keyPos > 0 then
            -- Start after the key and colon
            set startPos to keyPos + (length of searchKey)
            set remainingString to text startPos thru -1 of jsonString
            
            -- Skip any whitespace after colon
            set i to 1
            repeat while i ≤ (length of remainingString)
                set char to character i of remainingString
                if char is not " " and char is not tab then
                    exit repeat
                end if
                set i to i + 1
            end repeat
            
            -- Check if next character is a quote (string value)
            if i ≤ (length of remainingString) and character i of remainingString is "\"" then
                -- Find the closing quote
                set valueStart to i + 1
                set searchString to text valueStart thru -1 of remainingString
                set endPos to (offset of "\"" in searchString)
                if endPos > 0 then
                    return text 1 thru (endPos - 1) of searchString
                end if
            end if
        end if
    end try
    return ""
end extractJsonValue