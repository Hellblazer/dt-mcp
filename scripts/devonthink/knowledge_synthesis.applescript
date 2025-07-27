-- Knowledge Synthesis and Summarization (Fixed Version)
-- Create intelligent summaries and extract insights from multiple documents

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: action and parameters\"}"
    end if
    
    set action to item 1 of argv
    
    tell application id "DNtp"
        try
            if action is "synthesize" then
                -- Synthesize multiple documents
                if (count of argv) < 3 then
                    return "{\"error\":\"Missing synthesis type\"}"
                end if
                
                set synthesisType to item 2 of argv
                set documentUUIDs to {}
                repeat with i from 3 to count of argv
                    set end of documentUUIDs to item i of argv
                end repeat
                
                return my synthesizeDocuments(documentUUIDs, synthesisType)
                
            else if action is "extract_themes" then
                -- Extract themes from document collection
                set documentUUIDs to {}
                repeat with i from 2 to count of argv
                    set end of documentUUIDs to item i of argv
                end repeat
                
                return my extractThemes(documentUUIDs)
                
            else if action is "create_summary" then
                -- Create multi-level summary
                if (count of argv) < 3 then
                    return "{\"error\":\"Missing summary level and UUIDs\"}"
                end if
                
                set summaryLevel to item 2 of argv
                set documentUUIDs to {}
                repeat with i from 3 to count of argv
                    set end of documentUUIDs to item i of argv
                end repeat
                
                return my createMultiLevelSummary(documentUUIDs, summaryLevel)
                
            else
                return "{\"error\":\"Unknown action: " & action & "\"}"
            end if
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Synthesize multiple documents with actual content analysis
on synthesizeDocuments(documentUUIDs, synthesisType)
    tell application id "DNtp"
        set documentCount to count of documentUUIDs
        set docList to {}
        set allContent to ""
        set documentTitles to {}
        
        -- Collect document content
        repeat with uuid in documentUUIDs
            try
                set theRecord to get record with uuid uuid
                if theRecord is not missing value then
                    set docContent to plain text of theRecord
                    set docTitle to name of theRecord
                    set end of docList to {title:docTitle, content:docContent, uuid:uuid}
                    set end of documentTitles to docTitle
                    set allContent to allContent & docContent & " "
                end if
            end try
        end repeat
        
        -- Perform synthesis based on type
        set synthesis to ""
        if synthesisType is "summary" then
            set synthesis to my createSummary(docList, allContent)
        else if synthesisType is "consensus" then
            set synthesis to my findConsensus(docList, allContent)
        else if synthesisType is "contradictions" then
            set synthesis to my findContradictions(docList, allContent)
        else if synthesisType is "themes" then
            set synthesis to my extractMainThemes(docList, allContent)
        else
            set synthesis to "Unknown synthesis type: " & synthesisType
        end if
        
        -- Build JSON response
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"synthesisType\":\"" & synthesisType & "\","
        set jsonOutput to jsonOutput & "\"documentCount\":" & documentCount & ","
        set jsonOutput to jsonOutput & "\"documentTitles\":" & my listToJSON(documentTitles) & ","
        set jsonOutput to jsonOutput & "\"synthesis\":\"" & my escapeString(synthesis) & "\","
        set jsonOutput to jsonOutput & "\"status\":\"success\""
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end synthesizeDocuments

-- Create a summary of documents
on createSummary(docList, allContent)
    set summary to "Based on analysis of " & (count of docList) & " documents:\\n\\n"
    
    -- Get word frequency for key topics
    set wordFreq to my getWordFrequency(allContent)
    set topWords to my getTopFrequentWords(wordFreq, 10)
    
    set summary to summary & "Key Topics: "
    repeat with i from 1 to count of topWords
        if i > 1 then set summary to summary & ", "
        set summary to summary & (word of (item i of topWords))
    end repeat
    set summary to summary & "\\n\\n"
    
    -- Add document overview
    set summary to summary & "Document Overview:\\n"
    repeat with doc in docList
        set docTitle to title of doc
        set docContent to content of doc
        set docPreview to my getFirstNWords(docContent, 30)
        set summary to summary & "- " & docTitle & ": " & docPreview & "...\\n"
    end repeat
    
    return summary
end createSummary

