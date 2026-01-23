"""Time block queries."""

from datetime import date, time
from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection


async def get_time_blocks(
    user_id: UUID,
    target_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    """Get time blocks for a user with optional date filters."""
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

        blocks = await conn.fetch(
            f"""
            SELECT
                id, date, start_time, end_time, task_id, task_name,
                milestone_id, milestone_name, goal_id, goal_name, goal_color,
                is_routine
            FROM time_blocks
            WHERE {where_clause}
            ORDER BY date, start_time
            """,
            *params,
        )

        return [
            {
                "id": str(block["id"]),
                "date": block["date"].isoformat(),
                "startTime": block["start_time"].strftime("%H:%M"),
                "endTime": block["end_time"].strftime("%H:%M"),
                "taskId": str(block["task_id"]) if block["task_id"] else None,
                "taskName": block["task_name"],
                "milestone": {
                    "id": str(block["milestone_id"]),
                    "name": block["milestone_name"],
                } if block["milestone_id"] else None,
                "goal": {
                    "id": str(block["goal_id"]),
                    "name": block["goal_name"],
                    "color": block["goal_color"],
                } if block["goal_id"] else None,
                "isRoutine": block["is_routine"],
            }
            for block in blocks
        ]


async def create_time_block(
    user_id: UUID,
    target_date: date,
    start_time: time,
    end_time: time,
    task_name: str,
    task_id: UUID | None = None,
    milestone_id: UUID | None = None,
    milestone_name: str | None = None,
    goal_id: UUID | None = None,
    goal_name: str | None = None,
    goal_color: str | None = None,
    is_routine: bool = False,
) -> dict[str, Any]:
    """Create a new time block."""
    async with get_connection() as conn:
        block = await conn.fetchrow(
            """
            INSERT INTO time_blocks (
                user_id, date, start_time, end_time, task_id, task_name,
                milestone_id, milestone_name, goal_id, goal_name, goal_color, is_routine
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, date, start_time, end_time, task_id, task_name,
                milestone_id, milestone_name, goal_id, goal_name, goal_color, is_routine
            """,
            user_id,
            target_date,
            start_time,
            end_time,
            task_id,
            task_name,
            milestone_id,
            milestone_name,
            goal_id,
            goal_name,
            goal_color,
            is_routine,
        )

        return {
            "id": str(block["id"]),
            "date": block["date"].isoformat(),
            "startTime": block["start_time"].strftime("%H:%M"),
            "endTime": block["end_time"].strftime("%H:%M"),
            "taskId": str(block["task_id"]) if block["task_id"] else None,
            "taskName": block["task_name"],
            "milestone": {
                "id": str(block["milestone_id"]),
                "name": block["milestone_name"],
            } if block["milestone_id"] else None,
            "goal": {
                "id": str(block["goal_id"]),
                "name": block["goal_name"],
                "color": block["goal_color"],
            } if block["goal_id"] else None,
            "isRoutine": block["is_routine"],
        }
