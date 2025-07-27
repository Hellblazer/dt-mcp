-- Synthesize documents using DEVONthink's native AI classification
-- Replaces manual word frequency analysis with AI-powered document understanding

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: synthesis type and document UUIDs\"}"
    end if
    
    set synthesisType to item 1 of argv
    set documentUUIDs to {}
    repeat with i from 2 to count of argv
        set end of documentUUIDs to item i of argv
    end repeat
    
    tell application id "DNtp"
        try
            set documentCount to count of documentUUIDs
            if documentCount < 1 then
                return "{\"error\":\"At least one document UUID required\"}"
            end if
            
            -- Collect document metadata and AI classifications
            set documentData to {}
            set allClassifications to {}
            
            repeat with uuid in documentUUIDs
                try
                    set theRecord to get record with uuid uuid
                    if theRecord is not missing value then
                        set docTitle to name of theRecord
                        set docType to type of theRecord
                        set docWordCount to 0
                        
                        try
                            set docText to plain text of theRecord
                            set docWordCount to count words of docText
                        end try
                        
                        -- Get AI classification for this document
                        set classifications to classify record theRecord
                        
                        -- Extract meaningful themes
                        set docThemes to {}
                        repeat with j from 1 to 5 -- Top 5 themes per document
                            if j > (count of classifications) then exit repeat
                            
                            set suggestion to item j of classifications
                            set groupName to name of suggestion
                            set groupScore to score of suggestion
                            
                            if groupName is not in {"Inbox", "old inbox", "New Group", "Unfiled", "Trash", ""} then
                                set end of docThemes to {groupName, groupScore}
                                
                                -- Add to global classification list
                                set found to false
                                repeat with k from 1 to count of allClassifications
                                    if (item 1 of (item k of allClassifications)) = groupName then
                                        set item 2 of (item k of allClassifications) to (item 2 of (item k of allClassifications)) + groupScore
                                        set found to true
                                        exit repeat
                                    end if
                                end repeat
                                
                                if not found then
                                    set end of allClassifications to {groupName, groupScore}
                                end if
                            end if
                        end repeat
                        
                        set end of documentData to {uuid, docTitle, docType, docThemes, docWordCount}
                    end if
                on error
                    -- Skip documents that can't be processed
                end try
            end repeat
            
            -- Perform AI-powered synthesis based on type
            set synthesis to ""
            if synthesisType is "summary" then
                set synthesis to my createAISummary(documentData, allClassifications)
            else if synthesisType is "consensus" then
                set synthesis to my findAIConsensus(documentData, allClassifications)
            else if synthesisType is "insights" then
                set synthesis to my extractAIInsights(documentData, allClassifications)
            else
                set synthesis to my createAISummary(documentData, allClassifications)
            end if
            
            -- Extract document titles for response
            set documentTitles to {}
            repeat with docInfo in documentData
                set end of documentTitles to (item 2 of docInfo) -- title is the second item
            end repeat
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"synthesis_type\":\"" & synthesisType & "\","
            set jsonOutput to jsonOutput & "\"document_count\":" & documentCount & ","
            set jsonOutput to jsonOutput & "\"document_titles\":" & my listToJSON(documentTitles) & ","
            set jsonOutput to jsonOutput & "\"common_themes\":" & my classificationsToJSON(allClassifications) & ","
            set jsonOutput to jsonOutput & "\"synthesis\":\"" & my escapeString(synthesis) & "\","
            set jsonOutput to jsonOutput & "\"method\":\"devonthink_ai_classification\","
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Create AI-powered summary using classification themes
on createAISummary(documentData, allClassifications)
    set summary to "AI-Powered Document Synthesis\\n\\n"
    
    -- Sort classifications by importance
    set sortedClassifications to my sortClassificationsByScore(allClassifications)
    
    -- Overview
    set docCount to count of documentData
    set summary to summary & "Analysis of " & docCount & " documents reveals the following key themes:\\n\\n"
    
    -- Top themes from AI classification
    repeat with i from 1 to count of sortedClassifications
        if i > 5 then exit repeat -- Top 5 themes
        set classification to item i of sortedClassifications
        set themeName to item 1 of classification
        set themeScore to item 2 of classification
        
        set summary to summary & "• " & themeName & " (AI confidence: " & (round (themeScore * 100)) & "%)\\n"
    end repeat
    
    -- Document breakdown
    set summary to summary & "\\nDocument Overview:\\n"
    repeat with docInfo in documentData
        set docUUID to item 1 of docInfo
        set docTitle to item 2 of docInfo
        set docType to item 3 of docInfo
        set docThemes to item 4 of docInfo
        set docWordCount to item 5 of docInfo
        
        set summary to summary & "\\n- " & docTitle & " (" & docWordCount & " words)\\n"
        if (count of docThemes) > 0 then
            set topTheme to item 1 of (item 1 of docThemes)
            set summary to summary & "  Primary theme: " & topTheme & "\\n"
        end if
    end repeat
    
    return summary