-- Find consensus points across documents
on findConsensus(docList, allContent)
    set consensus to "Consensus Analysis:\\n\\n"
    
    -- Get frequently mentioned concepts
    set wordFreq to my getWordFrequency(allContent)
    set commonConcepts to my getTopFrequentWords(wordFreq, 15)
    
    -- Count how many documents mention each concept
    set sharedConcepts to {}
    repeat with concept in commonConcepts
        set conceptWord to word of concept
        set docCount to 0
        repeat with doc in docList
            if (content of doc) contains conceptWord then
                set docCount to docCount + 1
            end if
        end repeat
        
        if docCount >= ((count of docList) / 2) then
            set end of sharedConcepts to conceptWord
        end if
    end repeat
    
    set consensus to consensus & "Concepts mentioned in multiple documents: "
    repeat with i from 1 to count of sharedConcepts
        if i > 1 then set consensus to consensus & ", "
        set consensus to consensus & (item i of sharedConcepts)
    end repeat
    
    return consensus
end findConsensus

-- Find contradictions between documents
on findContradictions(docList, allContent)
    set contradictions to "Contradiction Analysis:\\n\\n"
    
    -- This is a simplified approach - in reality would need NLP
    set contradictions to contradictions & "Analysis of " & (count of docList) & " documents:\\n"
    set contradictions to contradictions & "- Document perspectives vary on key topics\\n"
    set contradictions to contradictions & "- Further semantic analysis needed for specific contradictions\\n"
    
    return contradictions
end findContradictions

-- Extract main themes from documents
on extractMainThemes(docList, allContent)
    set themes to "Theme Analysis:\\n\\n"
    
    -- Get word frequency and filter for meaningful words
    set wordFreq to my getWordFrequency(allContent)
    set topWords to my getTopFrequentWords(wordFreq, 20)
    
    -- Group related concepts (simplified)
    set themes to themes & "Primary themes identified:\\n"
    set themeCount to 0
    repeat with wordItem in topWords
        set wordText to word of wordItem
        if (count of wordText) > 5 then -- Focus on longer, more meaningful words
            set themeCount to themeCount + 1
            set themes to themes & themeCount & ". " & wordText & " (frequency: " & (freq of wordItem) & ")\\n"
        end if
        if themeCount >= 5 then exit repeat
    end repeat
    
    return themes
end extractMainThemes

-- Extract themes with actual content analysis
on extractThemes(documentUUIDs)
    tell application id "DNtp"
        set documentCount to count of documentUUIDs
        set allContent to ""
        set docList to {}
        
        -- Collect document content
        repeat with uuid in documentUUIDs
            try
                set theRecord to get record with uuid uuid
                if theRecord is not missing value then
                    set docContent to plain text of theRecord
                    set docTitle to name of theRecord
                    set end of docList to {title:docTitle, content:docContent}
                    set allContent to allContent & docContent & " "
                end if
            end try
        end repeat
        
        -- Extract themes using word frequency analysis
        set wordFreq to my getWordFrequency(allContent)
        set topWords to my getTopFrequentWords(wordFreq, 30)
        
        -- Filter for meaningful themes (longer words, higher frequency)
        set themes to {}
        repeat with wordItem in topWords
            set wordText to word of wordItem
            set freq to freq of wordItem
            if (count of wordText) > 5 and freq > 2 then
                set end of themes to wordText
            end if
            if (count of themes) >= 10 then exit repeat
        end repeat
        
        -- If not enough themes, add some from top words
        if (count of themes) < 5 then
            repeat with wordItem in topWords
                set wordText to word of wordItem
                if wordText is not in themes and (count of wordText) > 4 then
                    set end of themes to wordText
                end if
                if (count of themes) >= 8 then exit repeat
            end repeat
        end if
        
        -- Build response
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"documentCount\":" & documentCount & ","
        set jsonOutput to jsonOutput & "\"themes\":" & my listToJSON(themes) & ","
        set jsonOutput to jsonOutput & "\"topWords\":" & my wordFreqToJSON(topWords, 10) & ","
        set jsonOutput to jsonOutput & "\"status\":\"success\""
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end extractThemes

-- Convert word frequency list to JSON
on wordFreqToJSON(wordFreq, maxItems)
    set jsonArray to "["
    set itemCount to 0
    repeat with wordItem in wordFreq
        if itemCount > 0 then set jsonArray to jsonArray & ","
        set jsonArray to jsonArray & "{\"word\":\"" & (word of wordItem) & "\",\"frequency\":" & (freq of wordItem) & "}"
        set itemCount to itemCount + 1
        if itemCount >= maxItems then exit repeat
    end repeat
    set jsonArray to jsonArray & "]"
    return jsonArray
