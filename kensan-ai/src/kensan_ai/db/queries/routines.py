"""Routine task queries."""

from datetime import date
from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection


async def get_routine_tasks(
    user_id: UUID,
    day_of_week: int | None = None,
) -> list[dict[str, Any]]:
    """Get routine tasks for a user, optionally filtered by day of week.

    Args:
        user_id: The user ID.
        day_of_week: Day of week filter (0=Sunday, 6=Saturday). If None, returns all.
    """
    async with get_connection() as conn:
        conditions = ["user_id = $1", "frequency IS NOT NULL", "enabled = true"]
        params: list[Any] = [user_id]
        param_idx = 2

        if day_of_week is not None:
            conditions.append(f"($${param_idx} = ANY(days_of_week) OR days_of_week IS NULL)")
            params.append(day_of_week)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        rows = await conn.fetch(
            f"""
            SELECT id, name, frequency, days_of_week, estimated_minutes, tag_ids
            FROM todos
            WHERE {where_clause}
            ORDER BY name
            """,
            *params,
        )

        return [
            {
                "id": str(row["id"]),
                "name": row["name"],
                "frequency": row["frequency"],
                "daysOfWeek": row["days_of_week"],
                "estimatedMinutes": row["estimated_minutes"],
                "tagIds": [str(t) for t in row["tag_ids"]] if row["tag_ids"] else [],
            }
            for row in rows
        ]


async def get_routine_completions(
    user_id: UUID,
    target_date: date,
) -> list[dict[str, Any]]:
    """Get routine task completion status for a specific date."""
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT t.id as task_id, t.name,
                   tc.completed_date IS NOT NULL as completed
            FROM todos t
            LEFT JOIN todo_completions tc ON t.id = tc.todo_id AND tc.completed_date = $2
            WHERE t.user_id = $1 AND t.frequency IS NOT NULL AND t.enabled = true
            ORDER BY t.name
            """,
            user_id,
            target_date,
        )

        return [
            {
                "taskId": str(row["task_id"]),
                "name": row["name"],
                "completed": row["completed"],
            }
            for row in rows
        ]
