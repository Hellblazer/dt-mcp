-- Track Knowledge Evolution Over Time
-- Analyze how topics and understanding change across document collections

on run argv
    if (count of argv) < 2 then
        return "{\"error\":\"Missing required parameters: action and parameters\"}"
    end if
    
    set action to item 1 of argv
    
    tell application id "DNtp"
        try
            if action is "evolution" then
                -- Track evolution of a topic
                if (count of argv) < 3 then
                    return "{\"error\":\"Missing topic/tag and time range\"}"
                end if
                
                set topic to item 2 of argv
                set timeRange to item 3 of argv -- "week", "month", "year", "all"
                
                return my trackTopicEvolution(topic, timeRange)
                
            else if action is "timeline" then
                -- Create timeline for document collection
                set documentUUIDs to {}
                repeat with i from 2 to count of argv
                    set end of documentUUIDs to item i of argv
                end repeat
                
                return my createKnowledgeTimeline(documentUUIDs)
                
            else if action is "trends" then
                -- Identify trending topics
                if (count of argv) < 2 then
                    set databaseName to ""
                else
                    set databaseName to item 2 of argv
                end if
                
                return my identifyTrends(databaseName)
                
            else
                return "{\"error\":\"Unknown action: " & action & "\"}"
            end if
            
        on error errMsg
            return "{\"error\":\"" & my escapeString(errMsg) & "\"}"
        end try
    end tell
end run

-- Track how a topic has evolved over time
on trackTopicEvolution(topic, timeRange)
    tell application id "DNtp"
        -- Calculate date range
        set endDate to current date
        if timeRange is "week" then
            set startDate to endDate - (7 * days)
        else if timeRange is "month" then
            set startDate to endDate - (30 * days)
        else if timeRange is "year" then
            set startDate to endDate - (365 * days)
        else -- "all"
            set startDate to date "Monday, January 1, 2000 at 12:00:00 AM"
        end if
        
        -- Search for documents containing the topic
        set searchResults to search topic
        set timelineData to {}
        set totalDocs to 0
        
        -- Group documents by time period
        set monthlyData to {}
        
        repeat with doc in searchResults
            set docDate to creation date of doc
            if docDate ≥ startDate and docDate ≤ endDate then
                set totalDocs to totalDocs + 1
                
                -- Get month/year key
                set monthKey to (month of docDate as string) & " " & (year of docDate as string)
                
                -- Find or create month entry
                set found to false
                repeat with monthEntry in monthlyData
                    if monthName of monthEntry = monthKey then
                        set docCount of monthEntry to (docCount of monthEntry) + 1
                        set found to true
                        exit repeat
                    end if
                end repeat
                
                if not found then
                    set end of monthlyData to {monthName:monthKey, docCount:1, docs:{}}
                end if
            end if
        end repeat
        
        -- Sort monthlyData chronologically
        set sortedMonthlyData to my sortMonthlyData(monthlyData)
        
        -- Build response
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"topic\":\"" & my escapeString(topic) & "\","
        set jsonOutput to jsonOutput & "\"timeRange\":\"" & timeRange & "\","
        set jsonOutput to jsonOutput & "\"totalDocuments\":" & totalDocs & ","
        set jsonOutput to jsonOutput & "\"timeline\":["
        
        repeat with i from 1 to count of sortedMonthlyData
            if i > 1 then set jsonOutput to jsonOutput & ","
            set monthInfo to item i of sortedMonthlyData
            set jsonOutput to jsonOutput & "{"
            set jsonOutput to jsonOutput & "\"period\":\"" & (monthName of monthInfo) & "\","
            set jsonOutput to jsonOutput & "\"documentCount\":" & (docCount of monthInfo)
            set jsonOutput to jsonOutput & "}"
        end repeat
        
        set jsonOutput to jsonOutput & "],"
        
        -- Add evolution summary
        if totalDocs > 0 then
            set evolutionSummary to "Topic '" & topic & "' appears in " & totalDocs & " documents over " & timeRange & "."
            if (count of monthlyData) > 1 then
                set evolutionSummary to evolutionSummary & " Activity spans " & (count of monthlyData) & " distinct time periods."
            end if
        else
            set evolutionSummary to "No documents found for topic '" & topic & "' in the specified time range."
        end if
        
        set jsonOutput to jsonOutput & "\"summary\":\"" & my escapeString(evolutionSummary) & "\""
        set jsonOutput to jsonOutput & "}"
        
        return jsonOutput
    end tell
end trackTopicEvolution

