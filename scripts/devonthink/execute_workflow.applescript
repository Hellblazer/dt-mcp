on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"Missing required parameter: parameters JSON\"}"
    end if
    
    set parametersJson to item 1 of argv
    
    try
        -- Parse required parameters
        set templateId to my extractJsonValue(parametersJson, "templateId")
        set parametersString to my extractJsonValue(parametersJson, "parameters")
        
        if templateId is "" then
            return "{\"error\": \"Template ID is required\"}"
        end if
        
        -- Parse workflow parameters
        set topic to my extractJsonValue(parametersString, "topic")
        set targetGroup to my extractJsonValue(parametersString, "targetGroup")
        set maxResults to my extractJsonValue(parametersString, "maxResults")
        set timeRange to my extractJsonValue(parametersString, "timeRange")
        set databasesString to my extractJsonValue(parametersString, "databases")
        
        -- Set defaults
        if maxResults is "" then set maxResults to "10"
        if timeRange is "" then set timeRange to "month"
        
        tell application id "DNtp"
            set currentDb to current database
            set workflowResults to {}
            set workflowSteps to {}
            
            -- Execute workflow based on template
            if templateId is "academic_research" then
                set workflowSteps to my executeAcademicResearchWorkflow(topic, targetGroup, maxResults, currentDb)
                
            else if templateId is "literature_review" then
                set workflowSteps to my executeLiteratureReviewWorkflow(topic, targetGroup, maxResults, timeRange, currentDb)
                
            else if templateId is "data_collection" then
                set workflowSteps to my executeDataCollectionWorkflow(topic, targetGroup, maxResults, currentDb)
                
            else
                return "{\"error\": \"Unknown workflow template: " & templateId & "\"}"
            end if
            
            return my formatWorkflowResults(templateId, workflowSteps, topic)
        end tell
        
    on error errMsg number errNum
        return "{\"error\": \"Workflow execution failed: " & errMsg & " (Code: " & errNum & ")\"}"
    end try
end run

-- Execute Academic Research Workflow
on executeAcademicResearchWorkflow(topic, targetGroup, maxResults, currentDb)
    set workflowSteps to {}
    set maxResultsInt to maxResults as integer
    
    try
        -- Step 1: Create research structure
        set step1 to {stepNumber:1, stepName:"Create Research Structure", status:"in_progress", results:{}}
        
        set researchGroup to ""
        if targetGroup is not "" then
            try
                set researchGroup to get record at targetGroup in currentDb
            on error
                set researchGroup to create record with {type:group, name:targetGroup} in currentDb
            end try
        else
            set researchGroup to create record with {type:group, name:("Research_" & topic)} in currentDb
        end if
        
        set step1Result to {groupUUID:(uuid of researchGroup), groupName:(name of researchGroup)}
        set results of step1 to step1Result
        set status of step1 to "completed"
        set end of workflowSteps to step1
        
        -- Step 2: Search for relevant documents
        set step2 to {stepNumber:2, stepName:"Search Documents", status:"in_progress", results:{}}
        
        set searchResults to search topic in currentDb
        set limitedResults to {}
        set resultCount to 0
        
        repeat with searchResult in searchResults
            if resultCount ≥ maxResultsInt then exit repeat
            set end of limitedResults to searchResult
            set resultCount to resultCount + 1
        end repeat
        
        set step2Result to {searchTerm:topic, totalFound:(count of searchResults), limitedTo:resultCount}
        set results of step2 to step2Result
        set status of step2 to "completed"
        set end of workflowSteps to step2
        
        -- Step 3: Organize documents by type
        set step3 to {stepNumber:3, stepName:"Organize by Type", status:"in_progress", results:{}}
        
        set pdfGroup to create record with {type:group, name:"PDFs"} in researchGroup
        set htmlGroup to create record with {type:group, name:"Web_Content"} in researchGroup
        set textGroup to create record with {type:group, name:"Text_Documents"} in researchGroup
        
        set organizedCounts to {pdfs:0, html:0, text:0, other:0}
        
        repeat with doc in limitedResults
            try
                set docType to type of doc as string
                if docType contains "PDF" then
                    move record doc to pdfGroup
                    set pdfs of organizedCounts to (pdfs of organizedCounts) + 1
                else if docType contains "html" then
                    move record doc to htmlGroup  
                    set html of organizedCounts to (html of organizedCounts) + 1
                else if docType contains "txt" or docType contains "markdown" then
                    move record doc to textGroup
                    set text of organizedCounts to (text of organizedCounts) + 1
                else
                    set other of organizedCounts to (other of organizedCounts) + 1
                end if
            on error
                set other of organizedCounts to (other of organizedCounts) + 1
            end try
        end repeat
        
        set step3Result to organizedCounts
        set results of step3 to step3Result
        set status of step3 to "completed"
        set end of workflowSteps to step3
        
        -- Step 4: Create workflow summary document
        set step4 to {stepNumber:4, stepName:"Create Summary", status:"in_progress", results:{}}
        
        set summaryContent to "# Academic Research Workflow Results" & return & return
        set summaryContent to summaryContent & "**Topic:** " & topic & return
        set summaryContent to summaryContent & "**Date:** " & (current date as string) & return & return
        set summaryContent to summaryContent & "## Search Results" & return
        set summaryContent to summaryContent & "- Total documents found: " & (totalFound of step2Result) & return
        set summaryContent to summaryContent & "- Documents processed: " & (limitedTo of step2Result) & return & return
        set summaryContent to summaryContent & "## Organization" & return
        set summaryContent to summaryContent & "- PDFs: " & (pdfs of organizedCounts) & return
        set summaryContent to summaryContent & "- Web Content: " & (html of organizedCounts) & return
        set summaryContent to summaryContent & "- Text Documents: " & (text of organizedCounts) & return
        set summaryContent to summaryContent & "- Other: " & (other of organizedCounts) & return & return
        set summaryContent to summaryContent & "## Next Steps" & return
        set summaryContent to summaryContent & "1. Review organized documents" & return
        set summaryContent to summaryContent & "2. Synthesize key findings" & return
        set summaryContent to summaryContent & "3. Create literature review" & return
        
        set summaryDoc to create record with {type:markdown, name:("Academic_Research_Summary_" & topic), source:summaryContent} in researchGroup
        
        set step4Result to {summaryUUID:(uuid of summaryDoc), summaryName:(name of summaryDoc)}
        set results of step4 to step4Result
        set status of step4 to "completed"
        set end of workflowSteps to step4
        
    on error errMsg
        -- Add error step
        set errorStep to {stepNumber:(count of workflowSteps) + 1, stepName:"Error", status:"failed", error:errMsg}
        set end of workflowSteps to errorStep
    end try
    
    return workflowSteps