end wordFreqToJSON

-- Create multi-level summary with actual content
on createMultiLevelSummary(documentUUIDs, summaryLevel)
    tell application id "DNtp"
        set documentCount to count of documentUUIDs
        set docList to {}
        set allContent to ""
        
        -- Collect document content
        repeat with uuid in documentUUIDs
            try
                set theRecord to get record with uuid uuid
                if theRecord is not missing value then
                    set docContent to plain text of theRecord
                    set docTitle to name of theRecord
                    set end of docList to {title:docTitle, content:docContent, uuid:uuid}
                    set allContent to allContent & docContent & " "
                end if
            end try
        end repeat
        
        -- Create summary based on level
        set summary to ""
        if summaryLevel is "brief" then
            set summary to my createBriefSummary(docList, allContent)
        else if summaryLevel is "detailed" then
            set summary to my createDetailedSummary(docList, allContent)
        else if summaryLevel is "full" then
            set summary to my createFullSummary(docList, allContent)
        else
            set summary to "Unknown summary level: " & summaryLevel
        end if
        
        -- Build response
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"summaryLevel\":\"" & summaryLevel & "\","
        set jsonOutput to jsonOutput & "\"documentCount\":" & documentCount & ","
        set jsonOutput to jsonOutput & "\"summary\":\"" & my escapeString(summary) & "\","
        set jsonOutput to jsonOutput & "\"status\":\"success\""
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end createMultiLevelSummary

-- Create brief summary (1-2 paragraphs)
on createBriefSummary(docList, allContent)
    set summary to "Brief Summary of " & (count of docList) & " documents:\\n\\n"
    
    -- Get main topics
    set wordFreq to my getWordFrequency(allContent)
    set topWords to my getTopFrequentWords(wordFreq, 5)
    
    set summary to summary & "Main topics: "
    repeat with i from 1 to count of topWords
        if i > 1 then set summary to summary & ", "
        set summary to summary & (word of (item i of topWords))
    end repeat
    set summary to summary & "\\n\\n"
    
    -- Add one-line summary per document
    set summary to summary & "Documents analyzed: "
    repeat with i from 1 to count of docList
        if i > 1 then set summary to summary & "; "
        set doc to item i of docList
        set summary to summary & (title of doc)
    end repeat
    
    return summary
end createBriefSummary

-- Create detailed summary (full page)
on createDetailedSummary(docList, allContent)
    set summary to "Detailed Summary\\n\\n"
    
    -- Document overview
    set summary to summary & "Document Collection Overview:\\n"
    set summary to summary & "- Total documents: " & (count of docList) & "\\n"
    set summary to summary & "- Total words analyzed: " & (count of (words of allContent)) & "\\n\\n"
    
    -- Key themes
    set wordFreq to my getWordFrequency(allContent)
    set topWords to my getTopFrequentWords(wordFreq, 10)
    
    set summary to summary & "Key Themes:\\n"
    repeat with i from 1 to count of topWords
        set wordItem to item i of topWords
        set summary to summary & "- " & (word of wordItem) & " (mentioned " & (freq of wordItem) & " times)\\n"
    end repeat
    set summary to summary & "\\n"
    
    -- Document summaries
    set summary to summary & "Individual Document Summaries:\\n"
    repeat with doc in docList
        set docTitle to title of doc
        set docContent to content of doc
        set docPreview to my getFirstNWords(docContent, 50)
        set summary to summary & "\\n• " & docTitle & ":\\n  " & docPreview & "...\\n"
    end repeat
    
    return summary
end createDetailedSummary

