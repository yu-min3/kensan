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
    is_readonly_tool,
    ToolDefinition,
)
from kensan_ai.tools.db_tools import (
    get_goals_and_milestones,
    get_tasks,
    create_task,
    update_task,
    delete_task,
    get_time_blocks,
    create_time_block,
    update_time_block,
    delete_time_block,
    get_time_entries,
    get_memos,
    create_memo,
    get_notes,
    create_note,
    update_note,
    create_goal,
    update_goal,
    delete_goal,
    create_milestone,
    update_milestone,
    delete_milestone,
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
    reindex_notes,
    ALL_SEARCH_TOOLS,
)
from kensan_ai.tools.review_tools import (
    get_reviews,
    get_review,
    generate_weekly_review,
    ALL_REVIEW_TOOLS,
)
from kensan_ai.tools.analytics_tools import (
    get_analytics_summary,
    get_daily_summary,
    ALL_ANALYTICS_TOOLS,
)

# Aggregate all tools
ALL_TOOLS = [
    *ALL_DB_TOOLS,
    *ALL_MEMORY_TOOLS,
    *ALL_SEARCH_TOOLS,
    *ALL_REVIEW_TOOLS,
    *ALL_ANALYTICS_TOOLS,
]

__all__ = [
    # Base
    "tool",
    "get_tool",
    "get_all_tools",
    "get_tools_api_schema",
    "execute_tool",
    "format_tool_result",
    "is_readonly_tool",
    "ToolDefinition",
    # DB Tools
    "get_goals_and_milestones",
    "get_tasks",
    "create_task",
    "update_task",
    "delete_task",
    "get_time_blocks",
    "create_time_block",
    "update_time_block",
    "delete_time_block",
    "get_time_entries",
    "get_memos",
    "create_memo",
    "get_notes",
    "create_note",
    "update_note",
    "create_goal",
    "update_goal",
    "delete_goal",
    "create_milestone",
    "update_milestone",
    "delete_milestone",
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
    "reindex_notes",
    "ALL_SEARCH_TOOLS",
    # Review Tools
    "get_reviews",
    "get_review",
    "generate_weekly_review",
    "ALL_REVIEW_TOOLS",
    # Analytics Tools
    "get_analytics_summary",
    "get_daily_summary",
    "ALL_ANALYTICS_TOOLS",
    # All
    "ALL_TOOLS",
]
