"""Context resolver for loading AI context from database."""

import re
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from kensan_ai.context.detector import Situation
from kensan_ai.context.variable_replacer import VariableReplacer
from kensan_ai.context.ab_selector import ABSelector
from kensan_ai.db.connection import get_connection

_VARIABLE_PATTERN = re.compile(r"\{(\w+)\}")


@dataclass
class AIContext:
    """AI context configuration loaded from database."""

    id: UUID
    name: str
    situation: Situation
    version: str
    system_prompt: str
    allowed_tools: list[str]
    max_turns: int
    temperature: float
    experiment_id: UUID | None = None
    prompt_variables: list[str] = field(default_factory=list)


class ContextResolver:
    """Resolves AI context from database based on situation."""

    @staticmethod
    async def get_context(
        situation: Situation,
        experiment_id: UUID | None = None,
        user_id: UUID | None = None,
    ) -> AIContext | None:
        """Get the appropriate context for a situation.

        Resolves context from DB, applies variable replacement,
        and prepends shared persona prompt.

        Args:
            situation: The detected or specified situation
            experiment_id: Optional experiment ID for A/B testing
            user_id: Optional user ID for variable replacement and A/B selection

        Returns:
            AIContext if found, None otherwise
        """
        async with get_connection() as conn:
            context = await ContextResolver._resolve_context(
                conn, situation, experiment_id, user_id
            )
            if not context:
                return None

            # Variable replacement on task-specific prompt
            if user_id:
                context.prompt_variables = _VARIABLE_PATTERN.findall(context.system_prompt)
                context.system_prompt = await VariableReplacer.replace(
                    context.system_prompt, user_id
                )

            # Prepend shared persona (skip for persona row itself)
            if context.situation != Situation.PERSONA:
                persona = await ContextResolver._get_persona(conn, user_id)
                if persona:
                    context.prompt_variables = list(set(
                        persona.prompt_variables + context.prompt_variables
                    ))
                    context.system_prompt = persona.system_prompt + "\n\n" + context.system_prompt

            return context

    @staticmethod
    async def _resolve_context(
        conn: Any,
        situation: Situation,
        experiment_id: UUID | None,
        user_id: UUID | None,
    ) -> AIContext | None:
        """Resolve context from DB without variable replacement.

        Handles A/B testing, experiment lookup, default, and fallback paths.
        """
        # If experiment specified and user_id provided, use A/B selector
        if experiment_id and user_id:
            selected = await ABSelector.select_context(user_id, experiment_id)
            if selected:
                return AIContext(
                    id=selected.id,
                    name=selected.name,
                    situation=situation,
                    version="experiment",
                    system_prompt=selected.system_prompt,
                    allowed_tools=selected.allowed_tools,
                    max_turns=selected.max_turns,
                    temperature=selected.temperature,
                    experiment_id=experiment_id,
                )

        # If experiment specified without user_id, get first matching context
        if experiment_id:
            row = await conn.fetchrow(
                """
                SELECT id, name, situation, version, system_prompt,
                       allowed_tools, max_turns, temperature, experiment_id
                FROM ai_contexts
                WHERE experiment_id = $1 AND is_active = true
                LIMIT 1
                """,
                experiment_id,
            )
            if row:
                return ContextResolver._row_to_context(row)

        # Get default context for situation
        row = await conn.fetchrow(
            """
            SELECT id, name, situation, version, system_prompt,
                   allowed_tools, max_turns, temperature, experiment_id
            FROM ai_contexts
            WHERE situation = $1 AND is_default = true AND is_active = true
            LIMIT 1
            """,
            situation.value,
        )

        if row:
            return ContextResolver._row_to_context(row)

        # Fallback: get any active context for this situation
        row = await conn.fetchrow(
            """
            SELECT id, name, situation, version, system_prompt,
                   allowed_tools, max_turns, temperature, experiment_id
            FROM ai_contexts
            WHERE situation = $1 AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
            """,
            situation.value,
        )

        if row:
            return ContextResolver._row_to_context(row)

        return None

    @staticmethod
    async def _get_persona(conn: Any, user_id: UUID | None) -> AIContext | None:
        """Fetch the shared persona context and apply variable replacement."""
        row = await conn.fetchrow(
            """SELECT id, name, situation, version, system_prompt,
                      allowed_tools, max_turns, temperature, experiment_id
               FROM ai_contexts
               WHERE situation = 'persona' AND is_active = true
               LIMIT 1""",
        )
        if not row:
            return None
        ctx = ContextResolver._row_to_context(row)
        if user_id:
            ctx.prompt_variables = _VARIABLE_PATTERN.findall(ctx.system_prompt)
            ctx.system_prompt = await VariableReplacer.replace(ctx.system_prompt, user_id)
        return ctx

    @staticmethod
    def _row_to_context(row: Any) -> AIContext:
        """Convert a database row to AIContext."""
        return AIContext(
            id=row["id"],
            name=row["name"],
            situation=Situation(row["situation"]),
            version=row["version"],
            system_prompt=row["system_prompt"],
            allowed_tools=list(row["allowed_tools"]) if row["allowed_tools"] else [],
            max_turns=row["max_turns"],
            temperature=row["temperature"],
            experiment_id=row["experiment_id"],
        )

    @staticmethod
    async def list_contexts(
        situation: Situation | None = None,
        active_only: bool = True,
    ) -> list[AIContext]:
        """List all contexts, optionally filtered by situation.

        Args:
            situation: Filter by situation
            active_only: Only return active contexts

        Returns:
            List of AIContext objects
        """
        async with get_connection() as conn:
            conditions = []
            params: list[Any] = []
            param_idx = 1

            if situation:
                conditions.append(f"situation = ${param_idx}")
                params.append(situation.value)
                param_idx += 1

            if active_only:
                conditions.append("is_active = true")

            where_clause = " AND ".join(conditions) if conditions else "1=1"

            rows = await conn.fetch(
                f"""
                SELECT id, name, situation, version, system_prompt,
                       allowed_tools, max_turns, temperature, experiment_id
                FROM ai_contexts
                WHERE {where_clause}
                ORDER BY situation, is_default DESC, created_at DESC
                """,
                *params,
            )

            return [ContextResolver._row_to_context(row) for row in rows]
