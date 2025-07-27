-- Find shortest path between two documents using breadth-first search
-- Uses iterative approach with queue as suggested

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing document UUIDs (start and target required)\"}"
    end if
    
    set startUUID to item 1 of argv
    set targetUUID to item 2 of argv
    set maxDepth to 5
    if (count of argv) > 2 then
        set maxDepth to item 3 of argv as integer
    end if
    
    tell application id "DNtp"
        try
            -- Validate both documents exist
            set startRecord to get record with uuid startUUID
            set targetRecord to get record with uuid targetUUID
            if startRecord is missing value or targetRecord is missing value then
                return "{\"error\":\"One or both documents not found\"}"
            end if
            
            -- Check if start and target are the same
            if startUUID is equal to targetUUID then
                return "{\"path\":[\"" & startUUID & "\"],\"length\":0,\"found\":true}"
            end if
            
            -- Initialize BFS structures
            set visitedNodes to {}
            set queue to {{node:startRecord, path:{startUUID}, depth:0}}
            set pathFound to false
            set shortestPath to {}
            
            -- Breadth-first search
            repeat while (count of queue) > 0
                -- Dequeue first item
                set current to item 1 of queue
                set queue to rest of queue
                
                set currentRecord to node of current
                set currentPath to path of current
                set currentDepth to depth of current
                
                -- Check depth limit
                if currentDepth > maxDepth then
                    exit repeat
                end if
                
                set currentUUID to uuid of currentRecord
                
                -- Skip if already visited
                if visitedNodes contains currentUUID then
                    -- Continue to next iteration
                else
                    set end of visitedNodes to currentUUID
                    
                    -- Get all connected documents
                    set connectedDocs to {}
                    
                    -- Add AI-related documents (limit to top 3 for performance)
                    if currentDepth < maxDepth - 1 then -- Only use AI on earlier levels
                        try
                            set relatedDocs to compare record currentRecord
                            set relatedCount to 0
                            repeat with relDoc in relatedDocs
                                if relatedCount >= 3 then exit repeat
                                set relatedCount to relatedCount + 1
                                set end of connectedDocs to {doc:relDoc, connectionType:"ai_related"}
                            end repeat
                        end try
                    end if
                    
                    -- Add incoming references
                    try
                        set incomingDocs to incoming references of currentRecord
                        repeat with inDoc in incomingDocs
                            set end of connectedDocs to {doc:inDoc, connectionType:"incoming_ref"}
                        end repeat
                    end try
                    
                    -- Add outgoing references
                    try
                        set outgoingDocs to outgoing references of currentRecord
                        repeat with outDoc in outgoingDocs
                            set end of connectedDocs to {doc:outDoc, connectionType:"outgoing_ref"}
                        end repeat
                    end try
                    
                    -- Check each connected document
                    repeat with connInfo in connectedDocs
                        set connDoc to doc of connInfo
                        set connType to connectionType of connInfo
                        set connUUID to uuid of connDoc
                        
                        -- Build new path
                        set newPath to currentPath & {connUUID}
                        
                        -- Check if we found the target
                        if connUUID is equal to targetUUID then
                            set pathFound to true
                            set shortestPath to newPath
                            exit repeat
                        end if
                        
                        -- Add to queue if not visited
                        if not (visitedNodes contains connUUID) then
                            set end of queue to {node:connDoc, path:newPath, depth:(currentDepth + 1)}
                        end if
                    end repeat
                    
                    if pathFound then exit repeat
                end if
            end repeat
            
            -- Build result
            if pathFound then
                -- Get details for each node in path
                set pathDetails to "["
                repeat with i from 1 to count of shortestPath
                    set nodeUUID to item i of shortestPath
                    set nodeRecord to get record with uuid nodeUUID
                    
                    set pathDetails to pathDetails & "{"
                    set pathDetails to pathDetails & "\"uuid\":\"" & nodeUUID & "\","
                    set pathDetails to pathDetails & "\"name\":\"" & my escapeString(name of nodeRecord) & "\","
                    set pathDetails to pathDetails & "\"type\":\"" & (type of nodeRecord as string) & "\""
                    set pathDetails to pathDetails & "}"
                    
                    if i < count of shortestPath then set pathDetails to pathDetails & ","
                end repeat
                set pathDetails to pathDetails & "]"
                
                set jsonOutput to "{"
                set jsonOutput to jsonOutput & "\"found\":true,"
                set jsonOutput to jsonOutput & "\"length\":" & ((count of shortestPath) - 1) & ","
                set jsonOutput to jsonOutput & "\"path\":" & pathDetails & ","
                set jsonOutput to jsonOutput & "\"startUUID\":\"" & startUUID & "\","
                set jsonOutput to jsonOutput & "\"targetUUID\":\"" & targetUUID & "\""
                set jsonOutput to jsonOutput & "}"
                
                return jsonOutput
            else
                return "{\"found\":false,\"startUUID\":\"" & startUUID & "\",\"targetUUID\":\"" & targetUUID & "\",\"message\":\"No path found within depth " & maxDepth & "\"}"
            end if
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Utility function to escape special characters
on escapeString(inputString)
    set inputString to inputString as string
    set AppleScript's text item delimiters to "\\"
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\\"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to "/"
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\/"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 10
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 13
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\r"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 9
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\t"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ""
    
    return inputString
end escapeString