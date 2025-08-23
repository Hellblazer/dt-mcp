#!/usr/bin/osascript

(*
Download Paper Tool for DEVONthink MCP Server
Downloads academic papers from various sources with metadata extraction
*)

on run argv
	if (count of argv) < 1 then
		return "{\"error\": \"Source parameter required\"}"
	end if
	
	-- Parse parameters
	set sourceType to item 1 of argv
	set identifier to ""
	set targetGroup to ""
	set extractMetadata to false
	set tagsString to ""
	set databaseName to ""
	
	-- Parse additional parameters if provided
	if (count of argv) > 1 then
		try
			set paramsJson to item 2 of argv
			if paramsJson contains "\"identifier\":" then
				set identifier to extractJsonValue(paramsJson, "identifier")
			end if
			if paramsJson contains "\"targetGroup\":" then
				set targetGroup to extractJsonValue(paramsJson, "targetGroup")
			end if
			if paramsJson contains "\"extractMetadata\":true" then
				set extractMetadata to true
			end if
			if paramsJson contains "\"tags\":" then
				set tagsString to extractJsonValue(paramsJson, "tags")
			end if
			if paramsJson contains "\"database\":" then
				set databaseName to extractJsonValue(paramsJson, "database")
			end if
		end try
	end if
	
	try
		-- Validate parameters
		if sourceType is "" or identifier is "" then
			return "{\"error\": \"Source type and identifier are required\", \"code\": \"MISSING_PARAMETERS\"}"
		end if
		
		-- Validate source type
		set validSources to {"arxiv", "doi", "pubmed"}
		set isValidSource to false
		repeat with validSource in validSources
			if sourceType is validSource then
				set isValidSource to true
				exit repeat
			end if
		end repeat
		
		if not isValidSource then
			return "{\"error\": \"Invalid source type: " & sourceType & ". Valid sources: arxiv, doi, pubmed\", \"code\": \"INVALID_SOURCE\"}"
		end if
		
		-- Validate identifier format
		set validationResult to validateIdentifier(sourceType, identifier)
		if validationResult is not "valid" then
			return "{\"error\": \"" & validationResult & "\", \"code\": \"INVALID_IDENTIFIER\"}"
		end if
		
		-- Check DEVONthink availability
		tell application "System Events"
			if not (exists process "DEVONthink") then
				return "{\"error\": \"DEVONthink is not running\", \"code\": \"DEVONTHINK_NOT_RUNNING\"}"
			end if
		end tell
		
		tell application id "DNtp"
			-- Get target database
			set targetDb to getTargetDatabase(databaseName)
			if targetDb is missing value then
				return "{\"error\": \"Target database not found\", \"code\": \"DATABASE_NOT_FOUND\"}"
			end if
			
			-- Get or create target group
			set targetLocation to targetDb
			if targetGroup is not "" then
				set targetLocation to getOrCreateGroup(targetDb, targetGroup)
				if targetLocation is missing value then
					return "{\"error\": \"Failed to create target group: " & targetGroup & "\", \"code\": \"GROUP_CREATION_FAILED\"}"
				end if
			end if
			
			-- Build download URL based on source
			set downloadUrl to buildDownloadUrl(sourceType, identifier)
			if downloadUrl is "" then
				return "{\"error\": \"Failed to build download URL for " & sourceType & ":" & identifier & "\", \"code\": \"URL_BUILD_FAILED\"}"
			end if
			
			-- Download and import the paper
			set importedRecord to import URL downloadUrl to targetLocation
			if importedRecord is missing value then
				return "{\"error\": \"Failed to download paper from " & downloadUrl & "\", \"code\": \"DOWNLOAD_FAILED\"}"
			end if
			
			-- Set tags if provided
			if tagsString is not "" then
				try
					set paperTags to parseTagsString(tagsString)
					-- Add source-specific tags
					set end of paperTags to sourceType
					set end of paperTags to "downloaded"
					set tags of importedRecord to paperTags
				end try
			else
				-- Set default tags
				set tags of importedRecord to {sourceType, "downloaded", "academic-paper"}
			end if
			
			-- Extract metadata if requested
			set metadataObj to ""
			if extractMetadata then
				set metadataObj to extractPaperMetadata(importedRecord, sourceType, identifier)
			end if
			
			-- Build result
			set resultJson to buildDownloadResult(importedRecord, metadataObj, extractMetadata, sourceType, identifier)
			
			return resultJson
		end tell
		
	on error errMsg number errNum
		set cleanErrMsg to my cleanErrorMessage(errMsg)
		return "{\"error\": \"" & cleanErrMsg & "\", \"code\": \"APPLESCRIPT_ERROR\", \"number\": " & errNum & "}"
	end try
end run

