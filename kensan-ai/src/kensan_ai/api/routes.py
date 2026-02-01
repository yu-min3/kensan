"""API routes for kensan-ai."""

import json
import logging
import uuid as uuid_module
from datetime import date
from uuid import UUID

import jwt
from fastapi import APIRouter, HTTPException, Header, Query
from fastapi.responses import StreamingResponse

from kensan_ai.agents import AgentRunner
from kensan_ai.agents.conversation_store import (
    ConversationStore,
    ConversationState,
    PendingAction,
)
from kensan_ai.config import get_settings
from kensan_ai.api.schemas import (
    HealthResponse,
    FeedbackRequest,
    FeedbackResponse,
    AgentStreamRequest,
    AgentApproveRequest,
)
from kensan_ai.api.sse import sse_event
from kensan_ai.agents.chat import select_tools
from kensan_ai.context import Situation, ContextResolver, detect_situation
from kensan_ai.tools import execute_tool
from kensan_ai.logging import InteractionLogger
from kensan_ai.db.queries import interactions as interactions_queries
from kensan_ai.lib.parsers import parse_uuid as lib_parse_uuid, parse_date as lib_parse_date
from kensan_ai.telemetry import get_tracer

_tracer = get_tracer("kensan-ai.routes")

logger = logging.getLogger(__name__)

router = APIRouter()

# Singleton conversation store for agent approval flow
conversation_store = ConversationStore(ttl_minutes=30)


def _parse_uuid(value: str) -> UUID:
    """Parse a string to UUID, raising HTTPException if invalid."""
    result = lib_parse_uuid(value)
    if result is None:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {value}")
    return result


def _parse_date(value: str) -> date:
    """Parse a date string (YYYY-MM-DD), raising HTTPException if invalid."""
    result = lib_parse_date(value)
    if result is None:
        raise HTTPException(status_code=400, detail=f"Invalid date: {value}")
    return result


def _get_user_id_from_header(authorization: str | None) -> UUID:
    """Extract user ID from Authorization header (JWT token)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]

    # First, try to decode as JWT
    try:
        settings = get_settings()
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"verify_exp": True}
        )
        user_id = payload.get("user_id") or payload.get("sub")
        if user_id:
            return _parse_uuid(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        pass  # Fall through to other methods

    # Fallback: simple format "user_id:uuid" (for testing)
    if token.startswith("user_id:"):
        return _parse_uuid(token[8:])

    # Fallback: try to parse as just a UUID (for testing)
    try:
        return UUID(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization format")


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse()


# =============================================================================
# Unified Agent Endpoints
# =============================================================================

@router.post("/agent/stream")
async def agent_stream(
    request: AgentStreamRequest,
    authorization: str | None = Header(None),
) -> StreamingResponse:
    """Unified agent streaming endpoint with SSE.

    Handles all AI interactions through a single endpoint.
    Read-only tool calls are executed immediately.
    Write tool calls are collected and returned as action proposals.
    """
    user_id = _get_user_id_from_header(authorization)

    # 1-2. Detect situation and resolve context
    with _tracer.start_as_current_span("agent.context_resolution") as ctx_span:
        ctx_span.set_attribute("gen_ai.user.id", str(user_id))

        situation = detect_situation(
            explicit_situation=request.situation if request.situation != "auto" else None,
        )
        ctx_span.set_attribute("gen_ai.request.situation", situation.value)

        context = await ContextResolver.get_context(situation, user_id=user_id)

        if not context:
            logger.error(f"No AI context found for situation={situation.value}")
            raise HTTPException(
                status_code=500,
                detail=f"AI context not configured for situation: {situation.value}",
            )

        ctx_span.set_attribute("gen_ai.request.context_name", context.name if hasattr(context, "name") else situation.value)

    system_prompt = context.system_prompt
    context_keys: list[str] = []
    # フロントから渡された既存データをシステムプロンプトに注入
    if request.context:
        context_keys = list(request.context.keys())
        context_lines = []
        for key, value in request.context.items():
            context_lines.append(f"### {key}\n{value}")
        system_prompt += (
            "\n\n## 提供済みデータ（ツールで再取得不要）\n"
            "以下のデータは取得済みです。このデータを直接使い、"
            "不足するデータだけをツールで取得してください。"
            "複数のツールが必要な場合は1回のターンでまとめて呼び出してください。\n\n"
            + "\n\n".join(context_lines)
        )
    allowed_tools = select_tools(
        request.message, context.allowed_tools, request.situation, context_keys,
        prompt_variables=context.prompt_variables,
    )
    max_turns = context.max_turns
    temperature = context.temperature

    # 3. Get or create conversation state
    conv_id = request.conversation_id or str(uuid_module.uuid4())
    state = conversation_store.get(conv_id)
    if state is None:
        state = ConversationState(
            conversation_id=conv_id,
            user_id=user_id,
        )

    # 4. Create agent runner
    agent = AgentRunner(
        system_prompt=system_prompt,
        allowed_tools=allowed_tools,
        max_turns=max_turns,
        temperature=temperature,
        context_id=str(context.id),
        context_name=context.name,
        context_version=context.version,
        experiment_id=str(context.experiment_id) if context.experiment_id else None,
    )

    # 5. Stream SSE events
    async def event_generator():
        pending_actions: list[PendingAction] = []
        async for event_str in agent.stream_sse(
            user_message=request.message,
            user_id=str(user_id),
            conversation_id=conv_id,
            history=state.message_history,
        ):
            yield event_str

            # Parse action_proposal events to store pending actions
            if event_str.startswith("event: action_proposal"):
                data_line = event_str.split("\ndata: ", 1)[1].rstrip("\n")
                data = json.loads(data_line)
                for action in data.get("actions", []):
                    pending_actions.append(PendingAction(
                        id=action["id"],
                        tool_name=action["tool_name"],
                        description=action["description"],
                        input=action["input"],
                    ))

        # Save state with pending actions
        state.pending_actions = pending_actions
        conversation_store.set(state)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/agent/approve")
async def agent_approve(
    request: AgentApproveRequest,
    authorization: str | None = Header(None),
) -> StreamingResponse:
    """Execute approved actions from a previous agent proposal.

    Executes only the actions whose IDs are in action_ids.
    Returns results as SSE events.
    """
    user_id = _get_user_id_from_header(authorization)
    state = conversation_store.get(request.conversation_id)

    if not state or state.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    approved = [a for a in state.pending_actions if a.id in request.action_ids]

    async def event_generator():
        success_count = 0
        fail_count = 0

        for action in approved:
            yield sse_event("tool_call", {
                "id": f"tc_{action.id}",
                "name": action.tool_name,
            })

            try:
                await execute_tool(action.tool_name, action.input)
                yield sse_event("tool_result", {
                    "id": f"tc_{action.id}",
                    "name": action.tool_name,
                })
                success_count += 1
            except Exception as e:
                logger.error(f"Action execution failed: {action.tool_name}: {e}")
                yield sse_event("tool_result", {
                    "id": f"tc_{action.id}",
                    "name": action.tool_name,
                    "error": str(e),
                })
                fail_count += 1

        if fail_count == 0:
            yield sse_event("text", {
                "content": f"{success_count}件のアクションを実行しました。",
            })
        else:
            yield sse_event("text", {
                "content": f"{success_count}件成功、{fail_count}件失敗しました。",
            })
        yield sse_event("done", {
            "conversation_id": request.conversation_id,
            "tokens": {"input": 0, "output": 0},
        })

        # Cleanup
        state.pending_actions.clear()
        conversation_store.set(state)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# =============================================================================
# Conversation History
# =============================================================================

@router.get("/conversations")
async def get_conversations(
    authorization: str | None = Header(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    """Get list of past conversations."""
    user_id = _get_user_id_from_header(authorization)
    conversations = await interactions_queries.get_conversations(
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return {"conversations": conversations}


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: str,
    authorization: str | None = Header(None),
) -> dict:
    """Get messages for a specific conversation."""
    user_id = _get_user_id_from_header(authorization)
    conv_uuid = _parse_uuid(conversation_id)
    messages = await interactions_queries.get_conversation_messages(
        user_id=user_id,
        conversation_id=conv_uuid,
    )
    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"messages": messages}


# =============================================================================
# Feedback (kept for interaction tracking)
# =============================================================================

@router.post("/interactions/{interaction_id}/feedback", response_model=FeedbackResponse)
async def feedback_endpoint(
    interaction_id: str,
    request: FeedbackRequest,
) -> FeedbackResponse:
    """Add feedback to an AI interaction."""
    try:
        interaction_uuid = _parse_uuid(interaction_id)
        success = await InteractionLogger.add_feedback(
            interaction_id=interaction_uuid,
            rating=request.rating,
            feedback=request.feedback,
        )

        if success:
            return FeedbackResponse(success=True, message="Feedback recorded")
        else:
            raise HTTPException(status_code=404, detail="Interaction not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
