"""
Silver Assets: Bronze → Silver 変換
既存の transform.py をラップ
"""

import sys
from pathlib import Path

from dagster import AssetExecutionContext, asset

from dagster_project.resources import IcebergCatalogResource

# 既存パイプラインをインポート可能にする
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "pipelines" / "silver"))
from transform import (
    transform_ai_interactions,
    transform_ai_token_usage,
    transform_notes,
    transform_tasks,
    transform_time_entries,
)


@asset(
    deps=["bronze_time_entries_raw"],
    group_name="silver",
    compute_kind="pyarrow",
)
def silver_time_entries(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    transform_time_entries(catalog)


@asset(
    deps=["bronze_tasks_raw"],
    group_name="silver",
    compute_kind="pyarrow",
)
def silver_tasks(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    transform_tasks(catalog)


@asset(
    deps=["bronze_notes_raw"],
    group_name="silver",
    compute_kind="pyarrow",
)
def silver_notes(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    transform_notes(catalog)


@asset(
    deps=["bronze_ai_interactions_raw"],
    group_name="silver",
    compute_kind="pyarrow",
)
def silver_ai_interactions(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    transform_ai_interactions(catalog)


@asset(
    deps=["bronze_ai_interactions_raw"],
    group_name="silver",
    compute_kind="pyarrow",
)
def silver_ai_token_usage(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    transform_ai_token_usage(catalog)
