-- List smart groups in DEVONthink databases
-- Smart groups are records with type "smart group"

on run argv
    set databaseName to ""
    if (count of argv) > 0 then
        set databaseName to item 1 of argv
    end if
    
    tell application id "DNtp"
        try
            set allSmartGroups to {}
            set searchDatabases to {}
            
            -- Determine which databases to search
            if databaseName is not "" then
                repeat with db in databases
                    if name of db is databaseName then
                        set searchDatabases to {db}
                        exit repeat
                    end if
                end repeat
                if (count of searchDatabases) = 0 then
                    return "{\"error\":\"Database not found: " & databaseName & "\"}"
                end if
            else
                set searchDatabases to databases
            end if
            
            -- Use global search to find smart groups
            set searchQuery to "kind:smart-group"
            if databaseName is not "" then
                -- Search in specific database
                repeat with db in searchDatabases
                    try
                        set smartGroupResults to search searchQuery in db
                        set dbName to name of db
                        
                        repeat with rec in smartGroupResults
                            try
                                set groupName to name of rec
                                set groupUUID to uuid of rec
                                set groupLocation to location of rec
                                set groupCount to 0
                                
                                try
                                    set groupCount to count of children of rec
                                end try
                                
                                set groupJSON to "{"
                                set groupJSON to groupJSON & "\"name\":\"" & my escapeString(groupName) & "\","
                                set groupJSON to groupJSON & "\"uuid\":\"" & groupUUID & "\","
                                set groupJSON to groupJSON & "\"database\":\"" & my escapeString(dbName) & "\","
                                set groupJSON to groupJSON & "\"location\":\"" & my escapeString(groupLocation) & "\","
                                set groupJSON to groupJSON & "\"document_count\":" & groupCount
                                set groupJSON to groupJSON & "}"
                                
                                set end of allSmartGroups to groupJSON
                            on error
                                -- Skip records that can't be processed
                            end try
                        end repeat
                    on error
                        -- Skip databases that can't be accessed
                    end try
                end repeat
            else
                -- Search across all databases
                try
                    set smartGroupResults to search searchQuery
                    
                    repeat with rec in smartGroupResults
                        try
                            set groupName to name of rec
                            set groupUUID to uuid of rec
                            set groupLocation to location of rec
                            set groupCount to 0
                            set recDB to ""
                            
                            try
                                set groupCount to count of children of rec
                            end try
                            
                            -- Try to determine which database this record is from
                            try
                                set recDB to name of (database of rec)
                            on error
                                set recDB to "unknown"
                            end try
                            
                            set groupJSON to "{"
                            set groupJSON to groupJSON & "\"name\":\"" & my escapeString(groupName) & "\","
                            set groupJSON to groupJSON & "\"uuid\":\"" & groupUUID & "\","
                            set groupJSON to groupJSON & "\"database\":\"" & my escapeString(recDB) & "\","
                            set groupJSON to groupJSON & "\"location\":\"" & my escapeString(groupLocation) & "\","
                            set groupJSON to groupJSON & "\"document_count\":" & groupCount
                            set groupJSON to groupJSON & "}"
                            
                            set end of allSmartGroups to groupJSON
                        on error
                            -- Skip records that can't be processed
                        end try
                    end repeat
                on error
                    -- If global search fails, return empty list
                end try
            end if
            
            -- Build response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"database_filter\":\"" & databaseName & "\","
            set jsonOutput to jsonOutput & "\"total_smart_groups\":" & (count of allSmartGroups) & ","
            set jsonOutput to jsonOutput & "\"smart_groups\":[" & my joinList(allSmartGroups, ",") & "],"
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

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