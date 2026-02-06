"""Pydantic models for API request/response."""

from typing import Literal

from pydantic import BaseModel, Field


# =============================================================================
# Health & Feedback
# =============================================================================

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


# =============================================================================
# Unified Agent Endpoints
# =============================================================================

class AgentStreamRequest(BaseModel):
    """Request for unified agent stream endpoint."""

    message: str = Field(..., description="User's message")
    conversation_id: str | None = Field(None, description="Conversation ID for continuity")
    situation: Literal["auto", "weekly", "chat", "planning"] = Field(
        "auto", description="Situation context"
    )
    context: dict[str, str] | None = Field(
        None,
        description="Pre-fetched data from frontend to inject into system prompt, reducing tool calls",
    )


class AgentApproveRequest(BaseModel):
    """Request for agent action approval endpoint."""

    conversation_id: str = Field(..., description="Conversation ID with pending actions")
    action_ids: list[str] = Field(..., description="IDs of actions to approve")
