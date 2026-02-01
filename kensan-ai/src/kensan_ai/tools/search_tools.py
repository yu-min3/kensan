"""Search tools for semantic and keyword-based document search."""

import logging
from typing import Any
from uuid import UUID

from kensan_ai.tools.base import tool
from kensan_ai.db.connection import get_connection
from kensan_ai.embeddings.service import get_embedding_service

logger = logging.getLogger(__name__)


def _parse_uuid(value: str | None) -> UUID | None:
    """Parse a string to UUID, returning None if invalid or empty."""
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError:
        return None


@tool(
    name="semantic_search",
    description="ベクトル類似度を使用してドキュメントを検索します。意味的に類似したコンテンツを見つけるのに適しています。",
    input_schema={
        "properties": {
            "query": {
                "type": "string",
                "description": "検索クエリ",
            },
            "limit": {
                "type": "integer",
                "description": "結果の最大件数 (デフォルト: 5)",
            },
            "content_type": {
                "type": "string",
                "description": "コンテンツタイプでフィルタ (例: 'note', 'diary')",
            },
        },
        "required": ["query"],
    },
)
async def semantic_search(args: dict[str, Any]) -> dict[str, Any]:
    """Perform semantic search using vector similarity."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    query = args.get("query", "").strip()
    if not query:
        return {"error": "Query cannot be empty"}

    limit = args.get("limit", 5)
    content_type = args.get("content_type")

    try:
        # Generate embedding for the query
        embedding_service = get_embedding_service()
        query_embedding = await embedding_service.generate_embedding(query)

        # Search using pgvector
        async with get_connection() as conn:
            # Build the query with optional content_type filter
            if content_type:
                rows = await conn.fetch(
                    """
                    SELECT id, name, content_type, content,
                           1 - (embedding <=> $1::vector) as similarity
                    FROM documents
                    WHERE user_id = $2 AND content_type = $3
                    ORDER BY embedding <=> $1::vector
                    LIMIT $4
                    """,
                    query_embedding,
                    user_id,
                    content_type,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, name, content_type, content,
                           1 - (embedding <=> $1::vector) as similarity
                    FROM documents
                    WHERE user_id = $2
                    ORDER BY embedding <=> $1::vector
                    LIMIT $3
                    """,
                    query_embedding,
                    user_id,
                    limit,
                )

            results = [
                {
                    "id": str(row["id"]),
                    "name": row["name"],
                    "contentType": row["content_type"],
                    "content": row["content"][:500] + "..." if row["content"] and len(row["content"]) > 500 else row["content"],
                    "similarity": round(row["similarity"], 4),
                }
                for row in rows
            ]

            return {"results": results, "count": len(results)}

    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return {"error": f"Search failed: {str(e)}"}


@tool(
    name="keyword_search",
    description="キーワードベースの全文検索を行います。特定の単語やフレーズを含むドキュメントを見つけるのに適しています。",
    input_schema={
        "properties": {
            "query": {
                "type": "string",
                "description": "検索キーワード（スペース区切りでAND検索）",
            },
            "limit": {
                "type": "integer",
                "description": "結果の最大件数 (デフォルト: 10)",
            },
            "content_type": {
                "type": "string",
                "description": "コンテンツタイプでフィルタ (例: 'note', 'diary')",
            },
        },
        "required": ["query"],
    },
)
async def keyword_search(args: dict[str, Any]) -> dict[str, Any]:
    """Perform keyword-based full-text search using PostgreSQL tsvector."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    query = args.get("query", "").strip()
    if not query:
        return {"error": "Query cannot be empty"}

    limit = args.get("limit", 10)
    content_type = args.get("content_type")

    try:
        # Convert query to tsquery format (words joined with &)
        keywords = query.split()
        tsquery = " & ".join(keywords)

        async with get_connection() as conn:
            # Build the query with optional content_type filter
            if content_type:
                rows = await conn.fetch(
                    """
                    SELECT id, name, content_type, content,
                           ts_rank(to_tsvector('simple', content), to_tsquery('simple', $1)) as rank
                    FROM documents
                    WHERE user_id = $2
                      AND content_type = $3
                      AND to_tsvector('simple', content) @@ to_tsquery('simple', $1)
                    ORDER BY rank DESC
                    LIMIT $4
                    """,
                    tsquery,
                    user_id,
                    content_type,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, name, content_type, content,
                           ts_rank(to_tsvector('simple', content), to_tsquery('simple', $1)) as rank
                    FROM documents
                    WHERE user_id = $2
                      AND to_tsvector('simple', content) @@ to_tsquery('simple', $1)
                    ORDER BY rank DESC
                    LIMIT $3
                    """,
                    tsquery,
                    user_id,
                    limit,
                )

            results = [
                {
                    "id": str(row["id"]),
                    "name": row["name"],
                    "contentType": row["content_type"],
                    "content": row["content"][:500] + "..." if row["content"] and len(row["content"]) > 500 else row["content"],
                    "rank": round(row["rank"], 4),
                }
                for row in rows
            ]

            return {"results": results, "count": len(results)}

    except Exception as e:
        logger.error(f"Keyword search failed: {e}")
        return {"error": f"Search failed: {str(e)}"}


@tool(
    name="hybrid_search",
    description="セマンティック検索とキーワード検索を組み合わせたハイブリッド検索を行います。より精度の高い検索結果を得るのに適しています。",
    input_schema={
        "properties": {
            "query": {
                "type": "string",
                "description": "検索クエリ",
            },
            "limit": {
                "type": "integer",
                "description": "結果の最大件数 (デフォルト: 5)",
            },
            "content_type": {
                "type": "string",
                "description": "コンテンツタイプでフィルタ (例: 'note', 'diary')",
            },
            "semantic_weight": {
                "type": "number",
                "description": "セマンティックスコアの重み (0.0-1.0、デフォルト: 0.7)",
            },
        },
        "required": ["query"],
    },
)
async def hybrid_search(args: dict[str, Any]) -> dict[str, Any]:
    """Perform hybrid search combining semantic and keyword search."""
    user_id = _parse_uuid(args.get("user_id"))
    if not user_id:
        return {"error": "Invalid or missing user_id"}

    query = args.get("query", "").strip()
    if not query:
        return {"error": "Query cannot be empty"}

    limit = args.get("limit", 5)
    content_type = args.get("content_type")
    semantic_weight = args.get("semantic_weight", 0.7)

    # Clamp semantic_weight to valid range
    semantic_weight = max(0.0, min(1.0, semantic_weight))
    keyword_weight = 1.0 - semantic_weight

    try:
        # Generate embedding for the query
        embedding_service = get_embedding_service()
        query_embedding = await embedding_service.generate_embedding(query)

        # Convert query to tsquery format
        keywords = query.split()
        tsquery = " | ".join(keywords)  # Use OR for broader matching

        async with get_connection() as conn:
            # Complex hybrid query
            if content_type:
                rows = await conn.fetch(
                    """
                    WITH semantic AS (
                        SELECT id, 1 - (embedding <=> $1::vector) as semantic_score
                        FROM documents
                        WHERE user_id = $2 AND content_type = $3
                    ),
                    keyword AS (
                        SELECT id,
                               ts_rank(to_tsvector('simple', content), to_tsquery('simple', $4)) as keyword_score
                        FROM documents
                        WHERE user_id = $2 AND content_type = $3
                    )
                    SELECT d.id, d.name, d.content_type, d.content,
                           COALESCE(s.semantic_score, 0) as semantic_score,
                           COALESCE(k.keyword_score, 0) as keyword_score,
                           (COALESCE(s.semantic_score, 0) * $5 + COALESCE(k.keyword_score, 0) * $6) as combined_score
                    FROM documents d
                    LEFT JOIN semantic s ON d.id = s.id
                    LEFT JOIN keyword k ON d.id = k.id
                    WHERE d.user_id = $2 AND d.content_type = $3
                    ORDER BY combined_score DESC
                    LIMIT $7
                    """,
                    query_embedding,
                    user_id,
                    content_type,
                    tsquery,
                    semantic_weight,
                    keyword_weight,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    """
                    WITH semantic AS (
                        SELECT id, 1 - (embedding <=> $1::vector) as semantic_score
                        FROM documents
                        WHERE user_id = $2
                    ),
                    keyword AS (
                        SELECT id,
                               ts_rank(to_tsvector('simple', content), to_tsquery('simple', $3)) as keyword_score
                        FROM documents
                        WHERE user_id = $2
                    )
                    SELECT d.id, d.name, d.content_type, d.content,
                           COALESCE(s.semantic_score, 0) as semantic_score,
                           COALESCE(k.keyword_score, 0) as keyword_score,
                           (COALESCE(s.semantic_score, 0) * $4 + COALESCE(k.keyword_score, 0) * $5) as combined_score
                    FROM documents d
                    LEFT JOIN semantic s ON d.id = s.id
                    LEFT JOIN keyword k ON d.id = k.id
                    WHERE d.user_id = $2
                    ORDER BY combined_score DESC
                    LIMIT $6
                    """,
                    query_embedding,
                    user_id,
                    tsquery,
                    semantic_weight,
                    keyword_weight,
                    limit,
                )

            results = [
                {
                    "id": str(row["id"]),
                    "name": row["name"],
                    "contentType": row["content_type"],
                    "content": row["content"][:500] + "..." if row["content"] and len(row["content"]) > 500 else row["content"],
                    "semanticScore": round(row["semantic_score"], 4),
                    "keywordScore": round(row["keyword_score"], 4),
                    "combinedScore": round(row["combined_score"], 4),
                }
                for row in rows
            ]

            return {"results": results, "count": len(results)}

    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        return {"error": f"Search failed: {str(e)}"}


# All search tools for export
ALL_SEARCH_TOOLS = [
    semantic_search,
    keyword_search,
    hybrid_search,
]
