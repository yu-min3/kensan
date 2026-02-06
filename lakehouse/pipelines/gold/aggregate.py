"""
Gold Aggregation: Silver → Gold
週次サマリーとゴール別進捗の集計
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

import pyarrow as pa

from catalog.config import get_catalog, setup_logging

if TYPE_CHECKING:
    from pyiceberg.catalog import Catalog

logger = setup_logging("gold.aggregate")


class AggregationError(Exception):
    """Aggregation処理中のエラー"""

    pass


def _iso_week_start(date_val: date | None) -> date | None:
    """日付からISO週の月曜日を算出"""
    if date_val is None:
        return None
    weekday = date_val.weekday()  # 0=月曜
    return date_val - timedelta(days=weekday)


def aggregate_weekly_summary(catalog: Catalog) -> int:
    """週次サマリー: 時間、タスク、ノートの集計

    Returns:
        集計した行数

    Raises:
        AggregationError: 集計処理に失敗した場合
    """
    try:
        silver_time = catalog.load_table("silver.time_entries")
        silver_tasks = catalog.load_table("silver.tasks")
        silver_notes = catalog.load_table("silver.notes")
        gold = catalog.load_table("gold.weekly_summary")

        time_df = silver_time.scan().to_arrow()
        tasks_df = silver_tasks.scan().to_arrow()
        notes_df = silver_notes.scan().to_arrow()
    except Exception as e:
        raise AggregationError(f"Failed to load weekly_summary tables: {e}") from e

    # user_id × week_start ごとに集計
    summaries: dict[tuple[str, date | None], dict[str, int]] = {}

    # 時間集計
    for i in range(len(time_df)):
        user_id = time_df.column("user_id")[i].as_py()
        date_val = time_df.column("date")[i].as_py()
        minutes = time_df.column("duration_minutes")[i].as_py() or 0

        if date_val is None:
            continue

        week_start = _iso_week_start(date_val)
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
        date_val = notes_df.column("date")[i].as_py()
        note_type = notes_df.column("type")[i].as_py()

        if date_val is None:
            created = notes_df.column("created_at")[i].as_py()
            if created:
                date_val = created.date()
            else:
                continue

        week_start = _iso_week_start(date_val)
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
        logger.info("No data to aggregate for weekly_summary")
        return 0

    try:
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
    except Exception as e:
        raise AggregationError(f"Failed to write weekly_summary: {e}") from e

    logger.info(f"Aggregated {len(gold_table)} weekly summaries to Gold")
    return len(gold_table)


def aggregate_goal_progress(catalog: Catalog) -> int:
    """ゴール別の週次進捗

    Returns:
        集計した行数

    Raises:
        AggregationError: 集計処理に失敗した場合
    """
    try:
        silver_time = catalog.load_table("silver.time_entries")
        gold = catalog.load_table("gold.goal_progress")
        time_df = silver_time.scan().to_arrow()
    except Exception as e:
        raise AggregationError(f"Failed to load goal_progress tables: {e}") from e

    progress: dict[tuple[str, str, date | None], dict[str, int]] = {}

    for i in range(len(time_df)):
        user_id = time_df.column("user_id")[i].as_py()
        date_val = time_df.column("date")[i].as_py()
        goal_name = time_df.column("goal_name")[i].as_py()
        minutes = time_df.column("duration_minutes")[i].as_py() or 0

        if date_val is None or not goal_name:
            continue

        week_start = _iso_week_start(date_val)
        key = (user_id, goal_name, week_start)
        if key not in progress:
            progress[key] = {"total_minutes": 0, "entry_count": 0}
        progress[key]["total_minutes"] += minutes
        progress[key]["entry_count"] += 1

    if not progress:
        logger.info("No data to aggregate for goal_progress")
        return 0

    try:
        gold_table = pa.table({
            "user_id": pa.array([k[0] for k in progress], type=pa.string()),
            "goal_name": pa.array([k[1] for k in progress], type=pa.string()),
            "week_start": pa.array([k[2] for k in progress], type=pa.date32()),
            "total_minutes": pa.array([v["total_minutes"] for v in progress.values()], type=pa.int64()),
            "entry_count": pa.array([v["entry_count"] for v in progress.values()], type=pa.int32()),
        })
        gold.overwrite(gold_table)
    except Exception as e:
        raise AggregationError(f"Failed to write goal_progress: {e}") from e

    logger.info(f"Aggregated {len(gold_table)} goal progress entries to Gold")
    return len(gold_table)


def aggregate_ai_usage_weekly(catalog: Catalog) -> int:
    """AI使用量の週次集計

    Returns:
        集計した行数

    Raises:
        AggregationError: 集計処理に失敗した場合
    """
    try:
        silver_interactions = catalog.load_table("silver.ai_interactions")
        gold = catalog.load_table("gold.ai_usage_weekly")
        df = silver_interactions.scan().to_arrow()
    except Exception as e:
        raise AggregationError(f"Failed to load ai_usage_weekly tables: {e}") from e

    if len(df) == 0:
        logger.info("No data to aggregate for ai_usage_weekly")
        return 0

    summaries: dict[tuple[str, date | None], dict[str, Any]] = {}

    for i in range(len(df)):
        user_id = df.column("user_id")[i].as_py()
        date_val = df.column("date")[i].as_py()
        situation = df.column("situation")[i].as_py() or "chat"
        tokens_in = df.column("tokens_input")[i].as_py() or 0
        tokens_out = df.column("tokens_output")[i].as_py() or 0
        latency = df.column("latency_ms")[i].as_py() or 0
        tool_names_json = df.column("tool_names_json")[i].as_py()

        if date_val is None:
            continue

        week_start = _iso_week_start(date_val)
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "interaction_count": 0,
                "tokens_input_total": 0,
                "tokens_output_total": 0,
                "tokens_total": 0,
                "latency_sum": 0,
                "situation_dist": {},
                "tool_usage": {},
                "web_search_count": 0,
            }

        s = summaries[key]
        s["interaction_count"] += 1
        s["tokens_input_total"] += tokens_in
        s["tokens_output_total"] += tokens_out
        s["tokens_total"] += tokens_in + tokens_out
        s["latency_sum"] += latency

        # situation distribution
        s["situation_dist"][situation] = s["situation_dist"].get(situation, 0) + 1

        # tool usage
        if tool_names_json:
            try:
                names = json.loads(tool_names_json)
                for name in names:
                    s["tool_usage"][name] = s["tool_usage"].get(name, 0) + 1
                    if name == "web_search":
                        s["web_search_count"] += 1
            except (json.JSONDecodeError, TypeError):
                pass

    if not summaries:
        logger.info("No data to aggregate for ai_usage_weekly")
        return 0

    try:
        gold_table = pa.table({
            "user_id": pa.array([k[0] for k in summaries], type=pa.string()),
            "week_start": pa.array([k[1] for k in summaries], type=pa.date32()),
            "interaction_count": pa.array(
                [v["interaction_count"] for v in summaries.values()], type=pa.int32()
            ),
            "tokens_input_total": pa.array(
                [v["tokens_input_total"] for v in summaries.values()], type=pa.int64()
            ),
            "tokens_output_total": pa.array(
                [v["tokens_output_total"] for v in summaries.values()], type=pa.int64()
            ),
            "tokens_total": pa.array(
                [v["tokens_total"] for v in summaries.values()], type=pa.int64()
            ),
            "avg_latency_ms": pa.array(
                [
                    v["latency_sum"] // v["interaction_count"] if v["interaction_count"] > 0 else 0
                    for v in summaries.values()
                ],
                type=pa.int32(),
            ),
            "situation_distribution_json": pa.array(
                [json.dumps(v["situation_dist"], ensure_ascii=False) for v in summaries.values()],
                type=pa.string(),
            ),
            "tool_usage_json": pa.array(
                [json.dumps(v["tool_usage"], ensure_ascii=False) for v in summaries.values()],
                type=pa.string(),
            ),
            "web_search_count": pa.array(
                [v["web_search_count"] for v in summaries.values()], type=pa.int32()
            ),
        })
        gold.overwrite(gold_table)
    except Exception as e:
        raise AggregationError(f"Failed to write ai_usage_weekly: {e}") from e

    logger.info(f"Aggregated {len(gold_table)} AI usage weekly records to Gold")
    return len(gold_table)


def aggregate_ai_quality_weekly(catalog: Catalog) -> int:
    """AI品質の週次集計

    Silver層のai_interactions, ai_facts, ai_reviewsから集計。
    Medallionパターンに準拠（Gold → Silver のみ）。

    Returns:
        集計した行数

    Raises:
        AggregationError: 集計処理に失敗した場合
    """
    try:
        silver_interactions = catalog.load_table("silver.ai_interactions")
        silver_facts = catalog.load_table("silver.ai_facts")
        silver_reviews = catalog.load_table("silver.ai_reviews")
        gold = catalog.load_table("gold.ai_quality_weekly")

        interactions_df = silver_interactions.scan().to_arrow()
        facts_df = silver_facts.scan().to_arrow()
        reviews_df = silver_reviews.scan().to_arrow()
    except Exception as e:
        raise AggregationError(f"Failed to load ai_quality_weekly tables: {e}") from e

    summaries: dict[tuple[str, date | None], dict[str, Any]] = {}

    # Rating集計 (silver.ai_interactions)
    for i in range(len(interactions_df)):
        user_id = interactions_df.column("user_id")[i].as_py()
        date_val = interactions_df.column("date")[i].as_py()
        rating = interactions_df.column("rating")[i].as_py()

        if date_val is None:
            continue

        week_start = _iso_week_start(date_val)
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "rated_count": 0,
                "rating_sum": 0,
                "fact_count": 0,
                "review_generated": False,
            }

        if rating is not None:
            summaries[key]["rated_count"] += 1
            summaries[key]["rating_sum"] += rating

    # Fact集計 (silver.ai_facts)
    for i in range(len(facts_df)):
        user_id = facts_df.column("user_id")[i].as_py()
        date_val = facts_df.column("date")[i].as_py()

        if date_val is None:
            continue

        week_start = _iso_week_start(date_val)
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "rated_count": 0,
                "rating_sum": 0,
                "fact_count": 0,
                "review_generated": False,
            }
        summaries[key]["fact_count"] += 1

    # Review集計 (silver.ai_reviews)
    for i in range(len(reviews_df)):
        user_id = reviews_df.column("user_id")[i].as_py()
        week_start_val = reviews_df.column("week_start")[i].as_py()

        if week_start_val is None:
            continue

        week_start = _iso_week_start(week_start_val)
        key = (user_id, week_start)
        if key not in summaries:
            summaries[key] = {
                "rated_count": 0,
                "rating_sum": 0,
                "fact_count": 0,
                "review_generated": False,
            }
        summaries[key]["review_generated"] = True

    if not summaries:
        logger.info("No data to aggregate for ai_quality_weekly")
        return 0

    try:
        gold_table = pa.table({
            "user_id": pa.array([k[0] for k in summaries], type=pa.string()),
            "week_start": pa.array([k[1] for k in summaries], type=pa.date32()),
            "rated_count": pa.array(
                [v["rated_count"] for v in summaries.values()], type=pa.int32()
            ),
            "avg_rating": pa.array(
                [
                    v["rating_sum"] / v["rated_count"] if v["rated_count"] > 0 else None
                    for v in summaries.values()
                ],
                type=pa.float32(),
            ),
            "fact_count": pa.array(
                [v["fact_count"] for v in summaries.values()], type=pa.int32()
            ),
            "review_generated": pa.array(
                [v["review_generated"] for v in summaries.values()], type=pa.bool_()
            ),
        })
        gold.overwrite(gold_table)
    except Exception as e:
        raise AggregationError(f"Failed to write ai_quality_weekly: {e}") from e

    logger.info(f"Aggregated {len(gold_table)} AI quality weekly records to Gold")
    return len(gold_table)


def main() -> None:
    """メインエントリーポイント"""
    logger.info("Gold aggregation started.")

    try:
        catalog = get_catalog()
    except Exception as e:
        logger.error(f"Failed to initialize catalog: {e}")
        raise SystemExit(1) from e

    errors: list[str] = []
    aggregations = [
        ("weekly_summary", aggregate_weekly_summary),
        ("goal_progress", aggregate_goal_progress),
        ("ai_usage_weekly", aggregate_ai_usage_weekly),
        ("ai_quality_weekly", aggregate_ai_quality_weekly),
    ]

    for name, func in aggregations:
        try:
            func(catalog)
        except AggregationError as e:
            logger.error(f"Failed to aggregate {name}: {e}")
            errors.append(name)
            continue

    if errors:
        logger.warning(f"Gold aggregation completed with errors: {errors}")
    else:
        logger.info("Gold aggregation complete.")


if __name__ == "__main__":
    main()
