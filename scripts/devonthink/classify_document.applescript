-- Classify document using DEVONthink's native AI
-- Directly exposes DEVONthink 4's AI classification capabilities

on run argv
    if (count of argv) < 1 then
        return "{\"error\":\"Missing required parameter: document UUID\"}"
    end if
    
    set docUUID to item 1 of argv
    
    tell application id "DNtp"
        try
            set theRecord to get record with uuid docUUID
            if theRecord is missing value then
                return "{\"error\":\"Document not found\"}"
            end if
            
            set docTitle to name of theRecord
            set docType to type of theRecord
            set docPath to path of theRecord
            
            -- Get DEVONthink's AI classification
            set classifications to classify record theRecord
            
            set suggestions to {}
            repeat with i from 1 to count of classifications
                set suggestion to item i of classifications
                set groupName to name of suggestion
                set groupScore to score of suggestion
                set groupPath to location of suggestion
                
                -- Only include meaningful classifications (skip generic groups)
                if groupName is not in {"Inbox", "old inbox", "New Group", "Unfiled", "Trash", ""} then
                    -- Build suggestion object
                    set suggestionJSON to "{"
                    set suggestionJSON to suggestionJSON & "\"group_name\":\"" & my escapeString(groupName) & "\","
                    set suggestionJSON to suggestionJSON & "\"confidence\":" & groupScore & ","
                    set suggestionJSON to suggestionJSON & "\"group_path\":\"" & my escapeString(groupPath) & "\","
                    set suggestionJSON to suggestionJSON & "\"full_path\":\"" & my escapeString(groupPath & groupName) & "\""
                    set suggestionJSON to suggestionJSON & "}"
                    
                    set end of suggestions to suggestionJSON
                end if
            end repeat
            
            -- Get document statistics using DEVONthink's native capabilities
            set docWordCount to 0
            set docSize to 0
            try
                set docText to plain text of theRecord
                set docWordCount to count words of docText
                set docSize to size of theRecord
            on error
                -- Some documents might not have plain text
            end try
            
            -- Build complete response
            set jsonOutput to "{"
            set jsonOutput to jsonOutput & "\"document\":{"
            set jsonOutput to jsonOutput & "\"uuid\":\"" & docUUID & "\","
            set jsonOutput to jsonOutput & "\"title\":\"" & my escapeString(docTitle) & "\","
            set jsonOutput to jsonOutput & "\"type\":\"" & docType & "\","
            set jsonOutput to jsonOutput & "\"path\":\"" & my escapeString(docPath) & "\","
            set jsonOutput to jsonOutput & "\"word_count\":" & docWordCount & ","
            set jsonOutput to jsonOutput & "\"size_bytes\":" & docSize
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"ai_classification\":{"
            if (count of suggestions) > 0 then
                set jsonOutput to jsonOutput & "\"suggestions\":[" & my joinList(suggestions, ",") & "],"
            else
                set jsonOutput to jsonOutput & "\"suggestions\":[],"
            end if
            set jsonOutput to jsonOutput & "\"suggestion_count\":" & (count of suggestions) & ","
            set jsonOutput to jsonOutput & "\"method\":\"devonthink_native_ai\""
            set jsonOutput to jsonOutput & "},"
            set jsonOutput to jsonOutput & "\"status\":\"success\""
            set jsonOutput to jsonOutput & "}"
            
            return jsonOutput
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

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