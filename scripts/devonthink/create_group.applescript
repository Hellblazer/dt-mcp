#!/usr/bin/osascript

(*
Create Group Tool for DEVONthink MCP Server
Creates hierarchical folder structures with nested support
*)

on run argv
	if (count of argv) < 1 then
		return "{\"error\": \"Group name parameter required\"}"
	end if
	
	-- Parse parameters
	set groupName to item 1 of argv
	set parentGroup to ""
	set description to ""
	set tagsString to ""
	set databaseName to ""
	
	-- Parse additional parameters if provided
	if (count of argv) > 1 then
		try
			set paramsJson to item 2 of argv
			if paramsJson contains "\"parentGroup\":" then
				set parentGroup to extractJsonValue(paramsJson, "parentGroup")
			end if
			if paramsJson contains "\"description\":" then
				set description to extractJsonValue(paramsJson, "description")
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
		-- Validate group name
		if groupName is "" or groupName is missing value then
			return "{\"error\": \"Group name cannot be empty\", \"code\": \"INVALID_NAME\"}"
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
			
			-- Get parent group or use database root
			set parentLocation to targetDb
			if parentGroup is not "" then
				set parentLocation to getOrCreateGroup(targetDb, parentGroup)
				if parentLocation is missing value then
					return "{\"error\": \"Failed to find or create parent group: " & parentGroup & "\", \"code\": \"PARENT_GROUP_ERROR\"}"
				end if
			end if
			
			-- Check if group already exists
			try
				set existingGroup to first record of parentLocation whose name is groupName and type is group
				return "{\"error\": \"Group already exists: " & groupName & "\", \"code\": \"GROUP_EXISTS\"}"
			on error
				-- Group doesn't exist, we can create it
			end try
			
			-- Create the group
			set newGroup to create record with {type:group, name:groupName} in parentLocation
			if newGroup is missing value then
				return "{\"error\": \"Failed to create group: " & groupName & "\", \"code\": \"CREATION_FAILED\"}"
			end if
			
			-- Set description if provided
			if description is not "" then
				try
					set comment of newGroup to description
				end try
			end if
			
			-- Set tags if provided
			if tagsString is not "" then
				try
					set tags of newGroup to parseTagsString(tagsString)
				end try
			end if
			
			-- Build success result
			set resultJson to buildSuccessResult(newGroup)
			
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
			
			-- Navigate to each level (don't create - this is for finding parent)
			repeat with componentName in pathComponents
				set componentName to componentName as string
				if componentName is not "" then
					try
						-- Try to find existing group
						set foundGroup to first record of currentGroup whose name is componentName and type is group
						set currentGroup to foundGroup
					on error
						-- Parent group doesn't exist
						return missing value
					end try
				end if
			end repeat
			
			return currentGroup
			
		on error errMsg
			log "Error finding group path: " & errMsg
			return missing value
		end try
	end tell
end getOrCreateGroup

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

-- Build success result JSON
on buildSuccessResult(groupRecord)
	tell application id "DNtp"
		set groupUUID to uuid of groupRecord
		set groupName to name of groupRecord
		set groupPath to location of groupRecord
		
		set resultJson to "{\"success\": true"
		set resultJson to resultJson & ", \"uuid\": \"" & groupUUID & "\""
		set resultJson to resultJson & ", \"name\": \"" & my escapeJsonString(groupName) & "\""
		set resultJson to resultJson & ", \"path\": \"" & my escapeJsonString(groupPath) & "\""
		set resultJson to resultJson & ", \"type\": \"group\""
		set resultJson to resultJson & "}"
		
		return resultJson
	end tell
end buildSuccessResult

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