end executeAcademicResearchWorkflow

-- Execute Literature Review Workflow
on executeLiteratureReviewWorkflow(topic, targetGroup, maxResults, timeRange, currentDb)
    set workflowSteps to {}
    set maxResultsInt to maxResults as integer
    
    try
        -- Step 1: Time-based search
        set step1 to {stepNumber:1, stepName:"Time-based Search", status:"completed", results:{}}
        
        set searchQuery to topic
        if timeRange is "year" then
            set currentYear to year of (current date)
            set searchQuery to topic & " AND created:>=" & (currentYear - 1) & "-01-01"
        else if timeRange is "month" then
            set searchQuery to topic & " AND created:>=30"
        end if
        
        set searchResults to search searchQuery in currentDb
        set step1Result to {query:searchQuery, totalFound:(count of searchResults)}
        set results of step1 to step1Result
        set end of workflowSteps to step1
        
        -- Step 2: Create chronological analysis
        set step2 to {stepNumber:2, stepName:"Chronological Analysis", status:"completed", results:{}}
        
        set yearCounts to {}
        repeat with doc in searchResults
            try
                set docYear to year of (creation date of doc)
                set yearFound to false
                repeat with yearCount in yearCounts
                    if year of yearCount is docYear then
                        set count of yearCount to (count of yearCount) + 1
                        set yearFound to true
                        exit repeat
                    end if
                end repeat
                if not yearFound then
                    set end of yearCounts to {year:docYear, count:1}
                end if
            on error
                -- Skip documents with invalid dates
            end try
        end repeat
        
        set step2Result to {analysis:yearCounts, totalAnalyzed:(count of searchResults)}
        set results of step2 to step2Result
        set end of workflowSteps to step2
        
    on error errMsg
        set errorStep to {stepNumber:(count of workflowSteps) + 1, stepName:"Error", status:"failed", error:errMsg}
        set end of workflowSteps to errorStep
    end try
    
    return workflowSteps
end executeLiteratureReviewWorkflow

