"""Prompt evaluation and experiment queries."""

import json
import logging
from datetime import date
from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection

logger = logging.getLogger(__name__)


async def create_evaluation(
    context_id: UUID,
    period_start: date,
    period_end: date,
    interaction_count: int,
    avg_rating: float | None,
    rated_count: int,
    tool_success_rate: float | None,
    avg_turns: float | None,
    avg_tokens: float | None,
    strengths: list[str],
    weaknesses: list[str],
    improvement_suggestions: list[str],
    sample_analysis: dict | None = None,
    user_id: UUID | None = None,
) -> UUID | None:
    """Create a prompt evaluation. Returns None if duplicate (ON CONFLICT DO NOTHING)."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO prompt_evaluations (
                context_id, period_start, period_end,
                interaction_count, avg_rating, rated_count,
                tool_success_rate, avg_turns, avg_tokens,
                strengths, weaknesses, improvement_suggestions,
                sample_analysis, user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            context_id,
            period_start,
            period_end,
            interaction_count,
            avg_rating,
            rated_count,
            tool_success_rate,
            avg_turns,
            avg_tokens,
            strengths,
            weaknesses,
            improvement_suggestions,
            json.dumps(sample_analysis or {}, ensure_ascii=False),
            user_id,
        )
        if row is None:
            return None
        return row["id"]


async def get_evaluation(evaluation_id: UUID) -> dict[str, Any] | None:
    """Get a single evaluation by ID."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, context_id, period_start, period_end,
                   interaction_count, avg_rating, rated_count,
                   tool_success_rate, avg_turns, avg_tokens,
                   strengths, weaknesses, improvement_suggestions,
                   sample_analysis, created_at
            FROM prompt_evaluations
            WHERE id = $1
            """,
            evaluation_id,
        )
        if row is None:
            return None
        return _evaluation_row_to_dict(row)


async def create_experiment(
    situation: str,
    evaluation_id: UUID,
    control_context_id: UUID,
    variant_context_id: UUID,
    challenge_type: str = "side_by_side",
    challenge_config: dict | None = None,
    user_id: UUID | None = None,
) -> UUID:
    """Create a prompt experiment."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO prompt_experiments (
                situation, evaluation_id, control_context_id, variant_context_id,
                challenge_type, challenge_config, user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """,
            situation,
            evaluation_id,
            control_context_id,
            variant_context_id,
            challenge_type,
            json.dumps(challenge_config or {}, ensure_ascii=False),
            user_id,
        )
        return row["id"]


async def get_experiment(experiment_id: UUID) -> dict[str, Any] | None:
    """Get a single experiment by ID with joined context and evaluation data."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT e.id, e.situation, e.evaluation_id,
                   e.control_context_id, e.variant_context_id,
                   e.status, e.challenge_type, e.challenge_config,
                   e.challenge_results, e.win_rate, e.resolved_at, e.created_at,
                   ctrl.name AS control_name, ctrl.system_prompt AS control_prompt,
                   var.name AS variant_name, var.system_prompt AS variant_prompt,
                   ev.avg_rating AS eval_avg_rating, ev.interaction_count AS eval_interaction_count,
                   ev.weaknesses AS eval_weaknesses, ev.strengths AS eval_strengths
            FROM prompt_experiments e
            JOIN ai_contexts ctrl ON ctrl.id = e.control_context_id
            JOIN ai_contexts var ON var.id = e.variant_context_id
            JOIN prompt_evaluations ev ON ev.id = e.evaluation_id
            WHERE e.id = $1
            """,
            experiment_id,
        )
        if row is None:
            return None
        return _experiment_row_to_dict(row)


async def list_experiments(
    status: str | None = None,
    situation: str | None = None,
    user_id: UUID | None = None,
) -> list[dict[str, Any]]:
    """List experiments with optional filtering."""
    async with get_connection() as conn:
        conditions = []
        params: list[Any] = []
        idx = 1

        if status:
            conditions.append(f"e.status = ${idx}")
            params.append(status)
            idx += 1

        if situation:
            conditions.append(f"e.situation = ${idx}")
            params.append(situation)
            idx += 1

        if user_id:
            conditions.append(f"e.user_id = ${idx}")
            params.append(user_id)
            idx += 1
        else:
            conditions.append("e.user_id IS NULL")

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        rows = await conn.fetch(
            f"""
            SELECT e.id, e.situation, e.evaluation_id,
                   e.control_context_id, e.variant_context_id,
                   e.status, e.challenge_type, e.challenge_config,
                   e.challenge_results, e.win_rate, e.resolved_at, e.created_at,
                   ctrl.name AS control_name, ctrl.system_prompt AS control_prompt,
                   var.name AS variant_name, var.system_prompt AS variant_prompt,
                   ev.avg_rating AS eval_avg_rating, ev.interaction_count AS eval_interaction_count,
                   ev.weaknesses AS eval_weaknesses, ev.strengths AS eval_strengths
            FROM prompt_experiments e
            JOIN ai_contexts ctrl ON ctrl.id = e.control_context_id
            JOIN ai_contexts var ON var.id = e.variant_context_id
            JOIN prompt_evaluations ev ON ev.id = e.evaluation_id
            {where_clause}
            ORDER BY e.created_at DESC
            """,
            *params,
        )
        return [_experiment_row_to_dict(row) for row in rows]


async def update_experiment_status(
    experiment_id: UUID,
    status: str,
    challenge_results: list[dict] | None = None,
    win_rate: float | None = None,
) -> bool:
    """Update experiment status. Sets resolved_at when promoted or rejected."""
    async with get_connection() as conn:
        updates = ["status = $2"]
        params: list[Any] = [experiment_id, status]
        idx = 3

        if challenge_results is not None:
            updates.append(f"challenge_results = ${idx}")
            params.append(json.dumps(challenge_results, ensure_ascii=False))
            idx += 1

        if win_rate is not None:
            updates.append(f"win_rate = ${idx}")
            params.append(win_rate)
            idx += 1

        if status in ("promoted", "rejected"):
            updates.append("resolved_at = NOW()")

        set_clause = ", ".join(updates)
        result = await conn.execute(
            f"UPDATE prompt_experiments SET {set_clause} WHERE id = $1",
            *params,
        )
        return result == "UPDATE 1"


async def append_challenge_result(
    experiment_id: UUID,
    result: dict,
) -> bool:
    """Append a single challenge result to the experiment's challenge_results array."""
    async with get_connection() as conn:
        res = await conn.execute(
            """
            UPDATE prompt_experiments
            SET challenge_results = challenge_results || $2::jsonb
            WHERE id = $1
            """,
            experiment_id,
            json.dumps([result], ensure_ascii=False),
        )
        return res == "UPDATE 1"


