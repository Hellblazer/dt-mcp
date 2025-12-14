#!/usr/bin/env python3
"""
Minimal DEVONthink MCP Server - Python Version
No Node.js required! Just Python (comes with macOS) + one package.

Tools:
- search: Find documents with DEVONthink's search syntax
- document: Read or create documents

Total: ~120 lines of code
"""

import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    CallToolResult,
)


# Get script directory
SCRIPT_DIR = Path(__file__).parent / "scripts" / "minimal"

# Validation constants
ALLOWED_SCRIPTS = {'search', 'read', 'create'}
ALLOWED_DOC_TYPES = {'markdown', 'txt', 'rtf'}
MAX_QUERY_LENGTH = 1000
MAX_CONTENT_SIZE = 10 * 1024 * 1024  # 10MB
MAX_SEARCH_LIMIT = 100
UUID_PATTERN = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$', re.IGNORECASE)


def log(message: str):
    """Log to stderr (doesn't interfere with MCP JSON-RPC on stdout)"""
    print(f"[DEVONthink MCP] {message}", file=sys.stderr, flush=True)


def build_paper_url(source: str, identifier: str) -> str:
    """Build download URL for academic papers"""
    source = source.lower()

    if source == "arxiv":
        # arXiv PDF URL
        return f"https://arxiv.org/pdf/{identifier}.pdf"
    elif source == "pubmed":
        # PubMed Central PDF (requires PMC ID)
        return f"https://www.ncbi.nlm.nih.gov/pmc/articles/{identifier}/pdf/"
    elif source == "doi":
        # DOI resolver (may redirect to publisher)
        return f"https://doi.org/{identifier}"
    else:
        raise ValueError(f"Unknown paper source: {source}. Use arxiv, pubmed, or doi")


def validate_query(query: str) -> str:
    """Validate and sanitize search query"""
    if not query:
        raise ValueError("Query cannot be empty")
    if len(query) > MAX_QUERY_LENGTH:
        raise ValueError(f"Query too long (max {MAX_QUERY_LENGTH} characters)")
    return query


def validate_uuid(uuid: str) -> str:
    """Validate UUID format"""
    if not UUID_PATTERN.match(uuid):
        raise ValueError(f"Invalid UUID format: {uuid}")
    return uuid


def validate_limit(limit: int) -> int:
    """Validate result limit"""
    if limit < 1:
        raise ValueError("Limit must be at least 1")
    if limit > MAX_SEARCH_LIMIT:
        raise ValueError(f"Limit too high (max {MAX_SEARCH_LIMIT})")
    return limit


def validate_content(content: str) -> str:
    """Validate document content size"""
    if not content:
        raise ValueError("Content cannot be empty")
    if len(content.encode('utf-8')) > MAX_CONTENT_SIZE:
        raise ValueError(f"Content too large (max {MAX_CONTENT_SIZE} bytes)")
    return content


def validate_doc_type(doc_type: str) -> str:
    """Validate document type"""
    if doc_type not in ALLOWED_DOC_TYPES:
        raise ValueError(f"Invalid document type: {doc_type}. Allowed: {', '.join(ALLOWED_DOC_TYPES)}")
    return doc_type


async def run_applescript(script_name: str, *args) -> dict:
    """Execute AppleScript and return JSON result"""
    # Validate script name
    if script_name not in ALLOWED_SCRIPTS:
        raise ValueError(f"Invalid script name: {script_name}")

    script_path = SCRIPT_DIR / f"{script_name}.applescript"

    if not script_path.exists():
        raise FileNotFoundError(f"AppleScript not found: {script_path}")

    # Build command
    cmd = ["osascript", str(script_path)] + [str(arg) for arg in args if arg]

    log(f"Running: {' '.join(cmd)}")

    try:
        # Run osascript with timeout
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Add timeout to prevent hanging (30 seconds)
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise RuntimeError("AppleScript execution timed out after 30 seconds")

        if stderr:
            log(f"AppleScript stderr: {stderr.decode()}")

        if process.returncode != 0:
            raise RuntimeError(f"AppleScript failed with code {process.returncode}")

        # Parse JSON output
        output = stdout.decode().strip()

        # Check response size before parsing
        if len(output) > MAX_CONTENT_SIZE:
            raise RuntimeError(f"Response too large: {len(output)} bytes")

        return json.loads(output)

    except json.JSONDecodeError as e:
        log(f"Failed to parse JSON: {output}")
        raise RuntimeError(f"Invalid JSON from AppleScript: {e}")
    except Exception as e:
        log(f"Error running AppleScript: {e}")
        raise


