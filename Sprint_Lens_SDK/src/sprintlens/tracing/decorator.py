"""
Track decorator for automatic function tracing.

This module provides the @track decorator that automatically creates spans
for function calls, capturing inputs, outputs, and execution metrics.
"""

import asyncio
import functools
import inspect
from typing import Optional, Dict, Any, Callable, Union, TYPE_CHECKING

from .types import SpanType
from .context import get_current_trace, get_current_span
from ..utils.logging import get_logger
from ..utils.validation import validate_span_name, sanitize_tags
from ..utils.serialization import serialize_safely

if TYPE_CHECKING:
    from ..core.client import SprintLensClient

logger = get_logger(__name__)


class TrackDecorator:
    """
    Decorator factory for automatic function tracing.
    
    Creates spans automatically around function calls, capturing
    inputs, outputs, timing, and any exceptions.
    """

    def __init__(self, client: 'SprintLensClient'):
        """
        Initialize track decorator.
        
        Args:
            client: Sprint Lens client instance
        """
        self._client = client

    def __call__(
        self,
        name: Optional[str] = None,
        span_type: Union[str, SpanType] = SpanType.CUSTOM,
        capture_input: bool = True,
        capture_output: bool = True,
        capture_exception: bool = True,
        tags: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        project_name: Optional[str] = None,
        auto_flush: bool = False,
        **span_kwargs
    ):
        """
        Create a tracking decorator.
        
        Args:
            name: Optional span name (defaults to function name)
            span_type: Type of span operation
            capture_input: Whether to capture function arguments
            capture_output: Whether to capture function return value
            capture_exception: Whether to capture exceptions
            tags: Tags to add to the span
            metadata: Metadata to add to the span
            project_name: Project name for trace (overrides client default)
            auto_flush: Whether to automatically flush trace after function
            **span_kwargs: Additional span parameters
            
        Returns:
            Decorated function
        """
        def decorator(func: Callable) -> Callable:
            # Get function info
            func_name = name or func.__name__
            func_module = func.__module__
            
            # Validate span name
            if not validate_span_name(func_name):
                logger.warning("Invalid span name, using function name", extra={
                    "original_name": func_name,
                    "function": func.__name__
                })
                func_name = func.__name__
            
            # Convert string span type to enum
            if isinstance(span_type, str):
                try:
                    span_type_enum = SpanType(span_type)
                except ValueError:
                    span_type_enum = SpanType.CUSTOM
            else:
                span_type_enum = span_type
            
            # Prepare tags and metadata
            span_tags = sanitize_tags(tags or {})
            span_tags.update({
                "function_name": func.__name__,
                "module": func_module,
                "decorator": "track"
            })
            
            span_metadata = (metadata or {}).copy()
            span_metadata.update({
                "function_signature": str(inspect.signature(func)),
                "function_file": inspect.getfile(func),
                "function_line": inspect.getsourcelines(func)[1] if hasattr(inspect, 'getsourcelines') else None
            })
            
            # Create sync wrapper
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                return self._execute_with_tracking(
                    func=func,
                    args=args,
                    kwargs=kwargs,
                    span_name=func_name,
                    span_type=span_type_enum,
                    span_tags=span_tags,
                    span_metadata=span_metadata,
                    capture_input=capture_input,
                    capture_output=capture_output,
                    capture_exception=capture_exception,
                    project_name=project_name,
                    auto_flush=auto_flush,
                    is_async=False,
                    **span_kwargs
                )
            
            # Create async wrapper
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await self._execute_with_tracking(
                    func=func,
                    args=args,
                    kwargs=kwargs,
                    span_name=func_name,
                    span_type=span_type_enum,
                    span_tags=span_tags,
                    span_metadata=span_metadata,
                    capture_input=capture_input,
                    capture_output=capture_output,
                    capture_exception=capture_exception,
                    project_name=project_name,
                    auto_flush=auto_flush,
                    is_async=True,
                    **span_kwargs
                )
            
            # Return appropriate wrapper based on function type
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator

    def _execute_with_tracking(
        self,
        func: Callable,
        args: tuple,
        kwargs: dict,
        span_name: str,
        span_type: SpanType,
        span_tags: Dict[str, str],
        span_metadata: Dict[str, Any],
        capture_input: bool,
        capture_output: bool,
        capture_exception: bool,
        project_name: Optional[str],
        auto_flush: bool,
        is_async: bool,
        **span_kwargs
    ):
        """Execute function with span tracking."""
        # Get or create trace
        trace = get_current_trace()
        created_trace = False
        
        if trace is None:
            # Create new trace
            trace_name = f"{func.__module__}.{func.__name__}"
            trace = self._client.create_trace(
                name=trace_name,
                project_name=project_name,
                tags={"auto_created": "true"},
                metadata={"created_by": "track_decorator"}
            )
            created_trace = True
            logger.debug("Created new trace for decorated function", extra={
                "trace_id": trace.id,
                "function": func.__name__
            })
        
        # Create span
        current_span = get_current_span()
        span = trace.span(
            name=span_name,
            span_type=span_type,
            parent=current_span,
            tags=span_tags,
            metadata=span_metadata,
            **span_kwargs
        )
        
        # Execute function with span
        if is_async:
            return self._execute_async(
                func, args, kwargs, span, trace, created_trace,
                capture_input, capture_output, capture_exception, auto_flush
            )
        else:
            return self._execute_sync(
                func, args, kwargs, span, trace, created_trace,
                capture_input, capture_output, capture_exception, auto_flush
            )

    def _execute_sync(
        self,
        func: Callable,
        args: tuple,
        kwargs: dict,
        span,
        trace,
        created_trace: bool,
        capture_input: bool,
        capture_output: bool,
        capture_exception: bool,
        auto_flush: bool
    ):
        """Execute synchronous function with span tracking."""
        with span:
            try:
                # Capture input
                if capture_input:
                    input_data = self._capture_function_input(func, args, kwargs)
                    span.set_input(input_data)
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Capture output
                if capture_output:
                    span.set_output(serialize_safely(result))
                
                return result
                
            except Exception as e:
                if capture_exception:
                    span.set_error(e)
                raise
            
            finally:
                # Auto-flush if requested and we created the trace
                if auto_flush and created_trace:
                    try:
                        # For sync functions, we can't await, so just finish
                        trace.finish()
                    except Exception as e:
                        logger.error("Failed to flush trace", extra={
                            "trace_id": trace.id,
                            "error": str(e)
                        })

    async def _execute_async(
        self,
        func: Callable,
        args: tuple,
        kwargs: dict,
        span,
        trace,
        created_trace: bool,
        capture_input: bool,
        capture_output: bool,
        capture_exception: bool,
        auto_flush: bool
    ):
        """Execute asynchronous function with span tracking."""
        async with span:
            try:
                # Capture input
                if capture_input:
                    input_data = self._capture_function_input(func, args, kwargs)
                    span.set_input(input_data)
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Capture output
                if capture_output:
                    span.set_output(serialize_safely(result))
                
                return result
                
            except Exception as e:
                if capture_exception:
                    span.set_error(e)
                raise
            
            finally:
                # Auto-flush if requested and we created the trace
                if auto_flush and created_trace:
                    try:
                        await trace.finish_async()
                    except Exception as e:
                        logger.error("Failed to flush trace", extra={
                            "trace_id": trace.id,
                            "error": str(e)
                        })

    def _capture_function_input(self, func: Callable, args: tuple, kwargs: dict) -> Dict[str, Any]:
        """
        Capture function input parameters.
        
        Args:
            func: Function being called
            args: Positional arguments
            kwargs: Keyword arguments
            
        Returns:
            Dictionary containing input parameters
        """
        try:
            # Get function signature
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # Create input dictionary
            input_data = {}
            
            for param_name, param_value in bound_args.arguments.items():
                # Skip sensitive parameters
                if self._is_sensitive_parameter(param_name):
                    input_data[param_name] = "[REDACTED]"
                else:
                    input_data[param_name] = serialize_safely(param_value)
            
            return input_data
            
        except Exception as e:
            logger.warning("Failed to capture function input", extra={
                "function": func.__name__,
                "error": str(e)
            })
            # Fallback to basic args/kwargs
            return {
                "args": serialize_safely(args),
                "kwargs": serialize_safely(kwargs)
            }

    def _is_sensitive_parameter(self, param_name: str) -> bool:
        """
        Check if parameter name contains sensitive data.
        
        Args:
            param_name: Parameter name to check
            
        Returns:
            True if parameter should be redacted
        """
        sensitive_patterns = [
            'password', 'secret', 'key', 'token', 'auth',
            'credential', 'private', 'confidential'
        ]
        
        param_lower = param_name.lower()
        return any(pattern in param_lower for pattern in sensitive_patterns)