def _evaluation_row_to_dict(row: Any) -> dict[str, Any]:
    """Convert an evaluation DB row to a dictionary."""
    sample_analysis = row["sample_analysis"]
    if isinstance(sample_analysis, str):
        sample_analysis = json.loads(sample_analysis)

    return {
        "id": str(row["id"]),
        "context_id": str(row["context_id"]),
        "period_start": row["period_start"].isoformat(),
        "period_end": row["period_end"].isoformat(),
        "interaction_count": row["interaction_count"],
        "avg_rating": row["avg_rating"],
        "rated_count": row["rated_count"],
        "tool_success_rate": row["tool_success_rate"],
        "avg_turns": row["avg_turns"],
        "avg_tokens": row["avg_tokens"],
        "strengths": list(row["strengths"]) if row["strengths"] else [],
        "weaknesses": list(row["weaknesses"]) if row["weaknesses"] else [],
        "improvement_suggestions": list(row["improvement_suggestions"]) if row["improvement_suggestions"] else [],
        "sample_analysis": sample_analysis,
        "created_at": row["created_at"].isoformat(),
    }


def _experiment_row_to_dict(row: Any) -> dict[str, Any]:
    """Convert an experiment DB row to a dictionary."""
    challenge_config = row["challenge_config"]
    if isinstance(challenge_config, str):
        challenge_config = json.loads(challenge_config)

    challenge_results = row["challenge_results"]
    if isinstance(challenge_results, str):
        challenge_results = json.loads(challenge_results)

    return {
        "id": str(row["id"]),
        "situation": row["situation"],
        "evaluation_id": str(row["evaluation_id"]),
        "control_context_id": str(row["control_context_id"]),
        "variant_context_id": str(row["variant_context_id"]),
        "status": row["status"],
        "challenge_type": row["challenge_type"],
        "challenge_config": challenge_config,
        "challenge_results": challenge_results,
        "win_rate": row["win_rate"],
        "resolved_at": row["resolved_at"].isoformat() if row["resolved_at"] else None,
        "created_at": row["created_at"].isoformat(),
        "control_name": row["control_name"],
        "control_prompt": row["control_prompt"],
        "variant_name": row["variant_name"],
        "variant_prompt": row["variant_prompt"],
        "eval_avg_rating": row["eval_avg_rating"],
        "eval_interaction_count": row["eval_interaction_count"],
        "eval_weaknesses": list(row["eval_weaknesses"]) if row["eval_weaknesses"] else [],
        "eval_strengths": list(row["eval_strengths"]) if row["eval_strengths"] else [],
    }
