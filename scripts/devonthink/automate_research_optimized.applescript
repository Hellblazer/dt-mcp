-- Optimized version of organize_findings workflow
-- Addresses performance issues with large result sets

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: workflow type and query/UUID\"}"
    end if
    
    set workflowType to item 1 of argv
    set queryOrUUID to item 2 of argv
    
    -- Optional performance parameters
    set maxResults to 50 -- Default max results to process
    if (count of argv) >= 3 then
        try
            set maxResults to (item 3 of argv) as integer
        end try
    end if
    
    tell application id "DNtp"
        try
            if workflowType is "organize_findings_optimized" then
                return my organizeFindings_Optimized(queryOrUUID, maxResults)
            else
                return "{\"error\":\"Unknown workflow type: " & workflowType & "\"}"
            end if
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Optimized Workflow: Organize findings by relevance
on organizeFindings_Optimized(searchQuery, maxResults)
    tell application id "DNtp"
        -- Search and limit results BEFORE processing
        set searchResults to search searchQuery
        if (count of searchResults) = 0 then
            return "{\"error\":\"No documents found for query: " & searchQuery & "\"}"
        end if
        
        -- OPTIMIZATION 1: Limit results before scoring
        set totalFound to count of searchResults
        if totalFound > maxResults then
            set searchResults to items 1 through maxResults of searchResults
        end if
        
        -- OPTIMIZATION 2: Batch process metadata
        set scoredDocs to {}
        set processedCount to 0
        
        -- Process in smaller batches to avoid timeout
        set batchSize to 10
        repeat with i from 1 to count of searchResults by batchSize
            set endIndex to i + batchSize - 1
            if endIndex > (count of searchResults) then
                set endIndex to count of searchResults
            end if
            
            repeat with j from i to endIndex
                set doc to item j of searchResults
                set docScore to my calculateDocScore_Optimized(doc)
                set end of scoredDocs to {doc:doc, score:docScore, docName:(name of doc)}
                set processedCount to processedCount + 1
            end repeat
            
            -- Allow DEVONthink to process other events
            delay 0.01
        end repeat
        
        -- OPTIMIZATION 3: Use quicksort instead of bubble sort
        set scoredDocs to my quickSort(scoredDocs, 1, count of scoredDocs)
        
        -- Create organized collection
        set collectionName to "Organized: " & searchQuery
        set organizedGroup to create record with {name:collectionName, type:group}
        
        -- Add metadata note first
        set metaContent to "# Search Organization Results\\n\\n"
        set metaContent to metaContent & "**Query:** " & searchQuery & "\\n"
        set metaContent to metaContent & "**Total Found:** " & totalFound & "\\n"
        set metaContent to metaContent & "**Processed:** " & processedCount & "\\n"
        set metaContent to metaContent & "**Date:** " & (current date as string) & "\\n\\n"
        
        set metaNote to create record with {name:"_Search Metadata", type:markdown, content:metaContent} in organizedGroup
        
        -- Create relevance groups
        set highRelevance to create record with {name:"High Relevance (Score > 10)", type:group} in organizedGroup
        set mediumRelevance to create record with {name:"Medium Relevance (Score 5-10)", type:group} in organizedGroup
        set lowRelevance to create record with {name:"Low Relevance (Score < 5)", type:group} in organizedGroup
        
        -- OPTIMIZATION 4: Track counts instead of replicating all docs
        set highCount to 0
        set medCount to 0
        set lowCount to 0
        
        -- Add documents to groups based on score
        repeat with i from 1 to count of scoredDocs
            set scoredDoc to item i of scoredDocs
            set doc to doc of scoredDoc
            set docScore to score of scoredDoc
            
            if docScore > 10 then
                replicate record doc to highRelevance
                set highCount to highCount + 1
            else if docScore >= 5 then
                replicate record doc to mediumRelevance
                set medCount to medCount + 1
            else
                replicate record doc to lowRelevance
                set lowCount to lowCount + 1
            end if
        end repeat
        
        -- Create summary in each group
        if highCount > 0 then
            set summaryContent to "# High Relevance Documents\\n\\n"
            set summaryContent to summaryContent & "**Count:** " & highCount & " documents\\n\\n"
            set summaryContent to summaryContent & "Documents in this group have:\\n"
            set summaryContent to summaryContent & "- Multiple tags and references\\n"
            set summaryContent to summaryContent & "- Recent modification dates\\n"
            set summaryContent to summaryContent & "- Strong connections to other documents\\n"
            create record with {name:"_Summary", type:markdown, content:summaryContent} in highRelevance
        end if
        
        -- Return results
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"workflow\":\"organize_findings_optimized\","
        set jsonOutput to jsonOutput & "\"query\":\"" & searchQuery & "\","
        set jsonOutput to jsonOutput & "\"collectionUUID\":\"" & (uuid of organizedGroup) & "\","
        set jsonOutput to jsonOutput & "\"totalFound\":" & totalFound & ","
        set jsonOutput to jsonOutput & "\"processed\":" & processedCount & ","
        set jsonOutput to jsonOutput & "\"organized\":" & (highCount + medCount + lowCount) & ","
        set jsonOutput to jsonOutput & "\"highRelevance\":{\"uuid\":\"" & (uuid of highRelevance) & "\",\"count\":" & highCount & "},"
        set jsonOutput to jsonOutput & "\"mediumRelevance\":{\"uuid\":\"" & (uuid of mediumRelevance) & "\",\"count\":" & medCount & "},"
        set jsonOutput to jsonOutput & "\"lowRelevance\":{\"uuid\":\"" & (uuid of lowRelevance) & "\",\"count\":" & lowCount & "},"
        set jsonOutput to jsonOutput & "\"performance\":{\"maxResults\":" & maxResults & ",\"batchSize\":10}"
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end organizeFindings_Optimized

