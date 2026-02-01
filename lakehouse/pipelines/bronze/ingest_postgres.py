"""
Bronze Ingestion: PostgreSQL → Iceberg Bronze層
差分取り込み: updated_at ベースの増分ロード
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg
import pyarrow as pa

# catalog/config.py を参照できるようにパスを追加
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "catalog"))
from config import get_catalog, get_pg_dsn

# UUID型のカラム名（string変換が必要）
UUID_COLUMNS = {"id", "user_id", "task_id", "milestone_id", "goal_id", "parent_task_id"}

# 取り込み対象テーブルの定義
TABLES = {
    "bronze.time_entries_raw": {
        "query": """
            SELECT id, user_id, start_datetime, end_datetime,
                   task_id, task_name, milestone_id, milestone_name,
                   goal_id, goal_name, goal_color, description,
                   created_at, updated_at
            FROM time_entries
            WHERE updated_at > %(since)s
            ORDER BY updated_at
        """,
        "arrow_schema": pa.schema([
            ("id", pa.string()),
            ("user_id", pa.string()),
            ("start_datetime", pa.timestamp("us", tz="UTC")),
            ("end_datetime", pa.timestamp("us", tz="UTC")),
            ("task_id", pa.string()),
            ("task_name", pa.string()),
            ("milestone_id", pa.string()),
            ("milestone_name", pa.string()),
            ("goal_id", pa.string()),
            ("goal_name", pa.string()),
            ("goal_color", pa.string()),
            ("description", pa.string()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
            ("_ingested_at", pa.timestamp("us", tz="UTC")),
        ]),
    },
    "bronze.tasks_raw": {
        "query": """
            SELECT id, user_id, milestone_id, parent_task_id, name,
                   estimated_minutes, completed, due_date, frequency,
                   days_of_week, sort_order, created_at, updated_at
            FROM tasks
            WHERE updated_at > %(since)s
            ORDER BY updated_at
        """,
        "arrow_schema": pa.schema([
            ("id", pa.string()),
            ("user_id", pa.string()),
            ("milestone_id", pa.string()),
            ("parent_task_id", pa.string()),
            ("name", pa.string()),
            ("estimated_minutes", pa.int32()),
            ("completed", pa.bool_()),
            ("due_date", pa.date32()),
            ("frequency", pa.string()),
            ("days_of_week", pa.list_(pa.int32())),
            ("sort_order", pa.int32()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
            ("_ingested_at", pa.timestamp("us", tz="UTC")),
        ]),
    },
    "bronze.notes_raw": {
        "query": """
            SELECT id, user_id, type, title, content, format, "date",
                   task_id, milestone_id, goal_id, milestone_name,
                   goal_name, goal_color, archived, created_at, updated_at
            FROM notes
            WHERE updated_at > %(since)s
            ORDER BY updated_at
        """,
        "arrow_schema": pa.schema([
            ("id", pa.string()),
            ("user_id", pa.string()),
            ("type", pa.string()),
            ("title", pa.string()),
            ("content", pa.string()),
            ("format", pa.string()),
            ("date", pa.date32()),
            ("task_id", pa.string()),
            ("milestone_id", pa.string()),
            ("goal_id", pa.string()),
            ("milestone_name", pa.string()),
            ("goal_name", pa.string()),
            ("goal_color", pa.string()),
            ("archived", pa.bool_()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
            ("_ingested_at", pa.timestamp("us", tz="UTC")),
        ]),
    },
}

# 初回取り込み用の最小日時
EPOCH = datetime(2000, 1, 1, tzinfo=timezone.utc)


def fetch_rows(dsn: str, query: str, since: datetime) -> list[dict]:
    """PostgreSQLからデータを取得"""
    with psycopg.connect(dsn) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(query, {"since": since})
            return cur.fetchall()


def rows_to_arrow(rows: list[dict], arrow_schema: pa.Schema) -> pa.Table:
    """dict行リストをArrow Tableに変換"""
    now = datetime.now(timezone.utc)

    columns = {}
    for field in arrow_schema:
        if field.name == "_ingested_at":
            columns[field.name] = [now] * len(rows)
        else:
            columns[field.name] = [
                str(row[field.name]) if field.name in UUID_COLUMNS
                                        and row.get(field.name) is not None
                else row.get(field.name)
                for row in rows
            ]

    return pa.table(columns, schema=arrow_schema)


def ingest_table(catalog, dsn: str, iceberg_table_name: str, config: dict):
    """1テーブル分のingestion"""
    table = catalog.load_table(iceberg_table_name)

    # TODO: 前回取り込み時刻を記録する仕組み（Phase2）
    # 現時点では毎回全件取り込み
    since = EPOCH

    print(f"  Fetching from PostgreSQL: {iceberg_table_name} (since {since.isoformat()})...")
    rows = fetch_rows(dsn, config["query"], since)

    if not rows:
        print(f"  No new rows for {iceberg_table_name}")
        return

    arrow_table = rows_to_arrow(rows, config["arrow_schema"])
    table.overwrite(arrow_table)
    print(f"  Ingested {len(rows)} rows into {iceberg_table_name}")


def main():
    catalog = get_catalog()
    dsn = get_pg_dsn()

    print("Bronze ingestion started.")
    for table_name, config in TABLES.items():
        ingest_table(catalog, dsn, table_name, config)
    print("Bronze ingestion complete.")


if __name__ == "__main__":
    main()
