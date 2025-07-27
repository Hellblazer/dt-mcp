-- Multi-Level Summary using DEVONthink's native AI classification
-- Enhanced version that leverages AI for theme extraction and document understanding

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: summary level and document UUIDs\"}"
    end if
    
    set summaryLevel to item 1 of argv
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
            
            -- Collect documents with AI classification
            set documentData to {}
            set globalThemes to {}
            set allContent to ""
            set totalWordCount to 0
            
            repeat with uuid in documentUUIDs
                try
                    set theRecord to get record with uuid uuid
                    if theRecord is not missing value then
                        set docTitle to name of theRecord
                        set docType to type of theRecord as string
                        set docWordCount to 0
                        set docPreview to ""
                        
                        -- Get document content
                        try
                            set docText to plain text of theRecord
                            set docWordCount to count words of docText
                            set totalWordCount to totalWordCount + docWordCount
                            
                            -- Get preview based on summary level
                            if summaryLevel is "brief" then
                                set docPreview to my getTextPreview(docText, 50)
                            else if summaryLevel is "detailed" then
                                set docPreview to my getTextPreview(docText, 200)
                            else -- full
                                set docPreview to my getTextPreview(docText, 500)
                            end if
                            
                            set allContent to allContent & docText & " "
                        on error
                            set docPreview to "Content unavailable"
                        end try
                        
                        -- Use AI to classify and extract themes
                        set classifications to classify record theRecord
                        set docThemes to {}
                        
                        -- Extract top themes from AI classification
                        set themeLimit to 3
                        if summaryLevel is "detailed" then set themeLimit to 5
                        if summaryLevel is "full" then set themeLimit to 10
                        
                        repeat with j from 1 to themeLimit
                            if j > (count of classifications) then exit repeat
                            
                            set suggestion to item j of classifications
                            set themeName to name of suggestion
                            set themeScore to score of suggestion
                            
                            if themeScore > 10 then -- Only include relevant themes
                                set end of docThemes to {theme:themeName, score:themeScore}
                                
                                -- Add to global themes
                                set found to false
                                repeat with globalTheme in globalThemes
                                    if theme of globalTheme is themeName then
                                        set score of globalTheme to (score of globalTheme) + themeScore
                                        set docCount of globalTheme to (docCount of globalTheme) + 1
                                        set found to true
                                        exit repeat
                                    end if
                                end repeat
                                
                                if not found then
                                    set end of globalThemes to {theme:themeName, score:themeScore, docCount:1}
                                end if
                            end if
                        end repeat
                        
                        -- Store document data
                        set end of documentData to {docTitle:docTitle, docUUID:uuid, docType:docType, wordCount:docWordCount, preview:docPreview, themes:docThemes}
                    end if
                on error errMsg
                    -- Continue with next document
                end try
            end repeat
            
            -- Sort global themes by total score
            set globalThemes to my sortThemesByScore(globalThemes)
            
            -- Generate summary based on level
            set summaryContent to ""
            if summaryLevel is "brief" then
                set summaryContent to my generateBriefSummary(documentData, globalThemes, totalWordCount)
            else if summaryLevel is "detailed" then
                set summaryContent to my generateDetailedSummary(documentData, globalThemes, totalWordCount)
            else if summaryLevel is "full" then
                set summaryContent to my generateFullSummary(documentData, globalThemes, totalWordCount)
            else
                return "{\"error\":\"Invalid summary level: " & summaryLevel & "\"}"
            end if
            
            -- Build JSON response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"summaryLevel\":\"" & summaryLevel & "\","
            set jsonOutput to jsonOutput & "\"documentCount\":" & documentCount & ","
            set jsonOutput to jsonOutput & "\"totalWordCount\":" & totalWordCount & ","
            set jsonOutput to jsonOutput & "\"aiThemes\":" & my themesToJSON(globalThemes) & ","
            set jsonOutput to jsonOutput & "\"summary\":\"" & my escapeString(summaryContent) & "\","
            set jsonOutput to jsonOutput & "\"documents\":" & my documentsToJSON(documentData) & ","
            set jsonOutput to jsonOutput & "\"timestamp\":\"" & (current date as string) & "\","
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Generate brief summary (1-2 paragraphs)
on generateBriefSummary(documentData, globalThemes, totalWordCount)
    set summary to "Analysis of " & (count of documentData) & " documents (" & totalWordCount & " words total):\\n\\n"
    
    -- Top themes from AI
    set summary to summary & "Key Themes: "
    set themeCount to 0
    repeat with theme in globalThemes
        if themeCount > 0 then set summary to summary & ", "
        set summary to summary & (theme of theme)
        set themeCount to themeCount + 1
        if themeCount ≥ 5 then exit repeat
    end repeat
    set summary to summary & "\\n\\n"
    
    -- Brief overview
    set summary to summary & "Documents cover: "
    repeat with i from 1 to count of documentData
        if i > 1 then set summary to summary & "; "
        set doc to item i of documentData
        set summary to summary & (docTitle of doc)
        
        -- Add top theme for each doc
        if (count of themes of doc) > 0 then
            set summary to summary & " (focus: " & (theme of item 1 of themes of doc) & ")"
        end if
    end repeat
    
    return summary
