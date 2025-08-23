on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameter: parameters JSON\"}"
    end if
    
    set parametersJson to item 1 of argv
    
    try
        -- Parse URLs array from JSON
        set urlsList to my extractJsonArray(parametersJson, "urls")
        if urlsList is {} then
            return "{\"error\": \"No URLs found in parameters\"}"
        end if
        
        -- Extract optional parameters
        set targetGroup to my extractJsonValue(parametersJson, "targetGroup")
        set tagsString to my extractJsonValue(parametersJson, "tags")
        set extractMetadata to my extractJsonValue(parametersJson, "extractMetadata")
        set maxConcurrent to my extractJsonValue(parametersJson, "maxConcurrent")
        
        if extractMetadata is "" then set extractMetadata to "true"
        if maxConcurrent is "" then set maxConcurrent to "3"
        
        set shouldExtractMetadata to (extractMetadata is "true")
        set maxConcurrentInt to maxConcurrent as integer
        
        -- Parse tags if provided
        set tagsList to {}
        if tagsString is not "" then
            set tagsList to my parseCommaSeparatedTags(tagsString)
        end if
        
        tell application id "DNtp"
            set targetDb to current database
            set targetGrp to root of targetDb
            
            -- Find target group if specified
            if targetGroup is not "" then
                try
                    set targetGrp to get record at targetGroup in targetDb
                on error
                    -- Create group if it doesn't exist
                    set targetGrp to create record with {type:group, name:targetGroup} in targetDb
                end try
            end if
            
            set importResults to {}
            set processedCount to 0
            
            -- Process URLs (simplified sequential processing for reliability)
            repeat with urlItem in urlsList
                set processedCount to processedCount + 1
                
                try
                    -- Download content using curl
                    set curlCommand to "curl -L --max-time 30 -s \"" & urlItem & "\""
                    set downloadedContent to do shell script curlCommand
                    
                    -- Determine file extension and type from URL
                    set fileExtension to my getFileExtensionFromURL(urlItem)
                    set documentName to my generateDocumentName(urlItem, fileExtension)
                    
                    -- Create document with downloaded content
                    set newRecord to ""
                    if fileExtension is "pdf" then
                        -- For PDF, try to import as file
                        set tempFile to (POSIX path of (path to temporary items)) & documentName
                        do shell script "echo " & quoted form of downloadedContent & " > " & quoted form of tempFile
                        set newRecord to import tempFile to targetGrp
                    else
                        -- For other content, create as HTML or text
                        if fileExtension is "html" or fileExtension is "htm" then
                            set newRecord to create record with {type:html, name:documentName, source:downloadedContent} in targetGrp
                        else
                            set newRecord to create record with {type:txt, name:documentName, plain text:downloadedContent} in targetGrp
                        end if
                    end if
                    
                    -- Apply tags if specified
                    if tagsList is not {} then
                        set tags of newRecord to tagsList
                    end if
                    
                    -- Extract metadata if requested
                    set metadataInfo to {}
                    if shouldExtractMetadata then
                        try
                            set metadataInfo to {title:(name of newRecord), size:(size of newRecord), creationDate:(creation date of newRecord as string)}
                        on error
                            set metadataInfo to {title:documentName}
                        end try
                    end if
                    
                    set importResult to {url:urlItem, success:true, uuid:(uuid of newRecord), name:(name of newRecord), metadata:metadataInfo, processedIndex:processedCount}
                    set end of importResults to importResult
                    
                on error errMsg
                    set errorResult to {url:urlItem, success:false, error:errMsg, processedIndex:processedCount}
                    set end of importResults to errorResult
                end try
            end repeat
            
            return my formatBulkImportResults(importResults)
        end tell
        
    on error errMsg number errNum
        return "{\"error\": \"Bulk import failed: " & errMsg & " (Code: " & errNum & ")\"}"
    end try
end run

-- Extract JSON array values
on extractJsonArray(jsonString, arrayName)
    try
        set searchKey to "\"" & arrayName & "\":"
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
            
            -- Look for array start
            if i ≤ (length of remainingString) and character i of remainingString is "[" then
                set arrayStart to i + 1
                set arrayContent to text arrayStart thru -1 of remainingString
                set bracketCount to 1
                set arrayEndPos to 1
                
                repeat with j from 1 to (length of arrayContent)
                    set currentChar to character j of arrayContent
                    if currentChar is "[" then
                        set bracketCount to bracketCount + 1
                    else if currentChar is "]" then
                        set bracketCount to bracketCount - 1
                        if bracketCount is 0 then
                            set arrayEndPos to j - 1
                            exit repeat
                        end if
                    end if
                end repeat
                
                if arrayEndPos > 0 then
                    set arrayString to text 1 thru arrayEndPos of arrayContent
                    return my parseStringArray(arrayString)
                end if
            end if
        end if
    end try
    return {}
end extractJsonArray

-- Parse array of strings
on parseStringArray(arrayString)
    set stringList to {}
    set inString to false
    set currentString to ""
    set i to 1
    
    repeat while i ≤ (length of arrayString)
        set currentChar to character i of arrayString
        
        if currentChar is "\"" then
            if inString then
                -- End of string
                if currentString is not "" then
                    set end of stringList to currentString
                end if
                set currentString to ""
                set inString to false
            else
                -- Start of string
                set inString to true
            end if
        else if inString then
            set currentString to currentString & currentChar
        end if
        
        set i to i + 1
    end repeat
    
    return stringList
end parseStringArray

