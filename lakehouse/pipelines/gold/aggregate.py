"""
Gold Aggregation: Silver → Gold
週次サマリーとゴール別進捗の集計
"""

import sys
from datetime import timedelta
from pathlib import Path

import pyarrow as pa
import pyarrow.compute as pc

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "catalog"))
from config import get_catalog


def _iso_week_start(date_val) -> str:
    """日付からISO週の月曜日を算出"""
    if date_val is None:
        return None
    d = date_val
    weekday = d.weekday()  # 0=月曜
    return d - timedelta(days=weekday)


def aggregate_weekly_summary(catalog):
    """週次サマリー: 時間、タスク、ノートの集計"""
    silver_time = catalog.load_table("silver.time_entries")
    silver_tasks = catalog.load_table("silver.tasks")
    silver_notes = catalog.load_table("silver.notes")
    gold = catalog.load_table("gold.weekly_summary")

    time_df = silver_time.scan().to_arrow()
    tasks_df = silver_tasks.scan().to_arrow()
    notes_df = silver_notes.scan().to_arrow()

    # user_id × week_start ごとに集計
    summaries = {}

    # 時間集計
    for i in range(len(time_df)):
        user_id = time_df.column("user_id")[i].as_py()
        date = time_df.column("date")[i].as_py()
        minutes = time_df.column("duration_minutes")[i].as_py() or 0

        if date is None:
            continue

        week_start = _iso_week_start(date)
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "total_minutes": 0, "task_count": 0,
                "completed_task_count": 0, "note_count": 0,
                "diary_count": 0, "learning_count": 0,
            }
        summaries[key]["total_minutes"] += minutes

    # タスク集計 (created_atの週で集計)
    for i in range(len(tasks_df)):
        user_id = tasks_df.column("user_id")[i].as_py()
        created = tasks_df.column("created_at")[i].as_py()
        completed = tasks_df.column("completed")[i].as_py()

        if created is None:
            continue

        week_start = _iso_week_start(created.date())
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "total_minutes": 0, "task_count": 0,
                "completed_task_count": 0, "note_count": 0,
                "diary_count": 0, "learning_count": 0,
            }
        summaries[key]["task_count"] += 1
        if completed:
            summaries[key]["completed_task_count"] += 1

    # ノート集計
    for i in range(len(notes_df)):
        user_id = notes_df.column("user_id")[i].as_py()
        date = notes_df.column("date")[i].as_py()
        note_type = notes_df.column("type")[i].as_py()

        if date is None:
            created = notes_df.column("created_at")[i].as_py()
            if created:
                date = created.date()
            else:
                continue

        week_start = _iso_week_start(date)
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "total_minutes": 0, "task_count": 0,
                "completed_task_count": 0, "note_count": 0,
                "diary_count": 0, "learning_count": 0,
            }
        summaries[key]["note_count"] += 1
        if note_type == "diary":
            summaries[key]["diary_count"] += 1
        elif note_type == "learning":
            summaries[key]["learning_count"] += 1

    if not summaries:
        print("  No data to aggregate for weekly_summary")
        return

    # Arrow Tableに変換
    gold_table = pa.table({
        "user_id": pa.array([k[0] for k in summaries], type=pa.string()),
        "week_start": pa.array([k[1] for k in summaries], type=pa.date32()),
        "total_minutes": pa.array([v["total_minutes"] for v in summaries.values()], type=pa.int64()),
        "task_count": pa.array([v["task_count"] for v in summaries.values()], type=pa.int32()),
        "completed_task_count": pa.array([v["completed_task_count"] for v in summaries.values()], type=pa.int32()),
        "note_count": pa.array([v["note_count"] for v in summaries.values()], type=pa.int32()),
        "diary_count": pa.array([v["diary_count"] for v in summaries.values()], type=pa.int32()),
        "learning_count": pa.array([v["learning_count"] for v in summaries.values()], type=pa.int32()),
    })

    gold.overwrite(gold_table)
    print(f"  Aggregated {len(gold_table)} weekly summaries to Gold")


def aggregate_goal_progress(catalog):
    """ゴール別の週次進捗"""
    silver_time = catalog.load_table("silver.time_entries")
    gold = catalog.load_table("gold.goal_progress")

    time_df = silver_time.scan().to_arrow()

    progress = {}

    for i in range(len(time_df)):
        user_id = time_df.column("user_id")[i].as_py()
        date = time_df.column("date")[i].as_py()
        goal_name = time_df.column("goal_name")[i].as_py()
        minutes = time_df.column("duration_minutes")[i].as_py() or 0

        if date is None or not goal_name:
            continue

        week_start = _iso_week_start(date)
        key = (user_id, goal_name, week_start)
        if key not in progress:
            progress[key] = {"total_minutes": 0, "entry_count": 0}
        progress[key]["total_minutes"] += minutes
        progress[key]["entry_count"] += 1

    if not progress:
        print("  No data to aggregate for goal_progress")
        return

    gold_table = pa.table({
        "user_id": pa.array([k[0] for k in progress], type=pa.string()),
        "goal_name": pa.array([k[1] for k in progress], type=pa.string()),
        "week_start": pa.array([k[2] for k in progress], type=pa.date32()),
        "total_minutes": pa.array([v["total_minutes"] for v in progress.values()], type=pa.int64()),
        "entry_count": pa.array([v["entry_count"] for v in progress.values()], type=pa.int32()),
    })

    gold.overwrite(gold_table)
    print(f"  Aggregated {len(gold_table)} goal progress entries to Gold")


def main():
    catalog = get_catalog()

    print("Gold aggregation started.")
    aggregate_weekly_summary(catalog)
    aggregate_goal_progress(catalog)
    print("Gold aggregation complete.")


if __name__ == "__main__":
    main()
