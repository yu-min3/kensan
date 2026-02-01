"""Database tools for Direct Tools approach."""

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from kensan_ai.tools.base import tool
from kensan_ai.db.queries import (
    get_goals_and_milestones as db_get_goals,
    get_tasks as db_get_tasks,
    create_task as db_create_task,
    update_task as db_update_task,
    delete_task as db_delete_task,
    get_time_blocks as db_get_time_blocks,
    create_time_block as db_create_time_block,
    update_time_block as db_update_time_block,
    delete_time_block as db_delete_time_block,
    get_time_entries as db_get_time_entries,
    get_memos as db_get_memos,
    create_memo as db_create_memo,
    get_notes as db_get_notes,
    create_note as db_create_note,
    update_note as db_update_note,
    create_goal as db_create_goal,
    update_goal as db_update_goal,
    delete_goal as db_delete_goal,
    create_milestone as db_create_milestone,
    update_milestone as db_update_milestone,
    delete_milestone as db_delete_milestone,
)
from kensan_ai.db.queries.user_settings import get_user_timezone
from kensan_ai.db.queries.routines import get_routine_tasks as db_get_routine_tasks
from kensan_ai.lib.parsers import parse_uuid, parse_date, parse_time


def _local_date_to_utc_range(
    target_date: "datetime.date",
    tz: ZoneInfo,
) -> tuple[datetime, datetime]:
    """Convert a local date to a UTC datetime range (start inclusive, end exclusive)."""
    start_local = datetime(target_date.year, target_date.month, target_date.day, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(ZoneInfo("UTC")), end_local.astimezone(ZoneInfo("UTC"))


def _combine_to_utc(
    target_date: "datetime.date",
    local_time: "datetime.time",
    tz: ZoneInfo,
) -> datetime:
    """Combine a local date and time into a UTC datetime."""
    local_dt = datetime.combine(target_date, local_time, tzinfo=tz)
    return local_dt.astimezone(ZoneInfo("UTC"))


@tool(
    name="get_goals_and_milestones",
    description="目標とマイルストーンの一覧を取得する。各目標には紐づくマイルストーンとタスクの完了状況が含まれる。",
    input_schema={
        "properties": {},
        "required": [],
    },
)
async def get_goals_and_milestones(args: dict[str, Any]) -> dict[str, Any]:
    """Get all goals with their milestones and task counts."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    goals = await db_get_goals(user_id)
    # Slim down: remove descriptions to reduce token count
    return {"goals": [
        {
            "id": g["id"],
            "name": g["name"],
            "color": g["color"],
            "milestones": [
                {
                    "id": m["id"],
                    "name": m["name"],
                    "targetDate": m.get("targetDate"),
                    "status": m["status"],
                    "taskCount": m["taskCount"],
                }
                for m in g.get("milestones", [])
            ],
        }
        for g in goals
    ]}


@tool(
    name="get_tasks",
    description="タスク一覧を取得する。マイルストーンや完了状態、期日でフィルタできる。タスク関連の操作前には必ずこのツールで既存タスクを確認すること。",
    input_schema={
        "properties": {
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
        "required": [],
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
    description="新しいタスクを作成する。使用前に必ず get_tasks で既存タスクを検索し、同名・類似のタスクがないか確認すること。既存タスクがあればそちらを使う。",
    readonly=False,
    input_schema={
        "properties": {
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
        "required": ["name"],
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
    description="既存タスクを更新する。完了マーク、名前変更、期限変更に使う。事前に get_tasks でタスクIDを特定すること。",
    readonly=False,
    input_schema={
        "properties": {
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
        "required": ["task_id"],
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
    description="タイムブロック（計画）を取得する。日付や期間でフィルタできる。タイムブロック操作前には必ずこのツールで既存の予定を確認すること。",
    input_schema={
        "properties": {
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
        "required": [],
    },
)
async def get_time_blocks(args: dict[str, Any]) -> dict[str, Any]:
    """Get time blocks with optional date filters."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    user_tz = await get_user_timezone(user_id)

    # Convert local date filters to UTC datetime range
    start_dt = None
    end_dt = None
    target_date = parse_date(args.get("date"))
    if target_date is not None:
        start_dt, end_dt = _local_date_to_utc_range(target_date, user_tz)
    else:
        start_date = parse_date(args.get("start_date"))
        end_date = parse_date(args.get("end_date"))
        if start_date is not None and end_date is not None:
            start_dt, _ = _local_date_to_utc_range(start_date, user_tz)
            _, end_dt = _local_date_to_utc_range(end_date, user_tz)

    blocks = await db_get_time_blocks(
        user_id=user_id,
        start_datetime=start_dt,
        end_datetime=end_dt,
    )
    # Slim down: flatten nested objects, remove IDs not needed for reading
    return {"timeBlocks": [
        {
            "id": b["id"],
            "startDatetime": b["startDatetime"],
            "endDatetime": b["endDatetime"],
            "taskName": b["taskName"],
            "goalName": b["goal"]["name"] if b.get("goal") else None,
            "milestoneName": b["milestone"]["name"] if b.get("milestone") else None,
        }
        for b in blocks
    ]}


@tool(
    name="create_time_block",
    description="タイムブロック（計画）を作成する。事前に get_tasks と get_time_blocks で既存タスクと既存予定を確認すること。既存タスクが見つかれば task_id, milestone_id, goal_id を紐付ける（goal_name/goal_color/milestone_name はIDから自動解決される）。ユーザーの時間指定が曖昧な場合（「朝」「昼」「午後」等）は常識的に見繕う（朝→08:00-09:00、昼→12:00-13:00、午後→14:00-15:00、夕方→17:00-18:00）。既存の予定と重ならないようにすること。",
    readonly=False,
    input_schema={
        "properties": {
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
                "description": "タスクID (UUID形式、省略可。既存タスクがあれば必ず指定)",
            },
            "milestone_id": {
                "type": "string",
                "description": "マイルストーンID (UUID形式、省略可)",
            },
            "goal_id": {
                "type": "string",
                "description": "目標ID (UUID形式、省略可)",
            },
            "is_routine": {
                "type": "boolean",
                "description": "ルーティンかどうか (省略可、デフォルトfalse)",
            },
        },
        "required": ["date", "start_time", "end_time", "task_name"],
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

    user_tz = await get_user_timezone(user_id)

    # Combine local date + time into UTC datetimes
    start_dt = _combine_to_utc(target_date, start_time, user_tz)
    end_dt = _combine_to_utc(target_date, end_time, user_tz)
    # Handle overnight blocks (e.g., 23:30 - 00:30)
    if end_dt <= start_dt:
        end_dt += timedelta(days=1)

    block = await db_create_time_block(
        user_id=user_id,
        start_datetime=start_dt,
        end_datetime=end_dt,
        task_name=task_name,
        task_id=parse_uuid(args.get("task_id")),
        milestone_id=parse_uuid(args.get("milestone_id")),
        goal_id=parse_uuid(args.get("goal_id")),
        is_routine=args.get("is_routine", False),
    )
    return {"timeBlock": block}


@tool(
    name="get_time_entries",
    description="作業実績（タイムエントリー）を取得する。日付や期間でフィルタできる。計画との比較や振り返り時に使う。",
    input_schema={
        "properties": {
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
        "required": [],
    },
)
async def get_time_entries(args: dict[str, Any]) -> dict[str, Any]:
    """Get time entries with optional date filters."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    user_tz = await get_user_timezone(user_id)

    # Convert local date filters to UTC datetime range
    start_dt = None
    end_dt = None
    target_date = parse_date(args.get("date"))
    if target_date is not None:
        start_dt, end_dt = _local_date_to_utc_range(target_date, user_tz)
    else:
        start_date = parse_date(args.get("start_date"))
        end_date = parse_date(args.get("end_date"))
        if start_date is not None and end_date is not None:
            start_dt, _ = _local_date_to_utc_range(start_date, user_tz)
            _, end_dt = _local_date_to_utc_range(end_date, user_tz)

    entries = await db_get_time_entries(
        user_id=user_id,
        start_datetime=start_dt,
        end_datetime=end_dt,
    )
    # Slim down: flatten nested objects, remove IDs not needed for reading
    return {"timeEntries": [
        {
            "startDatetime": e["startDatetime"],
            "endDatetime": e["endDatetime"],
            "taskName": e["taskName"],
            "goalName": e["goal"]["name"] if e.get("goal") else None,
            "description": e.get("description"),
        }
        for e in entries
    ]}


# =========================================================================
# Task: delete
# =========================================================================

@tool(
    name="delete_task",
    description="タスクを削除する。事前に get_tasks で対象タスクのIDを特定すること。",
    readonly=False,
    input_schema={
        "properties": {
            "task_id": {"type": "string", "description": "タスクID"},
        },
        "required": ["task_id"],
    },
)
async def delete_task(args: dict[str, Any]) -> dict[str, Any]:
    """Delete a task."""
    user_id = parse_uuid(args.get("user_id"))
    task_id = parse_uuid(args.get("task_id"))
    if not user_id or not task_id:
        return {"error": "Invalid or missing user_id or task_id"}
    deleted = await db_delete_task(task_id, user_id)
    return {"deleted": deleted}


# =========================================================================
# Time Block: update, delete
# =========================================================================

@tool(
    name="update_time_block",
    description="既存タイムブロックを更新する。事前に get_time_blocks で対象のIDを特定すること。時刻を変更する場合は date も指定すること。",
    readonly=False,
    input_schema={
        "properties": {
            "time_block_id": {"type": "string", "description": "タイムブロックID"},
            "date": {"type": "string", "description": "日付 (YYYY-MM-DD形式、時刻変更時に必要)"},
            "start_time": {"type": "string", "description": "新しい開始時刻 (HH:MM)"},
            "end_time": {"type": "string", "description": "新しい終了時刻 (HH:MM)"},
            "task_name": {"type": "string", "description": "新しい表示名"},
        },
        "required": ["time_block_id"],
    },
)
async def update_time_block(args: dict[str, Any]) -> dict[str, Any]:
    """Update an existing time block."""
    user_id = parse_uuid(args.get("user_id"))
    tb_id = parse_uuid(args.get("time_block_id"))
    if not user_id or not tb_id:
        return {"error": "Invalid or missing user_id or time_block_id"}

    user_tz = await get_user_timezone(user_id)

    # Convert local date + time to UTC datetime if provided
    target_date = parse_date(args.get("date"))
    start_time = parse_time(args.get("start_time"))
    end_time = parse_time(args.get("end_time"))

    start_dt = None
    end_dt = None
    if target_date and start_time:
        start_dt = _combine_to_utc(target_date, start_time, user_tz)
    if target_date and end_time:
        end_dt = _combine_to_utc(target_date, end_time, user_tz)
    # Handle overnight (end before start)
    if start_dt and end_dt and end_dt <= start_dt:
        end_dt += timedelta(days=1)

    block = await db_update_time_block(
        time_block_id=tb_id,
        user_id=user_id,
        start_datetime=start_dt,
        end_datetime=end_dt,
        task_name=args.get("task_name"),
    )
    if block is None:
        return {"error": "Time block not found or no updates provided"}
    return {"timeBlock": block}


@tool(
    name="delete_time_block",
    description="タイムブロックを削除する。事前に get_time_blocks で対象のIDを特定すること。",
    readonly=False,
    input_schema={
        "properties": {
            "time_block_id": {"type": "string", "description": "タイムブロックID"},
        },
        "required": ["time_block_id"],
    },
)
async def delete_time_block(args: dict[str, Any]) -> dict[str, Any]:
    """Delete a time block."""
    user_id = parse_uuid(args.get("user_id"))
    tb_id = parse_uuid(args.get("time_block_id"))
    if not user_id or not tb_id:
        return {"error": "Invalid or missing user_id or time_block_id"}
    deleted = await db_delete_time_block(tb_id, user_id)
    return {"deleted": deleted}


# =========================================================================
# Memo: get, create
# =========================================================================

@tool(
    name="get_memos",
    description="メモ一覧を取得する。ユーザーの書いたメモや走り書きの確認に使う。",
    input_schema={
        "properties": {
            "limit": {"type": "integer", "description": "取得件数（デフォルト20）"},
        },
        "required": [],
    },
)
async def get_memos(args: dict[str, Any]) -> dict[str, Any]:
    """Get memos for a user."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    memos = await db_get_memos(user_id, limit=args.get("limit", 20))
    # Slim down: truncate long content
    return {"memos": [
        {**m, "content": m["content"][:300] + "..." if len(m.get("content", "")) > 300 else m.get("content", "")}
        for m in memos
    ]}


@tool(
    name="create_memo",
    description="メモを作成する。ユーザーが何かを書き留めたい時に使う。",
    readonly=False,
    input_schema={
        "properties": {
            "content": {"type": "string", "description": "メモの内容"},
        },
        "required": ["content"],
    },
)
async def create_memo(args: dict[str, Any]) -> dict[str, Any]:
    """Create a new memo."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    content = args.get("content")
    if not content:
        return {"error": "Missing content"}
    memo = await db_create_memo(user_id, content)
    return {"memo": memo}


# =========================================================================
# Note: get, create, update
# =========================================================================

@tool(
    name="get_notes",
    description="ノート一覧を取得する。学習記録や日記の確認に使う。",
    input_schema={
        "properties": {
            "type": {"type": "string", "description": "ノート種別で絞り込み (例: diary, learning, general, book_review)"},
            "limit": {"type": "integer", "description": "取得件数（デフォルト20）"},
        },
        "required": [],
    },
)
async def get_notes(args: dict[str, Any]) -> dict[str, Any]:
    """Get notes for a user."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    notes = await db_get_notes(
        user_id,
        note_type=args.get("type"),
        limit=args.get("limit", 20),
    )
    # Slim down: truncate content, remove updatedAt
    return {"notes": [
        {
            "id": n["id"],
            "title": n["title"],
            "type": n["type"],
            "content": n["content"][:300] + "..." if n.get("content") and len(n["content"]) > 300 else n.get("content"),
            "createdAt": n.get("createdAt"),
        }
        for n in notes
    ]}


@tool(
    name="create_note",
    description="ノートを作成する。学習記録や日記の新規作成に使う。",
    readonly=False,
    input_schema={
        "properties": {
            "title": {"type": "string", "description": "タイトル"},
            "content": {"type": "string", "description": "本文 (Markdown)"},
            "type": {"type": "string", "description": "ノート種別 (例: diary, learning, general, book_review)"},
        },
        "required": ["title", "content", "type"],
    },
)
async def create_note(args: dict[str, Any]) -> dict[str, Any]:
    """Create a new note."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    note = await db_create_note(
        user_id=user_id,
        title=args["title"],
        content=args["content"],
        note_type=args["type"],
    )
    return {"note": note}


@tool(
    name="update_note",
    description="既存ノートを更新する。学習記録や日記の編集に使う。事前に get_notes で対象のIDを特定すること。",
    readonly=False,
    input_schema={
        "properties": {
            "note_id": {"type": "string", "description": "ノートID"},
            "title": {"type": "string", "description": "新しいタイトル"},
            "content": {"type": "string", "description": "新しい本文"},
        },
        "required": ["note_id"],
    },
)
async def update_note(args: dict[str, Any]) -> dict[str, Any]:
    """Update an existing note."""
    user_id = parse_uuid(args.get("user_id"))
    note_id = parse_uuid(args.get("note_id"))
    if not user_id or not note_id:
        return {"error": "Invalid or missing user_id or note_id"}
    note = await db_update_note(
        note_id=note_id,
        user_id=user_id,
        title=args.get("title"),
        content=args.get("content"),
    )
    if note is None:
        return {"error": "Note not found or no updates provided"}
    return {"note": note}


# =========================================================================
# Goal: create, update, delete
# =========================================================================

@tool(
    name="create_goal",
    description="新しい目標を作成する。事前に get_goals_and_milestones で既存の目標を確認すること。",
    readonly=False,
    input_schema={
        "properties": {
            "name": {"type": "string", "description": "目標名"},
            "description": {"type": "string", "description": "目標の説明"},
            "color": {"type": "string", "description": "表示カラー (#hex)"},
        },
        "required": ["name"],
    },
)
async def create_goal(args: dict[str, Any]) -> dict[str, Any]:
    """Create a new goal."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    goal = await db_create_goal(
        user_id=user_id,
        name=args["name"],
        description=args.get("description"),
        color=args.get("color"),
    )
    return {"goal": goal}


@tool(
    name="update_goal",
    description="既存目標を更新する。事前に get_goals_and_milestones で対象のIDを特定すること。",
    readonly=False,
    input_schema={
        "properties": {
            "goal_id": {"type": "string", "description": "目標ID"},
            "name": {"type": "string", "description": "新しい名前"},
            "description": {"type": "string", "description": "新しい説明"},
        },
        "required": ["goal_id"],
    },
)
async def update_goal(args: dict[str, Any]) -> dict[str, Any]:
    """Update an existing goal."""
    user_id = parse_uuid(args.get("user_id"))
    goal_id = parse_uuid(args.get("goal_id"))
    if not user_id or not goal_id:
        return {"error": "Invalid or missing user_id or goal_id"}
    goal = await db_update_goal(
        goal_id=goal_id,
        user_id=user_id,
        name=args.get("name"),
        description=args.get("description"),
    )
    if goal is None:
        return {"error": "Goal not found or no updates provided"}
    return {"goal": goal}


@tool(
    name="delete_goal",
    description="目標を削除する。配下のマイルストーン・タスクとの紐付きに注意。事前に get_goals_and_milestones で確認すること。",
    readonly=False,
    input_schema={
        "properties": {
            "goal_id": {"type": "string", "description": "目標ID"},
        },
        "required": ["goal_id"],
    },
)
async def delete_goal(args: dict[str, Any]) -> dict[str, Any]:
    """Delete a goal."""
    user_id = parse_uuid(args.get("user_id"))
    goal_id = parse_uuid(args.get("goal_id"))
    if not user_id or not goal_id:
        return {"error": "Invalid or missing user_id or goal_id"}
    deleted = await db_delete_goal(goal_id, user_id)
    return {"deleted": deleted}


# =========================================================================
# Milestone: create, update, delete
# =========================================================================

@tool(
    name="create_milestone",
    description="目標にマイルストーンを追加する。",
    readonly=False,
    input_schema={
        "properties": {
            "goal_id": {"type": "string", "description": "親目標ID"},
            "name": {"type": "string", "description": "マイルストーン名"},
            "due_date": {"type": "string", "description": "期限日 (YYYY-MM-DD)"},
        },
        "required": ["goal_id", "name"],
    },
)
async def create_milestone(args: dict[str, Any]) -> dict[str, Any]:
    """Create a new milestone under a goal."""
    goal_id = parse_uuid(args.get("goal_id"))
    if not goal_id:
        return {"error": "Invalid or missing goal_id"}
    milestone = await db_create_milestone(
        goal_id=goal_id,
        name=args["name"],
        due_date=parse_date(args.get("due_date")),
    )
    return {"milestone": milestone}


@tool(
    name="update_milestone",
    description="既存マイルストーンを更新する。",
    readonly=False,
    input_schema={
        "properties": {
            "milestone_id": {"type": "string", "description": "マイルストーンID"},
            "name": {"type": "string", "description": "新しい名前"},
            "due_date": {"type": "string", "description": "新しい期限日"},
        },
        "required": ["milestone_id"],
    },
)
async def update_milestone(args: dict[str, Any]) -> dict[str, Any]:
    """Update an existing milestone."""
    milestone_id = parse_uuid(args.get("milestone_id"))
    if not milestone_id:
        return {"error": "Invalid or missing milestone_id"}
    milestone = await db_update_milestone(
        milestone_id=milestone_id,
        name=args.get("name"),
        due_date=parse_date(args.get("due_date")),
    )
    if milestone is None:
        return {"error": "Milestone not found or no updates provided"}
    return {"milestone": milestone}


@tool(
    name="delete_milestone",
    description="マイルストーンを削除する。",
    readonly=False,
    input_schema={
        "properties": {
            "milestone_id": {"type": "string", "description": "マイルストーンID"},
        },
        "required": ["milestone_id"],
    },
)
async def delete_milestone(args: dict[str, Any]) -> dict[str, Any]:
    """Delete a milestone."""
    milestone_id = parse_uuid(args.get("milestone_id"))
    if not milestone_id:
        return {"error": "Invalid or missing milestone_id"}
    deleted = await db_delete_milestone(milestone_id)
    return {"deleted": deleted}


# =========================================================================
# Routine Tasks: get
# =========================================================================

@tool(
    name="get_routine_tasks",
    description="ルーティンタスク（定期的な繰り返しタスク）の一覧を取得する。日次・週次のルーティンや習慣トラッカーの確認に使う。",
    input_schema={
        "properties": {
            "day_of_week": {
                "type": "integer",
                "description": "曜日フィルタ (0=日曜, 1=月曜, ..., 6=土曜。省略可)",
            },
        },
        "required": [],
    },
)
async def get_routine_tasks(args: dict[str, Any]) -> dict[str, Any]:
    """Get routine tasks for a user."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    routines = await db_get_routine_tasks(
        user_id=user_id,
        day_of_week=args.get("day_of_week"),
    )
    return {"routineTasks": routines}


# All DB tools for export
ALL_DB_TOOLS = [
    get_goals_and_milestones,
    get_tasks,
    create_task,
    update_task,
    delete_task,
    get_time_blocks,
    create_time_block,
    update_time_block,
    delete_time_block,
    get_time_entries,
    get_memos,
    create_memo,
    get_notes,
    create_note,
    update_note,
    create_goal,
    update_goal,
    delete_goal,
    create_milestone,
    update_milestone,
    delete_milestone,
    get_routine_tasks,
]
