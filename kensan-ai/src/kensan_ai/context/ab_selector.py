"""A/B test selector for experiment-based context selection."""

import hashlib
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection


@dataclass
class ExperimentContext:
    """Context variant within an experiment."""

    id: UUID
    name: str
    traffic_weight: float
    system_prompt: str
    allowed_tools: list[str]
    max_turns: int
    temperature: float


class ABSelector:
    """Selects context based on A/B test traffic weights.

    Uses consistent hashing to ensure the same user always gets
    the same variant for a given experiment.
    """

    @staticmethod
    def compute_bucket(user_id: UUID, experiment_id: UUID) -> int:
        """Compute a deterministic bucket (0-99) for a user in an experiment.

        Uses SHA256 hash of user_id:experiment_id for consistent assignment.

        Args:
            user_id: The user's ID
            experiment_id: The experiment's ID

        Returns:
            An integer from 0-99 representing the user's bucket
        """
        hash_input = f"{user_id}:{experiment_id}".encode("utf-8")
        hash_output = hashlib.sha256(hash_input).digest()
        # Use first 4 bytes as an integer, then mod 100
        bucket_value = int.from_bytes(hash_output[:4], byteorder="big")
        return bucket_value % 100

    @staticmethod
    def select_from_weights(
        bucket: int,
        contexts: list[ExperimentContext],
    ) -> ExperimentContext | None:
        """Select a context based on bucket and traffic weights.

        Args:
            bucket: The user's bucket (0-99)
            contexts: List of contexts with traffic_weight values

        Returns:
            The selected context, or None if no contexts match
        """
        if not contexts:
            return None

        # Normalize weights to sum to 100
        total_weight = sum(c.traffic_weight for c in contexts)
        if total_weight <= 0:
            # Equal distribution if no valid weights
            normalized = [(c, 100.0 / len(contexts)) for c in contexts]
        else:
            normalized = [(c, (c.traffic_weight / total_weight) * 100) for c in contexts]

        # Find which context the bucket falls into
        cumulative = 0.0
        for context, weight in normalized:
            cumulative += weight
            if bucket < cumulative:
                return context

        # Fallback to last context (handles floating point edge cases)
        return contexts[-1]

    @staticmethod
    async def select_context(
        user_id: UUID,
        experiment_id: UUID,
    ) -> ExperimentContext | None:
        """Select a context for a user in an experiment.

        Args:
            user_id: The user's ID
            experiment_id: The experiment's ID

        Returns:
            The selected ExperimentContext, or None if experiment not found
        """
        # Fetch all contexts for this experiment
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT id, name, traffic_weight, system_prompt,
                       allowed_tools, max_turns, temperature
                FROM ai_contexts
                WHERE experiment_id = $1 AND is_active = true
                ORDER BY traffic_weight DESC
                """,
                experiment_id,
            )

            if not rows:
                return None

            contexts = [
                ExperimentContext(
                    id=row["id"],
                    name=row["name"],
                    traffic_weight=row["traffic_weight"] or 0.0,
                    system_prompt=row["system_prompt"],
                    allowed_tools=list(row["allowed_tools"]) if row["allowed_tools"] else [],
                    max_turns=row["max_turns"],
                    temperature=row["temperature"],
                )
                for row in rows
            ]

        # Compute bucket and select
        bucket = ABSelector.compute_bucket(user_id, experiment_id)
        return ABSelector.select_from_weights(bucket, contexts)

    @staticmethod
    async def get_active_experiments(situation: str | None = None) -> list[dict[str, Any]]:
        """Get all active experiments, optionally filtered by situation.

        Args:
            situation: Filter by situation type

        Returns:
            List of experiment info dicts
        """
        async with get_connection() as conn:
            if situation:
                rows = await conn.fetch(
                    """
                    SELECT DISTINCT experiment_id, situation
                    FROM ai_contexts
                    WHERE experiment_id IS NOT NULL
                      AND is_active = true
                      AND situation = $1
                    """,
                    situation,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT DISTINCT experiment_id, situation
                    FROM ai_contexts
                    WHERE experiment_id IS NOT NULL
                      AND is_active = true
                    """,
                )

            return [
                {
                    "experiment_id": str(row["experiment_id"]),
                    "situation": row["situation"],
                }
                for row in rows
            ]