-- Execute Data Collection Workflow
on executeDataCollectionWorkflow(topic, targetGroup, maxResults, currentDb)
    set workflowSteps to {}
    
    try
        -- Step 1: Multi-source search
        set step1 to {stepNumber:1, stepName:"Multi-source Search", status:"completed", results:{}}
        
        set searchResults to search topic in currentDb
        set taggedResults to search ("tag:" & topic) in currentDb
        set commentResults to search ("comment:" & topic) in currentDb
        
        set allResults to searchResults & taggedResults & commentResults
        set uniqueResults to my removeDuplicates(allResults)
        
        set step1Result to {contentSearch:(count of searchResults), tagSearch:(count of taggedResults), commentSearch:(count of commentResults), uniqueTotal:(count of uniqueResults)}
        set results of step1 to step1Result
        set end of workflowSteps to step1
        
        -- Step 2: Data categorization
        set step2 to {stepNumber:2, stepName:"Data Categorization", status:"completed", results:{}}
        
        set categories to {primarySources:0, secondarySources:0, webContent:0, personalNotes:0}
        
        repeat with doc in uniqueResults
            try
                set docTags to tags of doc
                set docType to type of doc as string
                
                if "primary" is in docTags or docType contains "PDF" then
                    set primarySources of categories to (primarySources of categories) + 1
                else if "secondary" is in docTags or docType contains "html" then
                    set secondarySources of categories to (secondarySources of categories) + 1
                else if docType contains "html" or docType contains "webarchive" then
                    set webContent of categories to (webContent of categories) + 1
                else
                    set personalNotes of categories to (personalNotes of categories) + 1
                end if
            on error
                set personalNotes of categories to (personalNotes of categories) + 1
            end try
        end repeat
        
        set step2Result to categories
        set results of step2 to step2Result
        set end of workflowSteps to step2
        
    on error errMsg
        set errorStep to {stepNumber:(count of workflowSteps) + 1, stepName:"Error", status:"failed", error:errMsg}
        set end of workflowSteps to errorStep
    end try
    
    return workflowSteps
end executeDataCollectionWorkflow

-- Remove duplicates from list
on removeDuplicates(listToProcess)
    set uniqueList to {}
    repeat with item in listToProcess
        try
            set itemUUID to uuid of item
            set alreadyExists to false
            repeat with existingItem in uniqueList
                if uuid of existingItem is itemUUID then
                    set alreadyExists to true
                    exit repeat
                end if
            end repeat
            if not alreadyExists then
                set end of uniqueList to item
            end if
        on error
            -- Skip items without UUID
        end try
    end repeat
    return uniqueList
end removeDuplicates

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

-- Format workflow results as JSON
on formatWorkflowResults(templateId, workflowSteps, topic)
    set resultJson to "{"
    set resultJson to resultJson & "\"success\": true, "
    set resultJson to resultJson & "\"workflowId\": \"" & templateId & "\", "
    set resultJson to resultJson & "\"topic\": \"" & my escapeJsonString(topic) & "\", "
    set resultJson to resultJson & "\"executedAt\": \"" & (current date as string) & "\", "
    
    set resultJson to resultJson & "\"steps\": ["
    set stepCount to count of workflowSteps
    repeat with i from 1 to stepCount
        set workflowStep to item i of workflowSteps
        set resultJson to resultJson & "{"
        set resultJson to resultJson & "\"stepNumber\": " & (stepNumber of workflowStep) & ", "
        set resultJson to resultJson & "\"stepName\": \"" & my escapeJsonString(stepName of workflowStep) & "\", "
        set resultJson to resultJson & "\"status\": \"" & (status of workflowStep) & "\""
        
        if error of workflowStep exists then
            set resultJson to resultJson & ", \"error\": \"" & my escapeJsonString(error of workflowStep) & "\""
        end if
        
        if results of workflowStep exists then
            set resultJson to resultJson & ", \"results\": " & my formatStepResults(results of workflowStep)
        end if
        
        set resultJson to resultJson & "}"
        if i < stepCount then set resultJson to resultJson & ", "
    end repeat
    set resultJson to resultJson & "], "
    
    set resultJson to resultJson & "\"summary\": {"
    set completedSteps to 0
    set failedSteps to 0
    repeat with workflowStep in workflowSteps
        if status of workflowStep is "completed" then
            set completedSteps to completedSteps + 1
        else if status of workflowStep is "failed" then
            set failedSteps to failedSteps + 1
        end if
    end repeat
    
    set resultJson to resultJson & "\"totalSteps\": " & stepCount & ", "
    set resultJson to resultJson & "\"completedSteps\": " & completedSteps & ", "
    set resultJson to resultJson & "\"failedSteps\": " & failedSteps & ", "
    set resultJson to resultJson & "\"successRate\": " & (completedSteps / stepCount * 100)
    set resultJson to resultJson & "}}"
    
    return resultJson
end formatWorkflowResults

-- Format step results (simplified)
on formatStepResults(stepResults)
    try
        -- Convert AppleScript record to JSON string (simplified)
        return "\"" & (stepResults as string) & "\""
    on error
        return "\"results processed\""
    end try
end formatStepResults

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