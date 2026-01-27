"""Database tools for Direct Tools approach."""

from typing import Any

from kensan_ai.tools.base import tool
from kensan_ai.db.queries import (
    get_goals_and_milestones as db_get_goals,
    get_tasks as db_get_tasks,
    create_task as db_create_task,
    update_task as db_update_task,
    get_time_blocks as db_get_time_blocks,
    create_time_block as db_create_time_block,
    get_time_entries as db_get_time_entries,
)
from kensan_ai.lib.parsers import parse_uuid, parse_date, parse_time


@tool(
    name="get_goals_and_milestones",
    description="目標とマイルストーンの一覧を取得します。各目標には紐づくマイルストーンとタスクの完了状況が含まれます。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
        },
        "required": ["user_id"],
    },
)
async def get_goals_and_milestones(args: dict[str, Any]) -> dict[str, Any]:
    """Get all goals with their milestones and task counts."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    goals = await db_get_goals(user_id)
    return {"goals": goals}


@tool(
    name="get_tasks",
    description="タスク一覧を取得します。マイルストーンや完了状態、期日でフィルタできます。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "milestone_id": {
                "type": "string",
                "description": "マイルストーンID (UUID形式、省略可)",
            },
            "completed": {
                "type": "boolean",
                "description": "完了状態でフィルタ (省略可)",
            },
            "due_date": {
                "type": "string",
                "description": "期日 (YYYY-MM-DD形式、省略可)",
            },
        },
        "required": ["user_id"],
    },
)
async def get_tasks(args: dict[str, Any]) -> dict[str, Any]:
    """Get tasks with optional filters."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    tasks = await db_get_tasks(
        user_id=user_id,
        milestone_id=parse_uuid(args.get("milestone_id")),
        completed=args.get("completed"),
        due_date=parse_date(args.get("due_date")),
    )
    return {"tasks": tasks}


@tool(
    name="create_task",
    description="新しいタスクを作成します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "name": {
                "type": "string",
                "description": "タスク名",
            },
            "milestone_id": {
                "type": "string",
                "description": "マイルストーンID (UUID形式、省略可)",
            },
            "estimated_minutes": {
                "type": "integer",
                "description": "見積もり時間(分、省略可)",
            },
            "due_date": {
                "type": "string",
                "description": "期日 (YYYY-MM-DD形式、省略可)",
            },
        },
        "required": ["user_id", "name"],
    },
)
async def create_task(args: dict[str, Any]) -> dict[str, Any]:
    """Create a new task."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    name = args.get("name")
    if not name:
        return {"error": "Missing task name"}

    task = await db_create_task(
        user_id=user_id,
        name=name,
        milestone_id=parse_uuid(args.get("milestone_id")),
        estimated_minutes=args.get("estimated_minutes"),
        due_date=parse_date(args.get("due_date")),
    )
    return {"task": task}


@tool(
    name="update_task",
    description="既存のタスクを更新します。完了状態の変更などに使用します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "task_id": {
                "type": "string",
                "description": "タスクID (UUID形式)",
            },
            "name": {
                "type": "string",
                "description": "新しいタスク名 (省略可)",
            },
            "completed": {
                "type": "boolean",
                "description": "完了状態 (省略可)",
            },
            "due_date": {
                "type": "string",
                "description": "期日 (YYYY-MM-DD形式、省略可)",
            },
        },
        "required": ["user_id", "task_id"],
    },
)
async def update_task(args: dict[str, Any]) -> dict[str, Any]:
    """Update an existing task."""
    user_id = parse_uuid(args.get("user_id"))
    task_id = parse_uuid(args.get("task_id"))
    if not user_id or not task_id:
        return {"error": "Invalid or missing user_id or task_id"}

    task = await db_update_task(
        task_id=task_id,
        user_id=user_id,
        name=args.get("name"),
        completed=args.get("completed"),
        due_date=parse_date(args.get("due_date")),
    )
    if task is None:
        return {"error": "Task not found or no updates provided"}
    return {"task": task}


@tool(
    name="get_time_blocks",
    description="タイムブロック（計画）を取得します。日付や期間でフィルタできます。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "date": {
                "type": "string",
                "description": "特定の日付 (YYYY-MM-DD形式、省略可)",
            },
            "start_date": {
                "type": "string",
                "description": "期間の開始日 (YYYY-MM-DD形式、省略可)",
            },
            "end_date": {
                "type": "string",
                "description": "期間の終了日 (YYYY-MM-DD形式、省略可)",
            },
        },
        "required": ["user_id"],
    },
)
async def get_time_blocks(args: dict[str, Any]) -> dict[str, Any]:
    """Get time blocks with optional date filters."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    blocks = await db_get_time_blocks(
        user_id=user_id,
        target_date=parse_date(args.get("date")),
        start_date=parse_date(args.get("start_date")),
        end_date=parse_date(args.get("end_date")),
    )
    return {"timeBlocks": blocks}


