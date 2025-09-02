#!/usr/bin/osascript

(*
Create Group Tool for DEVONthink MCP Server - Fixed Version
Creates basic groups without complex parameter parsing
*)

on run argv
	if (count of argv) < 1 then
		return "{\"error\": \"Group name parameter required\"}"
	end if
	
	-- Parse basic parameters
	set groupName to item 1 of argv
	
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
			-- Use current database
			set targetDb to current database
			
			-- Check if group already exists (basic check)
			try
				set existingGroup to first record of targetDb whose name is groupName and type is group
				return "{\"error\": \"Group already exists: " & groupName & "\", \"code\": \"GROUP_EXISTS\"}"
			on error
				-- Group doesn't exist, we can create it
			end try
			
			-- Create the group
			set newGroup to create record with {type:group, name:groupName} in targetDb
			if newGroup is missing value then
				return "{\"error\": \"Failed to create group: " & groupName & "\", \"code\": \"CREATION_FAILED\"}"
			end if
			
			-- Build success result
			set groupUUID to uuid of newGroup
			set groupName2 to name of newGroup
			set groupPath to location of newGroup
			
			set resultJson to "{\"success\": true"
			set resultJson to resultJson & ", \"uuid\": \"" & groupUUID & "\""
			set resultJson to resultJson & ", \"name\": \"" & my escapeJsonString(groupName2) & "\""
			set resultJson to resultJson & ", \"path\": \"" & my escapeJsonString(groupPath) & "\""
			set resultJson to resultJson & ", \"type\": \"group\""
			set resultJson to resultJson & "}"
			
			return resultJson
		end tell
		
	on error errMsg number errNum
		return "{\"error\": \"AppleScript Error: " & errMsg & "\", \"code\": \"APPLESCRIPT_ERROR\", \"number\": " & errNum & "}"
	end try
end run

-- JSON string escaping (simplified)
on escapeJsonString(str)
	if str is missing value or str is "" then
		return ""
	end if
	
	-- Simple escaping - just handle quotes and backslashes
	set str to str as string
	set str to my replaceString(str, "\\", "\\\\")
	set str to my replaceString(str, "\"", "\\\"")
	return str
end escapeJsonString

-- Simple string replacement
on replaceString(str, searchStr, replaceStr)
	try
		set AppleScript's text item delimiters to searchStr
		set stringParts to text items of str
		set AppleScript's text item delimiters to replaceStr
		set newString to stringParts as string
		set AppleScript's text item delimiters to ""
		return newString
	on error
		set AppleScript's text item delimiters to ""
		return str
	end try
end replaceString