"""
Dagster Definitions の構造テスト
アセット数、依存関係、ジョブ、スケジュールが正しく定義されているかを検証
"""

from dagster import AssetKey

from dagster_project import all_assets, defs, daily_schedule, full_pipeline
from dagster_project.assets.bronze import bronze_assets


# ---------------------------------------------------------------------------
# アセット登録
# ---------------------------------------------------------------------------

def test_total_asset_count():
    """Bronze 7 + Silver 7 + Gold 4 = 18 アセットが登録されている"""
    assert len(all_assets) == 18


def test_bronze_asset_count():
    """Bronze レイヤーは 7 テーブル分のアセットを持つ"""
    assert len(bronze_assets) == 7


def test_bronze_asset_names():
    """Bronze アセット名が期待通り"""
    names = {a.key.to_user_string() for a in bronze_assets}
    expected = {
        "bronze_time_entries_raw",
        "bronze_tasks_raw",
        "bronze_notes_raw",
        "bronze_ai_interactions_raw",
        "bronze_ai_facts_raw",
        "bronze_ai_reviews_raw",
        "bronze_ai_contexts_raw",
    }
    assert names == expected


def test_silver_asset_names():
    """Silver アセット名が期待通り"""
    silver = [a for a in all_assets if hasattr(a, 'key') and a.key.to_user_string().startswith("silver_")]
    names = {a.key.to_user_string() for a in silver}
    expected = {
        "silver_time_entries",
        "silver_tasks",
        "silver_notes",
        "silver_ai_interactions",
        "silver_ai_token_usage",
        "silver_ai_facts",
        "silver_ai_reviews",
    }
    assert names == expected


def test_gold_asset_names():
    """Gold アセット名が期待通り"""
    gold = [a for a in all_assets if hasattr(a, 'key') and a.key.to_user_string().startswith("gold_")]
    names = {a.key.to_user_string() for a in gold}
    expected = {
        "gold_weekly_summary",
        "gold_goal_progress",
        "gold_ai_usage_weekly",
        "gold_ai_quality_weekly",
    }
    assert names == expected


# ---------------------------------------------------------------------------
# 依存関係
# ---------------------------------------------------------------------------

def _get_asset_dep_keys(asset_def) -> set[str]:
    """アセットの依存先キーを文字列 set で返す"""
    spec = next(iter(asset_def.specs))
    return {dep.asset_key.to_user_string() for dep in spec.deps}


def _find_asset(name: str):
    return next(a for a in all_assets if a.key == AssetKey(name))


def test_silver_time_entries_depends_on_bronze():
    asset = _find_asset("silver_time_entries")
    assert "bronze_time_entries_raw" in _get_asset_dep_keys(asset)


def test_silver_ai_interactions_depends_on_bronze():
    asset = _find_asset("silver_ai_interactions")
    assert "bronze_ai_interactions_raw" in _get_asset_dep_keys(asset)


def test_gold_weekly_summary_depends_on_silver():
    asset = _find_asset("gold_weekly_summary")
    deps = _get_asset_dep_keys(asset)
    assert "silver_time_entries" in deps
    assert "silver_tasks" in deps
    assert "silver_notes" in deps


def test_gold_ai_quality_depends_on_silver_only():
    """gold_ai_quality_weekly は Silver のみに依存 (Medallionパターン準拠)"""
    asset = _find_asset("gold_ai_quality_weekly")
    deps = _get_asset_dep_keys(asset)
    assert "silver_ai_interactions" in deps
    assert "silver_ai_facts" in deps
    assert "silver_ai_reviews" in deps
    # Bronze直接依存がないことを確認
    assert not any(d.startswith("bronze_") for d in deps)


# ---------------------------------------------------------------------------
# ジョブ / スケジュール
# ---------------------------------------------------------------------------

def test_full_pipeline_job():
    """full_pipeline ジョブが存在する"""
    assert full_pipeline.name == "full_pipeline"


def test_daily_schedule():
    """daily_schedule が毎日 02:00、初期 STOPPED"""
    assert daily_schedule.cron_schedule == "0 2 * * *"
    assert daily_schedule.default_status.value == "STOPPED"


# ---------------------------------------------------------------------------
# Definitions 統合
# ---------------------------------------------------------------------------

def test_definitions_resolve():
    """Definitions が矛盾なく解決される"""
    repo = defs.get_repository_def()
    asset_keys = repo.asset_graph.get_all_asset_keys()
    assert len(asset_keys) == 18


def test_definitions_resources():
    """iceberg_catalog と pg_dsn リソースが登録されている"""
    repo = defs.get_repository_def()
    resource_defs = repo.get_top_level_resources()
    assert "iceberg_catalog" in resource_defs
    assert "pg_dsn" in resource_defs
