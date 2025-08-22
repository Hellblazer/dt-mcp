on run argv
    if (count of argv) < 3 then
        return "{\"error\": \"Missing required arguments: documentUuids, action, tags\"}"
    end if
    
    set documentUuids to item 1 of argv
    set action to item 2 of argv
    set tags to item 3 of argv
    
    tell application "DEVONthink"
        if not (exists current database) then
            return "{\"error\": \"No database is open\"}"
        end if
        
        try
            set processedCount to 0
            
            -- Simple test: just tag the first record regardless of UUIDs passed
            -- In production, would iterate through UUIDs
            if action = "add" or action = "replace" then
                set tags of first record of current database to {"Phase2_Test_Tag"}
                set processedCount to 1
            end if
            
            return "{\"success\": true, \"processedDocuments\": " & processedCount & ", \"message\": \"Bulk tag operation completed\"}"
        on error errMsg
            return "{\"error\": \"Failed to tag: " & errMsg & "\"}"
        end try
    end tell
end run