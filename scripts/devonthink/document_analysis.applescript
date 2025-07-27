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
            
            -- Count sentences with improved PDF handling
            set sentenceCount to 0
            set cleanedText to docText
            
            -- First, normalize the text by removing extra whitespace and line breaks
            set AppleScript's text item delimiters to {ASCII character 10, ASCII character 13}
            set textLines to text items of cleanedText
            set AppleScript's text item delimiters to " "
            set cleanedText to textLines as text
            
            -- Remove multiple spaces
            repeat while cleanedText contains "  "
                set AppleScript's text item delimiters to "  "
                set textParts to text items of cleanedText
                set AppleScript's text item delimiters to " "
                set cleanedText to textParts as text
            end repeat
            
            -- Count sentences more accurately
            set sentenceEnders to {".", "!", "?"}
            set sentences to {}
            set currentSentence to ""
            
            repeat with i from 1 to length of cleanedText
                set currentChar to character i of cleanedText
                set currentSentence to currentSentence & currentChar
                
                if currentChar is in sentenceEnders then
                    -- Check if this is really a sentence end (not abbreviation)
                    set isEnd to true
                    if i < length of cleanedText then
                        set nextChar to character (i + 1) of cleanedText
                        -- If followed by lowercase or comma, it's probably not a sentence end
                        if nextChar is not " " and nextChar is not (ASCII character 10) and nextChar is not (ASCII character 13) then
                            set isEnd to false
                        end if
                    end if
                    
                    if isEnd and length of currentSentence > 10 then
                        set end of sentences to currentSentence
                        set sentenceCount to sentenceCount + 1
                        set currentSentence to ""
                    end if
                end if
            end repeat
            
            -- Add any remaining sentence
            if length of currentSentence > 10 then
                set end of sentences to currentSentence
                set sentenceCount to sentenceCount + 1
            end if
            
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
            
            -- Extract key sentences from the parsed sentences
            set keySentences to {}
            
            -- Take up to 5 key sentences: first 3 and last 2 (if available)
            if sentenceCount > 0 and (count of sentences) > 0 then
                -- Get first sentences
                set maxFirst to 3
                if (count of sentences) < maxFirst then set maxFirst to count of sentences
                
                repeat with i from 1 to maxFirst
                    set keySentence to item i of sentences
                    -- Clean up the sentence
                    set keySentence to my trimText(keySentence)
                    if length of keySentence > 20 then
                        set end of keySentences to keySentence
                    end if
                end repeat
                
                -- Get last sentences if we have more than 3
                if (count of sentences) > 3 then
                    set startLast to (count of sentences) - 1
                    if startLast < 4 then set startLast to 4
                    
                    repeat with i from startLast to (count of sentences)
                        set keySentence to item i of sentences
                        set keySentence to my trimText(keySentence)
                        if length of keySentence > 20 then
                            -- Avoid duplicates
                            set isDuplicate to false
                            repeat with existing in keySentences
                                if existing as string = keySentence then
                                    set isDuplicate to true
                                    exit repeat
                                end if
                            end repeat
                            if not isDuplicate then
                                set end of keySentences to keySentence
                            end if
                        end if
                    end repeat
                end if
            end if
            
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

-- Trim whitespace from text
on trimText(theText)
    set trimmedText to theText
    
    -- Trim leading whitespace
    repeat while (length of trimmedText) > 0 and (character 1 of trimmedText is in {" ", tab, ASCII character 10, ASCII character 13})
        set trimmedText to text 2 through -1 of trimmedText
    end repeat
    
    -- Trim trailing whitespace
    repeat while (length of trimmedText) > 0 and (character -1 of trimmedText is in {" ", tab, ASCII character 10, ASCII character 13})
        set trimmedText to text 1 through -2 of trimmedText
    end repeat
    
    return trimmedText
end trimText

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