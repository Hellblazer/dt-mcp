-- Optimized document synthesis using limited content analysis
-- Performance-optimized version that samples document content

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
            
            -- Collect document data with sampling
            set documentData to {}
            set allTags to {}
            set commonWords to {}
            set wordCounts to {}
            
            -- Limit words processed per document
            set maxWordsPerDoc to 200
            set stopWords to {"the", "and", "for", "are", "but", "not", "you", "all", "would", "her", "she", "there", "their", "what", "out", "about", "who", "get", "which", "when", "make", "can", "like", "time", "just", "him", "know", "take", "into", "year", "your", "some", "could", "them", "other", "than", "then", "now", "only", "over", "also", "after", "use", "two", "how", "our", "work", "well", "way", "even", "new", "want", "any", "these", "give", "most", "was", "have", "this", "with", "that", "from", "they", "will", "been", "has", "had", "were", "said", "did", "each", "such", "same", "where", "being"}
            
            repeat with uuid in documentUUIDs
                try
                    set theRecord to get record with uuid uuid
                    if theRecord is not missing value then
                        set docTitle to name of theRecord
                        set docType to type of theRecord
                        set docTags to tags of theRecord
                        set docText to ""
                        set docWordCount to 0
                        
                        -- Get text content
                        try
                            set docText to plain text of theRecord
                        on error
                            try
                                set docText to comment of theRecord
                            end try
                        end try
                        
                        -- Collect tags efficiently
                        repeat with tag in docTags
                            if tag is not in allTags then
                                set end of allTags to tag
                            end if
                        end repeat
                        
                        -- Process limited words for performance
                        set docSummary to ""
                        if docText is not "" then
                            set docWords to words of docText
                            set totalWords to count of docWords
                            set docWordCount to totalWords
                            
                            -- Create summary from first 100 words
                            set summaryWords to {}
                            set summaryLimit to 100
                            if totalWords < summaryLimit then set summaryLimit to totalWords
                            
                            repeat with i from 1 to summaryLimit
                                set end of summaryWords to item i of docWords
                            end repeat
                            
                            set AppleScript's text item delimiters to " "
                            set docSummary to summaryWords as string
                            set AppleScript's text item delimiters to ""
                            
                            -- Process only limited words for common themes
                            set wordsToProcess to maxWordsPerDoc
                            if totalWords < wordsToProcess then set wordsToProcess to totalWords
                            
                            -- Use a dictionary-like approach for word counting
                            repeat with i from 1 to wordsToProcess
                                set theWord to item i of docWords as string
                                if (length of theWord) > 4 and theWord is not in stopWords then
                                    -- Limit common words list size for performance
                                    if (count of commonWords) < 50 then
                                        set found to false
                                        repeat with j from 1 to count of commonWords
                                            if item j of commonWords = theWord then
                                                set item j of wordCounts to (item j of wordCounts) + 1
                                                set found to true
                                                exit repeat
                                            end if
                                        end repeat
                                        
                                        if not found then
                                            set end of commonWords to theWord
                                            set end of wordCounts to 1
                                        end if
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
            
            -- Find top common words (limit to top 10)
            set topWords to {}
            set sortedWords to {}
            set sortedCounts to {}
            
            -- Simple selection sort for top words
            repeat with i from 1 to count of commonWords
                if item i of wordCounts > 1 then
                    set inserted to false
                    repeat with j from 1 to count of sortedWords
                        if item i of wordCounts > item j of sortedCounts then
                            set sortedWords to (items 1 thru (j - 1) of sortedWords) & {item i of commonWords} & (items j thru -1 of sortedWords)
                            set sortedCounts to (items 1 thru (j - 1) of sortedCounts) & {item i of wordCounts} & (items j thru -1 of sortedCounts)
                            set inserted to true
                            exit repeat
                        end if
                    end repeat
                    if not inserted then
                        set end of sortedWords to item i of commonWords
                        set end of sortedCounts to item i of wordCounts
                    end if
                end if
            end repeat
            
            -- Take only top 10 words
            repeat with i from 1 to count of sortedWords
                if i ≤ 10 then
                    set end of topWords to item i of sortedWords
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
            set jsonOutput to jsonOutput & "\"method\":\"optimized_sampling\","
            set jsonOutput to jsonOutput & "\"performance_note\":\"Optimized version - samples first 200 words per document\","
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
        repeat with i from 1 to count of topWords
            if i > 1 then set synthesis to synthesis & ", "
            set synthesis to synthesis & item i of topWords
        end repeat
        set synthesis to synthesis & "\\n\\n"
    end if
    
    -- Document summaries (brief)
    set synthesis to synthesis & "Document summaries:\\n"
    repeat with i from 1 to count of documentData
        set docInfo to item i of documentData
        set synthesis to synthesis & "- " & (docTitle of docInfo) & ": "
        set docSummary to summary of docInfo
        if docSummary is not "" then
            -- Get first 80 characters of summary
            if (length of docSummary) > 80 then
                set synthesis to synthesis & (text 1 thru 80 of docSummary) & "..."
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
        repeat with theWord in topWords
            set synthesis to synthesis & "- " & theWord & "\\n"
        end repeat
    else
        set synthesis to synthesis & "No clear consensus themes found across documents.\\n"
    end if
    
    -- Common tags
    if (count of allTags) > 0 then
        set synthesis to synthesis & "\\nShared categories/tags: "
        repeat with i from 1 to count of allTags
            if i > 1 then set synthesis to synthesis & ", "
            set synthesis to synthesis & item i of allTags
            if i ≥ 5 then
                set synthesis to synthesis & " (+" & ((count of allTags) - 5) & " more)"
                exit repeat
            end if
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
        repeat with i from 1 to count of topWords
            set synthesis to synthesis & i & ". Focus on '" & item i of topWords & "' appears across multiple documents\\n"
        end repeat
        set synthesis to synthesis & "\\n"
    end if
    
    -- Document diversity
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
    
    -- Escape backslashes first
    set AppleScript's text item delimiters to "\\"
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\\"
    set inputString to textItems as string
    
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
    
    -- Escape line feeds
    set AppleScript's text item delimiters to linefeed
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as string
    
    -- Escape tabs
    set AppleScript's text item delimiters to tab
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\t"
    set inputString to textItems as string
    
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString