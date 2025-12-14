# Post-Restart Verification Checklist

**Last Updated**: December 13, 2025

After restarting Claude, use this checklist to verify the MCP server is working correctly.

## Pre-Restart Steps

- [ ] All code changes saved
- [ ] No `console.log` statements in src/ directory
- [ ] DEVONthink is running and active (not just in background)
- [ ] At least one DEVONthink database is open

## Restart Procedure

- [ ] **Quit Claude completely** (Cmd+Q or Claude → Quit)
- [ ] Wait 5 seconds
- [ ] Verify no Claude processes remain: `ps aux | grep Claude | grep -v grep`
- [ ] Relaunch Claude

## Verification Steps

### 1. Check MCP Server Started

- [ ] Open Claude settings/preferences
- [ ] Navigate to MCP Servers section
- [ ] Confirm "devonthink" server is listed
- [ ] Status should show as "Connected" or "Active"

### 2. Run Automated Test

```bash
cd /Users/hal.hildebrand/git/dt-mcp
./scripts/test_connection.sh
```

- [ ] All tests pass (green checkmarks)
- [ ] No red errors
- [ ] Script completes successfully

### 3. Test Basic MCP Tool

Try using a simple DEVONthink tool in Claude:

**Test Command:** "List my DEVONthink databases"

Expected response:
- [ ] Tool executes successfully
- [ ] Returns list of databases
- [ ] No timeout or error messages

### 4. Check Server Logs

```bash
tail -50 ~/Library/Logs/Claude/mcp-server-devonthink.log
```

- [ ] Server startup message present
- [ ] No JSON parsing errors
- [ ] No "DEVONthink is not running" errors
- [ ] Tool calls appear in logs
- [ ] Response messages are valid JSON

### 5. Test Complex Operation

**Test Command:** "Search DEVONthink for documents about [your topic]"

- [ ] Search executes successfully
- [ ] Returns relevant results
- [ ] No connection errors
- [ ] Performance is reasonable (<5 seconds)

### 6. Verify Logging Behavior

Check that debug messages go to logs, not stdout:

```bash
# Should see messages like:
# [ConnectionManager] ...
# Operation started: ...
# But NOT in the JSON-RPC stream
```

- [ ] Debug messages appear in stderr/logs
- [ ] No debug messages break JSON-RPC protocol
- [ ] Connection remains stable during operations

## Troubleshooting Failed Checks

### If Server Doesn't Start

1. Check Claude's MCP configuration:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Verify server.js exists and is executable:
   ```bash
   ls -la /Users/hal.hildebrand/git/dt-mcp/server.js
   ```

3. Try running server manually:
   ```bash
   node /Users/hal.hildebrand/git/dt-mcp/server.js
   ```

### If DEVONthink Tools Fail

1. Verify DEVONthink is truly active:
   ```bash
   osascript -e 'tell application id "DNtp" to return running'
   # Must return: true
   ```

2. If returns `false`, activate it:
   ```bash
   open -a DEVONthink
   sleep 2
   ```

3. Re-test the tools in Claude

### If Getting JSON Errors

1. Check for console.log statements:
   ```bash
   grep -r "console\.log" src/ | grep -v node_modules
   # Should be empty
   ```

2. If found, replace with `console.error`

3. Restart Claude again

## Success Criteria

✅ **All green checkmarks achieved:**

- Server started successfully
- All automated tests pass
- Basic tool works (list databases)
- Complex tool works (search)
- Logs show clean operation
- No JSON-RPC errors
- Connection remains stable

## Performance Benchmarks

After verification, note these benchmarks for future reference:

| Operation | Expected Time | Your Result |
|-----------|--------------|-------------|
| List databases | <1 second | _______ |
| Simple search | <3 seconds | _______ |
| Read document | <2 seconds | _______ |
| Batch operation | <10 seconds | _______ |

## Known Good State

Document your working configuration:

- **Claude Version:** _____________
- **Node Version:** _____________
- **DEVONthink Version:** _____________
- **macOS Version:** _____________
- **Test Date:** _____________
- **Last Successful Test:** _____________

---

## Next Steps After Verification

Once all checks pass:

1. **Test Your Workflow**: Try your typical DEVONthink operations
2. **Monitor for Stability**: Watch logs during extended use
3. **Document Any Issues**: Note any patterns of failures
4. **Update Checklist**: Add any new checks based on your use case

---

## Quick Reference Commands

```bash
# Run full connection test
./scripts/test_connection.sh

# Check logs
tail -f ~/Library/Logs/Claude/mcp-server-devonthink.log

# Verify DEVONthink
osascript -e 'tell application id "DNtp" to return running'

# Clean hanging processes
pkill -f "osascript.*devonthink"

# Restart everything
killall Claude && open -a DEVONthink && sleep 2 && open -a Claude
```

---

## Emergency Recovery

If nothing works after following this checklist:

1. See **TROUBLESHOOTING.md** for detailed recovery procedures
2. Run complete reset: `./scripts/test_connection.sh --reset` (if available)
3. Check GitHub issues for similar problems
4. Document your state and collect debug info

---

*Keep this checklist handy after every code change or Claude update!*
