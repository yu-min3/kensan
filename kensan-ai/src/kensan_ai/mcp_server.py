"""MCP Server configuration.

This module creates the MCP server that provides tools to AI agents.
"""

from claude_agent_sdk import create_sdk_mcp_server

from .tools import ALL_TOOLS

# Create MCP server with all available tools
kensan_server = create_sdk_mcp_server(
    name="kensan-db",
    version="0.1.0",
    tools=ALL_TOOLS,
)

__all__ = ["kensan_server"]
