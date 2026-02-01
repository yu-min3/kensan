"""Variable replacer for dynamic system prompt substitution."""

import re
from datetime import date, datetime, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from kensan_ai.db.connection import get_connection

# Default timezone for displaying local times
_DEFAULT_TZ = ZoneInfo("Asia/Tokyo")


class VariableReplacer:
    """Replaces variables in system prompts with dynamic content."""

    # Pattern to match variables like {user_memory}, {today_schedule}, etc.
    VARIABLE_PATTERN = re.compile(r"\{(\w+)\}")

    # Supported variables
    SUPPORTED_VARIABLES = {
        "current_datetime",
        "user_memory",
        "today_schedule",
        "today_entries",
        "pending_tasks",
        "recent_context",
        "weekly_summary",
        "goal_progress",
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
            if var == "current_datetime":
                now = datetime.now(_DEFAULT_TZ)
                weekday_names = ["月", "火", "水", "木", "金", "土", "日"]
                weekday = weekday_names[now.weekday()]
                replacements[var] = f"{now.strftime('%Y-%m-%d')}（{weekday}）{now.strftime('%H:%M')} JST"
            elif var == "user_memory":
                replacements[var] = await VariableReplacer._get_user_memory(user_id)
            elif var == "today_schedule":
                replacements[var] = await VariableReplacer._get_today_schedule(user_id)
            elif var == "pending_tasks":
                replacements[var] = await VariableReplacer._get_pending_tasks(user_id)
            elif var == "today_entries":
                replacements[var] = await VariableReplacer._get_today_entries(user_id)
            elif var == "recent_context":
                replacements[var] = await VariableReplacer._get_recent_context(user_id)
            elif var == "weekly_summary":
                replacements[var] = await VariableReplacer._get_weekly_summary(user_id)
            elif var == "goal_progress":
                replacements[var] = await VariableReplacer._get_goal_progress(user_id)

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
        start_utc = datetime(today.year, today.month, today.day, tzinfo=_DEFAULT_TZ).astimezone(ZoneInfo("UTC"))
        end_utc = start_utc + timedelta(days=1)

        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT start_datetime, end_datetime, task_name, goal_name
                FROM time_blocks
                WHERE user_id = $1
                  AND start_datetime >= $2
                  AND start_datetime < $3
                ORDER BY start_datetime
                """,
                user_id,
                start_utc,
                end_utc,
            )

            if not rows:
                return "（今日の予定なし）"

            schedule_items = []
            for row in rows:
                start = row["start_datetime"].astimezone(_DEFAULT_TZ).strftime("%H:%M")
                end = row["end_datetime"].astimezone(_DEFAULT_TZ).strftime("%H:%M")
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
                SELECT t.name, t.due_date,
                       m.name AS milestone_name,
                       g.name AS goal_name
                FROM tasks t
                LEFT JOIN milestones m ON t.milestone_id = m.id
                LEFT JOIN goals g ON m.goal_id = g.id
                WHERE t.user_id = $1 AND t.completed = false
                ORDER BY
                    CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
                    t.due_date ASC
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
    async def _get_today_entries(user_id: UUID) -> str:
        """Get today's actual time entries."""
        today = date.today()
        start_utc = datetime(today.year, today.month, today.day, tzinfo=_DEFAULT_TZ).astimezone(ZoneInfo("UTC"))
        end_utc = start_utc + timedelta(days=1)

        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT start_datetime, end_datetime, task_name, goal_name
                FROM time_entries
                WHERE user_id = $1
                  AND start_datetime >= $2
                  AND start_datetime < $3
                ORDER BY start_datetime
                """,
                user_id,
                start_utc,
                end_utc,
            )

            if not rows:
                return "（今日の実績なし）"

            entry_items = []
            for row in rows:
                start = row["start_datetime"].astimezone(_DEFAULT_TZ).strftime("%H:%M")
                end = row["end_datetime"].astimezone(_DEFAULT_TZ).strftime("%H:%M")
                task = row["task_name"]
                goal = f" [{row['goal_name']}]" if row["goal_name"] else ""
                entry_items.append(f"- {start}〜{end}: {task}{goal}")

            return "\n".join(entry_items)

    @staticmethod
    async def _get_weekly_summary(user_id: UUID) -> str:
        """Get this week's analytics summary (Mon-Sun)."""
        today = date.today()
        # Monday of this week
        week_start = today - timedelta(days=today.weekday())
        # Sunday of this week
        week_end = week_start + timedelta(days=6)

        # Convert local dates to UTC range
        start_utc = datetime(week_start.year, week_start.month, week_start.day, tzinfo=_DEFAULT_TZ).astimezone(ZoneInfo("UTC"))
        end_utc = datetime(week_end.year, week_end.month, week_end.day, tzinfo=_DEFAULT_TZ).astimezone(ZoneInfo("UTC")) + timedelta(days=1)

        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    goal_name,
                    SUM(EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 3600) as total_hours
                FROM time_entries
                WHERE user_id = $1
                  AND start_datetime >= $2
                  AND start_datetime < $3
                GROUP BY goal_name
                ORDER BY total_hours DESC
                """,
                user_id,
                start_utc,
                end_utc,
            )

            if not rows:
                return "（今週の実績なし）"

            total = 0.0
            breakdown = []
            for row in rows:
                hours = float(row["total_hours"] or 0)
                total += hours
                goal = row["goal_name"] or "未分類"
                breakdown.append(f"- {goal}: {hours:.1f}h")

            lines = [
                f"期間: {week_start.isoformat()} 〜 {week_end.isoformat()}",
                f"総稼働: {total:.1f}h",
                "目標別:",
                *breakdown,
            ]
            return "\n".join(lines)

    @staticmethod
    async def _get_goal_progress(user_id: UUID) -> str:
        """Get goal and milestone progress summary."""
        async with get_connection() as conn:
            goals = await conn.fetch(
                """
                SELECT id, name
                FROM goals
                WHERE user_id = $1 AND status != 'archived'
                ORDER BY created_at
                """,
                user_id,
            )

            if not goals:
                return "（目標なし）"

            goal_items = []
            for goal in goals:
                milestones = await conn.fetch(
                    """
                    SELECT m.name, m.status, m.target_date,
                           COUNT(t.id) as total_tasks,
                           COUNT(t.id) FILTER (WHERE t.completed = true) as done_tasks
                    FROM milestones m
                    LEFT JOIN tasks t ON t.milestone_id = m.id
                    WHERE m.goal_id = $1 AND m.status != 'archived'
                    GROUP BY m.id, m.name, m.status, m.target_date
                    ORDER BY m.target_date NULLS LAST
                    """,
                    goal["id"],
                )

                ms_lines = []
                for ms in milestones:
                    total = ms["total_tasks"]
                    done = ms["done_tasks"]
                    pct = f" ({done}/{total})" if total > 0 else ""
                    due = f" 期限:{ms['target_date'].isoformat()}" if ms["target_date"] else ""
                    status = "✓" if ms["status"] == "completed" else "○"
                    ms_lines.append(f"  {status} {ms['name']}{pct}{due}")

                goal_items.append(f"【{goal['name']}】")
                if ms_lines:
                    goal_items.extend(ms_lines)
                else:
                    goal_items.append("  （マイルストーンなし）")

            return "\n".join(goal_items)

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