# Standalone track function that can be used without a client instance
def track(
    name: Optional[str] = None,
    span_type: Union[str, SpanType] = SpanType.CUSTOM,
    capture_input: bool = True,
    capture_output: bool = True,
    capture_exception: bool = True,
    tags: Optional[Dict[str, str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    project_name: Optional[str] = None,
    auto_flush: bool = False,
    **span_kwargs
):
    """
    Standalone track decorator function.
    
    This function provides a track decorator that works with the global
    client instance configured via sprintlens.configure().
    
    Args:
        name: Optional span name (defaults to function name)
        span_type: Type of span operation
        capture_input: Whether to capture function arguments
        capture_output: Whether to capture function return value
        capture_exception: Whether to capture exceptions
        tags: Tags to add to the span
        metadata: Metadata to add to the span
        project_name: Project name for trace
        auto_flush: Whether to automatically flush trace
        **span_kwargs: Additional span parameters
        
    Returns:
        Decorated function
        
    Example:
        >>> @sprintlens.track
        ... def my_function(x, y):
        ...     return x + y
        >>>
        >>> @sprintlens.track(name="custom-name", span_type="processing")
        ... async def async_function(data):
        ...     return process_data(data)
    """
    # Import here to avoid circular imports
    from ..core.client import get_client
    
    def decorator(func: Callable) -> Callable:
        # Get global client
        client = get_client()
        if client is None:
            logger.error("No global client configured. Call sprintlens.configure() first.")
            return func  # Return undecorated function
        
        # Create TrackDecorator instance and apply
        track_decorator = TrackDecorator(client)
        return track_decorator(
            name=name,
            span_type=span_type,
            capture_input=capture_input,
            capture_output=capture_output,
            capture_exception=capture_exception,
            tags=tags,
            metadata=metadata,
            project_name=project_name,
            auto_flush=auto_flush,
            **span_kwargs
        )(func)
    
    return decorator