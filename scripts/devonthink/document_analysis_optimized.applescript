-- Optimized Document Analysis
-- Handles large documents efficiently

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing required parameter: document UUID\"}"
    end if
    
    set documentUUID to item 1 of argv
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid documentUUID
            if theRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            -- Get document metadata
            set docName to name of theRecord
            set docType to type of theRecord as string
            set docURL to URL of theRecord
            set docComment to comment of theRecord
            set docTags to tags of theRecord
            
            -- Get text content
            set docText to plain text of theRecord
            if docText is missing value or docText = "" then
                set docText to " "
            end if
            
            -- Limit text for performance (first 50000 chars)
            set textLength to length of docText
            if textLength > 50000 then
                set docText to text 1 through 50000 of docText
                set truncated to true
            else
                set truncated to false
            end if
            
            -- Fast word count using built-in command
            set wordCount to 0
            try
                -- Use shell for faster processing
                set shellCmd to "echo " & quoted form of docText & " | wc -w"
                set wordCount to (do shell script shellCmd) as integer
            on error
                -- Fallback to simple counting
                set AppleScript's text item delimiters to {" ", tab, return, ASCII character 10}
                set wordItems to text items of docText
                set wordCount to 0
                repeat with w in wordItems
                    if length of w > 0 then set wordCount to wordCount + 1
                end repeat
                set AppleScript's text item delimiters to ""
            end try
            
            -- Character and paragraph count
            set charCount to length of docText
            set paragraphList to paragraphs of docText
            set paragraphCount to count of paragraphList
            
            -- Sentence count (simplified)
            set sentenceCount to 0
            try
                set shellCmd to "echo " & quoted form of docText & " | grep -o '[.!?]' | wc -l"
                set sentenceCount to (do shell script shellCmd) as integer
                if sentenceCount = 0 then set sentenceCount to 1
            on error
                set sentenceCount to paragraphCount -- Rough estimate
            end try
            
            -- Calculate averages
            if wordCount > 0 then
                set avgWordLength to (charCount - wordCount) / wordCount -- Approximate
                set avgSentenceLength to wordCount / sentenceCount
            else
                set avgWordLength to 0
                set avgSentenceLength to 0
            end if
            
            -- Readability score
            set syllablesPerWord to 1.5 -- Approximation
            if avgSentenceLength > 0 then
                set readabilityScore to 206.835 - (1.015 * avgSentenceLength) - (84.6 * syllablesPerWord)
                if readabilityScore < 0 then set readabilityScore to 0
                if readabilityScore > 100 then set readabilityScore to 100
            else
                set readabilityScore to 0
            end if
            
            -- Readability level
            if readabilityScore >= 90 then
                set readabilityLevel to "Very Easy"
            else if readabilityScore >= 80 then
                set readabilityLevel to "Easy"
            else if readabilityScore >= 70 then
                set readabilityLevel to "Fairly Easy"
            else if readabilityScore >= 60 then
                set readabilityLevel to "Standard"
            else if readabilityScore >= 50 then
                set readabilityLevel to "Fairly Difficult"
            else if readabilityScore >= 30 then
                set readabilityLevel to "Difficult"
            else
                set readabilityLevel to "Very Difficult"
            end if
            
            -- Extract key sentences (simplified for performance)
            set keySentences to {}
            set maxSentences to 5
            set sentenceCount to 0
            
            -- Get first few non-empty paragraphs
            repeat with i from 1 to count of paragraphList
                if sentenceCount >= maxSentences then exit repeat
                set para to item i of paragraphList
                if length of para > 20 then
                    -- Extract first sentence
                    set sentenceEnd to 0
                    repeat with j from 1 to length of para
                        if character j of para is in {".", "!", "?"} then
                            set sentenceEnd to j
                            exit repeat
                        end if
                    end repeat
                    
                    if sentenceEnd > 20 then
                        set sentence to text 1 through sentenceEnd of para
                        set end of keySentences to sentence
                        set sentenceCount to sentenceCount + 1
                    else if length of para < 100 then
                        set end of keySentences to para
                        set sentenceCount to sentenceCount + 1
                    end if
                end if
            end repeat
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & documentUUID & "\","
            set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(docName) & "\","
            set jsonOutput to jsonOutput & "\"type\":\"" & docType & "\","
            set jsonOutput to jsonOutput & "\"metrics\":{"
            set jsonOutput to jsonOutput & "\"wordCount\":" & wordCount & ","
            set jsonOutput to jsonOutput & "\"characterCount\":" & charCount & ","
            set jsonOutput to jsonOutput & "\"paragraphCount\":" & paragraphCount & ","
            set jsonOutput to jsonOutput & "\"sentenceCount\":" & sentenceCount & ","
            set jsonOutput to jsonOutput & "\"avgWordLength\":" & avgWordLength & ","
            set jsonOutput to jsonOutput & "\"avgSentenceLength\":" & avgSentenceLength & ","
            set jsonOutput to jsonOutput & "\"readabilityScore\":" & readabilityScore & ","
            set jsonOutput to jsonOutput & "\"readabilityLevel\":\"" & readabilityLevel & "\","
            set jsonOutput to jsonOutput & "\"truncated\":" & (truncated as string)
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"metadata\":{"
            set jsonOutput to jsonOutput & "\"hasURL\":" & ((docURL is not "") as string) & ","
            set jsonOutput to jsonOutput & "\"hasComment\":" & ((docComment is not "") as string) & ","
            set jsonOutput to jsonOutput & "\"tagCount\":" & (count of docTags) & ","
            set jsonOutput to jsonOutput & "\"originalLength\":" & textLength
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"keySentences\":" & my listToJSON(keySentences)
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Convert list to JSON array
on listToJSON(theList)
    set jsonArray to "["
    repeat with i from 1 to count of theList
        if i > 1 then set jsonArray to jsonArray & ","
        set jsonArray to jsonArray & "\"" & my escapeString(item i of theList) & "\""
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
    set inputString to textItems as text
    
    -- Escape quotes
    set AppleScript's text item delimiters to "\""
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\\""
    set inputString to textItems as text
    
    -- Escape newlines
    set AppleScript's text item delimiters to ASCII character 10
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as text
    
    -- Escape carriage returns
    set AppleScript's text item delimiters to ASCII character 13
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\r"
    set inputString to textItems as text
    
    -- Escape tabs
    set AppleScript's text item delimiters to ASCII character 9
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\t"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ""
    
    return inputString
end escapeString