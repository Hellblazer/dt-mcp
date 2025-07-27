-- Analyze similarity between multiple documents
-- Uses word frequency, tags, and metadata for comparison

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"At least 2 document UUIDs required\"}"
    end if
    
    tell application id "DNtp"
        try
            -- Collect documents
            set documents to {}
            repeat with i from 1 to count of argv
                set docUUID to item i of argv
                set theRecord to get record with uuid docUUID
                if theRecord is missing value then
                    return "{\"error\":\"Document not found: " & docUUID & "\"}"
                end if
                set end of documents to theRecord
            end repeat
            
            -- Analyze each document
            set docAnalyses to {}
            repeat with doc in documents
                set docAnalysis to my analyzeDocument(doc)
                set end of docAnalyses to docAnalysis
            end repeat
            
            -- Compare all pairs
            set comparisons to {}
            repeat with i from 1 to (count of documents) - 1
                repeat with j from (i + 1) to count of documents
                    set comparison to my compareDocumentPair(item i of docAnalyses, item j of docAnalyses)
                    set end of comparisons to comparison
                end repeat
            end repeat
            
            -- Build response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"documentCount\":" & (count of documents) & ","
            set jsonOutput to jsonOutput & "\"documents\":["
            
            repeat with i from 1 to count of docAnalyses
                if i > 1 then set jsonOutput to jsonOutput & ","
                set analysis to item i of docAnalyses
                set jsonOutput to jsonOutput & "{"
                set jsonOutput to jsonOutput & "\"uuid\":\"" & (docUUID of analysis) & "\","
                set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(docName of analysis) & "\","
                set jsonOutput to jsonOutput & "\"wordCount\":" & (wordCount of analysis) & ","
                set jsonOutput to jsonOutput & "\"uniqueWords\":" & (uniqueWordCount of analysis) & ","
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
                set jsonOutput to jsonOutput & "\"commonWords\":" & (commonWords of comp) & ","
                set jsonOutput to jsonOutput & "\"commonTags\":" & (commonTags of comp) & ","
                set jsonOutput to jsonOutput & "\"jaccardIndex\":" & (jaccardIndex of comp)
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
                set jsonOutput to jsonOutput & "}"
            else
                set jsonOutput to jsonOutput & "\"mostSimilar\":null"
            end if
            
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Analyze a single document
on analyzeDocument(theRecord)
    tell application id "DNtp"
        set docText to plain text of theRecord
        set docUUID to uuid of theRecord
        set docName to name of theRecord
        set docTags to tags of theRecord
        
        -- Word frequency analysis
        set wordList to words of docText
        set wordCount to count of wordList
        set uniqueWords to {}
        set wordFreq to {}
        
        -- Count word frequencies (simplified - case sensitive)
        repeat with aWord in wordList
            set wordStr to aWord as string
            if length of wordStr > 3 then -- Skip short words
                set found to false
                repeat with i from 1 to count of wordFreq
                    if wordText of (item i of wordFreq) = wordStr then
                        set wordFrequency of (item i of wordFreq) to (wordFrequency of (item i of wordFreq)) + 1
                        set found to true
                        exit repeat
                    end if
                end repeat
                if not found then
                    set end of wordFreq to {wordText:wordStr, wordFrequency:1}
                    set end of uniqueWords to wordStr
                end if
            end if
        end repeat
        
        -- Get top words (sorted by frequency)
        set topWords to my getTopWords(wordFreq, 20)
        
        return {docUUID:docUUID, docName:docName, wordCount:wordCount, uniqueWordCount:(count of uniqueWords), wordFreq:wordFreq, topWords:topWords, docTags:docTags, tagCount:(count of docTags)}
    end tell
end analyzeDocument

-- Compare two document analyses
on compareDocumentPair(analysis1, analysis2)
    -- Calculate common words
    set commonWordCount to 0
    set words1 to wordFreq of analysis1
    set words2 to wordFreq of analysis2
    
    repeat with wordEntry in words1
        set word1 to wordText of wordEntry
        repeat with wordEntry2 in words2
            if wordText of wordEntry2 = word1 then
                set commonWordCount to commonWordCount + 1
                exit repeat
            end if
        end repeat
    end repeat
    
    -- Calculate Jaccard Index for words
    set union to (uniqueWordCount of analysis1) + (uniqueWordCount of analysis2) - commonWordCount
    if union > 0 then
        set jaccardIndex to commonWordCount / union
    else
        set jaccardIndex to 0
    end if
    
    -- Calculate tag similarity
    set commonTagCount to 0
    set tags1 to docTags of analysis1
    set tags2 to docTags of analysis2
    
    repeat with tag1 in tags1
        repeat with tag2 in tags2
            if tag1 as string = tag2 as string then
                set commonTagCount to commonTagCount + 1
                exit repeat
            end if
        end repeat
    end repeat
    
    -- Calculate overall similarity (weighted average)
    set wordSimilarity to jaccardIndex * 0.7
    set tagSimilarity to 0
    set totalTags to (tagCount of analysis1) + (tagCount of analysis2) - commonTagCount
    if totalTags > 0 then
        set tagSimilarity to (commonTagCount / totalTags) * 0.3
    end if
    
    set overallSimilarity to wordSimilarity + tagSimilarity
    
    return {uuid1:(docUUID of analysis1), uuid2:(docUUID of analysis2), similarity:overallSimilarity, commonWords:commonWordCount, commonTags:commonTagCount, jaccardIndex:jaccardIndex}
end compareDocumentPair

-- Get top N words by frequency
on getTopWords(wordFreqList, topN)
    -- Simple selection sort for top N
    set topWords to {}
    set workingList to wordFreqList
    
    repeat topN times
        if (count of workingList) = 0 then exit repeat
        
        set maxFreq to 0
        set maxIndex to 1
        
        repeat with i from 1 to count of workingList
            if wordFrequency of (item i of workingList) > maxFreq then
                set maxFreq to wordFrequency of (item i of workingList)
                set maxIndex to i
            end if
        end repeat
        
        set end of topWords to item maxIndex of workingList
        set workingList to my removeItemAtIndex(workingList, maxIndex)
    end repeat
    
    return topWords
end getTopWords

-- Remove item at index from list
on removeItemAtIndex(theList, theIndex)
    set newList to {}
    repeat with i from 1 to count of theList
        if i is not theIndex then
            set end of newList to item i of theList
        end if
    end repeat
    return newList
end removeItemAtIndex

-- Escape string for JSON
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