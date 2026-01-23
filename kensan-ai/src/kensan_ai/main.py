"""Kensan AI - Entry point for running agents."""

import anyio

from .agents import AgentRunner, weekly_review
from .mcp_server import kensan_server


def create_weekly_review_agent() -> AgentRunner:
    """Create a weekly review agent instance."""
    return AgentRunner(
        system_prompt=weekly_review.SYSTEM_PROMPT,
        mcp_servers={"kensan": kensan_server},
        allowed_tools=weekly_review.ALLOWED_TOOLS,
        max_turns=5,
    )


async def run_weekly_review(prompt: str | None = None) -> str:
    """Run the weekly review agent.

    Args:
        prompt: Custom prompt, or None for default.

    Returns:
        The agent's response text.
    """
    if prompt is None:
        prompt = "今週の振り返りをお願いします。まず目標とマイルストーンを確認してください。"

    agent = create_weekly_review_agent()
    return await agent.run(prompt)


async def main():
    """CLI entry point."""
    print("=== Kensan AI - Weekly Review ===\n")
    result = await run_weekly_review()
    print(result)


if __name__ == "__main__":
    anyio.run(main)
