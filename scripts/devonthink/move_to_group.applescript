#!/usr/bin/osascript

(*
Move to Group Tool for DEVONthink MCP Server
Moves documents to target groups with batch support
*)

on run argv
	if (count of argv) < 1 then
		return "{\"error\": \"Parameters required\"}"
	end if
	
	-- Parse parameters JSON
	set paramsJson to item 1 of argv
	
	try
		-- Extract parameters from JSON
		set documentUuids to extractJsonArray(paramsJson, "documentUuids")
		set targetGroup to extractJsonValue(paramsJson, "targetGroup")
		set databaseName to extractJsonValue(paramsJson, "database")
		
		-- Validate parameters
		if documentUuids is {} then
			return "{\"error\": \"Document UUIDs are required\", \"code\": \"MISSING_UUIDS\"}"
		end if
		
		if targetGroup is "" then
			return "{\"error\": \"Target group is required\", \"code\": \"MISSING_TARGET\"}"
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
			
			-- Find or create target group
			set targetLocation to findOrCreateGroup(targetDb, targetGroup)
			if targetLocation is missing value then
				return "{\"error\": \"Failed to find or create target group: " & targetGroup & "\", \"code\": \"TARGET_GROUP_ERROR\"}"
			end if
			
			-- Move documents
			set movedCount to 0
			set failedUuids to {}
			
			repeat with docUuid in documentUuids
				try
					-- Find document by UUID
					set docRecord to getDocumentByUuid(docUuid)
					if docRecord is not missing value then
						-- Move document to target group
						set location of docRecord to targetLocation
						set movedCount to movedCount + 1
					else
						set end of failedUuids to docUuid
					end if
				on error errMsg
					-- Document not found or move failed
					set end of failedUuids to docUuid
					log "Failed to move document " & docUuid & ": " & errMsg
				end try
			end repeat
			
			-- Build result
			set resultJson to buildMoveResult(movedCount, failedUuids, targetGroup)
			return resultJson
		end tell
		
	on error errMsg number errNum
		set cleanErrMsg to my cleanErrorMessage(errMsg)
		return "{\"error\": \"" & cleanErrMsg & "\", \"code\": \"APPLESCRIPT_ERROR\", \"number\": " & errNum & "}"
	end try
end run

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

-- Find or create target group
on findOrCreateGroup(targetDb, groupPath)
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
						try
							set newGroup to create record with {type:group, name:componentName} in currentGroup
							set currentGroup to newGroup
						on error createErr
							log "Failed to create group " & componentName & ": " & createErr
							return missing value
						end try
					end try
				end if
			end repeat
			
			return currentGroup
			
		on error errMsg
			log "Error finding/creating group path: " & errMsg
			return missing value
		end try
	end tell
end findOrCreateGroup

-- Get document by UUID
on getDocumentByUuid(uuid)
	tell application id "DNtp"
		try
			-- Search for document with this UUID across all databases
			set searchResults to search "uuid:" & uuid
			if (count of searchResults) > 0 then
				return item 1 of searchResults
			else
				return missing value
			end if
		on error
			return missing value
		end try
	end tell
end getDocumentByUuid

-- Build move operation result
on buildMoveResult(movedCount, failedUuids, targetGroup)
	set resultJson to "{\"success\": true"
	set resultJson to resultJson & ", \"movedDocuments\": " & movedCount
	set resultJson to resultJson & ", \"targetGroup\": \"" & my escapeJsonString(targetGroup) & "\""
	
	-- Add failed UUIDs if any
	if (count of failedUuids) > 0 then
		set resultJson to resultJson & ", \"failed\": " & my listToJsonArray(failedUuids)
		set resultJson to resultJson & ", \"failedCount\": " & (count of failedUuids)
	end if
	
	set resultJson to resultJson & "}"
	return resultJson
end buildMoveResult

-- Extract JSON array (simplified parsing)
on extractJsonArray(jsonString, keyName)
	try
		set searchKey to "\"" & keyName & "\":["
		set startPos to (offset of searchKey in jsonString)
		if startPos > 0 then
			set startPos to startPos + (length of searchKey)
			set remainingString to text startPos thru -1 of jsonString
			set endPos to (offset of "]" in remainingString)
			if endPos > 1 then
				set arrayContent to text 1 thru (endPos - 1) of remainingString
				return parseJsonArray(arrayContent)
			end if
		end if
	end try
	return {}
end extractJsonArray

-- Parse JSON array content into AppleScript list
on parseJsonArray(arrayContent)
	-- Handle both string and array formats
	if arrayContent contains "," then
		-- Multiple items
		set itemList to my splitString(arrayContent, ",")
	else
		-- Single item
		set itemList to {arrayContent}
	end if
	
	set parsedItems to {}
	repeat with item in itemList
		set cleanItem to my trimString(item as string)
		-- Remove quotes if present
		if cleanItem starts with "\"" and cleanItem ends with "\"" then
			set cleanItem to text 2 thru -2 of cleanItem
		end if
		if cleanItem is not "" then
			set end of parsedItems to cleanItem
		end if
	end repeat
	
	return parsedItems
end parseJsonArray

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

-- Convert list to JSON array
on listToJsonArray(itemList)
	set jsonArray to "["
	set firstItem to true
	repeat with item in itemList
		if not firstItem then
			set jsonArray to jsonArray & ", "
		end if
		set jsonArray to jsonArray & "\"" & my escapeJsonString(item as string) & "\""
		set firstItem to false
	end repeat
	set jsonArray to jsonArray & "]"
	return jsonArray
end listToJsonArray

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