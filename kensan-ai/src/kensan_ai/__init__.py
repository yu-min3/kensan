"""Kensan AI - AI agents for learning management.

Usage:
    from kensan_ai import run_weekly_review
    result = await run_weekly_review()

    # Or create custom agent:
    from kensan_ai.agents import AgentRunner
    from kensan_ai.mcp_server import kensan_server

    agent = AgentRunner(
        system_prompt="...",
        mcp_servers={"kensan": kensan_server},
        allowed_tools=["mcp__kensan__get_goals_and_milestones"],
    )
    result = await agent.run("Your prompt")
"""

from .main import create_weekly_review_agent, run_weekly_review
from .mcp_server import kensan_server

__all__ = [
    "create_weekly_review_agent",
    "run_weekly_review",
    "kensan_server",
]
