# DEVONthink MCP Server Troubleshooting Guide

## Quick Diagnosis

Run the automated connection test:
```bash
./scripts/test_connection.sh
```

## Common Issues and Solutions

### Issue 1: "DEVONthink is not running" Error

**Symptoms:**
- MCP tools return error: "DEVONthink is not running"
- Server logs show: `"DEVONthink is not running. Please start DEVONthink and try again."`

**Root Cause:**
DEVONthink process exists but is not fully activated/responsive to AppleScript.

**Solution:**
```bash
# Activate DEVONthink
open -a DEVONthink

# Wait 2 seconds, then verify
sleep 2
osascript -e 'tell application id "DNtp" to return running'
# Should return: true
```

**Why This Happens:**
DEVONthink can be in a background/suspended state where the process is alive but the AppleScript interface is not responsive. Bringing it to the foreground activates the interface.

---

### Issue 2: "Cannot Reconnect" After Changes

**Symptoms:**
- MCP server was working, then stopped
- Changes to code don't take effect
- Claude shows MCP tools as unavailable

**Solution:**
1. **Quit Claude completely** (not just close window)
2. Verify DEVONthink is active: `open -a DEVONthink`
3. Relaunch Claude
4. The MCP server will restart with new code

**Why This Happens:**
- MCP servers only reload when Claude restarts
- Code changes require a full restart to take effect

---

### Issue 3: JSON-RPC Protocol Errors

**Symptoms:**
- Logs show: `Unexpected token 'C', "[Connection"... is not valid JSON`
- Server fails silently
- Tools timeout or return empty responses

**Root Cause:**
Debug output (`console.log`) writes to stdout, which breaks JSON-RPC communication.

**Solution:**
Verify no `console.log` statements exist:
```bash
grep -r "console\.log" src/ | grep -v "node_modules"
# Should return nothing
```

All logging must use `console.error` which writes to stderr (logs) not stdout (JSON-RPC).

**Already Fixed:** All instances have been changed to `console.error`.

---

### Issue 4: Version Compatibility Issues

**Symptoms:**
- Scripts work in DEVONthink 3 but not DEVONthink 4 (or vice versa)
- Error: `Can't get application "DEVONthink 3"`

**Solution:**
All AppleScripts now use the version-independent bundle identifier:
```applescript
tell application id "DNtp"  -- Works for all versions
```

**Verify:**
```bash
grep -L 'application id "DNtp"' scripts/devonthink/*.applescript
# Should return nothing
```

---

### Issue 5: Connection Hangs or Timeouts

**Symptoms:**
- Operations never complete
- Server becomes unresponsive
- Stale `osascript` processes accumulate

**Solution:**
The connection manager automatically cleans up hanging processes. To manually clean:
```bash
# Kill hanging osascript processes
pkill -f "osascript.*devonthink"
```

**Monitoring:**
Check for zombie processes:
```bash
ps aux | grep osascript | grep devonthink
```

---

## Diagnostic Commands

### Check DEVONthink Status
```bash
# Is process running?
ps aux | grep -i DEVONthink | grep -v grep

# Is AppleScript responsive?
osascript -e 'tell application id "DNtp" to return running'

# How many databases are open?
osascript -e 'tell application id "DNtp" to return count of databases'
```

### Check MCP Server Logs
```bash
# View recent logs
tail -100 ~/Library/Logs/Claude/mcp-server-devonthink.log

# Follow logs in real-time
tail -f ~/Library/Logs/Claude/mcp-server-devonthink.log

# Search for errors
grep -i error ~/Library/Logs/Claude/mcp-server-devonthink.log | tail -20
```

### Test Server Manually
```bash
# Run server directly (for debugging)
cd /Users/hal.hildebrand/git/dt-mcp
node server.js

# Should output:
# - Server startup messages
# - No JSON parsing errors
# - Wait for stdin (MCP protocol)
```

### Test Individual AppleScripts
```bash
# Test check script
osascript scripts/devonthink/check_devonthink.applescript

# Test search (requires DEVONthink database open)
osascript scripts/devonthink/search.applescript "test query"

# Test list databases
osascript scripts/devonthink/list_databases.applescript
```

---

## Connection Manager Features

The server includes automatic connection management:

### Automatic Cleanup
- Runs after every 15 operations
- Kills hanging `osascript` processes
- Triggered automatically on high error rates (>30%)
- Triggered after 5 minutes of inactivity