end generateBriefSummary

-- Generate detailed summary (full page)
on generateDetailedSummary(documentData, globalThemes, totalWordCount)
    set summary to "Detailed Summary and Analysis\\n"
    set summary to summary & "========================\\n\\n"
    
    -- Document overview
    set summary to summary & "Document Set: " & (count of documentData) & " documents, " & totalWordCount & " words\\n\\n"
    
    -- AI-identified themes
    set summary to summary & "Primary Themes (AI Analysis):\\n"
    set themeCount to 0
    repeat with theme in globalThemes
        set themeCount to themeCount + 1
        set avgScore to (score of theme) / (docCount of theme)
        set summary to summary & themeCount & ". " & (theme of theme)
        set summary to summary & " (relevance: " & (round (avgScore)) & ", appears in " & (docCount of theme) & " documents)\\n"
        if themeCount ≥ 10 then exit repeat
    end repeat
    set summary to summary & "\\n"
    
    -- Document summaries
    set summary to summary & "Document Summaries:\\n"
    set summary to summary & "-----------------\\n"
    repeat with doc in documentData
        set summary to summary & "\\n• " & (docTitle of doc) & " (" & (wordCount of doc) & " words)\\n"
        
        -- Document themes
        if (count of themes of doc) > 0 then
            set summary to summary & "  Themes: "
            repeat with i from 1 to count of themes of doc
                if i > 1 then set summary to summary & ", "
                set docTheme to item i of themes of doc
                set summary to summary & (theme of docTheme)
            end repeat
            set summary to summary & "\\n"
        end if
        
        -- Preview
        set summary to summary & "  Preview: " & (preview of doc) & "\\n"
    end repeat
    
    return summary
end generateDetailedSummary

-- Generate full summary (comprehensive)
on generateFullSummary(documentData, globalThemes, totalWordCount)
    set summary to "Comprehensive Summary Report\\n"
    set summary to summary & "==========================\\n\\n"
    
    -- Executive summary
    set summary to summary & "EXECUTIVE SUMMARY\\n"
    set summary to summary & "-----------------\\n"
    set summary to summary & "This analysis covers " & (count of documentData) & " documents containing " & totalWordCount & " words. "
    set summary to summary & "AI analysis has identified " & (count of globalThemes) & " key themes across the document set.\\n\\n"
    
    -- Theme analysis
    set summary to summary & "THEME ANALYSIS (AI-POWERED)\\n"
    set summary to summary & "--------------------------\\n"
    repeat with i from 1 to count of globalThemes
        set theme to item i of globalThemes
        set avgScore to (score of theme) / (docCount of theme)
        set summary to summary & "\\n" & i & ". " & (theme of theme) & "\\n"
        set summary to summary & "   - Average relevance score: " & (round (avgScore)) & "\\n"
        set summary to summary & "   - Found in " & (docCount of theme) & " documents (" 
        set summary to summary & (round ((count of theme) * 100 / (count of documentData))) & "%)\\n"
        
        -- Find documents with this theme
        set summary to summary & "   - Key documents: "
        set docList to {}
        repeat with doc in documentData
            repeat with docTheme in themes of doc
                if theme of docTheme is theme of theme then
                    set end of docList to docTitle of doc
                    exit repeat
                end if
            end repeat
        end repeat
        
        repeat with j from 1 to count of docList
            if j > 1 then set summary to summary & ", "
            set summary to summary & item j of docList
        end repeat
        set summary to summary & "\\n"
    end repeat
    
    -- Detailed document analysis
    set summary to summary & "\\nDETAILED DOCUMENT ANALYSIS\\n"
    set summary to summary & "-------------------------\\n"
    repeat with doc in documentData
        set summary to summary & "\\n### " & (docTitle of doc) & "\\n"
        set summary to summary & "- Type: " & (docType of doc) & "\\n"
        set summary to summary & "- Length: " & (wordCount of doc) & " words\\n"
        
        -- AI themes for this document
        if (count of themes of doc) > 0 then
            set summary to summary & "- AI-Identified Themes:\\n"
            repeat with docTheme in themes of doc
                set summary to summary & "  • " & (theme of docTheme)
                set summary to summary & " (relevance: " & (score of docTheme) & ")\\n"
            end repeat
        end if
        
        -- Extended preview
        set summary to summary & "- Content Preview:\\n  " & (preview of doc) & "\\n"
    end repeat
    
    -- Cross-references
    set summary to summary & "\\nCROSS-REFERENCES AND CONNECTIONS\\n"
    set summary to summary & "-------------------------------\\n"
    set summary to summary & "Documents sharing common themes:\\n"
    
    -- Find documents that share themes
    repeat with i from 1 to 3 -- Top 3 themes
        if i > (count of globalThemes) then exit repeat
        set theme to item i of globalThemes
        set summary to summary & "\\n• Theme: " & (theme of theme) & "\\n  Documents: "
        
        set docList to {}
        repeat with doc in documentData
            repeat with docTheme in themes of doc
                if theme of docTheme is theme of theme then
                    set end of docList to docTitle of doc
                    exit repeat
                end if
            end repeat
        end repeat
        
        repeat with j from 1 to count of docList
            if j > 1 then set summary to summary & " | "
            set summary to summary & item j of docList
        end repeat
        set summary to summary & "\\n"
    end repeat
    
    return summary