@tool(
    name="create_time_block",
    description="新しいタイムブロック（計画）を作成します。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "date": {
                "type": "string",
                "description": "日付 (YYYY-MM-DD形式)",
            },
            "start_time": {
                "type": "string",
                "description": "開始時刻 (HH:MM形式)",
            },
            "end_time": {
                "type": "string",
                "description": "終了時刻 (HH:MM形式)",
            },
            "task_name": {
                "type": "string",
                "description": "タスク名",
            },
            "task_id": {
                "type": "string",
                "description": "タスクID (UUID形式、省略可)",
            },
            "milestone_id": {
                "type": "string",
                "description": "マイルストーンID (UUID形式、省略可)",
            },
            "milestone_name": {
                "type": "string",
                "description": "マイルストーン名 (省略可)",
            },
            "goal_id": {
                "type": "string",
                "description": "目標ID (UUID形式、省略可)",
            },
            "goal_name": {
                "type": "string",
                "description": "目標名 (省略可)",
            },
            "goal_color": {
                "type": "string",
                "description": "目標の色 (省略可)",
            },
            "is_routine": {
                "type": "boolean",
                "description": "ルーティンかどうか (省略可、デフォルトfalse)",
            },
        },
        "required": ["user_id", "date", "start_time", "end_time", "task_name"],
    },
)
async def create_time_block(args: dict[str, Any]) -> dict[str, Any]:
    """Create a new time block."""
    user_id = parse_uuid(args.get("user_id"))
    target_date = parse_date(args.get("date"))
    start_time = parse_time(args.get("start_time"))
    end_time = parse_time(args.get("end_time"))
    task_name = args.get("task_name")

    if not user_id:
        return {"error": "Invalid or missing user_id"}
    if not target_date:
        return {"error": "Invalid or missing date"}
    if not start_time or not end_time:
        return {"error": "Invalid or missing start_time or end_time"}
    if not task_name:
        return {"error": "Missing task_name"}

    block = await db_create_time_block(
        user_id=user_id,
        target_date=target_date,
        start_time=start_time,
        end_time=end_time,
        task_name=task_name,
        task_id=parse_uuid(args.get("task_id")),
        milestone_id=parse_uuid(args.get("milestone_id")),
        milestone_name=args.get("milestone_name"),
        goal_id=parse_uuid(args.get("goal_id")),
        goal_name=args.get("goal_name"),
        goal_color=args.get("goal_color"),
        is_routine=args.get("is_routine", False),
    )
    return {"timeBlock": block}


@tool(
    name="get_time_entries",
    description="作業実績（タイムエントリー）を取得します。日付や期間でフィルタできます。",
    input_schema={
        "properties": {
            "user_id": {
                "type": "string",
                "description": "ユーザーID (UUID形式)",
            },
            "date": {
                "type": "string",
                "description": "特定の日付 (YYYY-MM-DD形式、省略可)",
            },
            "start_date": {
                "type": "string",
                "description": "期間の開始日 (YYYY-MM-DD形式、省略可)",
            },
            "end_date": {
                "type": "string",
                "description": "期間の終了日 (YYYY-MM-DD形式、省略可)",
            },
        },
        "required": ["user_id"],
    },
)
async def get_time_entries(args: dict[str, Any]) -> dict[str, Any]:
    """Get time entries with optional date filters."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    entries = await db_get_time_entries(
        user_id=user_id,
        target_date=parse_date(args.get("date")),
        start_date=parse_date(args.get("start_date")),
        end_date=parse_date(args.get("end_date")),
    )
    return {"timeEntries": entries}


# All DB tools for export
ALL_DB_TOOLS = [
    get_goals_and_milestones,
    get_tasks,
    create_task,
    update_task,
    get_time_blocks,
    create_time_block,
    get_time_entries,
]
