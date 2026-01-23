"""Pydantic models for API request/response."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request for chat endpoint."""

    message: str = Field(..., description="User's message")
    user_id: str = Field(..., description="User ID (UUID)")
    session_id: str | None = Field(None, description="Session ID for conversation continuity")


class ToolCallResponse(BaseModel):
    """Tool call information in response."""

    name: str
    input: dict[str, Any]
    output: Any


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    message: str = Field(..., description="AI's response message")
    session_id: str = Field(..., description="Session ID for this conversation")
    tool_calls: list[ToolCallResponse] = Field(default_factory=list)
    tokens_input: int = 0
    tokens_output: int = 0


class StreamChatRequest(BaseModel):
    """Request for streaming chat endpoint."""

    message: str = Field(..., description="User's message")
    user_id: str = Field(..., description="User ID (UUID)")
    session_id: str | None = Field(None, description="Session ID for conversation continuity")


class AdviceRequest(BaseModel):
    """Request for advice endpoint (morning planning)."""

    user_id: str = Field(..., description="User ID (UUID)")


class AdviceResponse(BaseModel):
    """Response from advice endpoint."""

    advice: str = Field(..., description="AI's advice for the day")
    tokens_input: int = 0
    tokens_output: int = 0


class ReflectRequest(BaseModel):
    """Request for reflect endpoint (evening reflection)."""

    user_id: str = Field(..., description="User ID (UUID)")


class ReflectResponse(BaseModel):
    """Response from reflect endpoint."""

    reflection: str = Field(..., description="AI's reflection summary")
    tokens_input: int = 0
    tokens_output: int = 0


class ReviewRequest(BaseModel):
    """Request for review endpoint (weekly review)."""

    user_id: str = Field(..., description="User ID (UUID)")


class ReviewResponse(BaseModel):
    """Response from review endpoint."""

    review: str = Field(..., description="AI's weekly review")
    tokens_input: int = 0
    tokens_output: int = 0


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    version: str = "0.1.0"


class FeedbackRequest(BaseModel):
    """Request for interaction feedback endpoint."""

    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5")
    feedback: str | None = Field(None, description="Optional text feedback")


class FeedbackResponse(BaseModel):
    """Response from feedback endpoint."""

    success: bool
    message: str


# AI Review endpoints (for frontend compatibility)
class GenerateReviewRequest(BaseModel):
    """Request for generating AI review."""

    weekStart: str = Field(..., description="Start date (YYYY-MM-DD)")
    weekEnd: str = Field(..., description="End date (YYYY-MM-DD)")


class AIReviewReportResponse(BaseModel):
    """AI review report response."""

    id: str
    userId: str
    weekStart: str
    weekEnd: str
    summary: str
    goodPoints: list[str]
    improvementPoints: list[str]
    advice: list[str]
    createdAt: str


class AskRequest(BaseModel):
    """Request for AI ask endpoint."""

    question: str = Field(..., description="User's question")
    context: str | None = Field(None, description="Optional context")


class AskResponse(BaseModel):
    """Response from AI ask endpoint."""

    answer: str
    sources: list[str] | None = None
