"""
DuckDBインタラクティブクエリ用ヘルパー
PyIceberg経由でIcebergテーブルをDuckDBに登録し、SQLで分析可能にする。

使い方:
    uv run python queries/query.py          # 全テーブル登録してREPL起動
    uv run python queries/query.py summary  # サマリーを表示して終了
"""

import sys
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).parent.parent / "catalog"))
from config import get_catalog

# Iceberg → DuckDB テーブルマッピング
TABLES = {
    "bronze_time_entries": "bronze.time_entries_raw",
    "bronze_tasks": "bronze.tasks_raw",
    "bronze_notes": "bronze.notes_raw",
    "silver_time_entries": "silver.time_entries",
    "silver_tasks": "silver.tasks",
    "silver_notes": "silver.notes",
    "gold_weekly_summary": "gold.weekly_summary",
    "gold_goal_progress": "gold.goal_progress",
}


def setup(con: duckdb.DuckDBPyConnection):
    """全Icebergテーブルを DuckDB に登録"""
    catalog = get_catalog()
    for duckdb_name, iceberg_name in TABLES.items():
        arrow_table = catalog.load_table(iceberg_name).scan().to_arrow()
        con.register(duckdb_name, arrow_table)
        print(f"  Registered: {duckdb_name} ({len(arrow_table)} rows)")


def show_summary(con: duckdb.DuckDBPyConnection):
    """全テーブルのサマリーを表示"""
    print("\n=== Gold: Weekly Summary ===")
    print(con.sql("""
        SELECT week_start,
               total_minutes / 60 AS total_hours,
               task_count,
               completed_task_count,
               note_count
        FROM gold_weekly_summary
        ORDER BY week_start
    """))

    print("\n=== Gold: Goal Progress ===")
    print(con.sql("""
        SELECT goal_name,
               week_start,
               total_minutes / 60 AS hours,
               entry_count
        FROM gold_goal_progress
        ORDER BY goal_name, week_start
    """))

    print("\n=== Silver: Time by Goal ===")
    print(con.sql("""
        SELECT goal_name,
               count(*) AS entries,
               sum(duration_minutes) / 60 AS total_hours,
               round(avg(duration_minutes), 1) AS avg_minutes
        FROM silver_time_entries
        GROUP BY goal_name
        ORDER BY total_hours DESC
    """))


def main():
    con = duckdb.connect()

    print("Loading Iceberg tables into DuckDB...")
    setup(con)
    print()

    if len(sys.argv) > 1 and sys.argv[1] == "summary":
        show_summary(con)
        return

    # テーブル一覧を表示
    print("Available tables:")
    for name in TABLES:
        print(f"  - {name}")
    print()
    print("Starting DuckDB interactive shell.")
    print("Type SQL queries, or '.quit' to exit.\n")

    # インタラクティブループ
    while True:
        try:
            query = input("D> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            break

        if not query:
            continue
        if query.lower() in (".quit", ".exit", "quit", "exit"):
            print("Bye.")
            break
        if query.lower() == ".tables":
            for name in TABLES:
                print(f"  {name}")
            continue

        try:
            result = con.sql(query)
            print(result)
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
