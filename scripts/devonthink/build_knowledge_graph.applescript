-- Build Knowledge Graph with iterative (non-recursive) approach
-- Traverses document relationships using a queue-based algorithm

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing document UUID\"}"
    end if
    
    set startUUID to item 1 of argv
    set maxDepth to 3
    if (count of argv) > 1 then
        set maxDepth to item 2 of argv as integer
    end if
    
    tell application id "DNtp"
        try
            set rootRecord to get record with uuid startUUID
            if rootRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Initialize tracking
            set visitedNodes to {}
            set allNodes to {}
            set allEdges to {}
            
            -- Start iterative traversal
            my buildGraphIteratively(rootRecord, maxDepth, visitedNodes, allNodes, allEdges)
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"root\":\"" & startUUID & "\","
            set jsonOutput to jsonOutput & "\"depth\":" & maxDepth & ","
            set jsonOutput to jsonOutput & "\"nodes\":" & my nodesToJSON(allNodes) & ","
            set jsonOutput to jsonOutput & "\"edges\":" & my edgesToJSON(allEdges) & ","
            set jsonOutput to jsonOutput & "\"nodeCount\":" & (count of allNodes) & ","
            set jsonOutput to jsonOutput & "\"edgeCount\":" & (count of allEdges)
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

on buildGraphIteratively(rootRecord, maxDepth, visitedNodes, allNodes, allEdges)
    tell application id "DNtp"
        -- Initialize queue with root record at depth 0
        -- Each queue item is a list: {record, depth}
        set traversalQueue to {{rootRecord, 0}}
        
        repeat while length of traversalQueue > 0
            -- Dequeue first item (FIFO)
            set currentItem to item 1 of traversalQueue
            set currentRecord to item 1 of currentItem
            set currentDepth to item 2 of currentItem
            
            -- Remove first item from queue
            if length of traversalQueue > 1 then
                set traversalQueue to items 2 through -1 of traversalQueue
            else
                set traversalQueue to {}
            end if
            
            set recordUUID to uuid of currentRecord
            
            -- Check if already visited
            if visitedNodes contains recordUUID then
                -- Skip to next iteration
            else
                set end of visitedNodes to recordUUID
                
                -- Add node
                set nodeInfo to {nodeUUID:recordUUID, nodeName:(name of currentRecord), nodeType:(type of currentRecord as string), nodeDepth:currentDepth}
                set end of allNodes to nodeInfo
                
                -- Stop expanding if max depth reached
                if currentDepth < maxDepth then
                    -- Get AI-based related documents
                    try
                        set relatedDocs to compare record currentRecord
                        set maxRelated to 5  -- Limit to prevent explosion
                        set relatedCount to 0
                        repeat with relatedDoc in relatedDocs
                            if relatedCount >= maxRelated then exit repeat
                            set relatedCount to relatedCount + 1
                            set relatedUUID to uuid of relatedDoc
                            set edgeInfo to {fromUUID:recordUUID, toUUID:relatedUUID, linkType:"ai_related", linkWeight:0.8}
                            set end of allEdges to edgeInfo
                            
                            -- Add to queue for later processing
                            if not (visitedNodes contains relatedUUID) then
                                set end of traversalQueue to {relatedDoc, currentDepth + 1}
                            end if
                        end repeat
                    end try
                    
                    -- Get incoming references
                    try
                        set incomingDocs to incoming references of currentRecord
                        set maxIncoming to 3
                        set incomingCount to 0
                        repeat with incomingDoc in incomingDocs
                            if incomingCount >= maxIncoming then exit repeat
                            set incomingCount to incomingCount + 1
                            set incomingUUID to uuid of incomingDoc
                            set edgeInfo to {fromUUID:incomingUUID, toUUID:recordUUID, linkType:"reference", linkWeight:1.0}
                            set end of allEdges to edgeInfo
                            
                            -- Add to queue for later processing
                            if not (visitedNodes contains incomingUUID) then
                                set end of traversalQueue to {incomingDoc, currentDepth + 1}
                            end if
                        end repeat
                    end try
                    
                    -- Get outgoing references
                    try
                        set outgoingDocs to outgoing references of currentRecord
                        set maxOutgoing to 3
                        set outgoingCount to 0
                        repeat with outgoingDoc in outgoingDocs
                            if outgoingCount >= maxOutgoing then exit repeat
                            set outgoingCount to outgoingCount + 1
                            set outgoingUUID to uuid of outgoingDoc
                            set edgeInfo to {fromUUID:recordUUID, toUUID:outgoingUUID, linkType:"reference", linkWeight:1.0}
                            set end of allEdges to edgeInfo
                            
                            -- Add to queue for later processing
                            if not (visitedNodes contains outgoingUUID) then
                                set end of traversalQueue to {outgoingDoc, currentDepth + 1}
                            end if
                        end repeat
                    end try
                    
                    -- Get replicants (documents that are copies in other locations)
                    try
                        set replicantDocs to replicants of currentRecord
                        set maxReplicants to 2
                        set replicantCount to 0
                        repeat with replicantDoc in replicantDocs
                            if replicantCount >= maxReplicants then exit repeat
                            set replicantCount to replicantCount + 1
                            set replicantUUID to uuid of replicantDoc
                            if replicantUUID is not equal to recordUUID then
                                set edgeInfo to {fromUUID:recordUUID, toUUID:replicantUUID, linkType:"replicant", linkWeight:0.9}
                                set end of allEdges to edgeInfo
                                
                                -- Add to queue for later processing
                                if not (visitedNodes contains replicantUUID) then
                                    set end of traversalQueue to {replicantDoc, currentDepth + 1}
                                end if
                            end if
                        end repeat
                    end try
                end if
            end if
        end repeat
    end tell
