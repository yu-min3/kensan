"""Review tools for AI agent."""

from typing import Any

from kensan_ai.tools.base import tool
from kensan_ai.db.queries import ai_reviews
from kensan_ai.lib.parsers import parse_uuid, parse_date


@tool(
    name="get_reviews",
    description="過去のAI週次レビュー一覧を取得する。",
    input_schema={
        "properties": {
            "limit": {"type": "integer", "description": "取得件数（デフォルト10）"},
        },
        "required": [],
    },
)
async def get_reviews(args: dict[str, Any]) -> dict[str, Any]:
    """Get list of AI review reports."""
    user_id = parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}
    reviews = await ai_reviews.list_reviews(user_id)
    limit = args.get("limit", 10)
    return {"reviews": reviews[:limit]}


@tool(
    name="get_review",
    description="特定のAI週次レビューを取得する。事前に get_reviews でIDを確認すること。",
    input_schema={
        "properties": {
            "review_id": {"type": "string", "description": "レビューID"},
        },
        "required": ["review_id"],
    },
)
async def get_review(args: dict[str, Any]) -> dict[str, Any]:
    """Get a specific AI review report."""
    user_id = parse_uuid(args.get("user_id"))
    review_id = parse_uuid(args.get("review_id"))
    if not user_id or not review_id:
        return {"error": "Invalid or missing user_id or review_id"}
    review = await ai_reviews.get_review(review_id, user_id)
    if review is None:
        return {"error": "Review not found"}
    return {"review": review}


@tool(
    name="generate_weekly_review",
    description="指定した週の週次レビューを生成しDBに保存する。事前に get_analytics_summary と get_time_entries で週のデータを取得してから生成すること。",
    readonly=False,
    input_schema={
        "properties": {
            "week_start": {"type": "string", "description": "週の開始日 (YYYY-MM-DD, 月曜日)"},
            "week_end": {"type": "string", "description": "週の終了日 (YYYY-MM-DD, 日曜日)"},
            "summary": {"type": "string", "description": "週の概要"},
            "good_points": {"type": "array", "items": {"type": "string"}, "description": "良かった点"},
            "improvement_points": {"type": "array", "items": {"type": "string"}, "description": "改善点"},
            "advice": {"type": "array", "items": {"type": "string"}, "description": "来週へのアドバイス"},
        },
        "required": ["week_start", "week_end", "summary", "good_points", "improvement_points", "advice"],
    },
)
async def generate_weekly_review(args: dict[str, Any]) -> dict[str, Any]:
    """Generate and save a weekly review report."""
    user_id = parse_uuid(args.get("user_id"))
    week_start = parse_date(args.get("week_start"))
    week_end = parse_date(args.get("week_end"))

    if not user_id or not week_start or not week_end:
        return {"error": "Invalid or missing user_id, week_start, or week_end"}

    review = await ai_reviews.create_review(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
        summary=args.get("summary", ""),
        good_points=args.get("good_points", []),
        improvement_points=args.get("improvement_points", []),
        advice=args.get("advice", []),
    )
    return {"review": review}


ALL_REVIEW_TOOLS = [
    get_reviews,
    get_review,
    generate_weekly_review,
]