### Retry Logic
- Automatic retry on failure (2 attempts)
- Exponential backoff: 1s, 2s delays
- Forces cleanup before retry if error rate > 50%

### Performance Tracking
- Monitors operation success rates
- Tracks operation duration
- Logs performance metrics to stderr (visible in logs)

---

## Configuration

### MCP Server Configuration
Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop)
or: `~/.config/claude-code/config.json` (Code)

```json
{
  "mcpServers": {
    "devonthink": {
      "command": "/usr/local/bin/node",
      "args": ["/Users/hal.hildebrand/git/dt-mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Environment Variables
Optional configuration via environment:
- `NODE_ENV`: Set to "production" for less verbose logging
- `DEBUG`: Set to "devonthink:*" for detailed debug output

---

## Recovery Procedures

### Complete Reset
If everything is broken:

1. **Kill all processes:**
   ```bash
   pkill -f "osascript.*devonthink"
   pkill -f "node.*server.js"
   ```

2. **Restart DEVONthink:**
   ```bash
   killall DEVONthink
   open -a DEVONthink
   sleep 3
   ```

3. **Verify DEVONthink:**
   ```bash
   osascript -e 'tell application id "DNtp" to return running'
   # Must return: true
   ```

4. **Restart Claude:**
   - Quit Claude completely
   - Relaunch Claude

5. **Test connection:**
   ```bash
   ./scripts/test_connection.sh
   ```

### Log Rotation
If logs are too large:
```bash
# Backup old logs
mv ~/Library/Logs/Claude/mcp-server-devonthink.log ~/Library/Logs/Claude/mcp-server-devonthink.log.old

# Claude will create a new log file on next connection
```

---

## Getting Help

### Debug Information to Collect

When reporting issues, include:

1. **Connection test results:**
   ```bash
   ./scripts/test_connection.sh > debug_info.txt 2>&1
   ```

2. **Recent logs (last 100 lines):**
   ```bash
   tail -100 ~/Library/Logs/Claude/mcp-server-devonthink.log >> debug_info.txt
   ```

3. **DEVONthink status:**
   ```bash
   osascript -e 'tell application id "DNtp" to return {running, count of databases}' >> debug_info.txt
   ```

4. **Node version:**
   ```bash
   node --version >> debug_info.txt
   ```

5. **Process list:**
   ```bash
   ps aux | grep -E "(DEVONthink|osascript|node.*server)" >> debug_info.txt
   ```

### Useful Resources

- **MCP Documentation**: https://modelcontextprotocol.io/docs/tools/debugging
- **DEVONthink Bundle ID**: `DNtp` (for AppleScript)
- **Log Location**: `~/Library/Logs/Claude/mcp-server-devonthink.log`

---

## Prevention

### Best Practices

1. **Keep DEVONthink Active**
   - Don't just launch it - bring it to foreground periodically
   - Ensure at least one database is open

2. **Monitor Logs**
   - Check logs after making code changes
   - Look for JSON parsing errors (sign of stdout contamination)

3. **Test After Updates**
   - Run `./scripts/test_connection.sh` after updating code
   - Restart Claude after any changes

4. **Avoid Background Suspension**
   - macOS may suspend DEVONthink if unused
   - Keep DEVONthink in dock for quick access

5. **Version Independence**
   - Always use `application id "DNtp"` in AppleScripts
   - Never hardcode version numbers like "DEVONthink 3"

---

## Technical Details

### Why `console.error` Instead of `console.log`?

In MCP servers:
- **stdout** (console.log) → JSON-RPC protocol communication
- **stderr** (console.error) → Log files

Any non-JSON output to stdout breaks the JSON-RPC protocol between Claude and the MCP server.

### Bundle Identifier vs Application Name

```applescript
# ❌ Version-specific (breaks in DEVONthink 4)
tell application "DEVONthink 3"

# ✅ Version-independent (works for all versions)
tell application id "DNtp"
```

The bundle identifier (`DNtp`) never changes across versions, making scripts future-proof.

### Connection Manager Thresholds

Defined in `src/utils/connection-manager.js`:
- `cleanupThreshold`: 15 operations
- `degradationThreshold`: 70% success rate
- `retryAttempts`: 2 attempts per operation
- `cleanupInterval`: 5 minutes (300000ms)

---

*Last Updated: 2025-10-09*
*Version: 3.0.0 (Unified Architecture)*
