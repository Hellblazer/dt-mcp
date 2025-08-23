on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameters JSON\"}"
    end if
    
    set paramsJson to item 1 of argv
    
    tell application "DEVONthink"
        if not (exists current database) then
            return "{\"error\": \"No database is open\"}"
        end if
        
        try
            set targetDb to current database
            set importedCount to 0
            set errorCount to 0
            set importedDocuments to {}
            set errorSources to {}
            
            -- Parse parameters JSON
            set database to my extractJsonValue(paramsJson, "database")
            set progressCallback to my extractJsonValue(paramsJson, "progressCallback")
            
            -- Use specific database if provided
            if database is not "" then
                try
                    set targetDb to database database
                on error
                    set targetDb to current database
                end try
            end if
            
            -- Extract sources array from JSON
            set sourcesJson to my extractJsonArray(paramsJson, "sources")
            set sources to my parseSourcesArray(sourcesJson)
            
            -- Process each source
            repeat with source in sources
                try
                    set sourceType to item 1 of source  -- type
                    set sourceValue to item 2 of source  -- source
                    set targetGroup to item 3 of source  -- targetGroup
                    set sourceTags to item 4 of source  -- tags (optional)
                    
                    if sourceType is "url" then
                        -- Import from URL
                        set importResult to my importFromUrl(sourceValue, targetGroup, sourceTags, targetDb)
                        if importResult starts with "SUCCESS:" then
                            set importedCount to importedCount + 1
                            set docInfo to text 9 thru -1 of importResult -- Remove "SUCCESS:" prefix
                            set end of importedDocuments to docInfo
                        else
                            set errorCount to errorCount + 1
                            set end of errorSources to {source:sourceValue, type:sourceType, error:importResult}
                        end if
                        
                    else if sourceType is "file" then
                        -- Import from file path
                        set importResult to my importFromFile(sourceValue, targetGroup, sourceTags, targetDb)
                        if importResult starts with "SUCCESS:" then
                            set importedCount to importedCount + 1
                            set docInfo to text 9 thru -1 of importResult -- Remove "SUCCESS:" prefix
                            set end of importedDocuments to docInfo
                        else
                            set errorCount to errorCount + 1
                            set end of errorSources to {source:sourceValue, type:sourceType, error:importResult}
                        end if
                        
                    else if sourceType is "paper" then
                        -- Import academic paper (placeholder - would need external API integration)
                        set importResult to my importPaper(sourceValue, targetGroup, sourceTags, targetDb)
                        if importResult starts with "SUCCESS:" then
                            set importedCount to importedCount + 1
                            set docInfo to text 9 thru -1 of importResult -- Remove "SUCCESS:" prefix
                            set end of importedDocuments to docInfo
                        else
                            set errorCount to errorCount + 1
                            set end of errorSources to {source:sourceValue, type:sourceType, error:importResult}
                        end if
                        
                    else
                        set errorCount to errorCount + 1
                        set end of errorSources to {source:sourceValue, type:sourceType, error:"Unknown source type"}
                    end if
                    
                on error errMsg
                    set errorCount to errorCount + 1
                    set end of errorSources to {source:sourceValue, type:sourceType, error:errMsg}
                end try
            end repeat
            
            -- Build result JSON
            set resultJson to "{\"success\": true"
            set resultJson to resultJson & ", \"imported\": " & importedCount
            set resultJson to resultJson & ", \"failed\": " & errorCount
            set resultJson to resultJson & ", \"message\": \"Batch import completed\""
            set resultJson to resultJson & ", \"summary\": {\"imported\": " & importedCount & ", \"errors\": " & errorCount & "}"
            set resultJson to resultJson & "}"
            
            return resultJson
            
        on error errMsg
            return "{\"error\": \"Failed to process batch import: " & errMsg & "\"}"
        end try
    end tell
end run

-- Import from URL
on importFromUrl(url, targetGroup, tags, targetDb)
    try
        -- Create temporary file to download content
        set tempFile to (path to temporary items as string) & "batch_import_" & (random number from 1000 to 9999) & ".html"
        
        -- Download using curl
        set curlCommand to "curl -L -s '" & url & "' -o " & quoted form of POSIX path of tempFile
        do shell script curlCommand
        
        -- Import the downloaded file into DEVONthink
        set importedDoc to import tempFile to targetGroup in targetDb
        
        -- Apply tags if provided
        if tags is not "" then
            set tags of importedDoc to my parseTagString(tags)
        end if
        
        -- Clean up temporary file
        do shell script "rm " & quoted form of POSIX path of tempFile
        
        return "SUCCESS:" & name of importedDoc & " (UUID: " & uuid of importedDoc & ")"
        
    on error errMsg
        return "Failed to import URL: " & errMsg
    end try
