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
            
            -- Iterate through databases to find smart groups
            repeat with db in searchDatabases
                set dbName to name of db
                my findSmartGroupsInRecord(root of db, dbName, allSmartGroups, "/")
            end repeat
            
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

-- Recursively find smart groups in a record and its children
on findSmartGroupsInRecord(parentRecord, dbName, smartGroupsList, currentPath)
    tell application id "DNtp"
        try
            -- Get children of the current record
            set childRecords to children of parentRecord
            
            repeat with childRecord in childRecords
                try
                    set recordType to type of childRecord as string
                    set recordName to name of childRecord
                    
                    -- Check if it's a smart group
                    if recordType is "smart group" then
                        set groupUUID to uuid of childRecord
                        set groupLocation to currentPath
                        set groupCount to 0
                        
                        -- Try to get the count of items in the smart group
                        try
                            set groupCount to count of children of childRecord
                        on error
                            -- Some smart groups may not have accessible children
                            set groupCount to 0
                        end try
                        
                        -- Get the search predicate if available
                        set searchPredicate to ""
                        try
                            set searchPredicate to search predicate of childRecord
                        on error
                            -- Not all smart groups expose their search predicate
                        end try
                        
                        set groupJSON to "{"
                        set groupJSON to groupJSON & "\"name\":\"" & my escapeString(recordName) & "\","
                        set groupJSON to groupJSON & "\"uuid\":\"" & groupUUID & "\","
                        set groupJSON to groupJSON & "\"database\":\"" & my escapeString(dbName) & "\","
                        set groupJSON to groupJSON & "\"location\":\"" & my escapeString(groupLocation) & "\","
                        set groupJSON to groupJSON & "\"document_count\":" & groupCount
                        if searchPredicate is not "" then
                            set groupJSON to groupJSON & ",\"search_predicate\":\"" & my escapeString(searchPredicate) & "\""
                        end if
                        set groupJSON to groupJSON & "}"
                        
                        set end of smartGroupsList to groupJSON
                    else if recordType is "group" then
                        -- Recursively search in regular groups
                        my findSmartGroupsInRecord(childRecord, dbName, smartGroupsList, currentPath & recordName & "/")
                    end if
                on error
                    -- Skip records that can't be accessed
                end try
            end repeat
        on error
            -- Skip if we can't get children
        end try
    end tell
end findSmartGroupsInRecord

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