end generateFullSummary

-- Helper: Get text preview
on getTextPreview(theText, maxWords)
    try
        set wordList to words of theText
        if (count of wordList) ≤ maxWords then
            return theText
        else
            set preview to ""
            repeat with i from 1 to maxWords
                if i > 1 then set preview to preview & " "
                set preview to preview & item i of wordList
            end repeat
            return preview & "..."
        end if
    on error
        return "Preview unavailable"
    end try
end getTextPreview

-- Helper: Sort themes by score
on sortThemesByScore(themeList)
    -- Simple bubble sort for themes
    repeat with i from 1 to (count of themeList) - 1
        repeat with j from i + 1 to count of themeList
            if score of item j of themeList > score of item i of themeList then
                set temp to item i of themeList
                set item i of themeList to item j of themeList
                set item j of themeList to temp
            end if
        end repeat
    end repeat
    return themeList
end sortThemesByScore

-- Helper: Convert themes to JSON
on themesToJSON(themeList)
    set json to "["
    repeat with i from 1 to count of themeList
        if i > 1 then set json to json & ","
        set theme to item i of themeList
        set avgScore to (score of theme) / (docCount of theme)
        set json to json & "{"
        set json to json & "\"theme\":\"" & my escapeString(theme of theme) & "\","
        set json to json & "\"totalScore\":" & (score of theme) & ","
        set json to json & "\"averageScore\":" & (round (avgScore)) & ","
        set json to json & "\"documentCount\":" & (docCount of theme)
        set json to json & "}"
    end repeat
    set json to json & "]"
    return json
end themesToJSON

-- Helper: Convert documents to JSON
on documentsToJSON(docList)
    set json to "["
    repeat with i from 1 to count of docList
        if i > 1 then set json to json & ","
        set doc to item i of docList
        set json to json & "{"
        set json to json & "\"title\":\"" & my escapeString(docTitle of doc) & "\","
        set json to json & "\"uuid\":\"" & (docUUID of doc) & "\","
        set json to json & "\"type\":\"" & (docType of doc) & "\","
        set json to json & "\"wordCount\":" & (wordCount of doc) & ","
        set json to json & "\"themes\":["
        
        repeat with j from 1 to count of themes of doc
            if j > 1 then set json to json & ","
            set docTheme to item j of themes of doc
            set json to json & "{"
            set json to json & "\"theme\":\"" & my escapeString(theme of docTheme) & "\","
            set json to json & "\"score\":" & (score of docTheme)
            set json to json & "}"
        end repeat
        
        set json to json & "]"
        set json to json & "}"
    end repeat
    set json to json & "]"
    return json
end documentsToJSON

-- Helper: Escape special characters for JSON
on escapeString(str)
    set str to my replaceText(str, "\\", "\\\\")
    set str to my replaceText(str, "\"", "\\\"")
    set str to my replaceText(str, "/", "\\/")
    set str to my replaceText(str, ASCII character 8, "\\b")
    set str to my replaceText(str, ASCII character 12, "\\f")
    set str to my replaceText(str, ASCII character 10, "\\n")
    set str to my replaceText(str, ASCII character 13, "\\r")
    set str to my replaceText(str, ASCII character 9, "\\t")
    return str
end escapeString

-- Helper: Replace text
on replaceText(theText, searchString, replacementString)
    set AppleScript's text item delimiters to searchString
    set textItems to every text item of theText
    set AppleScript's text item delimiters to replacementString
    set theText to textItems as string
    set AppleScript's text item delimiters to ""
    return theText
end replaceText