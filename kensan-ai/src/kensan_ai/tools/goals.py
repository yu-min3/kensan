"""Goals and Milestones tools."""

import json
from typing import Any

from claude_agent_sdk import tool

from .data import get_all_goals


@tool(
    name="get_goals_and_milestones",
    description="目標とマイルストーンの一覧を取得します。各目標には紐づくマイルストーンとタスクの完了状況が含まれます。",
    input_schema={},
)
async def get_goals_and_milestones(args: dict[str, Any]) -> dict[str, Any]:
    """Get all goals with their milestones and tasks."""
    goals = await get_all_goals()
    return {
        "content": [
            {
                "type": "text",
                "text": json.dumps(goals, ensure_ascii=False, indent=2),
            }
        ]
    }


# Export all tools
ALL_TOOLS = [get_goals_and_milestones]
