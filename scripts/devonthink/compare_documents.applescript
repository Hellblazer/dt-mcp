-- Compare documents using DEVONthink's native AI classification
-- Replaces manual Jaccard similarity with AI classification overlap

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: at least 2 document UUIDs\"}"
    end if
    
    tell application id "DNtp"
        try
            -- Collect document UUIDs
            set documentUUIDs to {}
            repeat with i from 1 to count of argv
                set end of documentUUIDs to item i of argv
            end repeat
            
            if (count of documentUUIDs) < 2 then
                return "{\"error\":\"Need at least 2 documents to compare\"}"
            end if
            
            -- Get AI classifications for all documents
            set documentClassifications to {}
            set documentTitles to {}
            
            repeat with docUUID in documentUUIDs
                try
                    set theRecord to get record with uuid docUUID
                    if theRecord is not missing value then
                        set docTitle to name of theRecord
                        set classifications to classify record theRecord
                        
                        -- Extract top classification groups (themes)
                        set docThemes to {}
                        repeat with j from 1 to 10 -- Consider top 10 classifications
                            if j > (count of classifications) then exit repeat
                            
                            set suggestion to item j of classifications
                            set groupName to name of suggestion
                            set groupScore to score of suggestion
                            
                            -- Skip generic groups
                            if groupName is not in {"Inbox", "old inbox", "New Group", "Unfiled", "Trash", ""} then
                                set end of docThemes to {groupName, groupScore}
                            end if
                        end repeat
                        
                        set end of documentClassifications to docThemes
                        set end of documentTitles to docTitle
                    else
                        set end of documentClassifications to {}
                        set end of documentTitles to "Unknown Document"
                    end if
                on error
                    set end of documentClassifications to {}
                    set end of documentTitles to "Error Loading Document"
                end try
            end repeat
            
            -- Calculate pairwise similarities using classification overlap
            set similarities to {}
            repeat with i from 1 to (count of documentClassifications) - 1
                repeat with j from (i + 1) to count of documentClassifications
                    set doc1Themes to item i of documentClassifications
                    set doc2Themes to item j of documentClassifications
                    set doc1Title to item i of documentTitles
                    set doc2Title to item j of documentTitles
                    
                    -- Calculate AI classification overlap similarity
                    set similarity to my calculateClassificationSimilarity(doc1Themes, doc2Themes)
                    
                    set similarityRecord to "{"
                    set similarityRecord to similarityRecord & "\"document1\":\"" & my escapeString(doc1Title) & "\","
                    set similarityRecord to similarityRecord & "\"document2\":\"" & my escapeString(doc2Title) & "\","
                    set similarityRecord to similarityRecord & "\"similarity\":" & similarity & ","
                    set similarityRecord to similarityRecord & "\"method\":\"ai_classification_overlap\""
                    set similarityRecord to similarityRecord & "}"
                    
                    set end of similarities to similarityRecord
                end repeat
            end repeat
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"documentCount\":" & (count of documentUUIDs) & ","
            set jsonOutput to jsonOutput & "\"comparisons\":[" & my joinList(similarities, ",") & "],"
            set jsonOutput to jsonOutput & "\"method\":\"devonthink_ai_classification\","
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Calculate similarity based on AI classification overlap
on calculateClassificationSimilarity(themes1, themes2)
    if (count of themes1) = 0 or (count of themes2) = 0 then
        return 0.0
    end if
    
    -- Extract theme names for comparison
    set names1 to {}
    set names2 to {}
    set scores1 to {}
    set scores2 to {}
    
    repeat with themeRecord in themes1
        set end of names1 to item 1 of themeRecord
        set end of scores1 to item 2 of themeRecord
    end repeat
    
    repeat with themeRecord in themes2
        set end of names2 to item 1 of themeRecord
        set end of scores2 to item 2 of themeRecord
    end repeat
    
    -- Calculate weighted overlap similarity
    set sharedScore to 0.0
    set totalScore1 to 0.0
    set totalScore2 to 0.0
    
    -- Sum all scores for normalization
    repeat with score in scores1
        set totalScore1 to totalScore1 + score
    end repeat
    
    repeat with score in scores2
        set totalScore2 to totalScore2 + score
    end repeat
    
    -- Find shared themes and sum their scores
    repeat with i from 1 to count of names1
        set theme1 to item i of names1
        set score1 to item i of scores1
        
        repeat with j from 1 to count of names2
            set theme2 to item j of names2
            set score2 to item j of scores2
            
            if theme1 = theme2 then
                -- Use minimum score for shared theme
                set minScore to score1
                if score2 < minScore then set minScore to score2
                set sharedScore to sharedScore + minScore
                exit repeat
            end if
        end repeat
    end repeat
    
    -- Calculate Jaccard-like similarity with weighted scores
    set unionScore to totalScore1 + totalScore2 - sharedScore
    if unionScore > 0 then
        return sharedScore / unionScore
    else
        return 0.0
    end if
end calculateClassificationSimilarity

-- Join list items with separator
on joinList(itemList, separator)
    set AppleScript's text item delimiters to separator
    set result to itemList as string
    set AppleScript's text item delimiters to ""
    return result
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