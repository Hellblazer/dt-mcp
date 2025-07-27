-- Document Intelligence and Analysis
-- Analyze document complexity, readability, and extract key information

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
            
            -- Get document content and metadata
            set docText to plain text of theRecord
            if docText is missing value or docText = "" then
                set docText to " " -- Handle empty documents
            end if
            set docName to name of theRecord
            set docType to type of theRecord as string
            set docURL to URL of theRecord
            set docComment to comment of theRecord
            
            -- Basic metrics
            set charCount to count characters of docText
            set paragraphCount to count paragraphs of docText
            
            -- Get word list using text item delimiters
            set AppleScript's text item delimiters to {" ", tab, return, ASCII character 10, ".", ",", ";", ":", "!", "?", "(", ")", "[", "]", "{", "}", "\"", "'"}
            set wordItems to text items of docText
            set AppleScript's text item delimiters to ""
            
            -- Build clean word list and calculate metrics
            set wordList to {}
            set totalWordLength to 0
            repeat with wordItem in wordItems
                if length of wordItem > 0 then
                    set end of wordList to wordItem
                    set totalWordLength to totalWordLength + (length of wordItem)
                end if
            end repeat
            
            set wordCount to count of wordList
            
            if wordCount > 0 then
                set avgWordLength to (totalWordLength / wordCount) as real
            else
                set avgWordLength to 0
            end if
            
            -- Count sentences (simplified approach)
            set sentenceCount to 0
            set sentenceEnders to {".", "!", "?"}
            repeat with ender in sentenceEnders
                set AppleScript's text item delimiters to ender
                set sentenceCount to sentenceCount + (count of text items of docText) - 1
            end repeat
            set AppleScript's text item delimiters to ""
            
            if sentenceCount = 0 then set sentenceCount to 1
            
            -- Calculate average sentence length
            if sentenceCount > 0 then
                set avgSentenceLength to (wordCount / sentenceCount) as real
            else
                set avgSentenceLength to 0
            end if
            
            -- Simple readability score (Flesch Reading Ease approximation)
            -- Score = 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
            -- Simplified: assume 1.5 syllables per word average
            set syllablesPerWord to 1.5
            if avgSentenceLength > 0 and avgWordLength > 0 then
                set readabilityScore to 206.835 - (1.015 * avgSentenceLength) - (84.6 * syllablesPerWord)
                -- Bound the score between 0 and 100
                if readabilityScore < 0 then set readabilityScore to 0
                if readabilityScore > 100 then set readabilityScore to 100
            else
                set readabilityScore to 0
            end if
            
            -- Determine readability level
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
            
            -- Extract key sentences (first and last of significant paragraphs)
            set keySentences to {}
            set paragraphList to paragraphs of docText
            set significantParas to {}
            
            -- Filter out empty or very short paragraphs
            repeat with para in paragraphList
                -- Count words in paragraph manually
                set paraWordCount to 0
                set AppleScript's text item delimiters to {" ", tab}
                set paraWords to text items of para
                repeat with w in paraWords
                    if length of w > 0 then set paraWordCount to paraWordCount + 1
                end repeat
                set AppleScript's text item delimiters to ""
                
                if paraWordCount > 10 then
                    set end of significantParas to para
                end if
            end repeat
            
            -- Get first sentences from first 3 paragraphs and last paragraph
            set maxKeyParas to 4
            if (count of significantParas) < maxKeyParas then
                set maxKeyParas to count of significantParas
            end if
            
            repeat with i from 1 to maxKeyParas
                if i <= 3 or i = (count of significantParas) then
                    set currentPara to item i of significantParas
                    -- Extract first sentence
                    set firstSentence to my extractFirstSentence(currentPara)
                    if firstSentence is not "" then
                        set end of keySentences to firstSentence
                    end if
                end if
            end repeat
            
            -- Metadata analysis
            set hasURL to (docURL is not "")
            set hasComment to (docComment is not "")
            set tagCount to count of tags of theRecord
            
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
            set jsonOutput to jsonOutput & "\"readabilityLevel\":\"" & readabilityLevel & "\""
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"metadata\":{"
            set jsonOutput to jsonOutput & "\"hasURL\":" & (hasURL as string) & ","
            set jsonOutput to jsonOutput & "\"hasComment\":" & (hasComment as string) & ","
            set jsonOutput to jsonOutput & "\"tagCount\":" & tagCount
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"keySentences\":" & my listToJSON(keySentences)
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Extract first sentence from a paragraph
on extractFirstSentence(paragraphText)
    set sentenceEnders to {".", "!", "?"}
    set firstSentence to ""
    set minLength to 20 -- Minimum characters for a valid sentence
    
    repeat with ender in sentenceEnders
        set AppleScript's text item delimiters to ender
        set parts to text items of paragraphText
        if (count of parts) > 1 then
            set candidate to (item 1 of parts) & ender
            if (count characters of candidate) > minLength then
                if firstSentence = "" or (count characters of candidate) < (count characters of firstSentence) then
                    set firstSentence to candidate
                end if
            end if
        end if
    end repeat
    set AppleScript's text item delimiters to ""
    
    -- If no sentence found, take first 100 characters
    if firstSentence = "" and (count characters of paragraphText) > minLength then
        if (count characters of paragraphText) > 100 then
            set firstSentence to (characters 1 through 100 of paragraphText as string) & "..."
        else
            set firstSentence to paragraphText
        end if
    end if
    
    return firstSentence
end extractFirstSentence

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