-- Validate identifier format based on source
on validateIdentifier(sourceType, identifier)
	if sourceType is "arxiv" then
		-- arXiv format: YYMM.NNNNN or YYMM.NNNNNvN
		if not (identifier contains ".") then
			return "arXiv identifier must contain a dot (format: YYMM.NNNNN)"
		end if
		-- Basic format check
		if length of identifier < 9 then
			return "arXiv identifier too short (format: YYMM.NNNNN)"
		end if
	else if sourceType is "doi" then
		-- DOI format: 10.xxxx/yyyy
		if not (identifier starts with "10.") then
			return "DOI must start with '10.' (format: 10.xxxx/yyyy)"
		end if
		if not (identifier contains "/") then
			return "DOI must contain a slash (format: 10.xxxx/yyyy)"
		end if
	else if sourceType is "pubmed" then
		-- PubMed ID: numeric
		try
			set pmid to identifier as number
			if pmid < 1 then
				return "PubMed ID must be a positive number"
			end if
		on error
			return "PubMed ID must be numeric"
		end try
	end if
	
	return "valid"
end validateIdentifier

-- Build download URL based on source and identifier
on buildDownloadUrl(sourceType, identifier)
	if sourceType is "arxiv" then
		return "https://arxiv.org/pdf/" & identifier & ".pdf"
	else if sourceType is "doi" then
		-- For DOI, we'd typically need to resolve it first
		-- This is a simplified implementation
		return "https://doi.org/" & identifier
	else if sourceType is "pubmed" then
		-- PubMed doesn't directly provide PDFs, but we can try PMC
		return "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC" & identifier & "/pdf/"
	end if
	
	return ""
end buildDownloadUrl

-- Get target database
on getTargetDatabase(databaseName)
	tell application id "DNtp"
		if databaseName is "" then
			return current database
		else
			try
				return database databaseName
			on error
				return missing value
			end try
		end if
	end tell
end getTargetDatabase

-- Get or create group hierarchy
on getOrCreateGroup(targetDb, groupPath)
	tell application id "DNtp"
		try
			-- Remove leading slash if present
			if groupPath starts with "/" then
				set groupPath to text 2 thru -1 of groupPath
			end if
			
			-- Split path into components
			set pathComponents to my splitString(groupPath, "/")
			set currentGroup to targetDb
			
			-- Navigate/create each level
			repeat with componentName in pathComponents
				set componentName to componentName as string
				if componentName is not "" then
					try
						-- Try to find existing group
						set foundGroup to first record of currentGroup whose name is componentName and type is group
						set currentGroup to foundGroup
					on error
						-- Create new group if not found
						set newGroup to create record with {type:group, name:componentName} in currentGroup
						set currentGroup to newGroup
					end try
				end if
			end repeat
			
			return currentGroup
			
		on error errMsg
			log "Error creating group path: " & errMsg
			return missing value
		end try
	end tell
end getOrCreateGroup

-- Extract paper metadata with source-specific handling
on extractPaperMetadata(docRecord, sourceType, identifier)
	tell application id "DNtp"
		try
			set docName to name of docRecord
			set docURL to URL of docRecord
			set docType to type of docRecord
			set docSize to size of docRecord
			set docDate to date added of docRecord
			set docTags to tags of docRecord
			
			-- Build metadata JSON with source-specific information
			set metadataJson to "{\"name\": \"" & my escapeJsonString(docName) & "\""
			set metadataJson to metadataJson & ", \"url\": \"" & my escapeJsonString(docURL) & "\""
			set metadataJson to metadataJson & ", \"type\": \"" & docType & "\""
			set metadataJson to metadataJson & ", \"size\": " & docSize
			set metadataJson to metadataJson & ", \"dateAdded\": \"" & docDate & "\""
			set metadataJson to metadataJson & ", \"tags\": " & my tagsToJsonArray(docTags)
			set metadataJson to metadataJson & ", \"source\": \"" & sourceType & "\""
			set metadataJson to metadataJson & ", \"identifier\": \"" & my escapeJsonString(identifier) & "\""
			
			-- Add source-specific metadata
			if sourceType is "arxiv" then
				set metadataJson to metadataJson & ", \"arxivId\": \"" & my escapeJsonString(identifier) & "\""
				set metadataJson to metadataJson & ", \"repository\": \"arXiv\""
			else if sourceType is "doi" then
				set metadataJson to metadataJson & ", \"doi\": \"" & my escapeJsonString(identifier) & "\""
				set metadataJson to metadataJson & ", \"repository\": \"DOI System\""
			else if sourceType is "pubmed" then
				set metadataJson to metadataJson & ", \"pmid\": \"" & my escapeJsonString(identifier) & "\""
				set metadataJson to metadataJson & ", \"repository\": \"PubMed\""
			end if
			
			set metadataJson to metadataJson & "}"
			
			return metadataJson
			
		on error errMsg
			log "Error extracting paper metadata: " & errMsg
			return "{\"error\": \"Failed to extract metadata\"}"
		end try
	end tell
