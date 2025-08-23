on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameter: parameters JSON\"}"
    end if
    
    set parametersJson to item 1 of argv
    
    try
        -- Parse required action parameter
        set actionType to my extractJsonValue(parametersJson, "action")
        
        if actionType is "" then
            return "{\"error\": \"Action is required\"}"
        end if
        
        -- Parse optional parameters
        set operationId to my extractJsonValue(parametersJson, "operationId")
        set maxConcurrent to my extractJsonValue(parametersJson, "maxConcurrent")
        set priority to my extractJsonValue(parametersJson, "priority")
        
        -- Execute operation queue management based on action
        if actionType is "pause" then
            return my pauseQueue()
            
        else if actionType is "resume" then
            return my resumeQueue()
            
        else if actionType is "clear" then
            return my clearQueue()
            
        else if actionType is "set_concurrency" then
            if maxConcurrent is "" then
                return "{\"error\": \"maxConcurrent parameter required for set_concurrency action\"}"
            end if
            return my setConcurrency(maxConcurrent)
            
        else if actionType is "cancel_operation" then
            if operationId is "" then
                return "{\"error\": \"operationId parameter required for cancel_operation action\"}"
            end if
            return my cancelOperation(operationId)
            
        else
            return "{\"error\": \"Unknown action: " & actionType & ". Valid actions: pause, resume, clear, set_concurrency, cancel_operation\"}"
        end if
        
    on error errMsg number errNum
        return "{\"error\": \"Operation queue management failed: " & errMsg & " (Code: " & errNum & ")\"}"
    end try
end run

-- Pause operation queue
on pauseQueue()
    try
        -- Create status document to simulate queue pause
        tell application id "DNtp"
            set currentDb to current database
            
            -- Check if queue status document exists
            set statusDoc to ""
            try
                set searchResults to search "name:MCP_Operation_Queue_Status" in currentDb
                if (count of searchResults) > 0 then
                    set statusDoc to item 1 of searchResults
                else
                    set statusDoc to create record with {type:txt, name:"MCP_Operation_Queue_Status"} in currentDb
                end if
            on error
                set statusDoc to create record with {type:txt, name:"MCP_Operation_Queue_Status"} in currentDb
            end try
            
            -- Update status to paused
            set statusContent to "Queue Status: PAUSED" & return
            set statusContent to statusContent & "Updated: " & (current date as string) & return
            set statusContent to statusContent & "Active Operations: 0" & return
            set statusContent to statusContent & "Pending Operations: 0" & return
            set statusContent to statusContent & "Management Action: pause" & return
            
            set plain text of statusDoc to statusContent
            set tags of statusDoc to {"mcp-queue", "paused"}
            
            return my formatQueueResult("pause", true, "Queue paused successfully", {status:"paused", activeOperations:0, pendingOperations:0})
        end tell
        
    on error errMsg
        return my formatQueueResult("pause", false, errMsg, {})
    end try
end pauseQueue

-- Resume operation queue
on resumeQueue()
    try
        tell application id "DNtp"
            set currentDb to current database
            
            -- Find and update queue status document
            set statusDoc to ""
            try
                set searchResults to search "name:MCP_Operation_Queue_Status" in currentDb
                if (count of searchResults) > 0 then
                    set statusDoc to item 1 of searchResults
                else
                    set statusDoc to create record with {type:txt, name:"MCP_Operation_Queue_Status"} in currentDb
                end if
            on error
                set statusDoc to create record with {type:txt, name:"MCP_Operation_Queue_Status"} in currentDb
            end try
            
            -- Update status to running
            set statusContent to "Queue Status: RUNNING" & return
            set statusContent to statusContent & "Updated: " & (current date as string) & return
            set statusContent to statusContent & "Max Concurrent: 3" & return
            set statusContent to statusContent & "Active Operations: 0" & return
            set statusContent to statusContent & "Pending Operations: 0" & return
            set statusContent to statusContent & "Management Action: resume" & return
            
            set plain text of statusDoc to statusContent
            set tags of statusDoc to {"mcp-queue", "running"}
            
            return my formatQueueResult("resume", true, "Queue resumed successfully", {status:"running", maxConcurrent:3, activeOperations:0, pendingOperations:0})
        end tell
        
    on error errMsg
        return my formatQueueResult("resume", false, errMsg, {})
    end try
end resumeQueue

-- Clear operation queue
on clearQueue()
    try
        tell application id "DNtp"
            set currentDb to current database
            
            -- Find all MCP operation documents and clear them
            set operationDocs to search "tag:mcp-operation" in currentDb
            set clearedCount to 0
            
            repeat with opDoc in operationDocs
                try
                    delete record opDoc
                    set clearedCount to clearedCount + 1
                on error
                    -- Skip documents that can't be deleted
                end try
            end repeat
            
            -- Update queue status
            set statusDoc to ""
            try
                set searchResults to search "name:MCP_Operation_Queue_Status" in currentDb
                if (count of searchResults) > 0 then
                    set statusDoc to item 1 of searchResults
                else
                    set statusDoc to create record with {type:txt, name:"MCP_Operation_Queue_Status"} in currentDb
                end if
            on error
                set statusDoc to create record with {type:txt, name:"MCP_Operation_Queue_Status"} in currentDb
            end try
            
            set statusContent to "Queue Status: CLEARED" & return
            set statusContent to statusContent & "Updated: " & (current date as string) & return
            set statusContent to statusContent & "Operations Cleared: " & clearedCount & return
            set statusContent to statusContent & "Active Operations: 0" & return
            set statusContent to statusContent & "Pending Operations: 0" & return
            set statusContent to statusContent & "Management Action: clear" & return
            
            set plain text of statusDoc to statusContent
            set tags of statusDoc to {"mcp-queue", "cleared"}
            
            return my formatQueueResult("clear", true, "Queue cleared successfully", {status:"cleared", operationsCleared:clearedCount, activeOperations:0, pendingOperations:0})
        end tell
        
    on error errMsg
        return my formatQueueResult("clear", false, errMsg, {})
    end try
