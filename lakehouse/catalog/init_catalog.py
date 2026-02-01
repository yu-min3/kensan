"""
Nessie Catalog にIcebergテーブルを作成する。
冪等: 既存テーブルはスキップ。
"""

from pyiceberg.catalog import load_catalog
from pyiceberg.schema import Schema
from pyiceberg.types import (
    BooleanType,
    DateType,
    IntegerType,
    ListType,
    LongType,
    NestedField,
    StringType,
    TimestamptzType,
)
from pyiceberg.partitioning import PartitionSpec, PartitionField
from pyiceberg.transforms import MonthTransform

from config import get_catalog


def create_namespaces(catalog):
    """Bronze / Silver / Gold ネームスペースを作成"""
    for ns in ["bronze", "silver", "gold"]:
        try:
            catalog.create_namespace(ns)
            print(f"  Created namespace: {ns}")
        except Exception:
            print(f"  Namespace already exists: {ns}")


def create_bronze_tables(catalog):
    """Bronze層: PostgreSQLの生データをそのまま格納"""

    # bronze.time_entries_raw
    schema = Schema(
        NestedField(1, "id", StringType()),
        NestedField(2, "user_id", StringType()),
        NestedField(3, "start_datetime", TimestamptzType()),
        NestedField(4, "end_datetime", TimestamptzType()),
        NestedField(5, "task_id", StringType()),
        NestedField(6, "task_name", StringType()),
        NestedField(7, "milestone_id", StringType()),
        NestedField(8, "milestone_name", StringType()),
        NestedField(9, "goal_id", StringType()),
        NestedField(10, "goal_name", StringType()),
        NestedField(11, "goal_color", StringType()),
        NestedField(12, "description", StringType()),
        NestedField(13, "created_at", TimestamptzType()),
        NestedField(14, "updated_at", TimestamptzType()),
        NestedField(15, "_ingested_at", TimestamptzType()),
    )
    partition_spec = PartitionSpec(
        PartitionField(3, 1000, MonthTransform(), "start_datetime_month")
    )
    _create_table(catalog, "bronze.time_entries_raw", schema, partition_spec)

    # bronze.tasks_raw
    schema = Schema(
        NestedField(1, "id", StringType()),
        NestedField(2, "user_id", StringType()),
        NestedField(3, "milestone_id", StringType()),
        NestedField(4, "parent_task_id", StringType()),
        NestedField(5, "name", StringType()),
        NestedField(6, "estimated_minutes", IntegerType()),
        NestedField(7, "completed", BooleanType()),
        NestedField(8, "due_date", DateType()),
        NestedField(9, "frequency", StringType()),
        NestedField(10, "days_of_week", ListType(100, IntegerType(), element_required=False)),
        NestedField(11, "sort_order", IntegerType()),
        NestedField(12, "created_at", TimestamptzType()),
        NestedField(13, "updated_at", TimestamptzType()),
        NestedField(14, "_ingested_at", TimestamptzType()),
    )
    _create_table(catalog, "bronze.tasks_raw", schema)

    # bronze.notes_raw
    schema = Schema(
        NestedField(1, "id", StringType()),
        NestedField(2, "user_id", StringType()),
        NestedField(3, "type", StringType()),
        NestedField(4, "title", StringType()),
        NestedField(5, "content", StringType()),
        NestedField(6, "format", StringType()),
        NestedField(7, "date", DateType()),
        NestedField(8, "task_id", StringType()),
        NestedField(9, "milestone_id", StringType()),
        NestedField(10, "goal_id", StringType()),
        NestedField(11, "milestone_name", StringType()),
        NestedField(12, "goal_name", StringType()),
        NestedField(13, "goal_color", StringType()),
        NestedField(14, "archived", BooleanType()),
        NestedField(15, "created_at", TimestamptzType()),
        NestedField(16, "updated_at", TimestamptzType()),
        NestedField(17, "_ingested_at", TimestamptzType()),
    )
    _create_table(catalog, "bronze.notes_raw", schema)