-- Extract simple JSON value
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
            
            -- Get string value
            if i ≤ (length of remainingString) and character i of remainingString is "\"" then
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

-- Parse comma-separated tags
on parseCommaSeparatedTags(tagsString)
    set AppleScript's text item delimiters to ","
    set tagItems to text items of tagsString
    set AppleScript's text item delimiters to ""
    
    set cleanTags to {}
    repeat with tagItem in tagItems
        set cleanTag to my trimWhitespace(tagItem as string)
        if cleanTag is not "" then
            set end of cleanTags to cleanTag
        end if
    end repeat
    
    return cleanTags
end parseCommaSeparatedTags

-- Get file extension from URL
on getFileExtensionFromURL(urlString)
    try
        -- Remove query parameters
        set questionMarkPos to offset of "?" in urlString
        if questionMarkPos > 0 then
            set urlString to text 1 thru (questionMarkPos - 1) of urlString
        end if
        
        -- Get extension
        set lastDotPos to 0
        repeat with i from 1 to (length of urlString)
            if character i of urlString is "." then
                set lastDotPos to i
            end if
        end repeat
        
        if lastDotPos > 0 and lastDotPos < (length of urlString) then
            set fileExt to text (lastDotPos + 1) thru -1 of urlString
            return my toLowercase(fileExt)
        end if
    end try
    return "html"
end getFileExtensionFromURL

-- Generate document name from URL
on generateDocumentName(urlString, fileExtension)
    try
        -- Extract domain and path for name
        set urlString to my replaceText(urlString, "https://", "")
        set urlString to my replaceText(urlString, "http://", "")
        set urlString to my replaceText(urlString, "www.", "")
        
        -- Get first part of domain
        set slashPos to offset of "/" in urlString
        if slashPos > 0 then
            set domain to text 1 thru (slashPos - 1) of urlString
        else
            set domain to urlString
        end if
        
        -- Create timestamp
        set currentDate to current date
        set timestamp to (currentDate as string)
        
        return "URL_Import_" & domain & "_" & timestamp & "." & fileExtension
        
    on error
        return "URL_Import_" & (current date as string) & "." & fileExtension
    end try
end generateDocumentName

-- Convert to lowercase
on toLowercase(str)
    return do shell script "echo " & quoted form of str & " | tr '[:upper:]' '[:lower:]'"
end toLowercase

-- Trim whitespace
on trimWhitespace(str)
    try
        return do shell script "echo " & quoted form of str & " | xargs"
    on error
        return str
    end try
end trimWhitespace

-- Format bulk import results as JSON
on formatBulkImportResults(importResults)
    set resultJson to "{"
    set resultJson to resultJson & "\"importResults\": ["
    
    set resultCount to count of importResults
    set successCount to 0
    set failureCount to 0
    
    repeat with i from 1 to resultCount
        set importResult to item i of importResults
        
        set resultJson to resultJson & "{"
        set resultJson to resultJson & "\"url\": \"" & my escapeJsonString(url of importResult) & "\", "
        set resultJson to resultJson & "\"success\": " & (success of importResult) & ", "
        set resultJson to resultJson & "\"processedIndex\": " & (processedIndex of importResult) & ", "
        
        if success of importResult then
            set successCount to successCount + 1
            set resultJson to resultJson & "\"uuid\": \"" & (uuid of importResult) & "\", "
            set resultJson to resultJson & "\"name\": \"" & my escapeJsonString(name of importResult) & "\""
            
            if metadata of importResult exists then
                set resultJson to resultJson & ", \"metadata\": " & my formatMetadata(metadata of importResult)
            end if
        else
            set failureCount to failureCount + 1
            set resultJson to resultJson & "\"error\": \"" & my escapeJsonString(error of importResult) & "\""
        end if
        
        set resultJson to resultJson & "}"
        if i < resultCount then set resultJson to resultJson & ", "
    end repeat
    
    set resultJson to resultJson & "], "
    set resultJson to resultJson & "\"summary\": {"
    set resultJson to resultJson & "\"totalUrls\": " & resultCount & ", "
    set resultJson to resultJson & "\"successful\": " & successCount & ", "
    set resultJson to resultJson & "\"failed\": " & failureCount & ", "
    set resultJson to resultJson & "\"successRate\": " & (successCount / resultCount * 100) & ""
    set resultJson to resultJson & "}}"
    
    return resultJson
end formatBulkImportResults

-- Format metadata as JSON
on formatMetadata(metadataRecord)
    set metaJson to "{"
    set metaJson to metaJson & "\"title\": \"" & my escapeJsonString(title of metadataRecord) & "\""
    
    if size of metadataRecord exists then
        set metaJson to metaJson & ", \"size\": " & (size of metadataRecord)
    end if
    
    if creationDate of metadataRecord exists then
        set metaJson to metaJson & ", \"creationDate\": \"" & (creationDate of metadataRecord) & "\""
    end if
    
    set metaJson to metaJson & "}"
    return metaJson
end formatMetadata

-- Escape JSON strings
on escapeJsonString(str)
    set str to my replaceText(str, "\\", "\\\\")
    set str to my replaceText(str, "\"", "\\\"")
    set str to my replaceText(str, return, "\\n")
    set str to my replaceText(str, tab, "\\t")
    return str
end escapeJsonString

-- Replace text utility
on replaceText(str, oldText, newText)
    set AppleScript's text item delimiters to oldText
    set textItems to text items of str
    set AppleScript's text item delimiters to newText
    set result to textItems as string
    set AppleScript's text item delimiters to ""
    return result
end replaceText