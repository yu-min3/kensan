"""
Silver Transform: Bronze → Silver
クリーニング・正規化・算出カラム追加
"""

import sys
from datetime import date as date_type
from pathlib import Path

import pyarrow as pa
import pyarrow.compute as pc

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "catalog"))
from config import get_catalog


def transform_time_entries(catalog):
    """time_entries: date抽出、duration_minutes算出、不要カラム除去"""
    bronze = catalog.load_table("bronze.time_entries_raw")
    silver = catalog.load_table("silver.time_entries")

    scan = bronze.scan()
    df = scan.to_arrow()

    if len(df) == 0:
        print("  No data in bronze.time_entries_raw")
        return

    # start_datetimeからdate (日付部分) を抽出
    dates = []
    duration_minutes = []
    for i in range(len(df)):
        start = df.column("start_datetime")[i].as_py()
        end = df.column("end_datetime")[i].as_py()
        if start and end:
            dates.append(start.date())
            delta = (end - start).total_seconds() / 60
            duration_minutes.append(max(0, int(delta)))
        else:
            dates.append(None)
            duration_minutes.append(0)

    silver_table = pa.table({
        "id": df.column("id"),
        "user_id": df.column("user_id"),
        "date": pa.array(dates, type=pa.date32()),
        "start_datetime": df.column("start_datetime"),
        "end_datetime": df.column("end_datetime"),
        "duration_minutes": pa.array(duration_minutes, type=pa.int32()),
        "task_id": df.column("task_id"),
        "task_name": df.column("task_name"),
        "goal_name": df.column("goal_name"),
        "goal_color": df.column("goal_color"),
        "description": df.column("description"),
        "created_at": df.column("created_at"),
        "updated_at": df.column("updated_at"),
    })

    silver.overwrite(silver_table)
    print(f"  Transformed {len(silver_table)} time entries to Silver")


def transform_tasks(catalog):
    """tasks: is_subtaskフラグ追加、不要カラム除去"""
    bronze = catalog.load_table("bronze.tasks_raw")
    silver = catalog.load_table("silver.tasks")

    scan = bronze.scan()
    df = scan.to_arrow()

    if len(df) == 0:
        print("  No data in bronze.tasks_raw")
        return

    # is_subtask: parent_task_id がnullでなければTrue
    is_subtask = pc.is_valid(df.column("parent_task_id"))

    silver_table = pa.table({
        "id": df.column("id"),
        "user_id": df.column("user_id"),
        "name": df.column("name"),
        "completed": df.column("completed"),
        "milestone_id": df.column("milestone_id"),
        "parent_task_id": df.column("parent_task_id"),
        "is_subtask": is_subtask,
        "estimated_minutes": df.column("estimated_minutes"),
        "due_date": df.column("due_date"),
        "frequency": df.column("frequency"),
        "created_at": df.column("created_at"),
        "updated_at": df.column("updated_at"),
    })

    silver.overwrite(silver_table)
    print(f"  Transformed {len(silver_table)} tasks to Silver")


def transform_notes(catalog):
    """notes: content_length算出、本文除去"""
    bronze = catalog.load_table("bronze.notes_raw")
    silver = catalog.load_table("silver.notes")

    scan = bronze.scan()
    df = scan.to_arrow()

    if len(df) == 0:
        print("  No data in bronze.notes_raw")
        return

    # content_length: contentの文字数
    content_length = pa.array([
        len(c.as_py()) if c.as_py() else 0
        for c in df.column("content")
    ], type=pa.int32())

    silver_table = pa.table({
        "id": df.column("id"),
        "user_id": df.column("user_id"),
        "type": df.column("type"),
        "title": df.column("title"),
        "content_length": content_length,
        "format": df.column("format"),
        "date": df.column("date"),
        "goal_name": df.column("goal_name"),
        "archived": df.column("archived"),
        "created_at": df.column("created_at"),
        "updated_at": df.column("updated_at"),
    })

    silver.overwrite(silver_table)
    print(f"  Transformed {len(silver_table)} notes to Silver")