def create_silver_tables(catalog):
    """Silver層: クリーニング・正規化済みデータ"""

    # silver.time_entries
    schema = Schema(
        NestedField(1, "id", StringType()),
        NestedField(2, "user_id", StringType()),
        NestedField(3, "date", DateType()),
        NestedField(4, "start_datetime", TimestamptzType()),
        NestedField(5, "end_datetime", TimestamptzType()),
        NestedField(6, "duration_minutes", IntegerType()),  # 算出値
        NestedField(7, "task_id", StringType()),
        NestedField(8, "task_name", StringType()),
        NestedField(9, "goal_name", StringType()),
        NestedField(10, "goal_color", StringType()),
        NestedField(11, "description", StringType()),
        NestedField(12, "created_at", TimestamptzType()),
        NestedField(13, "updated_at", TimestamptzType()),
    )
    partition_spec = PartitionSpec(
        PartitionField(3, 1000, MonthTransform(), "date_month")
    )
    _create_table(catalog, "silver.time_entries", schema, partition_spec)

    # silver.tasks
    schema = Schema(
        NestedField(1, "id", StringType()),
        NestedField(2, "user_id", StringType()),
        NestedField(3, "name", StringType()),
        NestedField(4, "completed", BooleanType()),
        NestedField(5, "milestone_id", StringType()),
        NestedField(6, "parent_task_id", StringType()),
        NestedField(7, "is_subtask", BooleanType()),  # parent有無
        NestedField(8, "estimated_minutes", IntegerType()),
        NestedField(9, "due_date", DateType()),
        NestedField(10, "frequency", StringType()),
        NestedField(11, "created_at", TimestamptzType()),
        NestedField(12, "updated_at", TimestamptzType()),
    )
    _create_table(catalog, "silver.tasks", schema)

    # silver.notes
    schema = Schema(
        NestedField(1, "id", StringType()),
        NestedField(2, "user_id", StringType()),
        NestedField(3, "type", StringType()),
        NestedField(4, "title", StringType()),
        NestedField(5, "content_length", IntegerType()),  # 本文長
        NestedField(6, "format", StringType()),
        NestedField(7, "date", DateType()),
        NestedField(8, "goal_name", StringType()),
        NestedField(9, "archived", BooleanType()),
        NestedField(10, "created_at", TimestamptzType()),
        NestedField(11, "updated_at", TimestamptzType()),
    )
    _create_table(catalog, "silver.notes", schema)


def create_gold_tables(catalog):
    """Gold層: 分析用集計テーブル"""

    # gold.weekly_summary
    schema = Schema(
        NestedField(1, "user_id", StringType()),
        NestedField(2, "week_start", DateType()),
        NestedField(3, "total_minutes", LongType()),
        NestedField(4, "task_count", IntegerType()),
        NestedField(5, "completed_task_count", IntegerType()),
        NestedField(6, "note_count", IntegerType()),
        NestedField(7, "diary_count", IntegerType()),
        NestedField(8, "learning_count", IntegerType()),
    )
    _create_table(catalog, "gold.weekly_summary", schema)

    # gold.goal_progress
    schema = Schema(
        NestedField(1, "user_id", StringType()),
        NestedField(2, "goal_name", StringType()),
        NestedField(3, "week_start", DateType()),
        NestedField(4, "total_minutes", LongType()),
        NestedField(5, "entry_count", IntegerType()),
    )
    _create_table(catalog, "gold.goal_progress", schema)


def _create_table(catalog, name, schema, partition_spec=None):
    """テーブル作成（冪等）"""
    try:
        if partition_spec:
            catalog.create_table(name, schema=schema, partition_spec=partition_spec)
        else:
            catalog.create_table(name, schema=schema)
        print(f"  Created table: {name}")
    except Exception as e:
        if "already exists" in str(e).lower():
            print(f"  Table already exists: {name}")
        else:
            raise


def main():
    catalog = get_catalog()

    print("Creating namespaces...")
    create_namespaces(catalog)

    print("Creating Bronze tables...")
    create_bronze_tables(catalog)

    print("Creating Silver tables...")
    create_silver_tables(catalog)

    print("Creating Gold tables...")
    create_gold_tables(catalog)

    print("Done.")


if __name__ == "__main__":
    main()
