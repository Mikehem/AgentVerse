"""
Tracing engine for Sprint Lens SDK.

This module provides comprehensive tracing capabilities for AI applications,
including automatic function tracking, context management, and integration
with the Sprint Agent Lens backend.
"""

from .trace import Trace
from .span import Span
from .context import (
    get_current_trace,
    set_current_trace,
    get_current_span,
    set_current_span,
    create_trace_context,
    TraceContext
)
from .decorator import track
from .types import (
    TraceData,
    SpanData,
    TraceStatus,
    SpanType,
    InputOutput,
    MetricValue
)

__all__ = [
    # Core objects
    "Trace",
    "Span",
    
    # Context management
    "get_current_trace",
    "set_current_trace", 
    "get_current_span",
    "set_current_span",
    "create_trace_context",
    "TraceContext",
    
    # Decorator
    "track",
    
    # Types
    "TraceData",
    "SpanData",
    "TraceStatus",
    "SpanType",
    "InputOutput",
    "MetricValue"
]