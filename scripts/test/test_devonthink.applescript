-- Test script to verify DEVONthink integration
on run
    tell application id "DNtp"
        -- Test 1: Check if DEVONthink is running
        set appRunning to running
        log "DEVONthink running: " & appRunning
        
        -- Test 2: List databases
        set dbCount to count of databases
        log "Number of databases: " & dbCount
        
        -- Test 3: Test search
        set searchResults to search "test"
        log "Search results count: " & (count of searchResults)
        
        return "All tests completed successfully"
    end tell
end run