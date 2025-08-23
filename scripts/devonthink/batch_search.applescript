on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameter: parameters JSON\"}"
    end if
    
    set parametersJson to item 1 of argv
    
    try
        -- Parse queries array from JSON
        set queriesList to my extractJsonArray(parametersJson, "queries")
        if queriesList is {} then
            return "{\"error\": \"No queries found in parameters\"}"
        end if
        
        -- Extract optional parameters
        set databaseName to my extractJsonValue(parametersJson, "database")
        set maxResultsPerQuery to my extractJsonValue(parametersJson, "maxResultsPerQuery")
        if maxResultsPerQuery is "" then set maxResultsPerQuery to "20"
        
        set maxResults to maxResultsPerQuery as integer
        
        tell application id "DNtp"
            set targetDb to current database
            if databaseName is not "" then
                set targetDb to database databaseName
            end if
            
            set batchResults to {}
            
            repeat with queryItem in queriesList
                try
                    set searchResults to search queryItem in targetDb
                    set queryResult to {query:queryItem, results:{}, resultCount:(count of searchResults)}
                    
                    set resultsList to {}
                    set resultCount to 0
                    repeat with searchResult in searchResults
                        if resultCount ≥ maxResults then exit repeat
                        
                        set resultRecord to {uuid:(uuid of searchResult), name:(name of searchResult), type:(type of searchResult as string), path:(path of searchResult), score:(score of searchResult)}
                        set end of resultsList to resultRecord
                        set resultCount to resultCount + 1
                    end repeat
                    
                    set results of queryResult to resultsList
                    set end of batchResults to queryResult
                    
                on error errMsg
                    set errorResult to {query:queryItem, results:{}, resultCount:0, error:errMsg}
                    set end of batchResults to errorResult
                end try
            end repeat
            
            return my formatBatchSearchResults(batchResults)
        end tell
        
    on error errMsg number errNum
        return "{\"error\": \"Batch search failed: " & errMsg & " (Code: " & errNum & ")\"}"
    end try
end run

-- Extract JSON array values
on extractJsonArray(jsonString, arrayName)
    try
        set searchKey to "\"" & arrayName & "\":"
        set keyPos to (offset of searchKey in jsonString)
        if keyPos > 0 then
            set startPos to keyPos + (length of searchKey)
            set remainingString to text startPos thru -1 of jsonString
            
            -- Skip whitespace
            set i to 1
            repeat while i ≤ (length of remainingString)
                set char to character i of remainingString
                if char is not " " and char is not tab then
                    exit repeat
                end if
                set i to i + 1
            end repeat
            
            -- Look for array start
            if i ≤ (length of remainingString) and character i of remainingString is "[" then
                set arrayStart to i + 1
                set arrayContent to text arrayStart thru -1 of remainingString
                set bracketCount to 1
                set arrayEndPos to 1
                
                repeat with j from 1 to (length of arrayContent)
                    set currentChar to character j of arrayContent
                    if currentChar is "[" then
                        set bracketCount to bracketCount + 1
                    else if currentChar is "]" then
                        set bracketCount to bracketCount - 1
                        if bracketCount is 0 then
                            set arrayEndPos to j - 1
                            exit repeat
                        end if
                    end if
                end repeat
                
                if arrayEndPos > 0 then
                    set arrayString to text 1 thru arrayEndPos of arrayContent
                    return my parseStringArray(arrayString)
                end if
            end if
        end if
    end try
    return {}
end extractJsonArray

-- Parse array of strings
on parseStringArray(arrayString)
    set stringList to {}
    set inString to false
    set currentString to ""
    set i to 1
    
    repeat while i ≤ (length of arrayString)
        set currentChar to character i of arrayString
        
        if currentChar is "\"" then
            if inString then
                -- End of string
                if currentString is not "" then
                    set end of stringList to currentString
                end if
                set currentString to ""
                set inString to false
            else
                -- Start of string
                set inString to true
            end if
        else if inString then
            set currentString to currentString & currentChar
        end if
        
        set i to i + 1
    end repeat
    
    return stringList
end parseStringArray

-- Extract simple JSON value
on extractJsonValue(jsonString, keyName)
    try
        set searchKey to "\"" & keyName & "\":"
        set keyPos to (offset of searchKey in jsonString)
        if keyPos > 0 then
            set startPos to keyPos + (length of searchKey)
            set remainingString to text startPos thru -1 of jsonString
            
            -- Skip whitespace
            set i to 1
            repeat while i ≤ (length of remainingString)
                set char to character i of remainingString
                if char is not " " and char is not tab then
                    exit repeat
                end if
                set i to i + 1
            end repeat
            
            -- Get string value
            if i ≤ (length of remainingString) and character i of remainingString is "\"" then
                set valueStart to i + 1
                set searchString to text valueStart thru -1 of remainingString
                set endPos to (offset of "\"" in searchString)
                if endPos > 0 then
                    return text 1 thru (endPos - 1) of searchString
                end if
            end if
        end if
    end try
    return ""
end extractJsonValue

-- Format batch search results as JSON
on formatBatchSearchResults(batchResults)
    set resultJson to "{"
    set resultJson to resultJson & "\"batchResults\": ["
    
    set resultCount to count of batchResults
    repeat with i from 1 to resultCount
        set queryResult to item i of batchResults
        
        set resultJson to resultJson & "{"
        set resultJson to resultJson & "\"query\": \"" & (query of queryResult) & "\", "
        set resultJson to resultJson & "\"resultCount\": " & (resultCount of queryResult) & ", "
        
        if error of queryResult exists then
            set resultJson to resultJson & "\"error\": \"" & (error of queryResult) & "\", "
        end if
        
        set resultJson to resultJson & "\"results\": ["
        
        set resultsList to results of queryResult
        set resultsCount to count of resultsList
        repeat with j from 1 to resultsCount
            set docResult to item j of resultsList
            set resultJson to resultJson & "{"
            set resultJson to resultJson & "\"uuid\": \"" & (uuid of docResult) & "\", "
            set resultJson to resultJson & "\"name\": \"" & my escapeJsonString(name of docResult) & "\", "
            set resultJson to resultJson & "\"type\": \"" & (type of docResult) & "\", "
            set resultJson to resultJson & "\"path\": \"" & my escapeJsonString(path of docResult) & "\", "
            set resultJson to resultJson & "\"score\": " & (score of docResult)
            set resultJson to resultJson & "}"
            
            if j < resultsCount then set resultJson to resultJson & ", "
        end repeat
        
        set resultJson to resultJson & "]}"
        if i < resultCount then set resultJson to resultJson & ", "
    end repeat
    
    set resultJson to resultJson & "], "
    set resultJson to resultJson & "\"totalQueries\": " & resultCount
    set resultJson to resultJson & "}"
    
    return resultJson
end formatBatchSearchResults

-- Escape JSON strings
on escapeJsonString(str)
    set str to my replaceText(str, "\\", "\\\\")
    set str to my replaceText(str, "\"", "\\\"")
    set str to my replaceText(str, return, "\\n")
    set str to my replaceText(str, tab, "\\t")
    return str
end escapeJsonString

-- Replace text utility
on replaceText(str, oldText, newText)
    set AppleScript's text item delimiters to oldText
    set textItems to text items of str
    set AppleScript's text item delimiters to newText
    set result to textItems as string
    set AppleScript's text item delimiters to ""
    return result
end replaceText