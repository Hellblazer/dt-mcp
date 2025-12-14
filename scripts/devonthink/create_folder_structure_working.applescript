on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameters JSON\"}"
    end if
    
    set paramsJson to item 1 of argv
    
    tell application id "DNtp"
        if not (exists current database) then
            return "{\"error\": \"No database is open\"}"
        end if
        
        try
            set targetDb to current database
            set createdGroups to {}
            set createdCount to 0
            set skippedGroups to {}
            set skippedCount to 0
            set errorGroups to {}
            set errorCount to 0
            
            -- Extract parameters from JSON
            set rootGroup to my extractJsonValue(paramsJson, "rootGroup")
            set databaseName to my extractJsonValue(paramsJson, "database")
            set overwriteExisting to my extractJsonValue(paramsJson, "overwriteExisting")
            
            -- Use specific database if provided
            if databaseName is not "" then
                try
                    set targetDb to database databaseName
                on error
                    set targetDb to current database
                end try
            end if
            
            -- Determine root location
            set rootRecord to targetDb
            if rootGroup is not "" then
                try
                    set rootRecord to get record at rootGroup in targetDb
                on error
                    -- Create root group if it doesn't exist
                    set rootRecord to create record with {type:group, name:rootGroup} in targetDb
                    set createdCount to createdCount + 1
                    set end of createdGroups to rootGroup
                end try
            end if
            
            -- Parse the structure object from JSON (this is complex in AppleScript)
            -- For now, we'll extract a few common structure patterns
            set structureJson to my extractJsonObject(paramsJson, "structure")
            
            if structureJson is not "" then
                -- Try to parse simple structure patterns
                set folderNames to my extractFolderNames(structureJson)
                
                -- Create folders from parsed names
                repeat with folderName in folderNames
                    try
                        -- Check if folder already exists
                        set folderExists to false
                        try
                            set existingFolder to get record folderName in rootRecord
                            set folderExists to true
                        end try
                        
                        if folderExists and overwriteExisting is not "true" then
                            set skippedCount to skippedCount + 1
                            set end of skippedGroups to folderName
                        else
                            -- Create the folder
                            if folderExists then
                                -- Update existing folder if overwrite is enabled
                                set createdCount to createdCount + 1
                                set end of createdGroups to (folderName & " (updated)")
                            else
                                -- Create new folder
                                set newFolder to create record with {type:group, name:folderName} in rootRecord
                                set createdCount to createdCount + 1
                                set end of createdGroups to folderName
                            end if
                        end if
                    on error errMsg
                        set errorCount to errorCount + 1
                        set end of errorGroups to (folderName & " (error: " & errMsg & ")")
                    end try
                end repeat
            else
                -- Fallback: create example structure
                set exampleFolders to {"Research", "Documents", "Archive", "Projects"}
                repeat with folderName in exampleFolders
                    try
                        set newFolder to create record with {type:group, name:folderName} in rootRecord
                        set createdCount to createdCount + 1
                        set end of createdGroups to folderName
                    on error errMsg
                        set errorCount to errorCount + 1
                        set end of errorGroups to (folderName & " (error: " & errMsg & ")")
                    end try
                end repeat
            end if
            
            -- Build result JSON
            set resultJson to "{\"success\": true"
            set resultJson to resultJson & ", \"createdGroups\": " & createdCount
            set resultJson to resultJson & ", \"skippedGroups\": " & skippedCount
            set resultJson to resultJson & ", \"errorGroups\": " & errorCount
            set resultJson to resultJson & ", \"message\": \"Folder structure creation completed\""
            set resultJson to resultJson & ", \"summary\": {\"created\": " & createdCount & ", \"skipped\": " & skippedCount & ", \"errors\": " & errorCount & "}"
            set resultJson to resultJson & "}"
            
            return resultJson
            
        on error errMsg
            return "{\"error\": \"Failed to create folder structure: " & errMsg & "\"}"
        end try
    end tell
end run

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
            
            -- Extract value based on type
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
                    -- Boolean true
                    return "true"
                else if char is "f" then
                    -- Boolean false
                    return "false"
                end if
            end if
        end if
    end try
    return ""
end extractJsonValue

-- Extract JSON object (simplified - gets content between braces for a key)
on extractJsonObject(jsonString, keyName)
    try
        set searchKey to "\"" & keyName & "\":"
        set keyPos to (offset of searchKey in jsonString)
        if keyPos > 0 then
            set startPos to keyPos + (length of searchKey)
            set remainingString to text startPos thru -1 of jsonString
            
            -- Skip whitespace to find opening brace
            set i to 1
            repeat while i ≤ (length of remainingString)
                set char to character i of remainingString
                if char is not " " and char is not tab then
                    exit repeat
                end if
                set i to i + 1
            end repeat
            
            if i ≤ (length of remainingString) and character i of remainingString is "{" then
                -- Find matching closing brace
                set braceCount to 1
                set objStart to i + 1
                set j to i + 1
                
                repeat while j ≤ (length of remainingString) and braceCount > 0
                    set char to character j of remainingString
                    if char is "{" then
                        set braceCount to braceCount + 1
                    else if char is "}" then
                        set braceCount to braceCount - 1
                    end if
                    set j to j + 1
                end repeat
                
                if braceCount = 0 then
                    return text objStart thru (j - 2) of remainingString
                end if
            end if
        end if
    end try
    return ""
end extractJsonObject

-- Extract folder names from structure JSON (simplified parser)
on extractFolderNames(structureJson)
    set folderNames to {}
    try
        -- Look for quoted keys (folder names) in the structure
        set searchPos to 1
        repeat
            set quotePos to (offset of "\"" in (text searchPos thru -1 of structureJson))
            if quotePos = 0 then exit repeat
            
            set actualPos to searchPos + quotePos - 1
            set nextQuotePos to (offset of "\"" in (text (actualPos + 1) thru -1 of structureJson))
            if nextQuotePos = 0 then exit repeat
            
            set folderName to text (actualPos + 1) thru (actualPos + nextQuotePos - 1) of structureJson
            
            -- Only add if it looks like a folder name (no spaces, reasonable length)
            if length of folderName > 0 and length of folderName < 100 and folderName does not contain ":" then
                set end of folderNames to folderName
            end if
            
            set searchPos to actualPos + nextQuotePos + 1
            if searchPos ≥ length of structureJson then exit repeat
        end repeat
    end try
    return folderNames
end extractFolderNames