-- Minimal DEVONthink Create Document
-- Usage: osascript create.applescript "name" "content" "type" "database" "groupPath"

on run argv
	set docName to item 1 of argv
	set docContent to item 2 of argv
	set docType to "markdown"
	set targetDatabase to ""
	set targetGroup to ""
	
	if (count of argv) > 2 then
		set docType to item 3 of argv
	end if
	
	if (count of argv) > 3 then
		set targetDatabase to item 4 of argv
	end if
	
	if (count of argv) > 4 then
		set targetGroup to item 5 of argv
	end if
	
	tell application id "DNtp"
		try
			set newRecord to missing value
			
			-- Determine where to create the document
			if targetDatabase is not "" then
				set db to database targetDatabase
				if targetGroup is not "" then
					set groupRecord to create location targetGroup in db
					set newRecord to my createDocument(docName, docContent, docType, groupRecord)
				else
					set newRecord to my createDocument(docName, docContent, docType, db)
				end if
			else
				-- Create in global inbox
				set inboxGroup to incoming group of current database
				set newRecord to my createDocument(docName, docContent, docType, inboxGroup)
			end if
			
			-- Return created document info as JSON
			set docJSON to "{"
			set docJSON to docJSON & "\"uuid\":\"" & (uuid of newRecord) & "\","
			set docJSON to docJSON & "\"name\":\"" & my escapeString(name of newRecord) & "\","
			set docJSON to docJSON & "\"type\":\"" & (type of newRecord as string) & "\","
			set docJSON to docJSON & "\"path\":\"" & my escapeString(path of newRecord) & "\","
			set docJSON to docJSON & "\"created\":\"" & my escapeString(creation date of newRecord as string) & "\""
			set docJSON to docJSON & "}"
			
			return docJSON
			
		on error errMsg
			return "{\"error\":\"Create failed: " & my escapeString(errMsg) & "\"}"
		end try
	end tell
end run

on createDocument(docName, docContent, docType, targetLocation)
	tell application id "DNtp"
		if docType is "markdown" then
			return create record with {name:docName, type:markdown, plain text:docContent} in targetLocation
		else if docType is "txt" then
			return create record with {name:docName, type:txt, plain text:docContent} in targetLocation
		else if docType is "rtf" then
			return create record with {name:docName, type:rtf, plain text:docContent} in targetLocation
		else
			-- Default to markdown
			return create record with {name:docName, type:markdown, plain text:docContent} in targetLocation
		end if
	end tell
end createDocument

on escapeString(str)
	set str to my replaceText(str, "\\", "\\\\")
	set str to my replaceText(str, "\"", "\\\"")
	set str to my replaceText(str, return, "\\n")
	set str to my replaceText(str, tab, "\\t")
	return str
end escapeString

on replaceText(theText, findStr, replaceStr)
	set AppleScript's text item delimiters to findStr
	set textItems to text items of theText
	set AppleScript's text item delimiters to replaceStr
	set theText to textItems as text
	set AppleScript's text item delimiters to ""
	return theText
end replaceText