-- Create knowledge timeline from documents
on createKnowledgeTimeline(documentUUIDs)
    tell application id "DNtp"
        set timeline to {}
        set earliestDate to current date
        set latestDate to date "Monday, January 1, 2000 at 12:00:00 AM"
        
        -- Process each document
        repeat with docUUID in documentUUIDs
            try
                set theRecord to get record with uuid docUUID
                if theRecord is not missing value then
                    set docDate to creation date of theRecord
                    set docName to name of theRecord
                    set docTags to tags of theRecord
                    
                    -- Track date range
                    if docDate < earliestDate then set earliestDate to docDate
                    if docDate > latestDate then set latestDate to docDate
                    
                    -- Create timeline entry
                    set timelineEntry to {entryDate:docDate, uuid:docUUID, docName:docName, tags:docTags}
                    set end of timeline to timelineEntry
                end if
            end try
        end repeat
        
        -- Sort timeline by date (simple bubble sort for small sets)
        repeat with i from 1 to (count of timeline) - 1
            repeat with j from i + 1 to count of timeline
                if entryDate of (item i of timeline) > entryDate of (item j of timeline) then
                    set temp to item i of timeline
                    set item i of timeline to item j of timeline
                    set item j of timeline to temp
                end if
            end repeat
        end repeat
        
        -- Calculate time span
        set timeSpan to (latestDate - earliestDate) / days
        
        -- Build response
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"documentCount\":" & (count of timeline) & ","
        set jsonOutput to jsonOutput & "\"timeSpanDays\":" & (timeSpan as integer) & ","
        set jsonOutput to jsonOutput & "\"earliestDate\":\"" & (earliestDate as string) & "\","
        set jsonOutput to jsonOutput & "\"latestDate\":\"" & (latestDate as string) & "\","
        set jsonOutput to jsonOutput & "\"timeline\":["
        
        repeat with i from 1 to count of timeline
            if i > 1 then set jsonOutput to jsonOutput & ","
            set entry to item i of timeline
            set jsonOutput to jsonOutput & "{"
            set jsonOutput to jsonOutput & "\"date\":\"" & (entryDate of entry as string) & "\","
            set jsonOutput to jsonOutput & "\"uuid\":\"" & (uuid of entry) & "\","
            set jsonOutput to jsonOutput & "\"name\":\"" & my escapeString(docName of entry) & "\","
            set jsonOutput to jsonOutput & "\"tags\":["
            
            repeat with j from 1 to count of tags of entry
                if j > 1 then set jsonOutput to jsonOutput & ","
                set jsonOutput to jsonOutput & "\"" & my escapeString(item j of tags of entry as string) & "\""
            end repeat
            
            set jsonOutput to jsonOutput & "]}"
        end repeat
        
        set jsonOutput to jsonOutput & "]}"
        
        return jsonOutput
    end tell
end createKnowledgeTimeline

-- Identify trending topics in recent documents
on identifyTrends(databaseName)
    tell application id "DNtp"
        -- Get recent documents (last 30 days)
        set cutoffDate to (current date) - (30 * days)
        set recentDocs to {}
        set olderDocs to {}
        
        -- Search all or specific database
        if databaseName is "" then
            set searchResults to search "*"
        else
            -- Find database by name
            set targetDB to missing value
            repeat with db in databases
                if name of db is databaseName then
                    set targetDB to db
                    exit repeat
                end if
            end repeat
            
            if targetDB is not missing value then
                tell targetDB
                    set searchResults to search "*"
                end tell
            else
                -- Return error if database not found
                set jsonOutput to "{"
                set jsonOutput to jsonOutput & "\"error\":\"Database not found: " & databaseName & "\","
                set jsonOutput to jsonOutput & "\"database_requested\":\"" & databaseName & "\""
                set jsonOutput to jsonOutput & "}"
                return jsonOutput
            end if
        end if
        
        -- Separate recent from older
        repeat with doc in searchResults
            if creation date of doc > cutoffDate then
                set end of recentDocs to doc
            else
                set end of olderDocs to doc
            end if
        end repeat
        
        -- Count tags in recent vs older
        set recentTags to {}
        set olderTags to {}
        
        -- Process recent documents
        repeat with doc in recentDocs
            set docTags to tags of doc
            repeat with tag in docTags
                set tagStr to tag as string
                set found to false
                repeat with tagEntry in recentTags
                    if tagName of tagEntry = tagStr then
                        set tagCount of tagEntry to (tagCount of tagEntry) + 1
                        set found to true
                        exit repeat
                    end if
                end repeat
                if not found then
                    set end of recentTags to {tagName:tagStr, tagCount:1}
                end if
            end repeat
        end repeat
        
        -- Process older documents (sample for performance)
        set sampleSize to 100
        if (count of olderDocs) > sampleSize then
            set olderSample to items 1 through sampleSize of olderDocs
        else
            set olderSample to olderDocs
        end if
        
        repeat with doc in olderSample
            set docTags to tags of doc
            repeat with tag in docTags
                set tagStr to tag as string
                set found to false
                repeat with tagEntry in olderTags
                    if tagName of tagEntry = tagStr then
                        set tagCount of tagEntry to (tagCount of tagEntry) + 1
                        set found to true
                        exit repeat
                    end if
                end repeat
                if not found then
                    set end of olderTags to {tagName:tagStr, tagCount:1}
                end if
            end repeat
        end repeat
        
        -- Identify trending (tags more common in recent)
        set trendingTags to {}
        repeat with recentTag in recentTags
            set recentFreq to (tagCount of recentTag) / (count of recentDocs)
            
            -- Find in older tags
            set olderFreq to 0
            repeat with olderTag in olderTags
                if tagName of olderTag = tagName of recentTag then
                    set olderFreq to (tagCount of olderTag) / (count of olderSample)
                    exit repeat
                end if
            end repeat
            
            -- Calculate trend score
            if olderFreq > 0 then
                set trendScore to recentFreq / olderFreq
            else
                set trendScore to recentFreq * 10 -- New topic
            end if
            
            if trendScore > 1.5 then -- 50% increase = trending
                set end of trendingTags to {tagName:(tagName of recentTag), trendScore:trendScore, recentCount:(tagCount of recentTag)}
            end if
        end repeat
        
        -- Sort by trend score
        set sortedTrends to my sortByTrendScore(trendingTags)
        
        -- Build response
        set jsonOutput to "{"
        set jsonOutput to jsonOutput & "\"recentDocumentCount\":" & (count of recentDocs) & ","
        set jsonOutput to jsonOutput & "\"comparisonDocumentCount\":" & (count of olderSample) & ","
        set jsonOutput to jsonOutput & "\"trendingTopics\":["
        
        repeat with i from 1 to count of sortedTrends
            if i > 10 then exit repeat -- Top 10 only
            if i > 1 then set jsonOutput to jsonOutput & ","
            set trend to item i of sortedTrends
            set jsonOutput to jsonOutput & "{"
            set jsonOutput to jsonOutput & "\"topic\":\"" & my escapeString(tagName of trend) & "\","
            set jsonOutput to jsonOutput & "\"trendScore\":" & (trendScore of trend) & ","
            set jsonOutput to jsonOutput & "\"recentOccurrences\":" & (recentCount of trend)
            set jsonOutput to jsonOutput & "}"
        end repeat
        
        set jsonOutput to jsonOutput & "]}"
        
        return jsonOutput
    end tell