def transform_ai_interactions(catalog):
    """ai_interactions: date抽出、ツール情報解析、トークン合計算出"""
    bronze = catalog.load_table("bronze.ai_interactions_raw")
    silver = catalog.load_table("silver.ai_interactions")

    scan = bronze.scan()
    df = scan.to_arrow()

    if len(df) == 0:
        print("  No data in bronze.ai_interactions_raw")
        return

    import json

    dates = []
    ai_output_lengths = []
    tool_counts = []
    tool_names_list = []
    tokens_totals = []
    has_feedbacks = []

    for i in range(len(df)):
        created = df.column("created_at")[i].as_py()
        ai_output = df.column("ai_output")[i].as_py()
        tool_calls_json = df.column("tool_calls_json")[i].as_py()
        tokens_in = df.column("tokens_input")[i].as_py() or 0
        tokens_out = df.column("tokens_output")[i].as_py() or 0
        rating = df.column("rating")[i].as_py()

        # date
        dates.append(created.date() if created else None)

        # ai_output_length
        ai_output_lengths.append(len(ai_output) if ai_output else 0)

        # tool_count and tool_names
        if tool_calls_json:
            try:
                calls = json.loads(tool_calls_json)
                tool_counts.append(len(calls))
                names = list({c.get("name", "") for c in calls if isinstance(c, dict)})
                tool_names_list.append(json.dumps(names, ensure_ascii=False))
            except (json.JSONDecodeError, TypeError):
                tool_counts.append(0)
                tool_names_list.append("[]")
        else:
            tool_counts.append(0)
            tool_names_list.append("[]")

        # tokens_total
        tokens_totals.append(tokens_in + tokens_out)

        # has_feedback
        has_feedbacks.append(rating is not None)

    silver_table = pa.table({
        "id": df.column("id"),
        "user_id": df.column("user_id"),
        "date": pa.array(dates, type=pa.date32()),
        "situation": df.column("situation"),
        "user_input": df.column("user_input"),
        "ai_output_length": pa.array(ai_output_lengths, type=pa.int32()),
        "tool_count": pa.array(tool_counts, type=pa.int32()),
        "tool_names_json": pa.array(tool_names_list, type=pa.string()),
        "tokens_input": df.column("tokens_input"),
        "tokens_output": df.column("tokens_output"),
        "tokens_total": pa.array(tokens_totals, type=pa.int32()),
        "latency_ms": df.column("latency_ms"),
        "has_feedback": pa.array(has_feedbacks, type=pa.bool_()),
        "rating": df.column("rating"),
        "conversation_id": df.column("conversation_id"),
        "created_at": df.column("created_at"),
    })

    silver.overwrite(silver_table)
    print(f"  Transformed {len(silver_table)} AI interactions to Silver")


def transform_ai_token_usage(catalog):
    """ai_token_usage: 日別×situation別のトークン使用量集計"""
    bronze = catalog.load_table("bronze.ai_interactions_raw")
    silver = catalog.load_table("silver.ai_token_usage")

    scan = bronze.scan()
    df = scan.to_arrow()

    if len(df) == 0:
        print("  No data in bronze.ai_interactions_raw for token usage")
        return

    # user_id × date × situation ごとに集計
    usage = {}

    for i in range(len(df)):
        user_id = df.column("user_id")[i].as_py()
        created = df.column("created_at")[i].as_py()
        situation = df.column("situation")[i].as_py() or "chat"
        tokens_in = df.column("tokens_input")[i].as_py() or 0
        tokens_out = df.column("tokens_output")[i].as_py() or 0
        latency = df.column("latency_ms")[i].as_py() or 0

        if created is None:
            continue

        date_val = created.date()
        key = (user_id, date_val, situation)
        if key not in usage:
            usage[key] = {
                "interaction_count": 0,
                "tokens_input_total": 0,
                "tokens_output_total": 0,
                "tokens_total": 0,
                "latency_sum": 0,
            }
        usage[key]["interaction_count"] += 1
        usage[key]["tokens_input_total"] += tokens_in
        usage[key]["tokens_output_total"] += tokens_out
        usage[key]["tokens_total"] += tokens_in + tokens_out
        usage[key]["latency_sum"] += latency

    if not usage:
        print("  No data to aggregate for ai_token_usage")
        return

    silver_table = pa.table({
        "user_id": pa.array([k[0] for k in usage], type=pa.string()),
        "date": pa.array([k[1] for k in usage], type=pa.date32()),
        "situation": pa.array([k[2] for k in usage], type=pa.string()),
        "interaction_count": pa.array(
            [v["interaction_count"] for v in usage.values()], type=pa.int32()
        ),
        "tokens_input_total": pa.array(
            [v["tokens_input_total"] for v in usage.values()], type=pa.int64()
        ),
        "tokens_output_total": pa.array(
            [v["tokens_output_total"] for v in usage.values()], type=pa.int64()
        ),
        "tokens_total": pa.array(
            [v["tokens_total"] for v in usage.values()], type=pa.int64()
        ),
        "avg_latency_ms": pa.array(
            [
                v["latency_sum"] // v["interaction_count"] if v["interaction_count"] > 0 else 0
                for v in usage.values()
            ],
            type=pa.int32(),
        ),
    })

    silver.overwrite(silver_table)
    print(f"  Transformed {len(silver_table)} AI token usage records to Silver")


def main():
    catalog = get_catalog()

    print("Silver transformation started.")
    transform_time_entries(catalog)
    transform_tasks(catalog)
    transform_notes(catalog)
    transform_ai_interactions(catalog)
    transform_ai_token_usage(catalog)
    print("Silver transformation complete.")


if __name__ == "__main__":
    main()