end extractPaperMetadata

-- Parse tags string (simplified JSON array parsing)
on parseTagsString(tagsString)
	-- Remove brackets and quotes, split by comma
	set cleanTags to tagsString
	if cleanTags starts with "[" then
		set cleanTags to text 2 thru -2 of cleanTags
	end if
	
	set tagsList to my splitString(cleanTags, ",")
	set parsedTags to {}
	
	repeat with tagItem in tagsList
		set cleanTag to my trimString(tagItem as string)
		if cleanTag starts with "\"" and cleanTag ends with "\"" then
			set cleanTag to text 2 thru -2 of cleanTag
		end if
		if cleanTag is not "" then
			set end of parsedTags to cleanTag
		end if
	end repeat
	
	return parsedTags
end parseTagsString

-- Build download result JSON
on buildDownloadResult(docRecord, metadataObj, includeMetadata, sourceType, identifier)
	tell application id "DNtp"
		set docUUID to uuid of docRecord
		set docName to name of docRecord
		set docPath to location of docRecord
		
		set resultJson to "{\"success\": true"
		set resultJson to resultJson & ", \"uuid\": \"" & docUUID & "\""
		set resultJson to resultJson & ", \"name\": \"" & my escapeJsonString(docName) & "\""
		set resultJson to resultJson & ", \"path\": \"" & my escapeJsonString(docPath) & "\""
		set resultJson to resultJson & ", \"source\": \"" & sourceType & "\""
		set resultJson to resultJson & ", \"identifier\": \"" & my escapeJsonString(identifier) & "\""
		
		if includeMetadata and metadataObj is not "" then
			set resultJson to resultJson & ", \"metadata\": " & metadataObj
		end if
		
		set resultJson to resultJson & "}"
		
		return resultJson
	end tell
end buildDownloadResult

-- Utility function to extract JSON value (simplified)
on extractJsonValue(jsonString, keyName)
	try
		set searchKey to "\"" & keyName & "\":\""
		set startPos to (offset of searchKey in jsonString)
		if startPos > 0 then
			set startPos to startPos + (length of searchKey)
			set remainingString to text startPos thru -1 of jsonString
			set endPos to (offset of "\"" in remainingString)
			if endPos > 1 then
				return text 1 thru (endPos - 1) of remainingString
			end if
		end if
	end try
	return ""
end extractJsonValue

-- Clean error messages
on cleanErrorMessage(errMsg)
	-- Remove problematic characters and truncate if too long
	set cleanMsg to errMsg
	if length of cleanMsg > 200 then
		set cleanMsg to (text 1 thru 200 of cleanMsg) & "..."
	end if
	-- Escape quotes and backslashes for JSON
	return my escapeJsonString(cleanMsg)
end cleanErrorMessage

-- JSON string escaping
on escapeJsonString(str)
	set str to my replaceString(str, "\\", "\\\\")
	set str to my replaceString(str, "\"", "\\\"")
	set str to my replaceString(str, return, "\\n")
	set str to my replaceString(str, "\r", "\\r")
	set str to my replaceString(str, "\t", "\\t")
	return str
end escapeJsonString

-- Convert tags to JSON array
on tagsToJsonArray(tagsList)
	set jsonArray to "["
	set firstItem to true
	repeat with tagItem in tagsList
		if not firstItem then
			set jsonArray to jsonArray & ", "
		end if
		set jsonArray to jsonArray & "\"" & my escapeJsonString(tagItem as string) & "\""
		set firstItem to false
	end repeat
	set jsonArray to jsonArray & "]"
	return jsonArray
end tagsToJsonArray

-- String manipulation utilities
on splitString(str, delimiter)
	set AppleScript's text item delimiters to delimiter
	set stringList to text items of str
	set AppleScript's text item delimiters to ""
	return stringList
end splitString

on replaceString(str, searchStr, replaceStr)
	set AppleScript's text item delimiters to searchStr
	set stringParts to text items of str
	set AppleScript's text item delimiters to replaceStr
	set newString to stringParts as string
	set AppleScript's text item delimiters to ""
	return newString
end replaceString

on trimString(str)
	-- Remove leading and trailing whitespace
	repeat while str starts with " " or str starts with "\t"
		if length of str > 1 then
			set str to text 2 thru -1 of str
		else
			return ""
		end if
	end repeat
	
	repeat while str ends with " " or str ends with "\t"
		if length of str > 1 then
			set str to text 1 thru -2 of str
		else
			return ""
		end if
	end repeat
	
	return str
end trimString