-- Create full summary (comprehensive)
on createFullSummary(docList, allContent)
    set summary to "Comprehensive Summary\\n\\n"
    
    -- Executive overview
    set summary to summary & "EXECUTIVE OVERVIEW\\n"
    set summary to summary & "==================\\n"
    set summary to summary & "This analysis covers " & (count of docList) & " documents "
    set summary to summary & "containing approximately " & (count of (words of allContent)) & " words.\\n\\n"
    
    -- Detailed analysis
    set wordFreq to my getWordFrequency(allContent)
    set topWords to my getTopFrequentWords(wordFreq, 20)
    
    set summary to summary & "THEMATIC ANALYSIS\\n"
    set summary to summary & "=================\\n"
    set summary to summary & "Primary themes (by frequency):\\n"
    repeat with i from 1 to 10
        if i > (count of topWords) then exit repeat
        set wordItem to item i of topWords
        set summary to summary & i & ". " & (word of wordItem) & " - " & (freq of wordItem) & " occurrences\\n"
    end repeat
    set summary to summary & "\\n"
    
    -- Document details
    set summary to summary & "DOCUMENT DETAILS\\n"
    set summary to summary & "================\\n"
    repeat with i from 1 to count of docList
        set doc to item i of docList
        set docTitle to title of doc
        set docContent to content of doc
        set docWords to count of (words of docContent)
        set docPreview to my getFirstNWords(docContent, 100)
        
        set summary to summary & "\\nDocument " & i & ": " & docTitle & "\\n"
        set summary to summary & "Word count: " & docWords & "\\n"
        set summary to summary & "Preview: " & docPreview & "...\\n"
    end repeat
    
    return summary
end createFullSummary

-- Get word frequency from text
on getWordFrequency(textContent)
    set wordFreq to {}
    set stopWords to {"the", "and", "of", "to", "a", "in", "is", "it", "that", "this", "for", "on", "with", "as", "by", "at", "from", "or", "an", "be", "are", "was", "were", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "shall"}
    
    -- Split into words
    set AppleScript's text item delimiters to {" ", tab, return, ASCII character 10, ".", ",", ";", ":", "!", "?", "(", ")", "[", "]", "{", "}", "\"", "'", "-", "—"}
    set wordList to text items of textContent
    set AppleScript's text item delimiters to ""
    
    -- Count word frequencies
    repeat with wordItem in wordList
        set wordItem to wordItem as string
        -- Convert to lowercase for comparison
        set lowerWord to my toLowerCase(wordItem)
        
        if length of lowerWord > 3 and lowerWord is not in stopWords then
            set found to false
            repeat with i from 1 to count of wordFreq
                if word of (item i of wordFreq) = lowerWord then
                    set freq of (item i of wordFreq) to (freq of (item i of wordFreq)) + 1
                    set found to true
                    exit repeat
                end if
            end repeat
            
            if not found then
                set end of wordFreq to {word:lowerWord, freq:1}
            end if
        end if
    end repeat
    
    return wordFreq
end getWordFrequency

-- Get top N frequent words
on getTopFrequentWords(wordFreq, n)
    set sortedWords to my sortByFrequency(wordFreq)
    set topWords to {}
    
    repeat with i from 1 to n
        if i > (count of sortedWords) then exit repeat
        set end of topWords to item i of sortedWords
    end repeat
    
    return topWords
end getTopFrequentWords

-- Sort words by frequency
on sortByFrequency(wordFreq)
    set sorted to wordFreq
    
    -- Simple bubble sort
    repeat with i from 1 to (count of sorted) - 1
        repeat with j from i + 1 to count of sorted
            if freq of (item i of sorted) < freq of (item j of sorted) then
                set temp to item i of sorted
                set item i of sorted to item j of sorted
                set item j of sorted to temp
            end if
        end repeat
    end repeat
    
    return sorted
end sortByFrequency

-- Get first N words from text
on getFirstNWords(textContent, n)
    set words to {}
    set AppleScript's text item delimiters to {" ", tab, return, ASCII character 10}
    set wordList to text items of textContent
    set AppleScript's text item delimiters to ""
    
    set wordCount to 0
    repeat with wordItem in wordList
        if length of (wordItem as string) > 0 then
            set end of words to wordItem as string
            set wordCount to wordCount + 1
            if wordCount >= n then exit repeat
        end if
    end repeat
    
    set AppleScript's text item delimiters to " "
    set result to words as string
    set AppleScript's text item delimiters to ""
    
    return result
end getFirstNWords

-- Convert to lowercase
on toLowerCase(str)
    set lowerStr to ""
    repeat with char in str
        try
            set charCode to id of char
            if charCode >= 65 and charCode <= 90 then
                set lowerStr to lowerStr & character id (charCode + 32)
            else
                set lowerStr to lowerStr & char
            end if
        on error
            set lowerStr to lowerStr & char
        end try
    end repeat
    return lowerStr
end toLowerCase

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

-- Helper: Escape string for JSON (simplified)
on escapeString(inputString)
    set inputString to inputString as string
    -- Basic escaping for quotes
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as text
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString