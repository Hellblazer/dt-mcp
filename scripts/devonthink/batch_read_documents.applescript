on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameter: parameters JSON\"}"
    end if
    
    set parametersJson to item 1 of argv
    
    try
        -- Parse UUIDs array from JSON
        set uuidsList to my extractJsonArray(parametersJson, "uuids")
        if uuidsList is {} then
            return "{\"error\": \"No UUIDs found in parameters\"}"
        end if
        
        -- Extract optional parameters
        set includeContent to my extractJsonValue(parametersJson, "includeContent")
        if includeContent is "" then set includeContent to "false"
        
        set shouldIncludeContent to (includeContent is "true")
        
        tell application id "DNtp"
            set batchResults to {}
            
            repeat with uuidItem in uuidsList
                try
                    set targetRecord to get record with uuid uuidItem
                    
                    if targetRecord exists then
                        set docResult to {uuid:uuidItem, exists:true, name:(name of targetRecord), type:(type of targetRecord as string), path:(path of targetRecord), size:(size of targetRecord), creationDate:(creation date of targetRecord as string), modificationDate:(modification date of targetRecord as string), tags:(tags of targetRecord), comment:(comment of targetRecord)}
                        
                        -- Include content if requested
                        if shouldIncludeContent then
                            try
                                set docContent to plain text of targetRecord
                                set content of docResult to docContent
                            on error
                                set content of docResult to ""
                            end try
                        end if
                        
                        set end of batchResults to docResult
                    else
                        set errorResult to {uuid:uuidItem, exists:false, error:"Document not found"}
                        set end of batchResults to errorResult
                    end if
                    
                on error errMsg
                    set errorResult to {uuid:uuidItem, exists:false, error:errMsg}
                    set end of batchResults to errorResult
                end try
            end repeat
            
            return my formatBatchReadResults(batchResults, shouldIncludeContent)
        end tell
        
    on error errMsg number errNum
        return "{\"error\": \"Batch read failed: " & errMsg & " (Code: " & errNum & ")\"}"
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

-- Format batch read results as JSON
on formatBatchReadResults(batchResults, includeContent)
    set resultJson to "{"
    set resultJson to resultJson & "\"documents\": ["
    
    set resultCount to count of batchResults
    repeat with i from 1 to resultCount
        set docResult to item i of batchResults
        
        set resultJson to resultJson & "{"
        set resultJson to resultJson & "\"uuid\": \"" & (uuid of docResult) & "\", "
        set resultJson to resultJson & "\"exists\": " & (exists of docResult) & ", "
        
        if error of docResult exists then
            set resultJson to resultJson & "\"error\": \"" & my escapeJsonString(error of docResult) & "\""
        else
            set resultJson to resultJson & "\"name\": \"" & my escapeJsonString(name of docResult) & "\", "
            set resultJson to resultJson & "\"type\": \"" & (type of docResult) & "\", "
            set resultJson to resultJson & "\"path\": \"" & my escapeJsonString(path of docResult) & "\", "
            set resultJson to resultJson & "\"size\": " & (size of docResult) & ", "
            set resultJson to resultJson & "\"creationDate\": \"" & (creationDate of docResult) & "\", "
            set resultJson to resultJson & "\"modificationDate\": \"" & (modificationDate of docResult) & "\", "
            set resultJson to resultJson & "\"tags\": " & my formatTagsArray(tags of docResult) & ", "
            set resultJson to resultJson & "\"comment\": \"" & my escapeJsonString(comment of docResult) & "\""
            
            if includeContent and content of docResult exists then
                set resultJson to resultJson & ", \"content\": \"" & my escapeJsonString(content of docResult) & "\""
            end if
        end if
        
        set resultJson to resultJson & "}"
        if i < resultCount then set resultJson to resultJson & ", "
    end repeat
    
    set resultJson to resultJson & "], "
    set resultJson to resultJson & "\"totalDocuments\": " & resultCount & ", "
    set resultJson to resultJson & "\"includeContent\": " & includeContent
    set resultJson to resultJson & "}"
    
    return resultJson
end formatBatchReadResults

-- Format tags as JSON array
on formatTagsArray(tagsList)
    set tagsJson to "["
    set tagCount to count of tagsList
    repeat with i from 1 to tagCount
        set tagsJson to tagsJson & "\"" & my escapeJsonString(item i of tagsList) & "\""
        if i < tagCount then set tagsJson to tagsJson & ", "
    end repeat
    set tagsJson to tagsJson & "]"
    return tagsJson
end formatTagsArray

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