"""Situation detector for determining context based on time and user input."""

from datetime import datetime, time
from enum import Enum
from zoneinfo import ZoneInfo


class Situation(str, Enum):
    """Possible situations for AI context."""

    CHAT = "chat"
    MORNING = "morning"
    EVENING = "evening"
    WEEKLY = "weekly"


# Time ranges for automatic situation detection (in local time)
MORNING_START = time(5, 0)
MORNING_END = time(10, 0)
EVENING_START = time(17, 0)
EVENING_END = time(22, 0)


def detect_situation(
    explicit_situation: str | None = None,
    timezone: str = "Asia/Tokyo",
) -> Situation:
    """Detect the appropriate situation based on time or explicit specification.

    Args:
        explicit_situation: Explicitly specified situation (overrides auto-detection)
        timezone: User's timezone for time-based detection

    Returns:
        Detected or specified Situation
    """
    # If explicitly specified, validate and return
    if explicit_situation:
        try:
            return Situation(explicit_situation.lower())
        except ValueError:
            pass  # Fall through to auto-detection

    # Auto-detect based on current time
    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("Asia/Tokyo")

    now = datetime.now(tz)
    current_time = now.time()

    # Check if it's morning (5:00 - 10:00)
    if MORNING_START <= current_time < MORNING_END:
        return Situation.MORNING

    # Check if it's evening (17:00 - 22:00)
    if EVENING_START <= current_time < EVENING_END:
        return Situation.EVENING

    # Default to chat
    return Situation.CHAT


def is_weekend(timezone: str = "Asia/Tokyo") -> bool:
    """Check if current day is weekend (for weekly review suggestion).

    Args:
        timezone: User's timezone

    Returns:
        True if Saturday or Sunday
    """
    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("Asia/Tokyo")

    now = datetime.now(tz)
    return now.weekday() >= 5  # Saturday = 5, Sunday = 6