end buildGraphIteratively

on nodesToJSON(nodeList)
    set jsonNodes to "["
    repeat with i from 1 to count of nodeList
        set nodeInfo to item i of nodeList
        
        set jsonNodes to jsonNodes & "{"
        set jsonNodes to jsonNodes & "\"uuid\":\"" & (nodeUUID of nodeInfo) & "\","
        set jsonNodes to jsonNodes & "\"name\":\"" & my escapeString(nodeName of nodeInfo) & "\","
        set jsonNodes to jsonNodes & "\"type\":\"" & (nodeType of nodeInfo) & "\","
        set jsonNodes to jsonNodes & "\"depth\":" & (nodeDepth of nodeInfo)
        set jsonNodes to jsonNodes & "}"
        
        if i < count of nodeList then set jsonNodes to jsonNodes & ","
    end repeat
    set jsonNodes to jsonNodes & "]"
    
    return jsonNodes
end nodesToJSON

on edgesToJSON(edgeList)
    set jsonEdges to "["
    set uniqueEdges to {}
    
    -- Remove duplicate edges
    repeat with edge in edgeList
        set edgeKey to (fromUUID of edge) & "->" & (toUUID of edge) & ":" & (linkType of edge)
        if uniqueEdges does not contain edgeKey then
            set end of uniqueEdges to edgeKey
            
            if length of jsonEdges > 1 then set jsonEdges to jsonEdges & ","
            
            set jsonEdges to jsonEdges & "{"
            set jsonEdges to jsonEdges & "\"source\":\"" & (fromUUID of edge) & "\","
            set jsonEdges to jsonEdges & "\"target\":\"" & (toUUID of edge) & "\","
            set jsonEdges to jsonEdges & "\"type\":\"" & (linkType of edge) & "\","
            set jsonEdges to jsonEdges & "\"weight\":" & (linkWeight of edge)
            set jsonEdges to jsonEdges & "}"
        end if
    end repeat
    
    set jsonEdges to jsonEdges & "]"
    return jsonEdges
end edgesToJSON

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