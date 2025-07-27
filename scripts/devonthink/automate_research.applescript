-- Automate common research workflows in DEVONthink
-- Combines multiple operations for efficient research

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: workflow type and query/UUID\"}"
    end if
    
    set workflowType to item 1 of argv
    set queryOrUUID to item 2 of argv
    
    tell application id "DNtp"
        try
            if workflowType is "explore_topic" then
                -- Workflow: Search topic, find related docs, create collection
                return my exploreTopic(queryOrUUID)
                
            else if workflowType is "expand_research" then
                -- Workflow: From one doc, find related, summarize connections
                return my expandResearch(queryOrUUID)
                
            else if workflowType is "organize_findings" then
                -- Workflow: Organize search results by relevance and tags
                return my organizeFindings(queryOrUUID)
                
            else
                return "{\"error\":\"Unknown workflow type: " & workflowType & "\"}"
            end if
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Workflow 1: Explore a new topic
on exploreTopic(searchQuery)
    tell application id "DNtp"
        -- Step 1: Search for documents
        set searchResults to search searchQuery
        if (count of searchResults) = 0 then
            return "{\"error\":\"No documents found for query: " & searchQuery & "\"}"
        end if
        
        -- Limit to top 20 results
        if (count of searchResults) > 20 then
            set searchResults to items 1 through 20 of searchResults
        end if
        
        -- Step 2: Create research collection
        set collectionName to "Research: " & searchQuery
        set collectionGroup to create record with {name:collectionName, type:group}
        
        -- Step 3: Analyze and organize results
        set tagFrequency to {}
        set documentTypes to {}
        set addedCount to 0
        
        repeat with doc in searchResults
            -- Add to collection
            replicate record doc to collectionGroup
            set addedCount to addedCount + 1
            
            -- Collect tags
            set docTags to tags of doc
            repeat with tag in docTags
                set tagStr to tag as string
                set found to false
                repeat with tagEntry in tagFrequency
                    if tagName of tagEntry is tagStr then
                        set tagCount of tagEntry to (tagCount of tagEntry) + 1
                        set found to true
                        exit repeat
                    end if
                end repeat
                if not found then
                    set end of tagFrequency to {tagName:tagStr, tagCount:1}
                end if
            end repeat
            
            -- Track document types
            set docType to type of doc as string
            set found to false
            repeat with typeEntry in documentTypes
                if typeName of typeEntry is docType then
                    set typeCount of typeEntry to (typeCount of typeEntry) + 1
                    set found to true
                    exit repeat
                end if
            end repeat
            if not found then
                set end of documentTypes to {typeName:docType, typeCount:1}
            end if
        end repeat
        
        -- Step 4: Create summary note
        set summaryContent to "# Research Collection: " & searchQuery & "\n\n"
        set summaryContent to summaryContent & "**Created:** " & (current date as string) & "\n"
        set summaryContent to summaryContent & "**Documents Found:** " & addedCount & "\n\n"
        
        -- Add top tags
        set summaryContent to summaryContent & "## Top Tags\n"
        set tagCount to 0
        repeat with tagEntry in tagFrequency
            if (tagCount of tagEntry) >= 2 then
                set summaryContent to summaryContent & "- " & (tagName of tagEntry) & " (" & (tagCount of tagEntry) & " docs)\n"
                set tagCount to tagCount + 1
                if tagCount >= 10 then exit repeat
            end if
        end repeat
        
        -- Add document types
        set summaryContent to summaryContent & "\n## Document Types\n"
        repeat with typeEntry in documentTypes
            set summaryContent to summaryContent & "- " & (typeName of typeEntry) & ": " & (typeCount of typeEntry) & "\n"
        end repeat
        
        set summaryNote to create record with {name:"_Research Summary", type:markdown, content:summaryContent} in collectionGroup
        
        -- Return results
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"workflow\":\"explore_topic\","
        set jsonOutput to jsonOutput & "\"query\":\"" & searchQuery & "\","
        set jsonOutput to jsonOutput & "\"collectionUUID\":\"" & (uuid of collectionGroup) & "\","
        set jsonOutput to jsonOutput & "\"collectionName\":\"" & collectionName & "\","
        set jsonOutput to jsonOutput & "\"documentsAdded\":" & addedCount & ","
        set jsonOutput to jsonOutput & "\"summaryUUID\":\"" & (uuid of summaryNote) & "\","
        set jsonOutput to jsonOutput & "\"topTags\":" & my tagFrequencyToJSON(tagFrequency, 5)
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end exploreTopic

