"""Prompt comparison queries for version-based A/B testing."""

import json
import logging
from typing import Any
from uuid import UUID, uuid4

from kensan_ai.db.connection import get_connection

logger = logging.getLogger(__name__)


async def create_comparison(
    context_id: UUID,
    version_a: int,
    version_b: int,
    user_id: UUID,
) -> UUID:
    """Create a new prompt comparison session."""
    comparison_id = uuid4()
    async with get_connection() as conn:
        await conn.execute(
            """
            INSERT INTO prompt_comparisons (id, context_id, version_a, version_b, user_id)
            VALUES ($1, $2, $3, $4, $5)
            """,
            comparison_id,
            context_id,
            version_a,
            version_b,
            user_id,
        )
    return comparison_id


async def get_comparison(comparison_id: UUID) -> dict[str, Any] | None:
    """Get a comparison with context and version details."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT pc.id, pc.context_id, pc.version_a, pc.version_b,
                   pc.status, pc.rounds, pc.win_rate_b, pc.user_id,
                   pc.created_at, pc.resolved_at,
                   c.name AS context_name, c.situation,
                   va.system_prompt AS version_a_prompt,
                   va.changelog AS version_a_changelog,
                   vb.system_prompt AS version_b_prompt,
                   vb.changelog AS version_b_changelog
            FROM prompt_comparisons pc
            JOIN ai_contexts c ON c.id = pc.context_id
            LEFT JOIN ai_context_versions va
                ON va.context_id = pc.context_id AND va.version_number = pc.version_a
            LEFT JOIN ai_context_versions vb
                ON vb.context_id = pc.context_id AND vb.version_number = pc.version_b
            WHERE pc.id = $1
            """,
            comparison_id,
        )
        if not row:
            return None
        return _row_to_dict(row)


async def list_comparisons(
    user_id: UUID,
    context_id: UUID | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    """List comparisons for a user."""
    conditions = ["pc.user_id = $1"]
    params: list[Any] = [user_id]
    idx = 2

    if context_id:
        conditions.append(f"pc.context_id = ${idx}")
        params.append(context_id)
        idx += 1

    if status:
        conditions.append(f"pc.status = ${idx}")
        params.append(status)
        idx += 1

    where_clause = " AND ".join(conditions)

    async with get_connection() as conn:
        rows = await conn.fetch(
            f"""
            SELECT pc.id, pc.context_id, pc.version_a, pc.version_b,
                   pc.status, pc.rounds, pc.win_rate_b, pc.user_id,
                   pc.created_at, pc.resolved_at,
                   c.name AS context_name, c.situation,
                   va.system_prompt AS version_a_prompt,
                   va.changelog AS version_a_changelog,
                   vb.system_prompt AS version_b_prompt,
                   vb.changelog AS version_b_changelog
            FROM prompt_comparisons pc
            JOIN ai_contexts c ON c.id = pc.context_id
            LEFT JOIN ai_context_versions va
                ON va.context_id = pc.context_id AND va.version_number = pc.version_a
            LEFT JOIN ai_context_versions vb
                ON vb.context_id = pc.context_id AND vb.version_number = pc.version_b
            WHERE {where_clause}
            ORDER BY pc.created_at DESC
            """,
            *params,
        )
        return [_row_to_dict(row) for row in rows]


async def append_round(comparison_id: UUID, round_data: dict[str, Any]) -> bool:
    """Append a round to the comparison's rounds JSONB array."""
    async with get_connection() as conn:
        result = await conn.execute(
            """
            UPDATE prompt_comparisons
            SET rounds = rounds || $2::jsonb
            WHERE id = $1
            """,
            comparison_id,
            json.dumps([round_data]),
        )
        return result == "UPDATE 1"


async def update_round_winner(
    comparison_id: UUID,
    round_id: str,
    winner: str,
) -> bool:
    """Update the winner for a specific round in the rounds JSONB."""
    async with get_connection() as conn:
        # Fetch current rounds
        row = await conn.fetchrow(
            "SELECT rounds FROM prompt_comparisons WHERE id = $1",
            comparison_id,
        )
        if not row:
            return False

        rounds = json.loads(row["rounds"]) if isinstance(row["rounds"], str) else row["rounds"]
        found = False
        for r in rounds:
            if r.get("round_id") == round_id:
                r["winner"] = winner
                found = True
                break

        if not found:
            return False

        await conn.execute(
            "UPDATE prompt_comparisons SET rounds = $2::jsonb WHERE id = $1",
            comparison_id,
            json.dumps(rounds),
        )
        return True


async def resolve_comparison(
    comparison_id: UUID,
    status: str,
    win_rate_b: float | None = None,
) -> bool:
    """Resolve a comparison (adopt_a, adopt_b, or dismiss)."""
    async with get_connection() as conn:
        result = await conn.execute(
            """
            UPDATE prompt_comparisons
            SET status = $2, win_rate_b = $3, resolved_at = NOW()
            WHERE id = $1
            """,
            comparison_id,
            status,
            win_rate_b,
        )
        return result == "UPDATE 1"


def _row_to_dict(row: Any) -> dict[str, Any]:
    """Convert a DB row to a dictionary."""
    rounds = row["rounds"]
    if isinstance(rounds, str):
        rounds = json.loads(rounds)

    return {
        "id": str(row["id"]),
        "context_id": str(row["context_id"]),
        "context_name": row["context_name"],
        "situation": row["situation"],
        "version_a": row["version_a"],
        "version_b": row["version_b"],
        "version_a_prompt": row["version_a_prompt"] or "",
        "version_a_changelog": row["version_a_changelog"],
        "version_b_prompt": row["version_b_prompt"] or "",
        "version_b_changelog": row["version_b_changelog"],
        "status": row["status"],
        "rounds": rounds,
        "win_rate_b": row["win_rate_b"],
        "created_at": row["created_at"].isoformat(),
        "resolved_at": row["resolved_at"].isoformat() if row["resolved_at"] else None,
    }
