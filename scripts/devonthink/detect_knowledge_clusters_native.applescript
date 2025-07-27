-- Detect knowledge clusters using DEVONthink's native AI classification
-- Groups documents by their AI-determined themes instead of manual clustering

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
            -- Get documents to analyze
            set targetDocs to {}
            if searchQuery is "" then
                set targetDocs to selection
                if (count of targetDocs) = 0 then
                    return "{\"error\":\"No documents selected and no search query provided\"}"
                end if
            else
                set searchResults to search searchQuery
                if (count of searchResults) > maxDocuments then
                    set targetDocs to items 1 through maxDocuments of searchResults
                else
                    set targetDocs to searchResults
                end if
            end if
            
            -- Collect AI classifications for all documents
            set documentClassifications to {}
            
            repeat with doc in targetDocs
                try
                    set docUUID to uuid of doc
                    set docTitle to name of doc
                    set docType to type of doc
                    
                    -- Get AI classification
                    set classifications to classify record doc
                    
                    -- Extract top theme for clustering
                    set primaryTheme to ""
                    set primaryScore to 0.0
                    
                    repeat with i from 1 to count of classifications
                        set suggestion to item i of classifications
                        set groupName to name of suggestion
                        set groupScore to score of suggestion
                        
                        -- Skip generic groups and find highest scoring meaningful theme
                        if groupName is not in {"Inbox", "old inbox", "New Group", "Unfiled", "Trash", ""} then
                            if groupScore > primaryScore then
                                set primaryTheme to groupName
                                set primaryScore to groupScore
                            end if
                        end if
                    end repeat
                    
                    if primaryTheme ≠ "" then
                        set end of documentClassifications to {docUUID, docTitle, docType, primaryTheme, primaryScore}
                    end if
                    
                on error
                    -- Skip documents that can't be processed
                end try
            end repeat
            
            -- Group documents by their primary AI theme
            set clusterMap to {}
            repeat with docInfo in documentClassifications
                set docUUID to item 1 of docInfo
                set docTitle to item 2 of docInfo
                set docType to item 3 of docInfo
                set docTheme to item 4 of docInfo
                set docScore to item 5 of docInfo
                
                -- Find or create cluster for this theme
                set clusterFound to false
                repeat with i from 1 to count of clusterMap
                    if (item 1 of (item i of clusterMap)) = docTheme then
                        -- Add document to existing cluster
                        set clusterDocs to item 2 of (item i of clusterMap)
                        set end of clusterDocs to {docUUID, docTitle, docType, docScore}
                        set item 2 of (item i of clusterMap) to clusterDocs
                        set clusterFound to true
                        exit repeat
                    end if
                end repeat
                
                if not clusterFound then
                    -- Create new cluster
                    set end of clusterMap to {docTheme, {{docUUID, docTitle, docType, docScore}}}
                end if
            end repeat
            
            -- Filter clusters by minimum size and format results
            set clusters to {}
            repeat with cluster in clusterMap
                set clusterTheme to item 1 of cluster
                set clusterDocs to item 2 of cluster
                
                if (count of clusterDocs) >= minClusterSize then
                    -- Calculate cluster statistics
                    set totalScore to 0.0
                    set avgScore to 0.0
                    repeat with docInfo in clusterDocs
                        set totalScore to totalScore + (item 4 of docInfo)
                    end repeat
                    if (count of clusterDocs) > 0 then
                        set avgScore to totalScore / (count of clusterDocs)
                    end if
                    
                    -- Format cluster documents
                    set docList to {}
                    repeat with docInfo in clusterDocs
                        set docUUID to item 1 of docInfo
                        set docTitle to item 2 of docInfo
                        set docType to item 3 of docInfo
                        set docScore to item 4 of docInfo
                        
                        set docJSON to "{"
                        set docJSON to docJSON & "\"uuid\":\"" & docUUID & "\","
                        set docJSON to docJSON & "\"title\":\"" & my escapeString(docTitle) & "\","
                        set docJSON to docJSON & "\"type\":\"" & docType & "\","
                        set docJSON to docJSON & "\"ai_confidence\":" & docScore
                        set docJSON to docJSON & "}"
                        
                        set end of docList to docJSON
                    end repeat
                    
                    -- Build cluster JSON
                    set clusterJSON to "{"
                    set clusterJSON to clusterJSON & "\"theme\":\"" & my escapeString(clusterTheme) & "\","
                    set clusterJSON to clusterJSON & "\"document_count\":" & (count of clusterDocs) & ","
                    set clusterJSON to clusterJSON & "\"average_confidence\":" & avgScore & ","
                    set clusterJSON to clusterJSON & "\"documents\":[" & my joinList(docList, ",") & "]"
                    set clusterJSON to clusterJSON & "}"
                    
                    set end of clusters to clusterJSON
                end if
            end repeat
            
            -- Build final response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"total_documents_analyzed\":" & (count of documentClassifications) & ","
            set jsonOutput to jsonOutput & "\"clusters_found\":" & (count of clusters) & ","
            set jsonOutput to jsonOutput & "\"min_cluster_size\":" & minClusterSize & ","
            set jsonOutput to jsonOutput & "\"clusters\":[" & my joinList(clusters, ",") & "],"
            set jsonOutput to jsonOutput & "\"method\":\"devonthink_ai_classification\","
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