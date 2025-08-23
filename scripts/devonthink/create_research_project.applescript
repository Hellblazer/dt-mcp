on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameter: parameters JSON\"}"
    end if
    
    set parametersJson to item 1 of argv
    
    try
        -- Parse required parameters
        set projectName to my extractJsonValue(parametersJson, "projectName")
        set projectDescription to my extractJsonValue(parametersJson, "description")
        
        if projectName is "" then
            return "{\"error\": \"Project name is required\"}"
        end if
        
        if projectDescription is "" then
            return "{\"error\": \"Project description is required\"}"
        end if
        
        -- Parse optional parameters
        set databaseName to my extractJsonValue(parametersJson, "database")
        set organizationStructure to my extractJsonValue(parametersJson, "organizationStructure")
        set initialSources to my extractJsonArray(parametersJson, "initialSources")
        
        if organizationStructure is "" then set organizationStructure to "topic-based"
        
        tell application id "DNtp"
            set targetDb to current database
            if databaseName is not "" then
                try
                    set targetDb to database databaseName
                on error
                    return "{\"error\": \"Database not found: " & databaseName & "\"}"
                end try
            end if
            
            -- Create main project group
            set projectGroup to create record with {type:group, name:projectName, comment:projectDescription} in targetDb
            
            -- Create organizational structure based on type
            set createdGroups to {}
            
            if organizationStructure is "topic-based" then
                set literatureGroup to create record with {type:group, name:"Literature"} in projectGroup
                set analysisGroup to create record with {type:group, name:"Analysis"} in projectGroup
                set notesGroup to create record with {type:group, name:"Notes"} in projectGroup
                set referencesGroup to create record with {type:group, name:"References"} in projectGroup
                set draftsGroup to create record with {type:group, name:"Drafts"} in projectGroup
                
                set createdGroups to {literatureGroup, analysisGroup, notesGroup, referencesGroup, draftsGroup}
                
            else if organizationStructure is "chronological" then
                set currentYear to year of (current date)
                set archiveGroup to create record with {type:group, name:"Archive"} in projectGroup
                set currentYearGroup to create record with {type:group, name:("Year_" & currentYear)} in projectGroup
                set inProgressGroup to create record with {type:group, name:"In_Progress"} in projectGroup
                
                set createdGroups to {archiveGroup, currentYearGroup, inProgressGroup}
                
            else if organizationStructure is "source-based" then
                set papersGroup to create record with {type:group, name:"Academic_Papers"} in projectGroup
                set websitesGroup to create record with {type:group, name:"Web_Sources"} in projectGroup
                set booksGroup to create record with {type:group, name:"Books"} in projectGroup
                set personalNotesGroup to create record with {type:group, name:"Personal_Notes"} in projectGroup
                
                set createdGroups to {papersGroup, websitesGroup, booksGroup, personalNotesGroup}
            end if
            
            -- Create project overview document
            set overviewContent to "# " & projectName & return & return
            set overviewContent to overviewContent & "## Description" & return
            set overviewContent to overviewContent & projectDescription & return & return
            set overviewContent to overviewContent & "## Organization" & return
            set overviewContent to overviewContent & "Structure: " & organizationStructure & return & return
            set overviewContent to overviewContent & "## Created" & return
            set overviewContent to overviewContent & "Date: " & (current date as string) & return
            set overviewContent to overviewContent & "System: DEVONthink MCP Research Project Creator" & return & return
            set overviewContent to overviewContent & "## Status" & return
            set overviewContent to overviewContent & "- Project initialized" & return
            set overviewContent to overviewContent & "- Folder structure created" & return
            
            set overviewDoc to create record with {type:markdown, name:(projectName & "_Overview"), source:overviewContent} in projectGroup
            
            -- Process initial sources if provided
            set processedSources to {}
            if initialSources is not {} then
                repeat with sourceItem in initialSources
                    try
                        set sourceType to my extractJsonValue(sourceItem as string, "type")
                        set sourceData to my extractJsonValue(sourceItem as string, "source")
                        
                        if sourceType is "url" then
                            -- Import URL using import_url.applescript
                            try
                                set urlImportResult to do shell script "osascript " & quoted form of ((path to me as text) & "::import_url.applescript") & " " & quoted form of sourceData & " " & quoted form of (uuid of projectGroup)
                                if urlImportResult starts with "SUCCESS:" then
                                    set importedUUID to my extractUUIDFromResult(urlImportResult)
                                    set end of processedSources to {type:"url", source:sourceData, uuid:importedUUID, status:"imported"}
                                else
                                    -- Fallback to placeholder if import fails
                                    set urlDoc to create record with {type:txt, name:("URL_Source_" & sourceData), plain text:("Source URL: " & sourceData & return & "Status: Import failed - " & urlImportResult)} in projectGroup
                                    set end of processedSources to {type:"url", source:sourceData, uuid:(uuid of urlDoc), status:"import_failed"}
                                end if
                            on error
                                -- Fallback to placeholder if script fails
                                set urlDoc to create record with {type:txt, name:("URL_Source_" & sourceData), plain text:("Source URL: " & sourceData & return & "Status: Import script unavailable")} in projectGroup
                                set end of processedSources to {type:"url", source:sourceData, uuid:(uuid of urlDoc), status:"script_unavailable"}
                            end try
                            
                        else if sourceType is "paper" then
                            -- Download paper using download_paper.applescript
                            try
                                set paperDownloadResult to do shell script "osascript " & quoted form of ((path to me as text) & "::download_paper.applescript") & " arxiv " & quoted form of sourceData & " " & quoted form of (uuid of projectGroup)
                                if paperDownloadResult starts with "SUCCESS:" then
                                    set downloadedUUID to my extractUUIDFromResult(paperDownloadResult)
                                    set end of processedSources to {type:"paper", source:sourceData, uuid:downloadedUUID, status:"downloaded"}
                                else
                                    -- Fallback to placeholder if download fails
                                    set paperDoc to create record with {type:txt, name:("Paper_Source_" & sourceData), plain text:("Paper ID: " & sourceData & return & "Status: Download failed - " & paperDownloadResult)} in projectGroup
                                    set end of processedSources to {type:"paper", source:sourceData, uuid:(uuid of paperDoc), status:"download_failed"}
                                end if
                            on error
                                -- Fallback to placeholder if script fails
                                set paperDoc to create record with {type:txt, name:("Paper_Source_" & sourceData), plain text:("Paper ID: " & sourceData & return & "Status: Download script unavailable")} in projectGroup
                                set end of processedSources to {type:"paper", source:sourceData, uuid:(uuid of paperDoc), status:"script_unavailable"}
                            end try
                            
                        else if sourceType is "search" then
                            -- Create search query document
                            set searchDoc to create record with {type:txt, name:("Search_Query_" & sourceData), plain text:("Search Query: " & sourceData & return & "Created: " & (current date as string))} in projectGroup
                            set end of processedSources to {type:"search", source:sourceData, uuid:(uuid of searchDoc), status:"query_saved"}
                        end if
                        
                    on error errMsg
                        set end of processedSources to {type:"error", source:sourceItem, error:errMsg}
                    end try
                end repeat
            end if
            
            -- Apply project tags
            set projectTags to {"research-project", "mcp-created", organizationStructure}
            set tags of projectGroup to projectTags
            
            -- Tag all created groups
            repeat with groupItem in createdGroups
                set tags of groupItem to projectTags
            end repeat
            
            -- Tag overview document
            set tags of overviewDoc to projectTags
            
            return my formatResearchProjectResults(projectGroup, createdGroups, overviewDoc, processedSources, organizationStructure)
        end tell
        
    on error errMsg number errNum
        return "{\"error\": \"Research project creation failed: " & errMsg & " (Code: " & errNum & ")\"}"
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
                    return my parseObjectArray(arrayString)
                end if
            end if
        end if
    end try
    return {}
