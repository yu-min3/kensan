"""Variable replacer for dynamic system prompt substitution."""

import re
from datetime import date, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from kensan_ai.db.connection import get_connection


class VariableReplacer:
    """Replaces variables in system prompts with dynamic content."""

    # Pattern to match variables like {user_memory}, {today_schedule}, etc.
    VARIABLE_PATTERN = re.compile(r"\{(\w+)\}")

    # Supported variables
    SUPPORTED_VARIABLES = {
        "user_memory",
        "today_schedule",
        "pending_tasks",
        "recent_context",
    }

    @staticmethod
    async def replace(system_prompt: str, user_id: UUID) -> str:
        """Replace variables in the system prompt with dynamic content.

        Args:
            system_prompt: The system prompt with potential variables
            user_id: The user ID to fetch data for

        Returns:
            The system prompt with variables replaced
        """
        # Find all variables in the prompt
        variables = VariableReplacer.VARIABLE_PATTERN.findall(system_prompt)

        # Filter to only supported variables
        variables_to_replace = [v for v in variables if v in VariableReplacer.SUPPORTED_VARIABLES]

        if not variables_to_replace:
            return system_prompt

        # Fetch all needed data
        replacements: dict[str, str] = {}

        for var in variables_to_replace:
            if var == "user_memory":
                replacements[var] = await VariableReplacer._get_user_memory(user_id)
            elif var == "today_schedule":
                replacements[var] = await VariableReplacer._get_today_schedule(user_id)
            elif var == "pending_tasks":
                replacements[var] = await VariableReplacer._get_pending_tasks(user_id)
            elif var == "recent_context":
                replacements[var] = await VariableReplacer._get_recent_context(user_id)

        # Replace variables in the prompt
        result = system_prompt
        for var, value in replacements.items():
            result = result.replace(f"{{{var}}}", value)

        return result

    @staticmethod
    async def _get_user_memory(user_id: UUID) -> str:
        """Get user's profile summary from user_memory table."""
        async with get_connection() as conn:
            row = await conn.fetchrow(
                """
                SELECT profile_summary, preferences, strengths, growth_areas
                FROM user_memory
                WHERE user_id = $1
                """,
                user_id,
            )

            if not row or not row["profile_summary"]:
                return "（ユーザー情報なし）"

            parts = [row["profile_summary"]]

            if row["strengths"]:
                strengths = list(row["strengths"])
                if strengths:
                    parts.append(f"強み: {', '.join(strengths)}")

            if row["growth_areas"]:
                growth_areas = list(row["growth_areas"])
                if growth_areas:
                    parts.append(f"成長領域: {', '.join(growth_areas)}")

            return "\n".join(parts)

    @staticmethod
    async def _get_today_schedule(user_id: UUID) -> str:
        """Get today's time blocks."""
        today = date.today()

        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT start_time, end_time, task_name, goal_name
                FROM time_blocks
                WHERE user_id = $1 AND date = $2
                ORDER BY start_time
                """,
                user_id,
                today,
            )

            if not rows:
                return "（今日の予定なし）"

            schedule_items = []
            for row in rows:
                start = row["start_time"].strftime("%H:%M") if row["start_time"] else "?"
                end = row["end_time"].strftime("%H:%M") if row["end_time"] else "?"
                task = row["task_name"]
                goal = f" [{row['goal_name']}]" if row["goal_name"] else ""
                schedule_items.append(f"- {start}〜{end}: {task}{goal}")

            return "\n".join(schedule_items)

    @staticmethod
    async def _get_pending_tasks(user_id: UUID, limit: int = 10) -> str:
        """Get pending (incomplete) tasks, prioritized by due date."""
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT name, due_date, milestone_name, goal_name
                FROM tasks
                WHERE user_id = $1 AND completed = false
                ORDER BY
                    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                    due_date ASC
                LIMIT $2
                """,
                user_id,
                limit,
            )

            if not rows:
                return "（未完了タスクなし）"

            task_items = []
            for row in rows:
                task = row["name"]
                parts = []

                if row["due_date"]:
                    parts.append(f"期限: {row['due_date'].isoformat()}")
                if row["goal_name"]:
                    parts.append(row["goal_name"])
                if row["milestone_name"]:
                    parts.append(row["milestone_name"])

                suffix = f" ({', '.join(parts)})" if parts else ""
                task_items.append(f"- {task}{suffix}")

            return "\n".join(task_items)

    @staticmethod
    async def _get_recent_context(user_id: UUID, limit: int = 3) -> str:
        """Get summary of recent AI interactions."""
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT situation, user_input, ai_output, created_at
                FROM ai_interactions
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                user_id,
                limit,
            )

            if not rows:
                return "（最近の会話なし）"

            context_items = []
            for row in rows:
                created = row["created_at"]
                situation = row["situation"]
                # Truncate for brevity
                user_input = row["user_input"][:100]
                if len(row["user_input"]) > 100:
                    user_input += "..."
                ai_output = row["ai_output"][:150]
                if len(row["ai_output"]) > 150:
                    ai_output += "..."

                context_items.append(
                    f"[{created.strftime('%m/%d %H:%M')} - {situation}]\n"
                    f"ユーザー: {user_input}\n"
                    f"AI: {ai_output}"
                )

            return "\n\n".join(context_items)
