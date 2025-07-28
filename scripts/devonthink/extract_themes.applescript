-- Extract themes from document content using tags and content analysis
-- Uses document tags as primary themes and analyzes content for additional themes

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing required parameters: documentUUIDs\"}"
    end if
    
    tell application id "DNtp"
        try
            -- Collect document UUIDs
            set documentUUIDs to {}
            repeat with i from 1 to count of argv
                set end of documentUUIDs to item i of argv
            end repeat
            
            set allThemes to {}
            set themeScores to {}
            set documentCount to count of documentUUIDs
            set processedDocs to 0
            set allWords to {}
            set wordCounts to {}
            
            -- Common words to exclude
            set stopWords to {"the", "and", "for", "are", "but", "not", "you", "all", "would", "her", "she", "there", "their", "what", "out", "about", "who", "get", "which", "when", "make", "can", "like", "time", "just", "him", "know", "take", "into", "year", "your", "some", "could", "them", "other", "than", "then", "now", "only", "over", "also", "after", "use", "two", "how", "our", "work", "well", "way", "even", "new", "want", "any", "these", "give", "most", "was", "have", "this", "with", "that", "from", "they", "will", "been", "has", "had", "were", "said", "did", "each", "such", "same", "where", "being"}
            
            -- Process each document
            repeat with docUUID in documentUUIDs
                try
                    set theRecord to get record with uuid docUUID
                    if theRecord is not missing value then
                        set processedDocs to processedDocs + 1
                        
                        -- First, add document tags as themes with high weight
                        set docTags to tags of theRecord
                        repeat with tag in docTags
                            set tag to tag as string
                            if tag is not "" then
                                set found to false
                                repeat with i from 1 to count of allThemes
                                    if item i of allThemes = tag then
                                        set item i of themeScores to (item i of themeScores) + 10
                                        set found to true
                                        exit repeat
                                    end if
                                end repeat
                                
                                if not found then
                                    set end of allThemes to tag
                                    set end of themeScores to 10
                                end if
                            end if
                        end repeat
                        
                        -- Then analyze document content
                        set docText to ""
                        try
                            set docText to plain text of theRecord
                        on error
                            try
                                set docText to comment of theRecord
                            end try
                        end try
                        
                        if docText is not "" then
                            -- Get document name and add meaningful words from it
                            set docName to name of theRecord
                            set nameWords to words of docName
                            repeat with theWord in nameWords
                                set theWord to theWord as string
                                if (length of theWord) > 3 and theWord is not in stopWords then
                                    set found to false
                                    repeat with i from 1 to count of allThemes
                                        if item i of allThemes = theWord then
                                            set item i of themeScores to (item i of themeScores) + 5
                                            set found to true
                                            exit repeat
                                        end if
                                    end repeat
                                    
                                    if not found then
                                        set end of allThemes to theWord
                                        set end of themeScores to 5
                                    end if
                                end if
                            end repeat
                            
                            -- Extract key phrases from content (first 1000 words)
                            set docWords to words of docText
                            set wordLimit to 1000
                            if (count of docWords) < wordLimit then set wordLimit to count of docWords
                            
                            repeat with i from 1 to wordLimit
                                set theWord to item i of docWords as string
                                -- Only count words that are long enough and not stopwords
                                if (length of theWord) > 4 and theWord is not in stopWords then
                                    set found to false
                                    repeat with j from 1 to count of allWords
                                        if item j of allWords = theWord then
                                            set item j of wordCounts to (item j of wordCounts) + 1
                                            set found to true
                                            exit repeat
                                        end if
                                    end repeat
                                    
                                    if not found then
                                        set end of allWords to theWord
                                        set end of wordCounts to 1
                                    end if
                                end if
                            end repeat
                        end if
                    end if
                on error
                    -- Skip documents that can't be processed
                end try
            end repeat
            
            -- Add high-frequency words from content as themes
            repeat with i from 1 to count of allWords
                if item i of wordCounts > 2 then -- Word appears in multiple docs or multiple times
                    set theWord to item i of allWords
                    set wordScore to item i of wordCounts
                    
                    set found to false
                    repeat with j from 1 to count of allThemes
                        if item j of allThemes = theWord then
                            set item j of themeScores to (item j of themeScores) + wordScore
                            set found to true
                            exit repeat
                        end if
                    end repeat
                    
                    if not found then
                        set end of allThemes to theWord
                        set end of themeScores to wordScore
                    end if
                end if
            end repeat
            
            -- Sort themes by AI confidence scores
            set sortedThemes to my sortThemesByScore(allThemes, themeScores)
            
            -- Return top themes based on AI classification
            set finalThemes to {}
            set maxThemes to my getMinimum(15, count of sortedThemes)
            repeat with i from 1 to maxThemes
                set end of finalThemes to item i of sortedThemes
            end repeat
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"documentCount\":" & documentCount & ","
            set jsonOutput to jsonOutput & "\"processedDocuments\":" & processedDocs & ","
            set jsonOutput to jsonOutput & "\"themes\":" & my listToJSON(finalThemes) & ","
            set jsonOutput to jsonOutput & "\"method\":\"tags_and_content_analysis\","
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Extract theme words from group path hierarchy
on extractPathThemes(groupPath)
    set pathThemes to {}
    
    -- Remove leading slash
    if groupPath starts with "/" then
        set groupPath to text 2 thru -1 of groupPath
    end if
    
    -- Split path by slashes to get hierarchy levels
    set AppleScript's text item delimiters to "/"
    set pathParts to text items of groupPath
    set AppleScript's text item delimiters to ""
    
    repeat with part in pathParts
        set cleanPart to my cleanThemeName(part as string)
        if (count of cleanPart) > 3 then
            set end of pathThemes to cleanPart
        end if
    end repeat
    
    return pathThemes
end extractPathThemes

-- Clean and normalize theme names
on cleanThemeName(themeName)
    -- Remove common prefixes/suffixes and normalize
    set cleanName to themeName
    
    -- Remove file extensions
    if cleanName ends with ".pdf" or cleanName ends with ".md" or cleanName ends with ".txt" then
        set AppleScript's text item delimiters to "."
        set nameParts to text items of cleanName
        set AppleScript's text item delimiters to ""
        if (count of nameParts) > 1 then
            set cleanName to items 1 thru -2 of nameParts as string
        end if
    end if
    
    return cleanName
end cleanThemeName

-- Sort themes by their AI confidence scores (descending)
on sortThemesByScore(themes, scores)
    set indexedList to {}
    repeat with i from 1 to count of themes
        set end of indexedList to {theme:item i of themes, |score|:item i of scores}
    end repeat
    
    -- Sort by score (bubble sort, descending)
    repeat with i from 1 to (count of indexedList) - 1
        repeat with j from i + 1 to count of indexedList
            if |score| of (item i of indexedList) < |score| of (item j of indexedList) then
                set temp to item i of indexedList
                set item i of indexedList to item j of indexedList
                set item j of indexedList to temp
            end if
        end repeat
    end repeat
    
    -- Extract sorted theme names
    set sortedThemes to {}
    repeat with themeItem in indexedList
        set end of sortedThemes to theme of themeItem
    end repeat
    
    return sortedThemes
end sortThemesByScore

-- Get minimum of two numbers
on getMinimum(a, b)
    if a < b then return a
    return b
end getMinimum

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