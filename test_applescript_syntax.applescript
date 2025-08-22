#!/usr/bin/osascript

on run argv
    if (count of argv) < 1 then
        return "{\"error\": \"URL parameter required\"}"
    end if
    
    return "{\"success\": true, \"message\": \"Basic syntax test passed\"}"
end run