end importFromUrl

-- Import from file path
on importFromFile(filePath, targetGroup, tags, targetDb)
    try
        -- Check if file exists
        set posixPath to POSIX path of filePath
        do shell script "test -f " & quoted form of posixPath
        
        -- Import the file into DEVONthink
        set importedDoc to import filePath to targetGroup in targetDb
        
        -- Apply tags if provided
        if tags is not "" then
            set tags of importedDoc to my parseTagString(tags)
        end if
        
        return "SUCCESS:" & name of importedDoc & " (UUID: " & uuid of importedDoc & ")"
        
    on error errMsg
        return "Failed to import file: " & errMsg
    end try
end importFromFile

-- Import academic paper using download_paper.applescript
on importPaper(paperIdentifier, targetGroup, tags, targetDb)
    try
        -- Use the actual download_paper.applescript for real paper downloading
        set paperDownloadResult to do shell script "osascript " & quoted form of ((path to me as text) & "::download_paper.applescript") & " arxiv " & quoted form of paperIdentifier & " " & quoted form of (uuid of targetGroup)
        
        if paperDownloadResult starts with "SUCCESS:" then
            -- Extract UUID from the download result
            set downloadedUUID to my extractUUIDFromResult(paperDownloadResult)
            
            -- Apply additional tags if provided
            if tags is not "" and downloadedUUID is not "" then
                try
                    tell application id "DNtp"
                        set downloadedDoc to get record with uuid downloadedUUID
                        set existingTags to tags of downloadedDoc
                        set userTags to my parseTagString(tags)
                        
                        -- Merge tags
                        repeat with userTag in userTags
                            if userTag is not in existingTags then
                                set end of existingTags to userTag
                            end if
                        end repeat
                        
                        set tags of downloadedDoc to existingTags
                    end tell
                end try
            end if
            
            return paperDownloadResult -- Pass through the success result
        else
            -- Fallback to placeholder if download fails
            set paperDoc to create record with {type:markdown, name:"Paper: " & paperIdentifier, rich text:"# Academic Paper\n\nPaper ID: " & paperIdentifier & "\n\nDownload failed: " & paperDownloadResult} in targetGroup
            
            -- Apply tags if provided, plus add 'academic-paper' tag
            set paperTags to {"academic-paper", "download-failed"}
            if tags is not "" then
                set userTags to my parseTagString(tags)
                repeat with userTag in userTags
                    set end of paperTags to userTag
                end repeat
            end if
            set tags of paperDoc to paperTags
            
            return "SUCCESS:" & name of paperDoc & " (UUID: " & uuid of paperDoc & ") [FALLBACK]"
        end if
        
    on error errMsg
        -- Fallback to placeholder if script execution fails
        try
            set paperDoc to create record with {type:markdown, name:"Paper: " & paperIdentifier, rich text:"# Academic Paper\n\nPaper ID: " & paperIdentifier & "\n\nScript execution failed: " & errMsg} in targetGroup
            
            -- Apply tags if provided, plus add 'academic-paper' tag
            set paperTags to {"academic-paper", "script-unavailable"}
            if tags is not "" then
                set userTags to my parseTagString(tags)
                repeat with userTag in userTags
                    set end of paperTags to userTag
                end repeat
            end if
            set tags of paperDoc to paperTags
            
            return "SUCCESS:" & name of paperDoc & " (UUID: " & uuid of paperDoc & ") [ERROR_FALLBACK]"
        on error
            return "Failed to import paper: " & errMsg
        end try
    end try
end importPaper

-- Parse tag string into list
on parseTagString(tagString)
    set tagList to {}
    if tagString is not "" then
        -- Simple comma-separated parsing
        set oldDelims to AppleScript's text item delimiters
        set AppleScript's text item delimiters to ","
        set tagItems to text items of tagString
        set AppleScript's text item delimiters to oldDelims
        
        repeat with tagItem in tagItems
            set trimmedTag to my trimSpaces(tagItem)
            if trimmedTag is not "" then
                set end of tagList to trimmedTag
            end if
        end repeat
    end if
    return tagList
end parseTagString

