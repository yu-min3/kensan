"""Goal and milestone queries."""

from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection


async def get_goals_and_milestones(user_id: UUID) -> list[dict[str, Any]]:
    """Get all goals with their milestones and task counts for a user."""
    async with get_connection() as conn:
        # Get goals
        goals = await conn.fetch(
            """
            SELECT id, name, description, color, is_archived, created_at, updated_at
            FROM goals
            WHERE user_id = $1 AND is_archived = false
            ORDER BY created_at DESC
            """,
            user_id,
        )

        result = []
        for goal in goals:
            # Get milestones for this goal
            milestones = await conn.fetch(
                """
                SELECT id, name, description, target_date, status, created_at, updated_at
                FROM milestones
                WHERE goal_id = $1 AND status != 'archived'
                ORDER BY target_date NULLS LAST, created_at
                """,
                goal["id"],
            )

            milestone_list = []
            for milestone in milestones:
                # Get task counts for this milestone
                task_counts = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE completed = true) as completed
                    FROM tasks
                    WHERE milestone_id = $1
                    """,
                    milestone["id"],
                )

                milestone_list.append({
                    "id": str(milestone["id"]),
                    "name": milestone["name"],
                    "description": milestone["description"],
                    "targetDate": milestone["target_date"].isoformat() if milestone["target_date"] else None,
                    "status": milestone["status"],
                    "taskCount": {
                        "total": task_counts["total"],
                        "completed": task_counts["completed"],
                    },
                })

            result.append({
                "id": str(goal["id"]),
                "name": goal["name"],
                "description": goal["description"],
                "color": goal["color"],
                "milestones": milestone_list,
            })

        return result
