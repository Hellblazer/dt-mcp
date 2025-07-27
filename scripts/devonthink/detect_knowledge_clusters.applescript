-- Detect topic-based knowledge clusters
-- More efficient clustering based on tags and smart groups

on run argv
    set searchQuery to ""
    set maxDocuments to 50
    set minClusterSize to 3
    
    if (count of argv) > 0 then
        set searchQuery to item 1 of argv
    end if
    if (count of argv) > 1 then
        set maxDocuments to item 2 of argv as integer
    end if
    if (count of argv) > 2 then
        set minClusterSize to item 3 of argv as integer
    end if
    
    tell application id "DNtp"
        try
            -- Search for documents if query provided, otherwise use selection
            set targetDocs to {}
            if searchQuery is "" then
                -- Use current selection
                set targetDocs to selection
                if (count of targetDocs) = 0 then
                    return "{\"error\":\"No documents selected and no search query provided\"}"
                end if
            else
                -- Search for documents
                set searchResults to search searchQuery
                if (count of searchResults) > maxDocuments then
                    set targetDocs to items 1 through maxDocuments of searchResults
                else
                    set targetDocs to searchResults
                end if
            end if
            
            if (count of targetDocs) = 0 then
                return "{\"error\":\"No documents found\"}"
            end if
            
            -- Build tag-based clusters
            set tagClusters to {}
            
            -- Collect all tags and their document associations
            repeat with doc in targetDocs
                set docUUID to uuid of doc
                set docTags to tags of doc
                
                repeat with tag in docTags
                    set tagStr to tag as string
                    set foundCluster to false
                    
                    -- Find or create cluster for this tag
                    repeat with cluster in tagClusters
                        if tagName of cluster is tagStr then
                            set end of documentList of cluster to docUUID
                            set foundCluster to true
                            exit repeat
                        end if
                    end repeat
                    
                    if not foundCluster then
                        set end of tagClusters to {tagName:tagStr, documentList:{docUUID}}
                    end if
                end repeat
            end repeat
            
            -- Build connection graph for documents
            set connectionGraph to {}
            repeat with i from 1 to count of targetDocs
                set doc1 to item i of targetDocs
                set uuid1 to uuid of doc1
                set tags1 to tags of doc1
                
                repeat with j from (i + 1) to count of targetDocs
                    set doc2 to item j of targetDocs
                    set uuid2 to uuid of doc2
                    set tags2 to tags of doc2
                    
                    -- Calculate shared tags
                    set sharedTags to {}
                    repeat with tag1 in tags1
                        if tags2 contains tag1 then
                            set end of sharedTags to (tag1 as string)
                        end if
                    end repeat
                    
                    if (count of sharedTags) > 0 then
                        set end of connectionGraph to {source:uuid1, target:uuid2, sharedTags:sharedTags}
                    end if
                end repeat
            end repeat
            
            -- Find clusters using connected components
            set clusters to {}
            set visited to {}
            
            repeat with doc in targetDocs
                set docUUID to uuid of doc
                if not (visited contains docUUID) then
                    -- Start new cluster
                    set currentCluster to {docUUID}
                    set end of visited to docUUID
                    set toVisit to {docUUID}
                    
                    -- BFS to find all connected documents
                    repeat while (count of toVisit) > 0
                        set currentUUID to item 1 of toVisit
                        set toVisit to rest of toVisit
                        
                        -- Find all connections
                        repeat with conn in connectionGraph
                            set neighbor to missing value
                            if (source of conn) is currentUUID then
                                set neighbor to (target of conn)
                            else if (target of conn) is currentUUID then
                                set neighbor to (source of conn)
                            end if
                            
                            if neighbor is not missing value and not (visited contains neighbor) then
                                set end of currentCluster to neighbor
                                set end of visited to neighbor
                                set end of toVisit to neighbor
                            end if
                        end repeat
                    end repeat
                    
                    -- Add cluster if it meets minimum size
                    if (count of currentCluster) >= minClusterSize then
                        set end of clusters to currentCluster
                    end if
                end if
            end repeat
            
            -- Build detailed output
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"query\":\"" & searchQuery & "\","
            set jsonOutput to jsonOutput & "\"documentsAnalyzed\":" & (count of targetDocs) & ","
            set jsonOutput to jsonOutput & "\"clusterCount\":" & (count of clusters) & ","
            set jsonOutput to jsonOutput & "\"tagCount\":" & (count of tagClusters) & ","
            
            -- Add tag summary
            set jsonOutput to jsonOutput & "\"topTags\":["
            set tagCount to 0
            repeat with tagCluster in tagClusters
                if (count of documentList of tagCluster) >= 2 then
                    if tagCount > 0 then set jsonOutput to jsonOutput & ","
                    set jsonOutput to jsonOutput & "{"
                    set jsonOutput to jsonOutput & "\"tag\":\"" & my escapeString(tagName of tagCluster) & "\","
                    set jsonOutput to jsonOutput & "\"documentCount\":" & (count of documentList of tagCluster)
                    set jsonOutput to jsonOutput & "}"
                    set tagCount to tagCount + 1
                    if tagCount >= 10 then exit repeat
                end if
            end repeat
            set jsonOutput to jsonOutput & "],"
            
            -- Add clusters
            set jsonOutput to jsonOutput & "\"clusters\":["
            repeat with i from 1 to count of clusters
                set cluster to item i of clusters
                
                -- Get cluster documents and their common tags
                set clusterTags to {}
                set clusterDocs to {}
                repeat with docUUID in cluster
                    -- Find document in targetDocs
                    repeat with doc in targetDocs
                        if uuid of doc is docUUID then
                            set end of clusterDocs to doc
                            set docTags to tags of doc
                            repeat with tag in docTags
                                set tagStr to tag as string
                                if not (clusterTags contains tagStr) then
                                    set end of clusterTags to tagStr
                                end if
                            end repeat
                            exit repeat
                        end if
                    end repeat
                end repeat
                
                set jsonOutput to jsonOutput & "{"
                set jsonOutput to jsonOutput & "\"id\":" & i & ","
                set jsonOutput to jsonOutput & "\"size\":" & (count of cluster) & ","
                set jsonOutput to jsonOutput & "\"commonTags\":" & my tagListToJSON(clusterTags) & ","
                set jsonOutput to jsonOutput & "\"documents\":["
                
                repeat with j from 1 to count of clusterDocs
                    set doc to item j of clusterDocs
                    set jsonOutput to jsonOutput & "{"
                    set jsonOutput to jsonOutput & "\"uuid\":\"" & (uuid of doc) & "\","
                    set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(name of doc) & "\","
                    set jsonOutput to jsonOutput & "\"type\":\"" & (type of doc as string) & "\""
                    set jsonOutput to jsonOutput & "}"
                    if j < count of clusterDocs then set jsonOutput to jsonOutput & ","
                end repeat
                
                set jsonOutput to jsonOutput & "]}"
                if i < count of clusters then set jsonOutput to jsonOutput & ","
            end repeat
            set jsonOutput to jsonOutput & "]}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Convert tag list to JSON array
on tagListToJSON(tagList)
    set jsonTags to "["
    repeat with i from 1 to count of tagList
        set jsonTags to jsonTags & "\"" & my escapeString(item i of tagList) & "\""
        if i < count of tagList then set jsonTags to jsonTags & ","
    end repeat
    set jsonTags to jsonTags & "]"
    return jsonTags
end tagListToJSON

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