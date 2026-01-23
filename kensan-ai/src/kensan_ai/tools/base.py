"""Base tool infrastructure for Direct Tools approach."""

import json
from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable
from functools import wraps


@dataclass
class ToolDefinition:
    """Definition of a tool for the Anthropic API."""

    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], Awaitable[Any]]

    def to_api_schema(self) -> dict[str, Any]:
        """Convert to Anthropic API tool schema format."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": self.input_schema.get("properties", {}),
                "required": self.input_schema.get("required", []),
            },
        }


# Global registry of tools
_tool_registry: dict[str, ToolDefinition] = {}


def tool(
    name: str,
    description: str,
    input_schema: dict[str, Any] | None = None,
) -> Callable:
    """Decorator to register a function as a tool.

    Args:
        name: The tool name (used in API calls)
        description: Human-readable description of what the tool does
        input_schema: JSON Schema for the tool's input parameters

    Returns:
        Decorated function that's also registered as a tool
    """
    def decorator(func: Callable[[dict[str, Any]], Awaitable[Any]]) -> Callable:
        @wraps(func)
        async def wrapper(args: dict[str, Any]) -> Any:
            return await func(args)

        # Create and register the tool definition
        tool_def = ToolDefinition(
            name=name,
            description=description,
            input_schema=input_schema or {"properties": {}, "required": []},
            handler=wrapper,
        )
        _tool_registry[name] = tool_def

        # Attach metadata to the function for easy access
        wrapper._tool_definition = tool_def  # type: ignore
        wrapper._tool_name = name  # type: ignore

        return wrapper

    return decorator


def get_tool(name: str) -> ToolDefinition | None:
    """Get a tool definition by name."""
    return _tool_registry.get(name)


def get_all_tools() -> list[ToolDefinition]:
    """Get all registered tool definitions."""
    return list(_tool_registry.values())


def get_tools_api_schema(tool_names: list[str] | None = None) -> list[dict[str, Any]]:
    """Get API schema for tools.

    Args:
        tool_names: Optional list of tool names to include. If None, includes all tools.

    Returns:
        List of tool schemas in Anthropic API format.
    """
    if tool_names is None:
        tools = get_all_tools()
    else:
        tools = [t for t in get_all_tools() if t.name in tool_names]

    return [t.to_api_schema() for t in tools]


async def execute_tool(name: str, args: dict[str, Any]) -> Any:
    """Execute a tool by name with the given arguments.

    Args:
        name: The tool name
        args: Arguments to pass to the tool

    Returns:
        The tool's return value

    Raises:
        ValueError: If the tool is not found
    """
    tool_def = get_tool(name)
    if tool_def is None:
        raise ValueError(f"Tool not found: {name}")

    return await tool_def.handler(args)


def format_tool_result(result: Any) -> str:
    """Format a tool result as a string for the API.

    Args:
        result: The tool's return value

    Returns:
        String representation suitable for the API
    """
    if isinstance(result, str):
        return result
    return json.dumps(result, ensure_ascii=False, indent=2)
