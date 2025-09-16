"""
DateTime utilities for Sprint Lens SDK.
"""

from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def iso_format(dt: datetime) -> str:
    """Format datetime as ISO string."""
    return dt.isoformat()


def parse_iso_datetime(iso_string: str) -> Optional[datetime]:
    """
    Parse ISO datetime string.
    
    Args:
        iso_string: ISO formatted datetime string
        
    Returns:
        Parsed datetime or None if invalid
    """
    try:
        return datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None