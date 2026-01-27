"""API routes for kensan-ai."""

import asyncio
import logging
import time
import uuid as uuid_module
from datetime import date
from typing import AsyncIterator
from uuid import UUID

import jwt
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse

from kensan_ai.agents import AgentRunner, chat, weekly_review
from kensan_ai.config import get_settings
from kensan_ai.api.schemas import (
    ChatRequest,
    ChatResponse,
    StreamChatRequest,
    ToolCallResponse,
    AdviceRequest,
    AdviceResponse,
    ReflectRequest,
    ReflectResponse,
    ReviewRequest,
    ReviewResponse,
    HealthResponse,
    FeedbackRequest,
    FeedbackResponse,
    GenerateReviewRequest,
    AIReviewReportResponse,
    AskRequest,
    AskResponse,
)
from kensan_ai.context import Situation, ContextResolver
from kensan_ai.logging import InteractionLogger
from kensan_ai.db.queries import ai_reviews
from kensan_ai.extraction import FactExtractor
from kensan_ai.lib.parsers import parse_uuid as lib_parse_uuid, parse_date as lib_parse_date

logger = logging.getLogger(__name__)

router = APIRouter()


async def _extract_facts_background(
    user_id: UUID,
    user_input: str,
    ai_output: str,
    interaction_id: UUID,
) -> None:
    """Extract facts from a conversation in the background.

    This runs as a fire-and-forget task after the main response is sent.
    """
    try:
        extractor = FactExtractor()
        count = await extractor.extract_and_save(
            user_id=user_id,
            user_input=user_input,
            ai_output=ai_output,
            interaction_id=interaction_id,
        )
        if count > 0:
            logger.info(f"Background extraction: saved {count} facts for user {user_id}")
    except Exception as e:
        logger.error(f"Background fact extraction failed: {e}")


async def _get_agent_for_situation(
    situation: Situation,
    user_id: UUID | None = None,
    experiment_id: UUID | None = None,
) -> AgentRunner:
    """Get an agent configured for the given situation.

    Args:
        situation: The situation type
        user_id: Optional user ID for variable replacement and A/B testing
        experiment_id: Optional experiment ID for A/B testing

    Returns:
        Configured AgentRunner instance
    """
    context = await ContextResolver.get_context(
        situation,
        experiment_id=experiment_id,
        user_id=user_id,
    )

    if context:
        return AgentRunner(
            system_prompt=context.system_prompt,
            allowed_tools=context.allowed_tools,
            max_turns=context.max_turns,
            temperature=context.temperature,
        )

    if situation == Situation.WEEKLY:
        return AgentRunner(
            system_prompt=weekly_review.SYSTEM_PROMPT,
            allowed_tools=weekly_review.ALLOWED_TOOLS,
        )
    else:
        return AgentRunner(
            system_prompt=chat.SYSTEM_PROMPT,
            allowed_tools=chat.ALLOWED_TOOLS,
        )


def _parse_uuid(value: str) -> UUID:
    """Parse a string to UUID, raising HTTPException if invalid.

    Uses shared parser from lib.parsers with HTTP error handling.
    """
    result = lib_parse_uuid(value)
    if result is None:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {value}")
    return result


def _parse_date(value: str) -> date:
    """Parse a date string (YYYY-MM-DD), raising HTTPException if invalid.

    Uses shared parser from lib.parsers with HTTP error handling.
    """
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
        # Decode JWT token
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


def _parse_review_response(text: str) -> tuple[str, list[str], list[str], list[str]]:
    """Parse the AI review response into structured parts."""
    summary = ""
    good_points: list[str] = []
    improvement_points: list[str] = []
    advice: list[str] = []

    current_section = None
    lines = text.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect section headers
        if "今週の振り返り" in line or "概要" in line:
            current_section = "summary"
            continue
        elif "よかった点" in line or "良かった点" in line:
            current_section = "good"
            continue
        elif "改善点" in line:
            current_section = "improvement"
            continue
        elif "アドバイス" in line or "来週" in line:
            current_section = "advice"
            continue

        # Parse bullet points
        if line.startswith(("-", "•", "・", "✓", "!", "→", "*")):
            content = line.lstrip("-•・✓!→* ").strip()
            if content:
                if current_section == "good":
                    good_points.append(content)
                elif current_section == "improvement":
                    improvement_points.append(content)
                elif current_section == "advice":
                    advice.append(content)
        elif current_section == "summary":
            summary += line + " "

    # Fallback: if no structured content found, use the whole text
    if not good_points and not improvement_points and not advice:
        summary = text
        good_points = ["レビュー内容を確認してください"]
        improvement_points = ["レビュー内容を確認してください"]
        advice = ["レビュー内容を確認してください"]

    return summary.strip(), good_points, improvement_points, advice


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse()


# =============================================================================
# AI Review Endpoints (for frontend compatibility)
# =============================================================================

@router.post("/ai/reviews/generate", response_model=AIReviewReportResponse)
async def generate_review(
    request: GenerateReviewRequest,
    authorization: str | None = Header(None),
) -> AIReviewReportResponse:
    """Generate a new AI review for the specified week."""
    user_id = _get_user_id_from_header(authorization)
    week_start = _parse_date(request.weekStart)
    week_end = _parse_date(request.weekEnd)

    # Generate the review using AI
    agent = await _get_agent_for_situation(Situation.WEEKLY, user_id=user_id)
    prompt = f"{week_start.isoformat()}から{week_end.isoformat()}までの振り返りをお願いします。目標とマイルストーン、タスクの進捗を確認してください。"

    result = await agent.run(prompt, user_id=str(user_id))

    # Parse the response
    summary, good_points, improvement_points, advice_list = _parse_review_response(result.text)

    # Save to database
    review = await ai_reviews.create_review(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
        summary=summary,
        good_points=good_points,
        improvement_points=improvement_points,
        advice=advice_list,
        tokens_input=result.tokens_input,
        tokens_output=result.tokens_output,
    )

    return AIReviewReportResponse(**review)


@router.get("/ai/reviews", response_model=list[AIReviewReportResponse])
async def list_reviews(
    start_date: str | None = None,
    end_date: str | None = None,
    authorization: str | None = Header(None),
) -> list[AIReviewReportResponse]:
    """List all AI reviews for the current user."""
    user_id = _get_user_id_from_header(authorization)

    reviews = await ai_reviews.list_reviews(
        user_id=user_id,
        start_date=_parse_date(start_date) if start_date else None,
        end_date=_parse_date(end_date) if end_date else None,
    )

    return [AIReviewReportResponse(**r) for r in reviews]


@router.get("/ai/reviews/{review_id}", response_model=AIReviewReportResponse)
async def get_review(
    review_id: str,
    authorization: str | None = Header(None),
) -> AIReviewReportResponse:
    """Get a specific AI review."""
    user_id = _get_user_id_from_header(authorization)
    review_uuid = _parse_uuid(review_id)

    review = await ai_reviews.get_review(review_uuid, user_id)

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    return AIReviewReportResponse(**review)


@router.post("/ai/ask", response_model=AskResponse)
async def ask_ai(
    request: AskRequest,
    authorization: str | None = Header(None),
) -> AskResponse:
    """Ask AI a question."""
    user_id = _get_user_id_from_header(authorization)

    agent = await _get_agent_for_situation(Situation.CHAT, user_id=user_id)

    prompt = request.question
    if request.context:
        prompt = f"コンテキスト: {request.context}\n\n質問: {request.question}"

    result = await agent.run(prompt, user_id=str(user_id))

    return AskResponse(answer=result.text)


# =============================================================================
# Chat Endpoints
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """Chat with AI assistant."""
    session_id = request.session_id or str(uuid_module.uuid4())
    user_id = _parse_uuid(request.user_id)
    session_uuid = _parse_uuid(session_id)

    start_time = time.time()
    agent = await _get_agent_for_situation(Situation.CHAT, user_id=user_id)
    result = await agent.run(request.message, user_id=request.user_id)
    latency_ms = int((time.time() - start_time) * 1000)

    interaction_id: UUID | None = None
    try:
        interaction_id = await InteractionLogger.log(
            user_id=user_id,
            session_id=session_uuid,
            situation=Situation.CHAT.value,
            user_input=request.message,
            ai_output=result.text,
            tool_calls=result.tool_calls,
            tokens_input=result.tokens_input,
            tokens_output=result.tokens_output,
            latency_ms=latency_ms,
        )
        # Trigger background fact extraction
        asyncio.create_task(
            _extract_facts_background(
                user_id=user_id,
                user_input=request.message,
                ai_output=result.text,
                interaction_id=interaction_id,
            )
        )
    except Exception as e:
        logger.warning(f"Failed to log interaction: {e}")

    return ChatResponse(
        message=result.text,
        session_id=session_id,
        tool_calls=[
            ToolCallResponse(name=tc.name, input=tc.input, output=tc.output)
            for tc in result.tool_calls
        ],
        tokens_input=result.tokens_input,
        tokens_output=result.tokens_output,
    )


@router.post("/chat/stream")
async def chat_stream_endpoint(request: StreamChatRequest) -> StreamingResponse:
    """Stream chat response from AI assistant."""
    user_id = _parse_uuid(request.user_id) if request.user_id else None
    agent = await _get_agent_for_situation(Situation.CHAT, user_id=user_id)

    async def generate() -> AsyncIterator[bytes]:
        async for chunk in agent.stream(request.message, user_id=request.user_id):
            yield chunk.encode("utf-8")

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
    )


# =============================================================================
# Situational Endpoints
# =============================================================================

@router.post("/review", response_model=ReviewResponse)
async def review_endpoint(request: ReviewRequest) -> ReviewResponse:
    """Get weekly review from AI."""
    user_id = _parse_uuid(request.user_id)
    session_uuid = uuid_module.uuid4()
    user_input = "今週の振り返りをお願いします。まず目標とマイルストーンを確認してください。"

    start_time = time.time()
    agent = await _get_agent_for_situation(Situation.WEEKLY, user_id=user_id)
    result = await agent.run(user_input, user_id=request.user_id)
    latency_ms = int((time.time() - start_time) * 1000)

    try:
        await InteractionLogger.log(
            user_id=user_id,
            session_id=session_uuid,
            situation=Situation.WEEKLY.value,
            user_input=user_input,
            ai_output=result.text,
            tool_calls=result.tool_calls,
            tokens_input=result.tokens_input,
            tokens_output=result.tokens_output,
            latency_ms=latency_ms,
        )
    except Exception:
        pass

    return ReviewResponse(
        review=result.text,
        tokens_input=result.tokens_input,
        tokens_output=result.tokens_output,
    )


@router.post("/advice", response_model=AdviceResponse)
async def advice_endpoint(request: AdviceRequest) -> AdviceResponse:
    """Get morning advice/planning from AI."""
    user_id = _parse_uuid(request.user_id)
    session_uuid = uuid_module.uuid4()
    user_input = "今日の計画を立てたいです。目標とタスクを確認して、今日取り組むべきことをアドバイスしてください。"

    start_time = time.time()
    agent = await _get_agent_for_situation(Situation.MORNING, user_id=user_id)
    result = await agent.run(user_input, user_id=request.user_id)
    latency_ms = int((time.time() - start_time) * 1000)

    try:
        await InteractionLogger.log(
            user_id=user_id,
            session_id=session_uuid,
            situation=Situation.MORNING.value,
            user_input=user_input,
            ai_output=result.text,
            tool_calls=result.tool_calls,
            tokens_input=result.tokens_input,
            tokens_output=result.tokens_output,
            latency_ms=latency_ms,
        )
    except Exception:
        pass

    return AdviceResponse(
        advice=result.text,
        tokens_input=result.tokens_input,
        tokens_output=result.tokens_output,
    )


@router.post("/reflect", response_model=ReflectResponse)
async def reflect_endpoint(request: ReflectRequest) -> ReflectResponse:
    """Get evening reflection from AI."""
    user_id = _parse_uuid(request.user_id)
    session_uuid = uuid_module.uuid4()
    user_input = "今日の振り返りをしたいです。今日の作業実績を確認して、よかった点と改善点を教えてください。"

    start_time = time.time()
    agent = await _get_agent_for_situation(Situation.EVENING, user_id=user_id)
    result = await agent.run(user_input, user_id=request.user_id)
    latency_ms = int((time.time() - start_time) * 1000)

    try:
        await InteractionLogger.log(
            user_id=user_id,
            session_id=session_uuid,
            situation=Situation.EVENING.value,
            user_input=user_input,
            ai_output=result.text,
            tool_calls=result.tool_calls,
            tokens_input=result.tokens_input,
            tokens_output=result.tokens_output,
            latency_ms=latency_ms,
        )
    except Exception:
        pass

    return ReflectResponse(
        reflection=result.text,
        tokens_input=result.tokens_input,
        tokens_output=result.tokens_output,
    )


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
