"""
Gold Assets: Silver → Gold 週次集計
既存の aggregate.py をラップ
"""

from dagster import AssetExecutionContext, asset

from dagster_project.resources import IcebergCatalogResource
from pipelines.gold.aggregate import (
    aggregate_ai_quality_weekly,
    aggregate_ai_usage_weekly,
    aggregate_goal_progress,
    aggregate_weekly_summary,
)


@asset(
    deps=["silver_time_entries", "silver_tasks", "silver_notes"],
    group_name="gold",
    compute_kind="aggregation",
)
def gold_weekly_summary(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    aggregate_weekly_summary(catalog)


@asset(
    deps=["silver_time_entries"],
    group_name="gold",
    compute_kind="aggregation",
)
def gold_goal_progress(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    aggregate_goal_progress(catalog)


@asset(
    deps=["silver_ai_interactions"],
    group_name="gold",
    compute_kind="aggregation",
)
def gold_ai_usage_weekly(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    aggregate_ai_usage_weekly(catalog)


@asset(
    deps=[
        "silver_ai_interactions",
        "silver_ai_facts",
        "silver_ai_reviews",
    ],
    group_name="gold",
    compute_kind="aggregation",
)
def gold_ai_quality_weekly(
    context: AssetExecutionContext, iceberg_catalog: IcebergCatalogResource
):
    catalog = iceberg_catalog.get_catalog()
    aggregate_ai_quality_weekly(catalog)
