"""Time entry queries."""

from datetime import date
from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection


async def get_time_entries(
    user_id: UUID,
    target_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    """Get time entries for a user with optional date filters."""
    async with get_connection() as conn:
        conditions = ["user_id = $1"]
        params: list[Any] = [user_id]
        param_idx = 2

        if target_date is not None:
            conditions.append(f"date = ${param_idx}")
            params.append(target_date)
            param_idx += 1
        elif start_date is not None and end_date is not None:
            conditions.append(f"date >= ${param_idx} AND date <= ${param_idx + 1}")
            params.extend([start_date, end_date])
            param_idx += 2

        where_clause = " AND ".join(conditions)

        entries = await conn.fetch(
            f"""
            SELECT
                id, date, start_time, end_time, task_id, task_name,
                milestone_id, milestone_name, goal_id, goal_name, goal_color,
                description
            FROM time_entries
            WHERE {where_clause}
            ORDER BY date DESC, start_time DESC
            """,
            *params,
        )

        return [
            {
                "id": str(entry["id"]),
                "date": entry["date"].isoformat(),
                "startTime": entry["start_time"].strftime("%H:%M"),
                "endTime": entry["end_time"].strftime("%H:%M"),
                "taskId": str(entry["task_id"]) if entry["task_id"] else None,
                "taskName": entry["task_name"],
                "milestone": {
                    "id": str(entry["milestone_id"]),
                    "name": entry["milestone_name"],
                } if entry["milestone_id"] else None,
                "goal": {
                    "id": str(entry["goal_id"]),
                    "name": entry["goal_name"],
                    "color": entry["goal_color"],
                } if entry["goal_id"] else None,
                "description": entry["description"],
            }
            for entry in entries
        ]
