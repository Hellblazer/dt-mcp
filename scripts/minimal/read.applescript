-- Minimal DEVONthink Read Document
-- Usage: osascript read.applescript "uuid" "includeContent"

on run argv
	set docUUID to item 1 of argv
	set includeContent to true
	
	if (count of argv) > 1 then
		set includeContent to (item 2 of argv) is "true"
	end if
	
	tell application id "DNtp"
		try
			set docRecord to get record with uuid docUUID
			
			if docRecord is missing value then
				return "{\"error\":\"Document not found: " & docUUID & "\"}"
			end if
			
			-- Build JSON
			set docJSON to "{"
			set docJSON to docJSON & "\"uuid\":\"" & (uuid of docRecord) & "\","
			set docJSON to docJSON & "\"name\":\"" & my escapeString(name of docRecord) & "\","
			set docJSON to docJSON & "\"type\":\"" & (type of docRecord as string) & "\","
			set docJSON to docJSON & "\"path\":\"" & my escapeString(path of docRecord) & "\","
			set docJSON to docJSON & "\"tags\":" & my tagsToJSON(tags of docRecord) & ","
			set docJSON to docJSON & "\"created\":\"" & my escapeString(creation date of docRecord as string) & "\","
			set docJSON to docJSON & "\"modified\":\"" & my escapeString(modification date of docRecord as string) & "\","
			set docJSON to docJSON & "\"wordCount\":" & (word count of docRecord) & ","
			set docJSON to docJSON & "\"size\":" & (size of docRecord) & ""
			
			-- Optionally include content
			if includeContent then
				try
					set docContent to plain text of docRecord
					set docJSON to docJSON & ",\"content\":\"" & my escapeString(docContent) & "\""
				on error
					set docJSON to docJSON & ",\"content\":\"(content not available)\""
				end try
			end if
			
			set docJSON to docJSON & "}"
			return docJSON
			
		on error errMsg
			return "{\"error\":\"Read failed: " & my escapeString(errMsg) & "\"}"
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
