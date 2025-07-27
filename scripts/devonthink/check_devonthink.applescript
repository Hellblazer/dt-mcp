-- Check if DEVONthink is running and start it if needed
on run
    tell application "System Events"
        if not (exists process "DEVONthink") then
            try
                tell application id "DNtp" to activate
                delay 3 -- Give it time to start
                return "{\"status\":\"started\",\"message\":\"DEVONthink was not running and has been started\"}"
            on error errMsg
                return "{\"status\":\"error\",\"message\":\"Failed to start DEVONthink: " & errMsg & "\"}"
            end try
        else
            return "{\"status\":\"running\",\"message\":\"DEVONthink is already running\"}"
        end if
    end tell
end run