-- Workflow 2: Expand research from a document
on expandResearch(documentUUID)
    tell application id "DNtp"
        set theRecord to get record with uuid documentUUID
        if theRecord is missing value then
            return "{\"error\":\"Document not found\"}"
        end if
        
        -- Get document info
        set docName to name of theRecord
        set docTags to tags of theRecord
        
        -- Find related documents
        set relatedDocs to compare record theRecord
        set incomingRefs to incoming references of theRecord
        set outgoingRefs to outgoing references of theRecord
        
        -- Create expansion collection
        set collectionName to "Expansion: " & docName
        set expansionGroup to create record with {name:collectionName, type:group}
        
        -- Add original document
        replicate record theRecord to expansionGroup
        
        -- Process related documents
        set addedDocs to {}
        set connectionTypes to {}
        
        -- Add AI-related docs (limit to 10)
        set aiCount to 0
        repeat with relDoc in relatedDocs
            if aiCount >= 10 then exit repeat
            set aiCount to aiCount + 1
            replicate record relDoc to expansionGroup
            set end of addedDocs to {doc:relDoc, connectionType:"ai_related"}
        end repeat
        
        -- Add references
        repeat with refDoc in incomingRefs
            replicate record refDoc to expansionGroup
            set end of addedDocs to {doc:refDoc, connectionType:"incoming_ref"}
        end repeat
        
        repeat with refDoc in outgoingRefs
            replicate record refDoc to expansionGroup
            set end of addedDocs to {doc:refDoc, connectionType:"outgoing_ref"}
        end repeat
        
        -- Create relationship map
        set mapContent to "# Research Expansion: " & docName & "\n\n"
        set mapContent to mapContent & "**Base Document:** " & docName & "\n"
        set mapContent to mapContent & "**UUID:** " & documentUUID & "\n"
        set mapContent to mapContent & "**Expanded:** " & (current date as string) & "\n\n"
        
        set mapContent to mapContent & "## Connections Found\n\n"
        set mapContent to mapContent & "- AI-Related: " & aiCount & " documents\n"
        set mapContent to mapContent & "- Incoming References: " & (count of incomingRefs) & " documents\n"
        set mapContent to mapContent & "- Outgoing References: " & (count of outgoingRefs) & " documents\n\n"
        
        set mapContent to mapContent & "## Document Map\n\n"
        repeat with docInfo in addedDocs
            set doc to doc of docInfo
            set connType to connectionType of docInfo
            set mapContent to mapContent & "### " & (name of doc) & "\n"
            set mapContent to mapContent & "- Type: " & connType & "\n"
            set mapContent to mapContent & "- Document Type: " & (type of doc as string) & "\n"
            if (count of tags of doc) > 0 then
                set mapContent to mapContent & "- Tags: " & my tagsToString(tags of doc) & "\n"
            end if
            set mapContent to mapContent & "\n"
        end repeat
        
        set mapNote to create record with {name:"_Expansion Map", type:markdown, content:mapContent} in expansionGroup
        
        -- Return results
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"workflow\":\"expand_research\","
        set jsonOutput to jsonOutput & "\"sourceUUID\":\"" & documentUUID & "\","
        set jsonOutput to jsonOutput & "\"sourceName\":\"" & my escapeString(docName) & "\","
        set jsonOutput to jsonOutput & "\"collectionUUID\":\"" & (uuid of expansionGroup) & "\","
        set jsonOutput to jsonOutput & "\"documentsAdded\":" & (count of addedDocs) & ","
        set jsonOutput to jsonOutput & "\"aiRelated\":" & aiCount & ","
        set jsonOutput to jsonOutput & "\"references\":" & ((count of incomingRefs) + (count of outgoingRefs))
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end expandResearch

