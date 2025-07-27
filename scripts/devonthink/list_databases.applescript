on run
    tell application id "DNtp"
        set allDatabases to databases
        set jsonOutput to "["
        
        repeat with i from 1 to count of allDatabases
            set theDB to item i of allDatabases
            set jsonOutput to jsonOutput & "{"
            set jsonOutput to jsonOutput & "\"name\":\"" & name of theDB & "\","
            set jsonOutput to jsonOutput & "\"uuid\":\"" & uuid of theDB & "\","
            set jsonOutput to jsonOutput & "\"path\":\"" & path of theDB & "\","
            set jsonOutput to jsonOutput & "\"itemCount\":" & (count of children of root of theDB) & ","
            set jsonOutput to jsonOutput & "\"encrypted\":" & (encrypted of theDB) & ","
            set jsonOutput to jsonOutput & "\"readOnly\":" & (read only of theDB)
            set jsonOutput to jsonOutput & "}"
            if i < count of allDatabases then set jsonOutput to jsonOutput & ","
        end repeat
        
        set jsonOutput to jsonOutput & "]"
        return jsonOutput
    end tell
end run