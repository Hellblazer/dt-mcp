#!/usr/bin/osascript

on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"URL parameter required\"}"
    end if
    
    set urlString to item 1 of argv
    
    try
        -- Basic validation
        if urlString does not start with "http://" and urlString does not start with "https://" then
            return "{\"error\": \"Invalid URL protocol\", \"code\": \"INVALID_URL\"}"
        end if
        
        return "{\"success\": true, \"message\": \"URL validation passed\", \"url\": \"" & urlString & "\"}"
        
    on error errorMessage
        return "{\"error\": \"" & errorMessage & "\", \"code\": \"APPLESCRIPT_ERROR\"}"
    end try
end run