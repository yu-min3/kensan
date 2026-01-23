"""Kensan AI Agents - Agent definitions with system prompts.

To add a new agent:
1. Create a new file (e.g., morning_planner.py)
2. Define SYSTEM_PROMPT and ALLOWED_TOOLS
3. Import and export from this file
"""

from .base import AgentRunner
from . import weekly_review

__all__ = [
    "AgentRunner",
    "weekly_review",
]