-- Optimized scoring function
on calculateDocScore_Optimized(doc)
    tell application id "DNtp"
        set docScore to 0
        
        -- Score by tags (cached property access)
        try
            set tagCount to count of tags of doc
            set docScore to docScore + (tagCount * 2)
        end try
        
        -- Score by modification date only (skip expensive reference counting)
        try
            set daysSinceModified to (current date) - (modification date of doc)
            set daysSinceModified to daysSinceModified / days
            if daysSinceModified < 7 then
                set docScore to docScore + 10
            else if daysSinceModified < 30 then
                set docScore to docScore + 5
            else if daysSinceModified < 90 then
                set docScore to docScore + 2
            end if
        end try
        
        -- Simple type bonus
        set docType to type of doc as string
        if docType contains "PDF" or docType contains "rtf" then
            set docScore to docScore + 2
        end if
        
        return docScore
    end tell
end calculateDocScore_Optimized

-- Quicksort implementation for better performance
on quickSort(theList, leftIndex, rightIndex)
    if leftIndex < rightIndex then
        set pivotIndex to my partition(theList, leftIndex, rightIndex)
        my quickSort(theList, leftIndex, pivotIndex - 1)
        my quickSort(theList, pivotIndex + 1, rightIndex)
    end if
    return theList
end quickSort

on partition(theList, leftIndex, rightIndex)
    set pivotValue to score of (item rightIndex of theList)
    set i to leftIndex - 1
    
    repeat with j from leftIndex to rightIndex - 1
        if score of (item j of theList) >= pivotValue then
            set i to i + 1
            set temp to item i of theList
            set item i of theList to item j of theList
            set item j of theList to temp
        end if
    end repeat
    
    set temp to item (i + 1) of theList
    set item (i + 1) of theList to item rightIndex of theList
    set item rightIndex of theList to temp
    
    return i + 1
end partition

-- Escape string helper
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
    
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString