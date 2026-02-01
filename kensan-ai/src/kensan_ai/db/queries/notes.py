"""Note queries."""

from typing import Any
from uuid import UUID

from kensan_ai.db.connection import get_connection


async def get_notes(
    user_id: UUID,
    note_type: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Get notes for a user with optional type filter."""
    async with get_connection() as conn:
        conditions = ["user_id = $1"]
        params: list[Any] = [user_id]
        param_idx = 2

        if note_type is not None:
            conditions.append(f"type = ${param_idx}")
            params.append(note_type)
            param_idx += 1

        params.append(limit)
        where_clause = " AND ".join(conditions)

        rows = await conn.fetch(
            f"""
            SELECT id, title, type, content, created_at, updated_at
            FROM notes
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_idx}
            """,
            *params,
        )

        return [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "type": row["type"],
                "content": row["content"],
                "createdAt": row["created_at"].isoformat(),
                "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
            }
            for row in rows
        ]


async def create_note(
    user_id: UUID,
    title: str,
    content: str,
    note_type: str,
) -> dict[str, Any]:
    """Create a new note."""
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO notes (user_id, title, content, type)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, type, content, created_at
            """,
            user_id,
            title,
            content,
            note_type,
        )

        return {
            "id": str(row["id"]),
            "title": row["title"],
            "type": row["type"],
            "content": row["content"],
            "createdAt": row["created_at"].isoformat(),
        }


async def update_note(
    note_id: UUID,
    user_id: UUID,
    title: str | None = None,
    content: str | None = None,
) -> dict[str, Any] | None:
    """Update an existing note."""
    async with get_connection() as conn:
        updates = []
        params: list[Any] = []
        param_idx = 1

        if title is not None:
            updates.append(f"title = ${param_idx}")
            params.append(title)
            param_idx += 1

        if content is not None:
            updates.append(f"content = ${param_idx}")
            params.append(content)
            param_idx += 1

        if not updates:
            return None

        params.extend([note_id, user_id])
        set_clause = ", ".join(updates)

        row = await conn.fetchrow(
            f"""
            UPDATE notes
            SET {set_clause}
            WHERE id = ${param_idx} AND user_id = ${param_idx + 1}
            RETURNING id, title, type, content, created_at, updated_at
            """,
            *params,
        )

        if row is None:
            return None

        return {
            "id": str(row["id"]),
            "title": row["title"],
            "type": row["type"],
            "content": row["content"],
            "createdAt": row["created_at"].isoformat(),
            "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
        }