-- Workflow 3: Organize findings by relevance
on organizeFindings(searchQuery)
    tell application id "DNtp"
        -- Search and get results
        set searchResults to search searchQuery
        if (count of searchResults) = 0 then
            return "{\"error\":\"No documents found for query: " & searchQuery & "\"}"
        end if
        
        -- Score documents by multiple factors
        set scoredDocs to {}
        repeat with doc in searchResults
            set docScore to 0
            
            -- Score by tags (more tags = more organized/relevant)
            set docScore to docScore + (count of tags of doc) * 2
            
            -- Score by references (more connections = more important)
            try
                set docScore to docScore + (count of incoming references of doc) * 3
                set docScore to docScore + (count of outgoing references of doc)
            end try
            
            -- Score by modification date (recent = more relevant)
            set daysSinceModified to (current date) - (modification date of doc)
            set daysSinceModified to daysSinceModified / days
            if daysSinceModified < 30 then
                set docScore to docScore + 5
            else if daysSinceModified < 180 then
                set docScore to docScore + 2
            end if
            
            set end of scoredDocs to {doc:doc, score:docScore}
        end repeat
        
        -- Sort by score (simple bubble sort for small sets)
        repeat with i from 1 to (count of scoredDocs) - 1
            repeat with j from i + 1 to count of scoredDocs
                if score of (item i of scoredDocs) < score of (item j of scoredDocs) then
                    set temp to item i of scoredDocs
                    set item i of scoredDocs to item j of scoredDocs
                    set item j of scoredDocs to temp
                end if
            end repeat
        end repeat
        
        -- Create organized collection
        set collectionName to "Organized: " & searchQuery
        set organizedGroup to create record with {name:collectionName, type:group}
        
        -- Add top documents to subcategories
        set highRelevance to create record with {name:"High Relevance", type:group} in organizedGroup
        set mediumRelevance to create record with {name:"Medium Relevance", type:group} in organizedGroup
        set lowRelevance to create record with {name:"Low Relevance", type:group} in organizedGroup
        
        set addedCount to 0
        repeat with i from 1 to count of scoredDocs
            if i > 50 then exit repeat -- Limit total
            
            set scoredDoc to item i of scoredDocs
            set doc to doc of scoredDoc
            set docScore to score of scoredDoc
            
            if i ≤ 10 or docScore > 10 then
                replicate record doc to highRelevance
            else if i ≤ 25 or docScore > 5 then
                replicate record doc to mediumRelevance
            else
                replicate record doc to lowRelevance
            end if
            
            set addedCount to addedCount + 1
        end repeat
        
        -- Return results
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"workflow\":\"organize_findings\","
        set jsonOutput to jsonOutput & "\"query\":\"" & searchQuery & "\","
        set jsonOutput to jsonOutput & "\"collectionUUID\":\"" & (uuid of organizedGroup) & "\","
        set jsonOutput to jsonOutput & "\"totalFound\":" & (count of searchResults) & ","
        set jsonOutput to jsonOutput & "\"organized\":" & addedCount & ","
        set jsonOutput to jsonOutput & "\"highRelevance\":\"" & (uuid of highRelevance) & "\","
        set jsonOutput to jsonOutput & "\"mediumRelevance\":\"" & (uuid of mediumRelevance) & "\","
        set jsonOutput to jsonOutput & "\"lowRelevance\":\"" & (uuid of lowRelevance) & "\""
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end organizeFindings

-- Helper functions
on tagFrequencyToJSON(tagList, maxCount)
    set jsonTags to "["
    set tagCount to 0
    repeat with tagEntry in tagList
        if (tagCount of tagEntry) >= 2 then
            if tagCount > 0 then set jsonTags to jsonTags & ","
            set jsonTags to jsonTags & "{"
            set jsonTags to jsonTags & "\"tag\":\"" & my escapeString(tagName of tagEntry) & "\","
            set jsonTags to jsonTags & "\"count\":" & (tagCount of tagEntry)
            set jsonTags to jsonTags & "}"
            set tagCount to tagCount + 1
            if tagCount >= maxCount then exit repeat
        end if
    end repeat
    set jsonTags to jsonTags & "]"
    return jsonTags
end tagFrequencyToJSON

on tagsToString(tagList)
    set tagStr to ""
    repeat with i from 1 to count of tagList
        set tagStr to tagStr & (item i of tagList as string)
        if i < count of tagList then set tagStr to tagStr & ", "
    end repeat
    return tagStr
end tagsToString

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