# Create MCP server
app = Server("devonthink-minimal")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools"""
    return [
        Tool(
            name="search",
            description=(
                "Search for documents in DEVONthink. "
                "Supports advanced syntax: boolean (AND/OR/NOT), "
                "field searches (tag:, kind:, date:), wildcards (*), "
                'exact phrases ("")'
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Search query. Examples: 'quantum physics', "
                            "'tag:research AND kind:PDF', 'created:>2023'"
                        ),
                    },
                    "database": {
                        "type": "string",
                        "description": "Specific database name (optional, searches all if omitted)",
                    },
                    "limit": {
                        "type": "number",
                        "description": "Maximum results to return (default: 20)",
                        "default": 20,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="document",
            description="Read document content or create new documents in DEVONthink",
            inputSchema={
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": ["read", "create"],
                        "description": 'Operation: "read" to get content, "create" to make new document',
                    },
                    # Read parameters
                    "uuid": {
                        "type": "string",
                        "description": "Document UUID (required for read operation)",
                    },
                    "includeContent": {
                        "type": "boolean",
                        "description": "Include full content when reading (default: true)",
                        "default": True,
                    },
                    # Create parameters
                    "name": {
                        "type": "string",
                        "description": "Document name (required for create operation)",
                    },
                    "content": {
                        "type": "string",
                        "description": "Document content (required for create operation)",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["markdown", "txt", "rtf"],
                        "description": "Document type (default: markdown)",
                        "default": "markdown",
                    },
                    "database": {
                        "type": "string",
                        "description": "Target database (optional, uses Global Inbox if omitted)",
                    },
                    "groupPath": {
                        "type": "string",
                        "description": 'Folder path like "/Research/Papers" (optional)',
                    },
                },
                "required": ["operation"],
            },
        ),
        Tool(
            name="import",
            description="Import documents from URLs or academic paper repositories (arXiv, PubMed, DOI)",
            inputSchema={
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["url", "arxiv", "pubmed", "doi"],
                        "description": 'Source type: "url" for direct URL, "arxiv" for arXiv papers, "pubmed" for PubMed Central, "doi" for DOI',
                    },
                    "identifier": {
                        "type": "string",
                        "description": "URL or paper identifier (e.g., '2301.00001' for arXiv, 'PMC12345' for PubMed, '10.1000/xyz' for DOI)",
                    },
                    "tags": {
                        "type": "string",
                        "description": "Comma-separated tags to apply (optional)",
                    },
                    "database": {
                        "type": "string",
                        "description": "Target database (optional, uses Global Inbox if omitted)",
                    },
                    "groupPath": {
                        "type": "string",
                        "description": 'Folder path like "/Research/Papers" (optional)',
                    },
                },
                "required": ["source", "identifier"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls"""

    try:
        if name == "search":
            # Search tool - validate inputs
            query = validate_query(arguments["query"])
            database = arguments.get("database", "")
            limit = validate_limit(arguments.get("limit", 20))

            log(f'Search: query="{query}", database={database or "all"}, limit={limit}')

            result = await run_applescript("search", query, database, limit)

            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]

        elif name == "document":
            # Document tool
            operation = arguments["operation"]

            if operation == "read":
                uuid_arg = arguments.get("uuid")
                if not uuid_arg:
                    raise ValueError("uuid is required for read operation")

                # Validate UUID format
                uuid = validate_uuid(uuid_arg)
                include_content = arguments.get("includeContent", True)

                log(f"Document read: uuid={uuid}, includeContent={include_content}")

                result = await run_applescript(
                    "read",
                    uuid,
                    "true" if include_content else "false"
                )

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]

            elif operation == "create":
                name_arg = arguments.get("name")
                content_arg = arguments.get("content")

                if not name_arg or not content_arg:
                    raise ValueError("name and content are required for create operation")

                # Validate inputs
                content = validate_content(content_arg)
                doc_type = validate_doc_type(arguments.get("type", "markdown"))
                database = arguments.get("database", "")
                group_path = arguments.get("groupPath", "")

                log(f"Document create: name={name_arg}, type={doc_type}")

                result = await run_applescript(
                    "create",
                    name_arg,
                    content,
                    doc_type,
                    database,
                    group_path
                )

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]

            else:
                raise ValueError(f"Unknown operation: {operation}")

        elif name == "import":
            # Import tool
            source = arguments["source"]
            identifier = arguments["identifier"]
            tags = arguments.get("tags", "")
            database = arguments.get("database", "")
            group_path = arguments.get("groupPath", "")

            # Build URL based on source type
            if source == "url":
                url = identifier
            else:
                url = build_paper_url(source, identifier)

            log(f"Import: source={source}, identifier={identifier}, url={url}")

            result = await run_applescript(
                "import",
                url,
                tags,
                database,
                group_path
            )

            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]

        else:
            raise ValueError(f"Unknown tool: {name}")

    except ValueError as e:
        # User input errors - safe to show
        log(f"Validation error: {e}")
        return [TextContent(
            type="text",
            text=f"Invalid input: {str(e)}"
        )]
    except FileNotFoundError as e:
        # Internal error - don't expose paths
        log(f"Configuration error: {e}")
        return [TextContent(
            type="text",
            text="Configuration error: Required AppleScript files not found"
        )]
    except RuntimeError as e:
        # AppleScript execution errors - show message but sanitize
        error_msg = str(e)
        log(f"Runtime error: {error_msg}")
        # Don't expose file paths or system details
        if "timed out" in error_msg.lower():
            return [TextContent(type="text", text="Operation timed out")]
        elif "applescript failed" in error_msg.lower():
            return [TextContent(type="text", text="DEVONthink operation failed - ensure DEVONthink is running")]
        else:
            return [TextContent(type="text", text=f"Operation failed: {error_msg}")]
    except json.JSONDecodeError as e:
        # JSON parsing errors - internal issue
        log(f"JSON parse error: {e}")
        return [TextContent(
            type="text",
            text="Internal error: Failed to parse DEVONthink response"
        )]
    except Exception as e:
        # Unexpected errors - log but don't expose details
        log(f"Unexpected error: {type(e).__name__}: {e}")
        return [TextContent(
            type="text",
            text="An unexpected error occurred. Please check the logs."
        )]


async def main():
    """Run the MCP server"""
    log("Starting minimal DEVONthink MCP server (Python)...")
    log("3 tools available: search, document, import")

    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
