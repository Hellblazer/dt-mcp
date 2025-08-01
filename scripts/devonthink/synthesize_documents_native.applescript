-- Synthesize documents using content analysis
-- Analyzes actual document content to create summaries, find consensus, or extract insights

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
            
            -- Collect document data
            set documentData to {}
            set allTags to {}
            set commonWords to {}
            set wordCounts to {}
            
            repeat with uuid in documentUUIDs
                try
                    set theRecord to get record with uuid uuid
                    if theRecord is not missing value then
                        set docTitle to name of theRecord
                        set docType to type of theRecord
                        set docTags to tags of theRecord
                        set docText to ""
                        set docWordCount to 0
                        
                        try
                            set docText to plain text of theRecord
                            set docWordCount to count words of docText
                        on error
                            try
                                set docText to comment of theRecord
                                set docWordCount to count words of docText
                            end try
                        end try
                        
                        -- Collect tags
                        repeat with tag in docTags
                            if tag is not in allTags then
                                set end of allTags to tag
                            end if
                        end repeat
                        
                        -- Extract key content (first 500 words for synthesis)
                        set docSummary to ""
                        if docText is not "" then
                            set docWords to words of docText
                            set summaryWords to {}
                            set wordLimit to 500
                            if (count of docWords) < wordLimit then set wordLimit to count of docWords
                            
                            repeat with i from 1 to wordLimit
                                set end of summaryWords to item i of docWords
                            end repeat
                            
                            -- Join words back into summary
                            set AppleScript's text item delimiters to " "
                            set docSummary to summaryWords as string
                            set AppleScript's text item delimiters to ""
                            
                            -- Count significant words
                            set stopWords to {"the", "and", "for", "are", "but", "not", "you", "all", "would", "her", "she", "there", "their", "what", "out", "about", "who", "get", "which", "when", "make", "can", "like", "time", "just", "him", "know", "take", "into", "year", "your", "some", "could", "them", "other", "than", "then", "now", "only", "over", "also", "after", "use", "two", "how", "our", "work", "well", "way", "even", "new", "want", "any", "these", "give", "most", "was", "have", "this", "with", "that", "from", "they", "will", "been", "has", "had", "were", "said", "did", "each", "such", "same", "where", "being"}
                            
                            repeat with theWord in docWords
                                set theWord to theWord as string
                                if (length of theWord) > 4 and theWord is not in stopWords then
                                    set found to false
                                    repeat with i from 1 to count of commonWords
                                        if item i of commonWords = theWord then
                                            set item i of wordCounts to (item i of wordCounts) + 1
                                            set found to true
                                            exit repeat
                                        end if
                                    end repeat
                                    
                                    if not found then
                                        set end of commonWords to theWord
                                        set end of wordCounts to 1
                                    end if
                                end if
                            end repeat
                        end if
                        
                        set end of documentData to {uuid:uuid, docTitle:docTitle, docType:docType, tags:docTags, summary:docSummary, wordCount:docWordCount}
                    end if
                on error
                    -- Skip documents that can't be processed
                end try
            end repeat
            
            -- Find most common words across documents
            set topWords to {}
            repeat with i from 1 to count of commonWords
                if item i of wordCounts > 1 then -- Appears in multiple documents
                    set end of topWords to item i of commonWords
                end if
            end repeat
            
            -- Perform synthesis based on type
            set synthesis to ""
            if synthesisType is "summary" then
                set synthesis to my createSummary(documentData, topWords, allTags)
            else if synthesisType is "consensus" then
                set synthesis to my findConsensus(documentData, topWords, allTags)
            else if synthesisType is "insights" then
                set synthesis to my extractInsights(documentData, topWords, allTags)
            else
                set synthesis to my createSummary(documentData, topWords, allTags)
            end if
            
            -- Extract document titles for response
            set documentTitles to {}
            repeat with i from 1 to count of documentData
                set docInfo to item i of documentData
                set end of documentTitles to (docTitle of docInfo)
            end repeat
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"synthesis_type\":\"" & synthesisType & "\","
            set jsonOutput to jsonOutput & "\"document_count\":" & documentCount & ","
            set jsonOutput to jsonOutput & "\"document_titles\":" & my listToJSON(documentTitles) & ","
            set jsonOutput to jsonOutput & "\"common_themes\":" & my listToJSON(topWords) & ","
            set jsonOutput to jsonOutput & "\"synthesis\":\"" & my escapeString(synthesis) & "\","
            set jsonOutput to jsonOutput & "\"method\":\"content_analysis\","
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Create a summary synthesis
on createSummary(documentData, topWords, allTags)
    set synthesis to "Summary of " & (count of documentData) & " documents:\\n\\n"
    
    -- Common themes
    if (count of topWords) > 0 then
        set synthesis to synthesis & "Key themes: "
        set themeCount to 0
        repeat with theWord in topWords
            if themeCount < 10 then
                if themeCount > 0 then set synthesis to synthesis & ", "
                set synthesis to synthesis & theWord
                set themeCount to themeCount + 1
            end if
        end repeat
        set synthesis to synthesis & "\\n\\n"
    end if
    
    -- Document summaries
    set synthesis to synthesis & "Document summaries:\\n"
    repeat with i from 1 to count of documentData
        set docInfo to item i of documentData
        set synthesis to synthesis & "- " & (docTitle of docInfo) & ": "
        set docSummary to summary of docInfo
        if docSummary is not "" then
            -- Get first 100 characters of summary
            if (length of docSummary) > 100 then
                set synthesis to synthesis & (text 1 thru 100 of docSummary) & "..."
            else
                set synthesis to synthesis & docSummary
            end if
        else
            set synthesis to synthesis & "No content available"
        end if
        set synthesis to synthesis & "\\n"
    end repeat
    
    return synthesis
