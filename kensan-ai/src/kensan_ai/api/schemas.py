"""Pydantic models for API request/response."""

from datetime import datetime
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
    situation: Literal["auto", "review", "chat", "daily_advice"] = Field(
        "auto", description="Situation context"
    )
    context: dict[str, str] | None = Field(
        None,
        description="Pre-fetched data from frontend to inject into system prompt, reducing tool calls",
    )
    context_id: str | None = Field(
        None,
        description="Direct AI context ID to use (bypasses situation detection)",
    )
    version_number: int | None = Field(
        None,
        description="Specific version number to use for the context (for A/B comparison)",
    )


class AgentApproveRequest(BaseModel):
    """Request for agent action approval endpoint."""

    conversation_id: str = Field(..., description="Conversation ID with pending actions")
    action_ids: list[str] = Field(..., description="IDs of actions to approve")


class AgentRejectRequest(BaseModel):
    """Request for agent action rejection endpoint."""

    conversation_id: str = Field(..., description="Conversation ID with pending actions")


# =============================================================================
# Prompt Metadata
# =============================================================================

class VariableMetadataItem(BaseModel):
    """Metadata for a system prompt variable."""

    name: str
    description: str
    example: str
    excludes_tools: list[str] = []


class ToolMetadataItem(BaseModel):
    """Metadata for an allowed tool."""

    name: str
    description: str
    readonly: bool
    category: str


class PromptMetadataResponse(BaseModel):
    """Response for prompt metadata (variables + tools)."""

    variables: list[VariableMetadataItem]
    tools: list[ToolMetadataItem]


# =============================================================================
# Prompt Management
# =============================================================================

class PendingExperiment(BaseModel):
    """Pending experiment info attached to a context."""

    id: str
    status: str
    win_rate: float | None = None
    created_at: str


class AIContextResponse(BaseModel):
    """Response for an AI context."""

    id: str
    name: str
    situation: str
    version: str
    is_active: bool
    is_default: bool
    system_prompt: str
    allowed_tools: list[str]
    max_turns: int
    temperature: float
    description: str | None = None
    created_at: str
    updated_at: str
    current_version_number: int | None = None
    pending_experiment: PendingExperiment | None = None


class AIContextUpdateRequest(BaseModel):
    """Request to update an AI context."""

    system_prompt: str | None = None
    allowed_tools: list[str] | None = None
    max_turns: int | None = None
    temperature: float | None = None
    changelog: str | None = None


class AIContextVersionResponse(BaseModel):
    """Response for an AI context version."""

    id: str
    context_id: str
    version_number: int
    system_prompt: str
    allowed_tools: list[str]
    max_turns: int
    temperature: float
    changelog: str | None = None
    created_at: str


# =============================================================================
# Prompt Challenges
# =============================================================================

class ChallengeGenerateRequest(BaseModel):
    """Request to generate a challenge round."""

    custom_message: str | None = Field(
        None,
        description="Optional custom message to use instead of sampling from past conversations",
    )


class ChallengeVoteRequest(BaseModel):
    """Request to vote on a challenge round."""

    round_id: str = Field(..., description="Round ID to vote on")
    winner: Literal["A", "B", "tie"] = Field(..., description="Which response won: A, B, or tie")


class ChallengeResolveRequest(BaseModel):
    """Request to resolve (promote or reject) an experiment."""

    action: Literal["promote", "reject"] = Field(..., description="Promote variant or reject it")


class ConversationRateRequest(BaseModel):
    """Request to rate a conversation."""

    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5")
    feedback: str | None = Field(None, description="Optional text feedback")


# =============================================================================
# Prompt Comparisons (Version-based A/B)
# =============================================================================

class ComparisonCreateRequest(BaseModel):
    """Request to create a version comparison session."""

    context_id: str = Field(..., description="Context ID to compare versions of")
    version_a: int = Field(..., description="First version number")
    version_b: int = Field(..., description="Second version number")


class ComparisonVoteRequest(BaseModel):
    """Request to vote on a comparison round."""

    round_id: str = Field(..., description="Round ID to vote on")
    winner: Literal["A", "B", "tie"] = Field(..., description="Which response won: A, B, or tie")


class ComparisonResolveRequest(BaseModel):
    """Request to resolve a comparison."""

    action: Literal["adopt_a", "adopt_b", "dismiss"] = Field(
        ..., description="Adopt version A, adopt version B, or dismiss"
    )
