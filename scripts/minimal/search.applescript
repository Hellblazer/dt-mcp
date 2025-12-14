-- Minimal DEVONthink Search
-- Usage: osascript search.applescript "query" "database" "limit"

on run argv
	set searchQuery to item 1 of argv
	set targetDatabase to ""
	set resultLimit to 20
	
	if (count of argv) > 1 then
		set targetDatabase to item 2 of argv
	end if
	
	if (count of argv) > 2 then
		set resultLimit to item 3 of argv as integer
	end if
	
	tell application id "DNtp"
		try
			-- Search in specific database or all databases
			if targetDatabase is not "" then
				set databaseRecord to database targetDatabase
				set searchResults to search searchQuery in databaseRecord
			else
				set searchResults to search searchQuery
			end if
			
			-- Limit results
			if (count of searchResults) > resultLimit then
				set searchResults to items 1 thru resultLimit of searchResults
			end if
			
			-- Build JSON array
			set resultList to {}
			repeat with docRecord in searchResults
				set docJSON to "{"
				set docJSON to docJSON & "\"uuid\":\"" & (uuid of docRecord) & "\","
				set docJSON to docJSON & "\"name\":\"" & my escapeString(name of docRecord) & "\","
				set docJSON to docJSON & "\"type\":\"" & (type of docRecord as string) & "\","
				set docJSON to docJSON & "\"path\":\"" & my escapeString(path of docRecord) & "\","
				set docJSON to docJSON & "\"tags\":" & my tagsToJSON(tags of docRecord) & ","
				set docJSON to docJSON & "\"created\":\"" & my escapeString(creation date of docRecord as string) & "\","
				set docJSON to docJSON & "\"modified\":\"" & my escapeString(modification date of docRecord as string) & "\","
				set docJSON to docJSON & "\"wordCount\":" & (word count of docRecord) & ""
				set docJSON to docJSON & "}"
				
				set end of resultList to docJSON
			end repeat
			
			return "[" & my joinList(resultList, ",") & "]"
			
		on error errMsg
			return "{\"error\":\"Search failed: " & my escapeString(errMsg) & "\"}"
		end try
	end tell
end run

on escapeString(str)
	set str to my replaceText(str, "\\", "\\\\")
	set str to my replaceText(str, "\"", "\\\"")
	set str to my replaceText(str, return, "\\n")
	set str to my replaceText(str, tab, "\\t")
	return str
end escapeString

on tagsToJSON(tagList)
	if (count of tagList) is 0 then return "[]"
	
	set jsonTags to {}
	repeat with tag in tagList
		set end of jsonTags to "\"" & my escapeString(tag) & "\""
	end repeat
	return "[" & my joinList(jsonTags, ",") & "]"
end tagsToJSON

on joinList(lst, delimiter)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to delimiter
	set result to lst as text
	set AppleScript's text item delimiters to oldDelimiters
	return result
end joinList

on replaceText(theText, findStr, replaceStr)
	set AppleScript's text item delimiters to findStr
	set textItems to text items of theText
	set AppleScript's text item delimiters to replaceStr
	set theText to textItems as text
	set AppleScript's text item delimiters to ""
	return theText
end replaceText