end createSummary

-- Find consensus among documents
on findConsensus(documentData, topWords, allTags)
    set synthesis to "Consensus analysis of " & (count of documentData) & " documents:\\n\\n"
    
    -- Common themes indicate consensus
    if (count of topWords) > 0 then
        set synthesis to synthesis & "Areas of agreement (common themes):\\n"
        set themeCount to 0
        repeat with theWord in topWords
            if themeCount < 15 then
                set synthesis to synthesis & "- " & theWord & "\\n"
                set themeCount to themeCount + 1
            end if
        end repeat
    else
        set synthesis to synthesis & "No clear consensus themes found across documents.\\n"
    end if
    
    -- Common tags
    if (count of allTags) > 0 then
        set synthesis to synthesis & "\\nShared categories/tags: "
        set tagCount to 0
        repeat with tag in allTags
            if tagCount > 0 then set synthesis to synthesis & ", "
            set synthesis to synthesis & tag
            set tagCount to tagCount + 1
        end repeat
        set synthesis to synthesis & "\\n"
    end if
    
    return synthesis
end findConsensus

-- Extract insights from documents
on extractInsights(documentData, topWords, allTags)
    set synthesis to "Key insights from " & (count of documentData) & " documents:\\n\\n"
    
    -- Primary insights from common themes
    if (count of topWords) > 0 then
        set synthesis to synthesis & "Main insights based on recurring themes:\\n"
        set insightCount to 0
        repeat with theWord in topWords
            if insightCount < 10 then
                set synthesis to synthesis & (insightCount + 1) & ". Focus on '" & theWord & "' appears across multiple documents\\n"
                set insightCount to insightCount + 1
            end if
        end repeat
        set synthesis to synthesis & "\\n"
    end if
    
    -- Document diversity
    set uniqueTitles to {}
    repeat with i from 1 to count of documentData
        set docInfo to item i of documentData
        set docTitle to docTitle of docInfo
        if docTitle is not in uniqueTitles then
            set end of uniqueTitles to docTitle
        end if
    end repeat
    
    set synthesis to synthesis & "Document collection insights:\\n"
    set synthesis to synthesis & "- Total documents analyzed: " & (count of documentData) & "\\n"
    set synthesis to synthesis & "- Common themes identified: " & (count of topWords) & "\\n"
    set synthesis to synthesis & "- Shared tags/categories: " & (count of allTags) & "\\n"
    
    return synthesis
end extractInsights

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
    -- Escape quotes
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as string
    -- Escape newlines
    set AppleScript's text item delimiters to return
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as string
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString