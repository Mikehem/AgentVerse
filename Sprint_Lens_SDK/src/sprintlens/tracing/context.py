"""
Context management for traces and spans.

Provides thread-safe and async-safe context propagation for distributed tracing.
"""

import asyncio
import threading
from contextvars import ContextVar
from typing import Optional, Dict, Any
from contextlib import contextmanager, asynccontextmanager

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Context variables for async context propagation
_current_trace: ContextVar[Optional['Trace']] = ContextVar('current_trace', default=None)
_current_span: ContextVar[Optional['Span']] = ContextVar('current_span', default=None)

# Thread-local storage for sync context propagation
_thread_local = threading.local()


def get_current_trace() -> Optional['Trace']:
    """
    Get the current trace from context.
    
    Returns:
        Current trace or None if no trace is active
    """
    try:
        # Try async context first
        return _current_trace.get()
    except LookupError:
        # Fall back to thread-local storage
        return getattr(_thread_local, 'current_trace', None)


def set_current_trace(trace: Optional['Trace']) -> None:
    """
    Set the current trace in context.
    
    Args:
        trace: Trace to set as current, or None to clear
    """
    try:
        # Set in async context
        _current_trace.set(trace)
    except Exception:
        pass
    
    # Also set in thread-local for sync compatibility
    _thread_local.current_trace = trace


def get_current_span() -> Optional['Span']:
    """
    Get the current span from context.
    
    Returns:
        Current span or None if no span is active
    """
    try:
        # Try async context first
        return _current_span.get()
    except LookupError:
        # Fall back to thread-local storage
        return getattr(_thread_local, 'current_span', None)


def set_current_span(span: Optional['Span']) -> None:
    """
    Set the current span in context.
    
    Args:
        span: Span to set as current, or None to clear
    """
    try:
        # Set in async context
        _current_span.set(span)
    except Exception:
        pass
    
    # Also set in thread-local for sync compatibility
    _thread_local.current_span = span


class TraceContext:
    """
    Context manager for trace lifecycle management.
    
    Ensures proper setup and cleanup of trace context,
    handles errors and provides span creation.
    """

    def __init__(self, trace: 'Trace'):
        """Initialize trace context with a trace."""
        self.trace = trace
        self._previous_trace: Optional['Trace'] = None
        self._entered = False

    def __enter__(self) -> 'Trace':
        """Enter trace context (sync)."""
        self._previous_trace = get_current_trace()
        set_current_trace(self.trace)
        self._entered = True
        
        logger.debug("Entered trace context", extra={
            "trace_id": self.trace.id,
            "trace_name": self.trace.name
        })
        
        return self.trace

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit trace context (sync)."""
        if self._entered:
            if exc_type is not None:
                # Handle exception in trace
                self.trace._handle_exception(exc_val)
            
            set_current_trace(self._previous_trace)
            self._entered = False
            
            logger.debug("Exited trace context", extra={
                "trace_id": self.trace.id,
                "had_error": exc_type is not None
            })

    async def __aenter__(self) -> 'Trace':
        """Enter trace context (async)."""
        self._previous_trace = get_current_trace()
        set_current_trace(self.trace)
        self._entered = True
        
        logger.debug("Entered async trace context", extra={
            "trace_id": self.trace.id,
            "trace_name": self.trace.name
        })
        
        return self.trace

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit trace context (async)."""
        if self._entered:
            if exc_type is not None:
                # Handle exception in trace
                self.trace._handle_exception(exc_val)
            
            set_current_trace(self._previous_trace)
            self._entered = False
            
            logger.debug("Exited async trace context", extra={
                "trace_id": self.trace.id,
                "had_error": exc_type is not None
            })


class SpanContext:
    """
    Context manager for span lifecycle management.
    
    Manages span timing, error handling, and context propagation.
    """

    def __init__(self, span: 'Span'):
        """Initialize span context with a span."""
        self.span = span
        self._previous_span: Optional['Span'] = None
        self._entered = False

    def __enter__(self) -> 'Span':
        """Enter span context (sync)."""
        self._previous_span = get_current_span()
        set_current_span(self.span)
        self.span._start()
        self._entered = True
        
        logger.debug("Entered span context", extra={
            "span_id": self.span.id,
            "span_name": self.span.name,
            "trace_id": self.span.trace_id
        })
        
        return self.span

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit span context (sync)."""
        if self._entered:
            if exc_type is not None:
                # Handle exception in span
                self.span.set_error(exc_val)
            
            self.span._finish()
            set_current_span(self._previous_span)
            self._entered = False
            
            logger.debug("Exited span context", extra={
                "span_id": self.span.id,
                "duration_ms": self.span.duration_ms,
                "had_error": exc_type is not None
            })

    async def __aenter__(self) -> 'Span':
        """Enter span context (async)."""
        self._previous_span = get_current_span()
        set_current_span(self.span)
        self.span._start()
        self._entered = True
        
        logger.debug("Entered async span context", extra={
            "span_id": self.span.id,
            "span_name": self.span.name,
            "trace_id": self.span.trace_id
        })
        
        return self.span

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit span context (async)."""
        if self._entered:
            if exc_type is not None:
                # Handle exception in span
                self.span.set_error(exc_val)
            
            self.span._finish()
            set_current_span(self._previous_span)
            self._entered = False
            
            logger.debug("Exited async span context", extra={
                "span_id": self.span.id,
                "duration_ms": self.span.duration_ms,
                "had_error": exc_type is not None
            })


def create_trace_context(trace: 'Trace') -> TraceContext:
    """
    Create a trace context manager.
    
    Args:
        trace: Trace to manage
        
    Returns:
        TraceContext manager
    """
    return TraceContext(trace)


def create_span_context(span: 'Span') -> SpanContext:
    """
    Create a span context manager.
    
    Args:
        span: Span to manage
        
    Returns:
        SpanContext manager
    """
    return SpanContext(span)


@contextmanager
def trace_context(trace: 'Trace'):
    """
    Synchronous context manager for traces.
    
    Args:
        trace: Trace to set as current
        
    Yields:
        The trace object
    """
    with TraceContext(trace) as t:
        yield t


@asynccontextmanager
async def async_trace_context(trace: 'Trace'):
    """
    Asynchronous context manager for traces.
    
    Args:
        trace: Trace to set as current
        
    Yields:
        The trace object
    """
    async with TraceContext(trace) as t:
        yield t


@contextmanager
def span_context(span: 'Span'):
    """
    Synchronous context manager for spans.
    
    Args:
        span: Span to set as current
        
    Yields:
        The span object
    """
    with SpanContext(span) as s:
        yield s


@asynccontextmanager
async def async_span_context(span: 'Span'):
    """
    Asynchronous context manager for spans.
    
    Args:
        span: Span to set as current
        
    Yields:
        The span object
    """
    async with SpanContext(span) as s:
        yield s


def get_trace_id() -> Optional[str]:
    """
    Get the current trace ID from context.
    
    Returns:
        Current trace ID or None
    """
    trace = get_current_trace()
    return trace.id if trace else None


def get_span_id() -> Optional[str]:
    """
    Get the current span ID from context.
    
    Returns:
        Current span ID or None
    """
    span = get_current_span()
    return span.id if span else None


def clear_context():
    """Clear all context variables."""
    set_current_trace(None)
    set_current_span(None)