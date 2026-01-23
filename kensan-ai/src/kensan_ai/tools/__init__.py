"""Kensan AI Tools.

All MCP tools for data access.

To add a new tool:
1. Create a new file in this directory (e.g., time_entries.py)
2. Define your tool using @tool decorator
3. Add to ALL_TOOLS list
4. Import and add to ALL_TOOLS below
"""

from .goals import ALL_TOOLS as GOAL_TOOLS
from .goals import get_goals_and_milestones

# Aggregate all tools
ALL_TOOLS = [
    *GOAL_TOOLS,
    # Add more tools here as they are implemented:
    # *TIME_ENTRY_TOOLS,
    # *LEARNING_RECORD_TOOLS,
    # *DIARY_TOOLS,
]

__all__ = [
    "ALL_TOOLS",
    "get_goals_and_milestones",
]
