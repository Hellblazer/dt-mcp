-- Advanced search with DEVONthink's native search operators and syntax
-- Simplified version focusing on core functionality

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing search query\"}"
    end if
    
    set searchQuery to item 1 of argv
    set databaseName to ""
    set maxResults to 100
    
    -- Parse additional parameters
    if (count of argv) > 1 then
        set dbParam to item 2 of argv
        if dbParam is not "" then
            set databaseName to dbParam
        end if
    end if
    if (count of argv) > 3 then
        set maxParam to item 4 of argv
        if maxParam is not "" then
            set maxResults to maxParam as integer
        end if
    end if
    
    tell application id "DNtp"
        try
            -- Perform search
            set searchResults to {}
            if databaseName is not "" then
                -- Find database by name
                set targetDB to missing value
                repeat with db in databases
                    if name of db is databaseName then
                        set targetDB to db
                        exit repeat
                    end if
                end repeat
                if targetDB is not missing value then
                    tell targetDB
                        set searchResults to search searchQuery
                    end tell
                else
                    return "{\"error\":\"Database not found: " & databaseName & "\"}"
                end if
            else
                set searchResults to search searchQuery
            end if
            
            -- Limit results
            if (count of searchResults) > maxResults then
                set searchResults to items 1 through maxResults of searchResults
            end if
            
            -- Build detailed results
            set resultList to {}
            repeat with doc in searchResults
                try
                    set docUUID to uuid of doc
                    set docName to name of doc
                    set docType to type of doc as string
                    set docSize to 0
                    set docLocation to location of doc
                    
                    try
                        set docSize to size of doc
                    end try
                    
                    set docJSON to "{"
                    set docJSON to docJSON & "\"uuid\":\"" & docUUID & "\","
                    set docJSON to docJSON & "\"name\":\"" & my escapeString(docName) & "\","
                    set docJSON to docJSON & "\"type\":\"" & docType & "\","
                    set docJSON to docJSON & "\"size\":" & docSize & ","
                    set docJSON to docJSON & "\"location\":\"" & my escapeString(docLocation) & "\""
                    set docJSON to docJSON & "}"
                    
                    set end of resultList to docJSON
                    
                on error
                    -- Skip documents that can't be processed
                end try
            end repeat
            
            -- Analyze search operators
            set operators to my analyzeSearchOperators(searchQuery)
            
            -- Build final response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"query\":\"" & my escapeString(searchQuery) & "\","
            set jsonOutput to jsonOutput & "\"database\":\"" & databaseName & "\","
            set jsonOutput to jsonOutput & "\"total_found\":" & (count of searchResults) & ","
            set jsonOutput to jsonOutput & "\"total_returned\":" & (count of resultList) & ","
            set jsonOutput to jsonOutput & "\"search_operators\":" & operators & ","
            set jsonOutput to jsonOutput & "\"results\":[" & my joinList(resultList, ",") & "],"
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Analyze search operators used in query
on analyzeSearchOperators(searchQuery)
    set operators to {}
    
    -- Check for common DEVONthink search operators
    if searchQuery contains " AND " or searchQuery contains " & " then
        set end of operators to "\"AND\""
    end if
    if searchQuery contains " OR " or searchQuery contains " | " then
        set end of operators to "\"OR\""
    end if
    if searchQuery contains " NOT " or searchQuery contains " -" then
        set end of operators to "\"NOT\""
    end if
    if searchQuery contains "\"" then
        set end of operators to "\"exact_phrase\""
    end if
    if searchQuery contains "*" then
        set end of operators to "\"wildcard\""
    end if
    if searchQuery contains "~" then
        set end of operators to "\"fuzzy\""
    end if
    if searchQuery contains "name:" then
        set end of operators to "\"name_field\""
    end if
    if searchQuery contains "comment:" then
        set end of operators to "\"comment_field\""
    end if
    if searchQuery contains "tag:" then
        set end of operators to "\"tag_field\""
    end if
    if searchQuery contains "kind:" then
        set end of operators to "\"kind_field\""
    end if
    if searchQuery contains "date:" then
        set end of operators to "\"date_field\""
    end if
    
    return "[" & my joinList(operators, ",") & "]"
end analyzeSearchOperators

-- Join list items with separator
on joinList(itemList, separator)
    if (count of itemList) = 0 then return ""
    
    set joinedText to ""
    repeat with i from 1 to count of itemList
        if i > 1 then set joinedText to joinedText & separator
        set joinedText to joinedText & (item i of itemList)
    end repeat
    
    return joinedText
end joinList

-- Escape special characters for JSON
on escapeString(inputString)
    set inputString to inputString as string
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as string
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString