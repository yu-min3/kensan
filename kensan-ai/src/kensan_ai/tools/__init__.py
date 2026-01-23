"""Kensan AI Tools.

Direct Tools for AI agent data access.

To add a new tool:
1. Create a new file in this directory (e.g., my_tools.py)
2. Define your tool using @tool decorator from base.py
3. Import and add to ALL_TOOLS below
"""

from kensan_ai.tools.base import (
    tool,
    get_tool,
    get_all_tools,
    get_tools_api_schema,
    execute_tool,
    format_tool_result,
    ToolDefinition,
)
from kensan_ai.tools.db_tools import (
    get_goals_and_milestones,
    get_tasks,
    create_task,
    update_task,
    get_time_blocks,
    create_time_block,
    get_time_entries,
    ALL_DB_TOOLS,
)
from kensan_ai.tools.memory_tools import (
    get_user_memory,
    get_user_facts,
    add_user_fact,
    get_recent_interactions,
    ALL_MEMORY_TOOLS,
)
from kensan_ai.tools.search_tools import (
    semantic_search,
    keyword_search,
    hybrid_search,
    ALL_SEARCH_TOOLS,
)
from kensan_ai.tools.storage_tools import (
    upload_file,
    get_file,
    delete_file,
    get_upload_url,
    ALL_STORAGE_TOOLS,
)

# Aggregate all tools
ALL_TOOLS = [
    *ALL_DB_TOOLS,
    *ALL_MEMORY_TOOLS,
    *ALL_SEARCH_TOOLS,
    *ALL_STORAGE_TOOLS,
]

__all__ = [
    # Base
    "tool",
    "get_tool",
    "get_all_tools",
    "get_tools_api_schema",
    "execute_tool",
    "format_tool_result",
    "ToolDefinition",
    # DB Tools
    "get_goals_and_milestones",
    "get_tasks",
    "create_task",
    "update_task",
    "get_time_blocks",
    "create_time_block",
    "get_time_entries",
    "ALL_DB_TOOLS",
    # Memory Tools
    "get_user_memory",
    "get_user_facts",
    "add_user_fact",
    "get_recent_interactions",
    "ALL_MEMORY_TOOLS",
    # Search Tools
    "semantic_search",
    "keyword_search",
    "hybrid_search",
    "ALL_SEARCH_TOOLS",
    # Storage Tools
    "upload_file",
    "get_file",
    "delete_file",
    "get_upload_url",
    "ALL_STORAGE_TOOLS",
    # All
    "ALL_TOOLS",
]