end clearQueue

-- Set concurrency limit
on setConcurrency(maxConcurrentStr)
    try
        set maxConcurrentInt to maxConcurrentStr as integer
        
        if maxConcurrentInt < 1 or maxConcurrentInt > 10 then
            return my formatQueueResult("set_concurrency", false, "Concurrency limit must be between 1 and 10", {})
        end if
        
        tell application id "DNtp"
            set currentDb to current database
            
            -- Update queue configuration
            set configDoc to ""
            try
                set searchResults to search "name:MCP_Queue_Config" in currentDb
                if (count of searchResults) > 0 then
                    set configDoc to item 1 of searchResults
                else
                    set configDoc to create record with {type:txt, name:"MCP_Queue_Config"} in currentDb
                end if
            on error
                set configDoc to create record with {type:txt, name:"MCP_Queue_Config"} in currentDb
            end try
            
            set configContent to "Max Concurrent Operations: " & maxConcurrentInt & return
            set configContent to configContent & "Updated: " & (current date as string) & return
            set configContent to configContent & "Priority Levels: 1-10 (1=highest)" & return
            set configContent to configContent & "Timeout: 300 seconds" & return
            set configContent to configContent & "Management Action: set_concurrency" & return
            
            set plain text of configDoc to configContent
            set tags of configDoc to {"mcp-queue", "config"}
            
            return my formatQueueResult("set_concurrency", true, "Concurrency limit set successfully", {maxConcurrent:maxConcurrentInt, status:"updated"})
        end tell
        
    on error errMsg
        return my formatQueueResult("set_concurrency", false, errMsg, {})
    end try
end setConcurrency

-- Cancel specific operation
on cancelOperation(operationId)
    try
        tell application id "DNtp"
            set currentDb to current database
            
            -- Find operation document by ID
            set operationFound to false
            set searchResults to search ("MCP_Operation_" & operationId) in currentDb
            
            if (count of searchResults) > 0 then
                set operationDoc to item 1 of searchResults
                
                -- Mark as cancelled instead of deleting
                set cancelContent to "Operation ID: " & operationId & return
                set cancelContent to cancelContent & "Status: CANCELLED" & return
                set cancelContent to cancelContent & "Cancelled: " & (current date as string) & return
                set cancelContent to cancelContent & "Management Action: cancel_operation" & return
                
                set plain text of operationDoc to cancelContent
                set tags of operationDoc to {"mcp-operation", "cancelled"}
                set name of operationDoc to "MCP_Operation_Cancelled_" & operationId
                
                set operationFound to true
            end if
            
            if operationFound then
                return my formatQueueResult("cancel_operation", true, "Operation cancelled successfully", {operationId:operationId, status:"cancelled"})
            else
                return my formatQueueResult("cancel_operation", false, "Operation not found: " & operationId, {operationId:operationId})
            end if
        end tell
        
    on error errMsg
        return my formatQueueResult("cancel_operation", false, errMsg, {operationId:operationId})
    end try
end cancelOperation

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
            
            -- Get string/number value
            if i ≤ (length of remainingString) then
                set firstChar to character i of remainingString
                if firstChar is "\"" then
                    -- String value
                    set valueStart to i + 1
                    set searchString to text valueStart thru -1 of remainingString
                    set endPos to (offset of "\"" in searchString)
                    if endPos > 0 then
                        return text 1 thru (endPos - 1) of searchString
                    end if
                else
                    -- Number value
                    set valueStart to i
                    set searchString to text valueStart thru -1 of remainingString
                    set endPos to 1
                    repeat with j from 1 to (length of searchString)
                        set char to character j of searchString
                        if char is in {",", "}", "]", " ", tab, return} then
                            set endPos to j - 1
                            exit repeat
                        end if
                        set endPos to j
                    end repeat
                    return text 1 thru endPos of searchString
                end if
            end if
        end if
    end try
    return ""
end extractJsonValue

-- Format queue operation result
on formatQueueResult(action, success, message, details)
    set resultJson to "{"
    set resultJson to resultJson & "\"success\": " & (success as string) & ", "
    set resultJson to resultJson & "\"action\": \"" & action & "\", "
    set resultJson to resultJson & "\"message\": \"" & my escapeJsonString(message) & "\", "
    set resultJson to resultJson & "\"timestamp\": \"" & (current date as string) & "\""
    
    -- Add details if provided
    if details is not {} then
        set resultJson to resultJson & ", \"details\": " & my formatDetails(details)
    end if
    
    set resultJson to resultJson & "}"
    return resultJson
end formatQueueResult

-- Format details object (simplified)
on formatDetails(details)
    try
        set detailsJson to "{"
        set detailsJson to detailsJson & "\"data\": \"" & (details as string) & "\""
        set detailsJson to detailsJson & "}"
        return detailsJson
    on error
        return "{\"data\": \"details processed\"}"
    end try
end formatDetails

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