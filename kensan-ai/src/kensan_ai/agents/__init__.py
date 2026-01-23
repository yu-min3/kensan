"""Kensan AI Agents - Agent definitions with system prompts.

To add a new agent:
1. Create a new file (e.g., morning_planner.py)
2. Define SYSTEM_PROMPT and ALLOWED_TOOLS
3. Import and export from this file
"""

from kensan_ai.agents.base import AgentRunner, AgentResult, ToolCall
from kensan_ai.agents import weekly_review
from kensan_ai.agents import chat

__all__ = [
    "AgentRunner",
    "AgentResult",
    "ToolCall",
    "weekly_review",
    "chat",
]
