-- Optimized document similarity analysis
-- Uses sampling and limits to prevent timeouts

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"At least 2 document UUIDs required\"}"
    end if
    
    tell application id "DNtp"
        try
            -- Limit to prevent timeouts
            set maxDocuments to 10
            set docCount to count of argv
            if docCount > maxDocuments then
                set docCount to maxDocuments
            end if
            
            -- Collect documents
            set documentsList to {}
            repeat with i from 1 to docCount
                set docUUID to item i of argv
                try
                    set theRecord to get record with uuid docUUID
                    if theRecord is not missing value then
                        set end of documentsList to theRecord
                    end if
                on error
                    -- Skip documents that can't be found
                end try
            end repeat
            
            if (count of documentsList) < 2 then
                return "{\"error\":\"Need at least 2 valid documents for comparison\"}"
            end if
            
            -- Quick analysis of each document
            set docAnalyses to {}
            repeat with doc in documentsList
                set docAnalysis to my quickAnalyzeDocument(doc)
                set end of docAnalyses to docAnalysis
            end repeat
            
            -- Compare all pairs efficiently
            set comparisons to {}
            repeat with i from 1 to (count of documentsList) - 1
                repeat with j from (i + 1) to count of documentsList
                    set comparison to my quickCompareDocuments(item i of docAnalyses, item j of docAnalyses)
                    set end of comparisons to comparison
                end repeat
            end repeat
            
            -- Build response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"documentCount\":" & (count of documentsList) & ","
            set jsonOutput to jsonOutput & "\"documents\":["
            
            repeat with i from 1 to count of docAnalyses
                if i > 1 then set jsonOutput to jsonOutput & ","
                set analysis to item i of docAnalyses
                set jsonOutput to jsonOutput & "{"
                set jsonOutput to jsonOutput & "\"uuid\":\"" & (docUUID of analysis) & "\","
                set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(docName of analysis) & "\","
                set jsonOutput to jsonOutput & "\"wordCount\":" & (wordCount of analysis) & ","
                set jsonOutput to jsonOutput & "\"tagCount\":" & (tagCount of analysis)
                set jsonOutput to jsonOutput & "}"
            end repeat
            
            set jsonOutput to jsonOutput & "],"
            set jsonOutput to jsonOutput & "\"comparisons\":["
            
            repeat with i from 1 to count of comparisons
                if i > 1 then set jsonOutput to jsonOutput & ","
                set comp to item i of comparisons
                set jsonOutput to jsonOutput & "{"
                set jsonOutput to jsonOutput & "\"document1\":\"" & (uuid1 of comp) & "\","
                set jsonOutput to jsonOutput & "\"document2\":\"" & (uuid2 of comp) & "\","
                set jsonOutput to jsonOutput & "\"similarity\":" & (similarity of comp) & ","
                set jsonOutput to jsonOutput & "\"tagSimilarity\":" & (tagSimilarity of comp)
                set jsonOutput to jsonOutput & "}"
            end repeat
            
            set jsonOutput to jsonOutput & "],"
            
            -- Find most similar pair
            set maxSimilarity to 0
            set mostSimilarPair to missing value
            repeat with comp in comparisons
                if (similarity of comp) > maxSimilarity then
                    set maxSimilarity to (similarity of comp)
                    set mostSimilarPair to comp
                end if
            end repeat
            
            if mostSimilarPair is not missing value then
                set jsonOutput to jsonOutput & "\"mostSimilar\":{"
                set jsonOutput to jsonOutput & "\"document1\":\"" & (uuid1 of mostSimilarPair) & "\","
                set jsonOutput to jsonOutput & "\"document2\":\"" & (uuid2 of mostSimilarPair) & "\","
                set jsonOutput to jsonOutput & "\"similarity\":" & maxSimilarity
                set jsonOutput to jsonOutput & "},"
            else
                set jsonOutput to jsonOutput & "\"mostSimilar\":null,"
            end if
            
            set jsonOutput to jsonOutput & "\"optimized\":true"
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Quick document analysis (optimized)
on quickAnalyzeDocument(theRecord)
    tell application id "DNtp"
        set docUUID to uuid of theRecord
        set docName to name of theRecord
        set docTags to tags of theRecord
        
        -- Get word count without full text processing
        set wordCount to 0
        try
            set wordCount to word count of theRecord
        on error
            try
                set docText to plain text of theRecord
                set wordCount to count words of docText
            on error
                set wordCount to 0
            end try
        end try
        
        -- Create simplified word signature (first 100 words)
        set wordSignature to ""
        try
            set docText to plain text of theRecord
            if docText is not "" then
                set textWords to words of docText
                set sampleSize to 100
                if (count of textWords) < sampleSize then set sampleSize to count of textWords
                
                set sampleWords to {}
                repeat with i from 1 to sampleSize
                    set theWord to item i of textWords as string
                    if length of theWord > 4 then
                        set end of sampleWords to theWord
                    end if
                end repeat
                
                -- Create simple signature
                set AppleScript's text item delimiters to " "
                set wordSignature to sampleWords as string
                set AppleScript's text item delimiters to ""
            end if
        on error
            set wordSignature to ""
        end try
        
        return {docUUID:docUUID, docName:docName, wordCount:wordCount, docTags:docTags, tagCount:(count of docTags), wordSignature:wordSignature}
    end tell
end quickAnalyzeDocument

-- Quick document comparison
on quickCompareDocuments(analysis1, analysis2)
    -- Tag similarity
    set commonTagCount to 0
    set tags1 to docTags of analysis1
    set tags2 to docTags of analysis2
    
    repeat with tag1 in tags1
        if tag1 is in tags2 then
            set commonTagCount to commonTagCount + 1
        end if
    end repeat
    
    set totalTags to (tagCount of analysis1) + (tagCount of analysis2)
    if totalTags > 0 then
        set tagSimilarity to (2.0 * commonTagCount) / totalTags
    else
        set tagSimilarity to 0
    end if
    
    -- Simple content similarity based on word signatures
    set contentSimilarity to 0
    set sig1 to wordSignature of analysis1
    set sig2 to wordSignature of analysis2
    
    if sig1 is not "" and sig2 is not "" then
        -- Count common words in signatures
        set words1 to words of sig1
        set words2 to words of sig2
        set commonWords to 0
        
        repeat with word1 in words1
            if word1 is in words2 then
                set commonWords to commonWords + 1
            end if
        end repeat
        
        set totalWords to (count of words1) + (count of words2)
        if totalWords > 0 then
            set contentSimilarity to (2.0 * commonWords) / totalWords
        end if
    end if
    
    -- Overall similarity (weighted average)
    set overallSimilarity to (contentSimilarity * 0.7) + (tagSimilarity * 0.3)
    
    return {uuid1:(docUUID of analysis1), uuid2:(docUUID of analysis2), similarity:overallSimilarity, tagSimilarity:tagSimilarity}
end quickCompareDocuments

-- Escape string for JSON
on escapeString(inputString)
    set inputString to inputString as string
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as string
    set AppleScript's text item delimiters to ""
    return inputString
end escapeString