end createAISummary

-- Find consensus using AI classification overlap
on findAIConsensus(documentData, allClassifications)
    set consensus to "AI-Powered Consensus Analysis\\n\\n"
    
    -- Find themes present in multiple documents
    set sharedThemes to {}
    repeat with classification in allClassifications
        set themeName to item 1 of classification
        set docCount to 0
        
        repeat with docInfo in documentData
            set docThemes to item 4 of docInfo -- themes are item 4
            repeat with docTheme in docThemes
                if (item 1 of docTheme) = themeName then
                    set docCount to docCount + 1
                    exit repeat
                end if
            end repeat
        end repeat
        
        if docCount >= ((count of documentData) / 2) then -- Present in majority of documents
            set end of sharedThemes to {themeName, docCount}
        end if
    end repeat
    
    set consensus to consensus & "Themes appearing in multiple documents:\\n"
    repeat with sharedTheme in sharedThemes
        set themeName to item 1 of sharedTheme
        set docCount to item 2 of sharedTheme
        set consensus to consensus & "• " & themeName & " (found in " & docCount & " of " & (count of documentData) & " documents)\\n"
    end repeat
    
    return consensus
end findAIConsensus

-- Extract insights using AI classification patterns
on extractAIInsights(documentData, allClassifications)
    set insights to "AI-Powered Insights\\n\\n"
    
    -- Analyze classification patterns
    set sortedClassifications to my sortClassificationsByScore(allClassifications)
    
    set insights to insights & "Key insights from AI analysis:\\n\\n"
    set insights to insights & "1. Document Collection Focus:\\n"
    
    if (count of sortedClassifications) > 0 then
        set topTheme to item 1 of (item 1 of sortedClassifications)
        set insights to insights & "   Primary focus: " & topTheme & "\\n"
    end if
    
    set insights to insights & "\\n2. Thematic Diversity:\\n"
    set insights to insights & "   " & (count of allClassifications) & " distinct themes identified\\n"
    set insights to insights & "   Suggests " & my assessDiversity(count of allClassifications, count of documentData) & " thematic diversity\\n"
    
    set insights to insights & "\\n3. Document Relationships:\\n"
    set insights to insights & "   AI classification reveals natural groupings for organization\\n"
    
    return insights
end extractAIInsights

-- Assess thematic diversity
on assessDiversity(themeCount, docCount)
    if docCount = 0 then return "undefined"
    
    set ratio to themeCount / docCount
    if ratio > 1.5 then
        return "high"
    else if ratio > 0.8 then
        return "moderate"
    else
        return "focused"
    end if
end assessDiversity

-- Sort classifications by score (descending)
on sortClassificationsByScore(classifications)
    set sorted to classifications
    
    repeat with i from 1 to (count of sorted) - 1
        repeat with j from i + 1 to count of sorted
            if (item 2 of (item i of sorted)) < (item 2 of (item j of sorted)) then
                set temp to item i of sorted
                set item i of sorted to item j of sorted
                set item j of sorted to temp
            end if
        end repeat
    end repeat
    
    return sorted
end sortClassificationsByScore

-- Convert classifications to JSON
on classificationsToJSON(classifications)
    set jsonArray to "["
    repeat with i from 1 to count of classifications
        if i > 1 then set jsonArray to jsonArray & ","
        set classification to item i of classifications
        set themeName to item 1 of classification
        set themeScore to item 2 of classification
        
        set jsonArray to jsonArray & "{"
        set jsonArray to jsonArray & "\"theme\":\"" & my escapeString(themeName) & "\","
        set jsonArray to jsonArray & "\"total_score\":" & themeScore
        set jsonArray to jsonArray & "}"
    end repeat
    set jsonArray to jsonArray & "]"
    return jsonArray
end classificationsToJSON

-- Convert list to JSON array
on listToJSON(theList)
    set jsonArray to "["
    repeat with i from 1 to count of theList
        if i > 1 then set jsonArray to jsonArray & ","
        set jsonArray to jsonArray & "\"" & my escapeString(item i of theList as string) & "\""
    end repeat
    set jsonArray to jsonArray & "]"
    return jsonArray
end listToJSON

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