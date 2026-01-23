"""Mock data for tools.

TODO: Replace with actual DB/API access.
"""

from typing import TypedDict


class Task(TypedDict):
    id: str
    name: str
    completed: bool


class Milestone(TypedDict):
    id: str
    name: str
    description: str | None
    targetDate: str | None
    status: str
    tasks: list[Task]


class Goal(TypedDict):
    id: str
    name: str
    description: str | None
    color: str
    milestones: list[Milestone]


# Mock data - will be replaced with DB queries
MOCK_GOALS: list[Goal] = [
    {
        "id": "goal-1",
        "name": "Golden Kubestronaut",
        "description": "Kubernetes認定資格を全て取得する",
        "color": "#3b82f6",
        "milestones": [
            {
                "id": "ms-1",
                "name": "ICA合格",
                "description": "Istio Certified Associate",
                "targetDate": "2025-03-31",
                "status": "active",
                "tasks": [
                    {"id": "task-1", "name": "Traffic Management学習", "completed": True},
                    {"id": "task-2", "name": "Security学習", "completed": False},
                    {"id": "task-3", "name": "Observability学習", "completed": False},
                ],
            },
            {
                "id": "ms-2",
                "name": "PCA合格",
                "description": "Prometheus Certified Associate",
                "targetDate": "2025-05-31",
                "status": "active",
                "tasks": [
                    {"id": "task-4", "name": "PromQL基礎", "completed": False},
                    {"id": "task-5", "name": "AlertManager設定", "completed": False},
                ],
            },
        ],
    },
    {
        "id": "goal-2",
        "name": "OSS活動",
        "description": "OSSコントリビューションを続ける",
        "color": "#10b981",
        "milestones": [
            {
                "id": "ms-3",
                "name": "月1PR",
                "description": "毎月1つ以上のPRを出す",
                "targetDate": None,
                "status": "active",
                "tasks": [
                    {"id": "task-6", "name": "good first issue探し", "completed": True},
                ],
            },
        ],
    },
]


async def get_all_goals() -> list[Goal]:
    """Fetch all goals from data source."""
    # TODO: Replace with DB query
    return MOCK_GOALS


async def get_goal_by_id(goal_id: str) -> Goal | None:
    """Fetch a goal by ID."""
    for goal in MOCK_GOALS:
        if goal["id"] == goal_id:
            return goal
    return None