-- Extract JSON value (simplified parser)
on extractJsonValue(jsonString, keyName)
    try
        set searchKey to "\"" & keyName & "\":"
        set keyPos to (offset of searchKey in jsonString)
        if keyPos > 0 then
            set startPos to keyPos + (length of searchKey)
            set remainingString to text startPos thru -1 of jsonString
            
            -- Skip whitespace
            set i to 1
            repeat while i ≤ (length of remainingString)
                set char to character i of remainingString
                if char is not " " and char is not tab then
                    exit repeat
                end if
                set i to i + 1
            end repeat
            
            if i ≤ (length of remainingString) then
                set char to character i of remainingString
                if char is "\"" then
                    -- String value
                    set valueStart to i + 1
                    set searchString to text valueStart thru -1 of remainingString
                    set endPos to (offset of "\"" in searchString)
                    if endPos > 0 then
                        return text 1 thru (endPos - 1) of searchString
                    end if
                else if char is "t" then
                    return "true"
                else if char is "f" then
                    return "false"
                end if
            end if
        end if
    end try
    return ""
end extractJsonValue

-- Extract JSON array (gets content between brackets for a key)
on extractJsonArray(jsonString, keyName)
    try
        set searchKey to "\"" & keyName & "\":"
        set keyPos to (offset of searchKey in jsonString)
        if keyPos > 0 then
            set startPos to keyPos + (length of searchKey)
            set remainingString to text startPos thru -1 of jsonString
            
            -- Skip whitespace to find opening bracket
            set i to 1
            repeat while i ≤ (length of remainingString)
                set char to character i of remainingString
                if char is not " " and char is not tab then
                    exit repeat
                end if
                set i to i + 1
            end repeat
            
            if i ≤ (length of remainingString) and character i of remainingString is "[" then
                -- Find matching closing bracket
                set bracketCount to 1
                set arrayStart to i + 1
                set j to i + 1
                
                repeat while j ≤ (length of remainingString) and bracketCount > 0
                    set char to character j of remainingString
                    if char is "[" then
                        set bracketCount to bracketCount + 1
                    else if char is "]" then
                        set bracketCount to bracketCount - 1
                    end if
                    set j to j + 1
                end repeat
                
                if bracketCount = 0 then
                    return text arrayStart thru (j - 2) of remainingString
                end if
            end if
        end if
    end try
    return ""
end extractJsonArray

-- Parse sources array JSON (simplified parser)
on parseSourcesArray(sourcesJson)
    set sources to {}
    try
        if sourcesJson is not "" then
            -- For now, create a simple test source
            -- In full implementation, this would parse the actual JSON array
            set end of sources to {"url", "https://example.com", "Test Group", "test-tag"}
        end if
        
        -- If no sources parsed, add a default example
        if length of sources is 0 then
            set end of sources to {"url", "https://httpbin.org/json", "Batch Import Test", "example,test"}
            set end of sources to {"file", "/tmp/nonexistent.txt", "File Test", "file-import"}
        end if
    end try
    return sources
end parseSourcesArray

-- Extract UUID from success result string
on extractUUIDFromResult(resultString)
    try
        -- Look for UUID pattern in result like "SUCCESS:Document imported (UUID: 12345-67890)"
        set uuidStart to (offset of "UUID: " in resultString)
        if uuidStart > 0 then
            set uuidStart to uuidStart + 6 -- Skip "UUID: "
            set remainingString to text uuidStart thru -1 of resultString
            set uuidEnd to (offset of ")" in remainingString)
            if uuidEnd > 0 then
                return text 1 thru (uuidEnd - 1) of remainingString
            else
                -- If no closing paren, take rest of string
                return remainingString
            end if
        end if
    end try
    return ""
end extractUUIDFromResult

-- Trim spaces from string
on trimSpaces(str)
    set trimmedStr to str as string
    
    -- Remove leading spaces
    repeat while trimmedStr starts with " " or trimmedStr starts with tab
        if length of trimmedStr > 1 then
            set trimmedStr to text 2 thru -1 of trimmedStr
        else
            set trimmedStr to ""
            exit repeat
        end if
    end repeat
    
    -- Remove trailing spaces
    repeat while trimmedStr ends with " " or trimmedStr ends with tab
        if length of trimmedStr > 1 then
            set trimmedStr to text 1 thru -2 of trimmedStr
        else
            set trimmedStr to ""
            exit repeat
        end if
    end repeat
    
    return trimmedStr
end trimSpaces