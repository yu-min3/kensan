"""
Kensan Lakehouse - Dagster Definitions
全18アセット (Bronze 7 + Silver 7 + Gold 4) をオーケストレーション
"""

from dagster import DefaultScheduleStatus, Definitions, ScheduleDefinition, define_asset_job

from dagster_project.assets.bronze import bronze_assets
from dagster_project.assets.gold import (
    gold_ai_quality_weekly,
    gold_ai_usage_weekly,
    gold_goal_progress,
    gold_weekly_summary,
)
from dagster_project.assets.silver import (
    silver_ai_facts,
    silver_ai_interactions,
    silver_ai_reviews,
    silver_ai_token_usage,
    silver_notes,
    silver_tasks,
    silver_time_entries,
)
from dagster_project.resources import IcebergCatalogResource, PostgresDsnResource

all_assets = [
    *bronze_assets,
    silver_time_entries,
    silver_tasks,
    silver_notes,
    silver_ai_interactions,
    silver_ai_token_usage,
    silver_ai_facts,
    silver_ai_reviews,
    gold_weekly_summary,
    gold_goal_progress,
    gold_ai_usage_weekly,
    gold_ai_quality_weekly,
]

full_pipeline = define_asset_job(
    name="full_pipeline",
    selection="*",
    description="Bronze → Silver → Gold 全アセット実行",
)

daily_schedule = ScheduleDefinition(
    name="daily_schedule",
    job=full_pipeline,
    cron_schedule="0 2 * * *",
    default_status=DefaultScheduleStatus.STOPPED,
)

defs = Definitions(
    assets=all_assets,
    jobs=[full_pipeline],
    schedules=[daily_schedule],
    resources={
        "iceberg_catalog": IcebergCatalogResource(),
        "pg_dsn": PostgresDsnResource(),
    },
)
