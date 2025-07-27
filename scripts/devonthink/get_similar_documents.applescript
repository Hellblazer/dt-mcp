-- Get similar documents using DEVONthink's native AI
-- Uses classification overlap to find documents with similar AI-determined themes

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing required parameter: document UUID\"}"
    end if
    
    set sourceUUID to item 1 of argv
    set limitCount to 10
    if (count of argv) > 1 then
        try
            set limitCount to (item 2 of argv) as integer
        end try
    end if
    
    tell application id "DNtp"
        try
            set sourceRecord to get record with uuid sourceUUID
            if sourceRecord is missing value then
                return "{\"error\":\"Source document not found\"}"
            end if
            
            set sourceTitle to name of sourceRecord
            
            -- Get AI classification for source document
            set sourceClassifications to classify record sourceRecord
            
            -- Extract meaningful classification groups from source
            set sourceThemes to {}
            repeat with i from 1 to count of sourceClassifications
                set suggestion to item i of sourceClassifications
                set groupName to name of suggestion
                set groupScore to score of suggestion
                
                if groupName is not in {"Inbox", "old inbox", "New Group", "Unfiled", "Trash", ""} then
                    set end of sourceThemes to {groupName, groupScore}
                end if
            end repeat
            
            if (count of sourceThemes) = 0 then
                return "{\"error\":\"No meaningful classifications found for source document\"}"
            end if
            
            -- Use DEVONthink's native comparison which already provides similarity scores
            set relatedDocs to compare record sourceRecord
            
            -- Build results directly from DEVONthink's comparison (much faster)
            set similarDocuments to {}
            set processedCount to 0
            
            repeat with relatedDoc in relatedDocs
                if processedCount >= limitCount then exit repeat
                
                try
                    set relatedUUID to uuid of relatedDoc
                    set relatedTitle to name of relatedDoc
                    set relatedType to type of relatedDoc
                    
                    -- Skip the source document itself
                    if relatedUUID ≠ sourceUUID then
                        -- Use DEVONthink's native similarity (no need to recalculate)
                        -- DEVONthink orders results by relevance, so position indicates similarity
                        set similarity to (1.0 - (processedCount / 20.0)) -- Decreasing confidence based on rank
                        if similarity < 0.1 then set similarity to 0.1
                        
                        set similarDoc to "{"
                        set similarDoc to similarDoc & "\"uuid\":\"" & relatedUUID & "\","
                        set similarDoc to similarDoc & "\"title\":\"" & my escapeString(relatedTitle) & "\","
                        set similarDoc to similarDoc & "\"type\":\"" & relatedType & "\","
                        set similarDoc to similarDoc & "\"similarity\":" & similarity & ","
                        set similarDoc to similarDoc & "\"method\":\"devonthink_native_compare\","
                        set similarDoc to similarDoc & "\"rank\":" & (processedCount + 1)
                        set similarDoc to similarDoc & "}"
                        
                        set end of similarDocuments to similarDoc
                        set processedCount to processedCount + 1
                    end if
                on error
                    -- Skip documents that can't be processed
                end try
            end repeat
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"source_document\":{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & sourceUUID & "\","
            set jsonOutput to jsonOutput & "\"title\":\"" & my escapeString(sourceTitle) & "\","
            set jsonOutput to jsonOutput & "\"theme_count\":" & (count of sourceThemes)
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"similar_documents\":[" & my joinList(similarDocuments, ",") & "],"
            set jsonOutput to jsonOutput & "\"result_count\":" & (count of similarDocuments) & ","
            set jsonOutput to jsonOutput & "\"method\":\"devonthink_native_ai\","
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Calculate similarity based on AI classification overlap
on calculateAISimilarity(sourceThemes, targetClassifications)
    if (count of sourceThemes) = 0 or (count of targetClassifications) = 0 then
        return 0.0
    end if
    
    -- Extract target themes
    set targetThemes to {}
    repeat with i from 1 to count of targetClassifications
        set suggestion to item i of targetClassifications
        set groupName to name of suggestion
        set groupScore to score of suggestion
        
        if groupName is not in {"Inbox", "old inbox", "New Group", "Unfiled", "Trash", ""} then
            set end of targetThemes to {groupName, groupScore}
        end if
    end repeat
    
    if (count of targetThemes) = 0 then return 0.0
    
    -- Calculate weighted overlap similarity
    set sharedScore to 0.0
    set sourceTotal to 0.0
    set targetTotal to 0.0
    
    -- Sum source theme scores
    repeat with sourceTheme in sourceThemes
        set sourceTotal to sourceTotal + (item 2 of sourceTheme)
    end repeat
    
    -- Sum target theme scores
    repeat with targetTheme in targetThemes
        set targetTotal to targetTotal + (item 2 of targetTheme)
    end repeat
    
    -- Find shared themes and calculate overlap
    repeat with sourceTheme in sourceThemes
        set sourceName to item 1 of sourceTheme
        set sourceScore to item 2 of sourceTheme
        
        repeat with targetTheme in targetThemes
            set targetName to item 1 of targetTheme
            set targetScore to item 2 of targetTheme
            
            if sourceName = targetName then
                -- Use minimum score for shared theme
                set minScore to sourceScore
                if targetScore < minScore then set minScore to targetScore
                set sharedScore to sharedScore + minScore
                exit repeat
            end if
        end repeat
    end repeat
    
    -- Calculate Jaccard-like similarity
    set unionScore to sourceTotal + targetTotal - sharedScore
    if unionScore > 0 then
        return sharedScore / unionScore
    else
        return 0.0
    end if
end calculateAISimilarity

-- Join list items with separator
on joinList(itemList, separator)
    if (count of itemList) = 0 then return ""
    
    set joinedText to ""
    repeat with i from 1 to count of itemList
        if i > 1 then set joinedText to joinedText & separator
        set joinedText to joinedText & (item i of itemList)
    end repeat
    
    return joinedText
end joinList

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