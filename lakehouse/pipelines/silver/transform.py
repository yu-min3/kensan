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


def main():
    catalog = get_catalog()

    print("Silver transformation started.")
    transform_time_entries(catalog)
    transform_tasks(catalog)
    transform_notes(catalog)
    print("Silver transformation complete.")


if __name__ == "__main__":
    main()