end identifyTrends

-- Helper: Sort by trend score
on sortByTrendScore(trendList)
    set sorted to {}
    set working to trendList
    
    repeat (count of trendList) times
        if (count of working) = 0 then exit repeat
        
        set maxScore to 0
        set maxIndex to 1
        
        repeat with i from 1 to count of working
            if trendScore of (item i of working) > maxScore then
                set maxScore to trendScore of (item i of working)
                set maxIndex to i
            end if
        end repeat
        
        set end of sorted to item maxIndex of working
        set working to my removeItemAtIndex(working, maxIndex)
    end repeat
    
    return sorted
end sortByTrendScore

-- Helper: Remove item at index
on removeItemAtIndex(theList, theIndex)
    set newList to {}
    repeat with i from 1 to count of theList
        if i is not theIndex then
            set end of newList to item i of theList
        end if
    end repeat
    return newList
end removeItemAtIndex

-- Helper: Sort monthly data chronologically
on sortMonthlyData(monthlyData)
    set sorted to {}
    set working to monthlyData
    
    repeat (count of monthlyData) times
        if (count of working) = 0 then exit repeat
        
        set earliestDate to missing value
        set earliestIndex to 1
        
        repeat with i from 1 to count of working
            set monthEntry to item i of working
            set monthStr to monthName of monthEntry
            set entryDate to my parseMonthString(monthStr)
            
            if earliestDate is missing value or entryDate < earliestDate then
                set earliestDate to entryDate
                set earliestIndex to i
            end if
        end repeat
        
        set end of sorted to item earliestIndex of working
        set working to my removeItemAtIndex(working, earliestIndex)
    end repeat
    
    return sorted
end sortMonthlyData

-- Helper: Parse month string to date for comparison
on parseMonthString(monthStr)
    try
        -- Convert "January 2024" to a date for comparison
        set monthName to word 1 of monthStr
        set yearStr to word 2 of monthStr
        set year to yearStr as integer
        
        -- Map month names to numbers
        if monthName is "January" then set monthNum to 1
        if monthName is "February" then set monthNum to 2
        if monthName is "March" then set monthNum to 3
        if monthName is "April" then set monthNum to 4
        if monthName is "May" then set monthNum to 5
        if monthName is "June" then set monthNum to 6
        if monthName is "July" then set monthNum to 7
        if monthName is "August" then set monthNum to 8
        if monthName is "September" then set monthNum to 9
        if monthName is "October" then set monthNum to 10
        if monthName is "November" then set monthNum to 11
        if monthName is "December" then set monthNum to 12
        
        -- Create a comparable value (year * 100 + month)
        return year * 100 + monthNum
    on error
        -- Fallback: return a large number so unparseable dates go to end
        return 999999
    end try
end parseMonthString

-- Helper: Escape string for JSON
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
    
    set AppleScript's text item delimiters to ASCII character 10
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\n"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ASCII character 13
    set textItems to text items of inputString
    set AppleScript's text item delimiters to "\\r"
    set inputString to textItems as text
    
    set AppleScript's text item delimiters to ""
    
    return inputString
end escapeString