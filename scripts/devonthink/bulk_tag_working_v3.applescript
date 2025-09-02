on run argv
    if (count of argv) < 3 then
        return "{\"error\": \"Missing required arguments: documentUuids, action, tags\"}"
    end if
    
    set documentUuidsJson to item 1 of argv
    set action to item 2 of argv
    set tagsJson to item 3 of argv
    
    tell application "DEVONthink"
        if not (exists current database) then
            return "{\"error\": \"No database is open\"}"
        end if
        
        try
            set processedCount to 0
            set errorCount to 0
            set processedDocuments to {}
            set errorDocuments to {}
            
            -- Parse UUIDs from JSON array (simplified parser)
            set documentUuids to my parseJsonArray(documentUuidsJson)
            
            -- Parse tags from JSON array (simplified parser)  
            set newTags to my parseJsonArray(tagsJson)
            
            -- Process each document UUID
            repeat with documentUuid in documentUuids
                try
                    -- Find the document by UUID
                    set targetRecord to get record with uuid documentUuid
                    
                    if targetRecord exists then
                        -- Apply tag action
                        if action = "add" then
                            -- Add new tags to existing tags
                            set currentTags to tags of targetRecord
                            set combinedTags to my mergeLists(currentTags, newTags)
                            set tags of targetRecord to combinedTags
                            
                        else if action = "replace" then
                            -- Replace all tags with new tags
                            set tags of targetRecord to newTags
                            
                        else if action = "remove" then
                            -- Remove specified tags from current tags
                            set currentTags to tags of targetRecord
                            set filteredTags to my removeTags(currentTags, newTags)
                            set tags of targetRecord to filteredTags
                            
                        end if
                        
                        set processedCount to processedCount + 1
                        set end of processedDocuments to documentUuid
                    else
                        set errorCount to errorCount + 1
                        set end of errorDocuments to documentUuid
                    end if
                    
                on error errMsg
                    set errorCount to errorCount + 1
                    set end of errorDocuments to documentUuid
                end try
            end repeat
            
            return "{\"success\": true, \"processedDocuments\": " & processedCount & ", \"errorDocuments\": " & errorCount & ", \"message\": \"Bulk tag operation completed\", \"action\": \"" & action & "\"}"
            
        on error errMsg
            return "{\"error\": \"Failed to process bulk tags: " & errMsg & "\"}"
        end try
    end tell
end run

-- Parse JSON array (simplified parser for arrays of strings)
on parseJsonArray(jsonString)
    set resultList to {}
    try
        -- Remove brackets and split by comma
        set cleanString to jsonString
        if cleanString starts with "[" then
            set cleanString to text 2 thru -1 of cleanString
        end if
        if cleanString ends with "]" then
            set cleanString to text 1 thru -2 of cleanString
        end if
        
        -- Split by comma and clean quotes
        set oldDelim to AppleScript's text item delimiters
        set AppleScript's text item delimiters to ","
        set rawItems to text items of cleanString
        set AppleScript's text item delimiters to oldDelim
        
        repeat with rawItem in rawItems
            set cleanItem to my trimSpaces(rawItem)
            if cleanItem starts with "\"" then
                set cleanItem to text 2 thru -1 of cleanItem
            end if
            if cleanItem ends with "\"" then
                set cleanItem to text 1 thru -2 of cleanItem
            end if
            if cleanItem is not "" then
                set end of resultList to cleanItem
            end if
        end repeat
        
    end try
    return resultList
end parseJsonArray

-- Merge two lists, removing duplicates
on mergeLists(list1, list2)
    set mergedList to {}
    
    -- Add all items from list1
    repeat with item1 in list1
        set end of mergedList to item1
    end repeat
    
    -- Add items from list2 that aren't already in mergedList
    repeat with item2 in list2
        if item2 is not in mergedList then
            set end of mergedList to item2
        end if
    end repeat
    
    return mergedList
end mergeLists

-- Remove tags from current list
on removeTags(currentTags, tagsToRemove)
    set filteredTags to {}
    
    repeat with currentTag in currentTags
        if currentTag is not in tagsToRemove then
            set end of filteredTags to currentTag
        end if
    end repeat
    
    return filteredTags
end removeTags

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