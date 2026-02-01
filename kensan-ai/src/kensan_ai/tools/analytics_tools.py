"""Analytics tools for AI agent."""

from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from kensan_ai.tools.base import tool
from kensan_ai.db.queries.analytics import (
    get_analytics_summary as db_get_analytics_summary,
    get_daily_summary as db_get_daily_summary,
)
from kensan_ai.lib.parsers import parse_uuid, parse_date

# Default timezone for converting local dates to UTC ranges
_DEFAULT_TZ = ZoneInfo("Asia/Tokyo")


def _local_date_to_utc_range(
    target_date: date,
) -> tuple[datetime, datetime]:
    """Convert a local date to a UTC datetime range (start inclusive, end exclusive)."""
    start_local = datetime(target_date.year, target_date.month, target_date.day, tzinfo=_DEFAULT_TZ)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(ZoneInfo("UTC")), end_local.astimezone(ZoneInfo("UTC"))


@tool(
    name="get_analytics_summary",
    description="週次または月次の稼働サマリーを取得する。目標別の時間配分を確認する。",
    input_schema={
        "properties": {
            "period": {"type": "string", "enum": ["weekly", "monthly"], "description": "集計期間"},
            "start_date": {"type": "string", "description": "開始日 (YYYY-MM-DD)"},
            "end_date": {"type": "string", "description": "終了日 (YYYY-MM-DD)"},
        },
        "required": ["period", "start_date", "end_date"],
    },
)
async def get_analytics_summary(args: dict[str, Any]) -> dict[str, Any]:
    """Get analytics summary for a period."""
    user_id = parse_uuid(args.get("user_id"))
    start = parse_date(args.get("start_date"))
    end = parse_date(args.get("end_date"))
    if not user_id or not start or not end:
        return {"error": "Invalid or missing user_id, start_date, or end_date"}

    # Convert local dates to UTC datetime range
    start_dt, _ = _local_date_to_utc_range(start)
    _, end_dt = _local_date_to_utc_range(end)

    summary = await db_get_analytics_summary(
        user_id=user_id,
        period=args.get("period", "weekly"),
        start_datetime=start_dt,
        end_datetime=end_dt,
    )
    return {"summary": summary}


@tool(
    name="get_daily_summary",
    description="特定日の時間配分サマリーを取得する。計画vs実績の比較に使う。",
    input_schema={
        "properties": {
            "date": {"type": "string", "description": "日付 (YYYY-MM-DD)。省略時は今日"},
        },
        "required": [],
    },
)
async def get_daily_summary(args: dict[str, Any]) -> dict[str, Any]:
    """Get daily summary with planned vs actual comparison."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    target_date = parse_date(args.get("date"))
    if not target_date:
        target_date = date.today()

    # Convert local date to UTC datetime range
    start_dt, end_dt = _local_date_to_utc_range(target_date)

    summary = await db_get_daily_summary(
        user_id=user_id,
        start_datetime=start_dt,
        end_datetime=end_dt,
    )
    return {"summary": summary}


ALL_ANALYTICS_TOOLS = [
    get_analytics_summary,
    get_daily_summary,
]
