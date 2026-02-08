"""
Kensan Lakehouse - Dagster Definitions
全29アセット (Bronze 10 + Silver 12 + Gold 7) をオーケストレーション
"""

from dagster import AssetSelection, DefaultScheduleStatus, Definitions, ScheduleDefinition, define_asset_job

from dagster_project.assets.bronze import bronze_assets
from dagster_project.assets.bronze_loki import bronze_ai_explorer_events_raw
from dagster_project.assets.gold import (
    gold_ai_quality_weekly,
    gold_ai_usage_weekly,
    gold_emotion_weekly,
    gold_goal_progress,
    gold_user_interest_profile,
    gold_user_trait_profile,
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
from dagster_project.assets.silver_emotion import silver_emotion_segments
from dagster_project.assets.silver_explorer import (
    silver_ai_explorer_events,
    silver_ai_explorer_interactions,
)
from dagster_project.assets.silver_tags import silver_tag_usage_profile
from dagster_project.assets.silver_traits import silver_user_trait_segments
from dagster_project.resources import IcebergCatalogResource, LokiResource, PostgresDsnResource

all_assets = [
    *bronze_assets,
    bronze_ai_explorer_events_raw,
    silver_time_entries,
    silver_tasks,
    silver_notes,
    silver_ai_interactions,
    silver_ai_token_usage,
    silver_ai_facts,
    silver_ai_reviews,
    silver_emotion_segments,
    silver_tag_usage_profile,
    silver_user_trait_segments,
    silver_ai_explorer_interactions,
    silver_ai_explorer_events,
    gold_weekly_summary,
    gold_goal_progress,
    gold_ai_usage_weekly,
    gold_ai_quality_weekly,
    gold_user_interest_profile,
    gold_user_trait_profile,
    gold_emotion_weekly,
]

full_pipeline = define_asset_job(
    name="full_pipeline",
    selection="*",
    description="Bronze → Silver → Gold 全アセット実行",
)

ai_explorer_pipeline = define_asset_job(
    name="ai_explorer_pipeline",
    selection=AssetSelection.assets(
        bronze_ai_explorer_events_raw,
        silver_ai_explorer_interactions,
        silver_ai_explorer_events,
    ),
    description="Loki → Bronze → Silver AI Explorer パイプライン",
)

daily_schedule = ScheduleDefinition(
    name="daily_schedule",
    job=full_pipeline,
    cron_schedule="0 2 * * *",
    default_status=DefaultScheduleStatus.RUNNING,
)

ai_explorer_schedule = ScheduleDefinition(
    name="ai_explorer_schedule",
    job=ai_explorer_pipeline,
    cron_schedule="*/5 * * * *",
    default_status=DefaultScheduleStatus.RUNNING,
)

defs = Definitions(
    assets=all_assets,
    jobs=[full_pipeline, ai_explorer_pipeline],
    schedules=[daily_schedule, ai_explorer_schedule],
    resources={
        "iceberg_catalog": IcebergCatalogResource(),
        "pg_dsn": PostgresDsnResource(),
        "loki": LokiResource(),
    },
)
