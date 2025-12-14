-- Minimal DEVONthink Import
-- Usage: osascript import.applescript "url" "tags" "database" "groupPath"
-- Downloads file with curl and imports to DEVONthink

on run argv
	set sourceUrl to item 1 of argv
	set tagsString to ""
	set targetDatabase to ""
	set targetGroup to ""

	if (count of argv) > 1 then
		set tagsString to item 2 of argv
	end if

	if (count of argv) > 2 then
		set targetDatabase to item 3 of argv
	end if

	if (count of argv) > 3 then
		set targetGroup to item 4 of argv
	end if

	-- Validate URL
	if sourceUrl is "" then
		return "{\"error\":\"URL is required\"}"
	end if

	try
		-- Create temp directory
		set tempDir to (do shell script "mktemp -d")

		-- Extract filename from URL or generate one
		set fileName to my getFilenameFromUrl(sourceUrl)
		set tempFile to tempDir & "/" & fileName

		-- Download with curl
		set curlCmd to "curl -L -o " & quoted form of tempFile & " " & quoted form of sourceUrl & " 2>&1"
		try
			do shell script curlCmd
		on error errMsg
			do shell script "rm -rf " & quoted form of tempDir
			return "{\"error\":\"Download failed: " & my escapeString(errMsg) & "\"}"
		end try

		-- Check if file was downloaded
		try
			do shell script "test -f " & quoted form of tempFile
		on error
			do shell script "rm -rf " & quoted form of tempDir
			return "{\"error\":\"Downloaded file not found\"}"
		end try

		-- Parse tags BEFORE entering DEVONthink tell block (inline to avoid scoping issues)

		set tagList to {}
		if tagsString is not "" then
			set oldDelims to AppleScript's text item delimiters
			set AppleScript's text item delimiters to ","
			set newTags to text items of tagsString
			set AppleScript's text item delimiters to oldDelims


			repeat with i from 1 to count of newTags
				set tagText to item i of newTags as text
				set trimmedTag to my simpleTrim(tagText)
				if trimmedTag is not "" then
					set end of tagList to trimmedTag
				end if
			end repeat
		else
		end if

		tell application id "DNtp"
			try
				-- Determine target location
				set targetLocation to missing value

				if targetDatabase is not "" then
					set db to database targetDatabase
					if targetGroup is not "" then
						set targetLocation to create location targetGroup in db
					else
						set targetLocation to db
					end if
				else
					set targetLocation to incoming group of current database
				end if

				-- Import file to DEVONthink
				set importedRecord to import tempFile to targetLocation


				-- Apply tags if we have any
				if (count of tagList) > 0 then
					set tags of importedRecord to tagList
				else
				end if

				-- Clean up temp file
				do shell script "rm -rf " & quoted form of tempDir

				-- Extract record properties inside tell block

				set recordUUID to uuid of importedRecord
				set recordName to name of importedRecord
				set recordType to type of importedRecord as string
				set recordPath to path of importedRecord
				set recordTags to tags of importedRecord
				set recordSize to size of importedRecord

			on error errMsg
				-- Clean up temp file on error
				do shell script "rm -rf " & quoted form of tempDir
				return "{\"error\":\"Import failed: " & my escapeString(errMsg) & "\"}"
			end try
		end tell

		-- Build JSON OUTSIDE tell block (build tags JSON inline to avoid function call issues)
		set tagsJSON to "["
		if (count of recordTags) > 0 then
			repeat with i from 1 to count of recordTags
				set tagText to item i of recordTags as text
				set escapedTag to my escapeString(tagText)
				set tagsJSON to tagsJSON & "\"" & escapedTag & "\""
				if i < (count of recordTags) then
					set tagsJSON to tagsJSON & ","
				end if
			end repeat
		end if
		set tagsJSON to tagsJSON & "]"

		set docJSON to "{"
		set docJSON to docJSON & "\"uuid\":\"" & recordUUID & "\","
		set docJSON to docJSON & "\"name\":\"" & my escapeString(recordName) & "\","
		set docJSON to docJSON & "\"type\":\"" & recordType & "\","
		set docJSON to docJSON & "\"path\":\"" & my escapeString(recordPath) & "\","
		set docJSON to docJSON & "\"tags\":" & tagsJSON & ","
		set docJSON to docJSON & "\"size\":" & recordSize & ""
		set docJSON to docJSON & "}"

		return docJSON

	on error errMsg
		return "{\"error\":\"Import failed: " & my escapeString(errMsg) & "\"}"
	end try
end run

on getFilenameFromUrl(url)
	try
		-- Extract filename using shell commands for reliability
		set fileName to do shell script "echo " & quoted form of url & " | sed 's/\\?.*$//' | sed 's|.*/||'"

		-- If no extension, add .pdf (common for papers)
		if fileName does not contain "." then
			set fileName to fileName & ".pdf"
		end if

		-- If empty, use fallback
		if fileName is "" then
			return "import_" & (do shell script "date +%s") & ".pdf"
		end if

		return fileName
	on error
		-- Fallback to timestamp-based filename
		return "import_" & (do shell script "date +%s") & ".pdf"
	end try
end getFilenameFromUrl

on escapeString(str)
	set str to my replaceText(str, "\\", "\\\\")
	set str to my replaceText(str, "\"", "\\\"")
	set str to my replaceText(str, return, "\\n")
	set str to my replaceText(str, tab, "\\t")
	return str
end escapeString

on tagsToJSON(tagList)
	if (count of tagList) is 0 then
		return "[]"
	end if

	set jsonTags to {}
	repeat with i from 1 to count of tagList
		set tagText to item i of tagList as text
		set end of jsonTags to "\"" & my escapeString(tagText) & "\""
	end repeat
	set result to "[" & my joinList(jsonTags, ",") & "]"
	return result
end tagsToJSON

on joinList(lst, delimiter)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to delimiter
	set joinedText to lst as text
	set AppleScript's text item delimiters to oldDelimiters
	return joinedText
end joinList

on splitString(str, delimiter)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to delimiter
	set result to text items of str
	set AppleScript's text item delimiters to oldDelimiters
	return result
end splitString

on simpleTrim(str)
	-- Simple AppleScript-only trim function
	set str to str as text

	-- Remove leading spaces
	repeat while str begins with " " or str begins with tab
		if (length of str) > 1 then
			set str to text 2 thru -1 of str
		else
			return ""
		end if
	end repeat

	-- Remove trailing spaces
	repeat while str ends with " " or str ends with tab
		if (length of str) > 1 then
			set str to text 1 thru -2 of str
		else
			return ""
		end if
	end repeat

	return str
end simpleTrim

on replaceText(theText, findStr, replaceStr)
	set AppleScript's text item delimiters to findStr
	set textItems to text items of theText
	set AppleScript's text item delimiters to replaceStr
	set theText to textItems as text
	set AppleScript's text item delimiters to ""
	return theText
end replaceText