end extractJsonArray

-- Parse array of objects (simplified)
on parseObjectArray(arrayString)
    set objectList to {}
    set inString to false
    set braceCount to 0
    set currentObject to ""
    set i to 1
    
    repeat while i ≤ (length of arrayString)
        set currentChar to character i of arrayString
        
        if currentChar is "\"" and (i = 1 or character (i - 1) of arrayString is not "\\") then
            set inString to not inString
        else if not inString then
            if currentChar is "{" then
                if braceCount = 0 then
                    set currentObject to ""
                end if
                set braceCount to braceCount + 1
            else if currentChar is "}" then
                set braceCount to braceCount - 1
                if braceCount = 0 then
                    set currentObject to currentObject & currentChar
                    if currentObject is not "" then
                        set end of objectList to currentObject
                    end if
                    set currentObject to ""
                    set i to i + 1
                    repeat while i ≤ (length of arrayString) and character i of arrayString is in {" ", ",", tab, return}
                        set i to i + 1
                    end repeat
                    set i to i - 1
                end if
            end if
        end if
        
        if braceCount > 0 then
            set currentObject to currentObject & currentChar
        end if
        
        set i to i + 1
    end repeat
    
    return objectList
end parseObjectArray

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

-- Format research project results as JSON
on formatResearchProjectResults(projectGroup, createdGroups, overviewDoc, processedSources, organizationStructure)
    set resultJson to "{"
    set resultJson to resultJson & "\"success\": true, "
    set resultJson to resultJson & "\"projectGroup\": {"
    set resultJson to resultJson & "\"uuid\": \"" & (uuid of projectGroup) & "\", "
    set resultJson to resultJson & "\"name\": \"" & my escapeJsonString(name of projectGroup) & "\", "
    set resultJson to resultJson & "\"path\": \"" & my escapeJsonString(path of projectGroup) & "\", "
    set resultJson to resultJson & "\"description\": \"" & my escapeJsonString(comment of projectGroup) & "\""
    set resultJson to resultJson & "}, "
    
    set resultJson to resultJson & "\"organizationStructure\": \"" & organizationStructure & "\", "
    
    set resultJson to resultJson & "\"createdGroups\": ["
    set groupCount to count of createdGroups
    repeat with i from 1 to groupCount
        set groupItem to item i of createdGroups
        set resultJson to resultJson & "{"
        set resultJson to resultJson & "\"uuid\": \"" & (uuid of groupItem) & "\", "
        set resultJson to resultJson & "\"name\": \"" & my escapeJsonString(name of groupItem) & "\", "
        set resultJson to resultJson & "\"path\": \"" & my escapeJsonString(path of groupItem) & "\""
        set resultJson to resultJson & "}"
        if i < groupCount then set resultJson to resultJson & ", "
    end repeat
    set resultJson to resultJson & "], "
    
    set resultJson to resultJson & "\"overviewDocument\": {"
    set resultJson to resultJson & "\"uuid\": \"" & (uuid of overviewDoc) & "\", "
    set resultJson to resultJson & "\"name\": \"" & my escapeJsonString(name of overviewDoc) & "\", "
    set resultJson to resultJson & "\"path\": \"" & my escapeJsonString(path of overviewDoc) & "\""
    set resultJson to resultJson & "}, "
    
    set resultJson to resultJson & "\"processedSources\": ["
    set sourceCount to count of processedSources
    repeat with i from 1 to sourceCount
        set sourceItem to item i of processedSources
        set resultJson to resultJson & "{"
        
        if type of sourceItem exists then
            set resultJson to resultJson & "\"type\": \"" & (type of sourceItem) & "\", "
        end if
        
        if source of sourceItem exists then
            set resultJson to resultJson & "\"source\": \"" & my escapeJsonString(source of sourceItem) & "\", "
        end if
        
        if uuid of sourceItem exists then
            set resultJson to resultJson & "\"uuid\": \"" & (uuid of sourceItem) & "\", "
        end if
        
        if status of sourceItem exists then
            set resultJson to resultJson & "\"status\": \"" & (status of sourceItem) & "\""
        end if
        
        if error of sourceItem exists then
            set resultJson to resultJson & "\"error\": \"" & my escapeJsonString(error of sourceItem) & "\""
        end if
        
        set resultJson to resultJson & "}"
        if i < sourceCount then set resultJson to resultJson & ", "
    end repeat
    set resultJson to resultJson & "], "
    
    set resultJson to resultJson & "\"summary\": {"
    set resultJson to resultJson & "\"totalGroups\": " & (count of createdGroups) & ", "
    set resultJson to resultJson & "\"totalSources\": " & (count of processedSources) & ", "
    set resultJson to resultJson & "\"organizationStructure\": \"" & organizationStructure & "\", "
    set resultJson to resultJson & "\"createdAt\": \"" & (current date as string) & "\""
    set resultJson to resultJson & "}}"
    
    return resultJson
end formatResearchProjectResults

-- Escape JSON strings
on escapeJsonString(str)
    set str to my replaceText(str, "\\", "\\\\")
    set str to my replaceText(str, "\"", "\\\"")
    set str to my replaceText(str, return, "\\n")
    set str to my replaceText(str, tab, "\\t")
    return str
end escapeJsonString

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

-- Replace text utility
on replaceText(str, oldText, newText)
    set AppleScript's text item delimiters to oldText
    set textItems to text items of str
    set AppleScript's text item delimiters to newText
    set result to textItems as string
    set AppleScript's text item delimiters to ""
    return result
end replaceText