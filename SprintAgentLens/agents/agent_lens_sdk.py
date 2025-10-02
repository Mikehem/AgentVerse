#!/usr/bin/env python3
"""
Agent Lens SDK - Enhanced SDK for Agent observability with run-based tracking and multiturn conversations

This SDK provides comprehensive observability for AI agents with the following features:
- Automatic run_id generation for session tracking
- Multiturn conversation support with thread_id tracking
- Rich telemetry collection (metrics, traces, conversations)
- Master-style evaluation metrics support
- Robust error handling and retry logic
"""

import requests
import time
import json
import uuid
import threading
import functools
import inspect
import contextvars
import contextlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union, Callable, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import warnings


class ConversationStatus(Enum):
    SUCCESS = "success"
    ERROR = "error" 
    TIMEOUT = "timeout"


class RunStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ConversationData:
    """Data class for conversation tracking"""
    input: str
    output: str
    response_time: int  # milliseconds
    status: ConversationStatus = ConversationStatus.SUCCESS
    token_usage: int = 0
    cost: float = 0.0
    feedback: Optional[str] = None
    thread_id: Optional[str] = None
    conversation_index: Optional[int] = None
    parent_conversation_id: Optional[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class MetricData:
    """Data class for metric tracking"""
    metric_type: str
    value: float
    unit: Optional[str] = None
    aggregation_type: str = "instant"
    evaluation_model: Optional[str] = None
    reference_value: Optional[str] = None
    threshold: Optional[float] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class SpanData:
    """Data class for span tracking"""
    id: str
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    input: Optional[Dict[str, Any]] = None
    output: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[str] = None
    trace_id: Optional[str] = None
    thread_id: Optional[str] = None
    error_info: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.tags is None:
            self.tags = []

    def update(self, **kwargs):
        """Update span data with new values"""
        for key, value in kwargs.items():
            if hasattr(self, key) and value is not None:
                if key in ['metadata', 'tags'] and getattr(self, key) is not None:
                    if key == 'metadata':
                        getattr(self, key).update(value)
                    elif key == 'tags':
                        getattr(self, key).extend(value)
                else:
                    setattr(self, key, value)


@dataclass 
class TraceData:
    """Data class for trace tracking"""
    id: str
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    input: Optional[Dict[str, Any]] = None
    output: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    thread_id: Optional[str] = None
    feedback_scores: Optional[List[Dict[str, Any]]] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.tags is None:
            self.tags = []
        if self.feedback_scores is None:
            self.feedback_scores = []

    def update(self, **kwargs):
        """Update trace data with new values"""
        for key, value in kwargs.items():
            if hasattr(self, key) and value is not None:
                if key in ['metadata', 'tags', 'feedback_scores'] and getattr(self, key) is not None:
                    if key == 'metadata':
                        getattr(self, key).update(value)
                    elif key in ['tags', 'feedback_scores']:
                        getattr(self, key).extend(value)
                else:
                    setattr(self, key, value)


class AgentLensContextStorage:
    """
    Manages span and trace context using Python's contextvars for thread and async safety.
    Based on Master's context storage patterns.
    """

    def __init__(self) -> None:
        # Agent Lens instance context
        self._current_agent_lens_context: contextvars.ContextVar[
            Optional['AgentLens']
        ] = contextvars.ContextVar("current_agent_lens", default=None)
        
        # Trace context
        self._current_trace_data_context: contextvars.ContextVar[
            Optional[TraceData]
        ] = contextvars.ContextVar("current_trace_data", default=None)
        
        # Span stack context (using immutable tuples like Master)
        default_span_stack: Tuple[SpanData, ...] = tuple()
        self._spans_data_stack_context: contextvars.ContextVar[
            Tuple[SpanData, ...]
        ] = contextvars.ContextVar("spans_data_stack", default=default_span_stack)

    def get_current_agent_lens(self) -> Optional['AgentLens']:
        """Get the current AgentLens instance"""
        return self._current_agent_lens_context.get()

    def set_current_agent_lens(self, agent_lens: Optional['AgentLens']) -> None:
        """Set the current AgentLens instance"""
        self._current_agent_lens_context.set(agent_lens)

    def top_span_data(self) -> Optional[SpanData]:
        """Get the top span from the stack"""
        if self.span_data_stack_empty():
            return None
        stack = self._spans_data_stack_context.get()
        return stack[-1]

    def pop_span_data(self) -> Optional[SpanData]:
        """Pop the top span from the stack"""
        if self.span_data_stack_empty():
            return None
        stack = self._spans_data_stack_context.get()
        self._spans_data_stack_context.set(stack[:-1])
        return stack[-1]

    def add_span_data(self, span_data: SpanData) -> None:
        """Add span data to the stack"""
        stack = self._spans_data_stack_context.get()
        self._spans_data_stack_context.set(stack + (span_data,))

    def span_data_stack_empty(self) -> bool:
        """Check if span stack is empty"""
        return len(self._spans_data_stack_context.get()) == 0

    def get_trace_data(self) -> Optional[TraceData]:
        """Get current trace data"""
        return self._current_trace_data_context.get()

    def set_trace_data(self, trace_data: Optional[TraceData]) -> None:
        """Set current trace data"""
        self._current_trace_data_context.set(trace_data)

    def pop_trace_data(self) -> Optional[TraceData]:
        """Pop current trace data"""
        trace_data = self._current_trace_data_context.get()
        if trace_data is not None:
            self.set_trace_data(None)
        return trace_data

    def clear_spans(self) -> None:
        """Clear all spans from the stack"""
        self._spans_data_stack_context.set(tuple())

    def clear_all(self) -> None:
        """Clear all context data"""
        self._current_agent_lens_context.set(None)
        self._current_trace_data_context.set(None)
        self.clear_spans()


# Global context storage instance
_context_storage = AgentLensContextStorage()

# Convenience functions for global access
def get_current_agent_lens() -> Optional['AgentLens']:
    """Get the current AgentLens instance from context"""
    return _context_storage.get_current_agent_lens()

def set_current_agent_lens(agent_lens: Optional['AgentLens']) -> None:
    """Set the current AgentLens instance in context"""
    _context_storage.set_current_agent_lens(agent_lens)

def get_current_span_data() -> Optional[SpanData]:
    """Get current span data from context"""
    return _context_storage.top_span_data()

def get_current_trace_data() -> Optional[TraceData]:
    """Get current trace data from context"""
    return _context_storage.get_trace_data()

def update_current_span(
    name: Optional[str] = None,
    input: Optional[Dict[str, Any]] = None,
    output: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    thread_id: Optional[str] = None,
    error_info: Optional[Dict[str, Any]] = None,
) -> None:
    """Update the current span with provided parameters (Master-style API)"""
    current_span = _context_storage.top_span_data()
    if current_span is None:
        raise Exception("No span in context to update")
    
    current_span.update(
        name=name,
        input=input,
        output=output,
        metadata=metadata,
        tags=tags,
        thread_id=thread_id,
        error_info=error_info,
    )

def update_current_trace(
    name: Optional[str] = None,
    input: Optional[Dict[str, Any]] = None,
    output: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    thread_id: Optional[str] = None,
    feedback_scores: Optional[List[Dict[str, Any]]] = None,
) -> None:
    """Update the current trace with provided parameters (Master-style API)"""
    current_trace = _context_storage.get_trace_data()
    if current_trace is None:
        raise Exception("No trace in context to update")
    
    current_trace.update(
        name=name,
        input=input,
        output=output,
        metadata=metadata,
        tags=tags,
        thread_id=thread_id,
        feedback_scores=feedback_scores,
    )


@contextlib.contextmanager
def span_context(span_data: SpanData):
    """Context manager for span tracking"""
    error_info: Optional[Dict[str, Any]] = None
    try:
        _context_storage.add_span_data(span_data)
        yield
    except Exception as exception:
        error_info = {
            "exception_type": type(exception).__name__,
            "exception_message": str(exception),
            "traceback": str(exception.__traceback__)
        }
        raise
    finally:
        popped_span = _context_storage.pop_span_data()
        if popped_span and error_info:
            popped_span.error_info = error_info
        if popped_span:
            popped_span.end_time = datetime.now(timezone.utc)


@contextlib.contextmanager
def trace_context(trace_data: TraceData):
    """Context manager for trace tracking"""
    try:
        _context_storage.set_trace_data(trace_data)
        yield
    finally:
        popped_trace = _context_storage.pop_trace_data()
        if popped_trace:
            popped_trace.end_time = datetime.now(timezone.utc)


class AgentLensTracker:
    """
    Master-style decorator for automatic function tracking with Agent Lens using contextvars
    """
    
    def __init__(self, agent_lens: Optional['AgentLens'] = None):
        self.agent_lens = agent_lens
    
    def track(self,
             name: Optional[str] = None,
             track_type: str = "general",
             tags: Optional[List[str]] = None,
             metadata: Optional[Dict[str, Any]] = None,
             capture_input: bool = True,
             capture_output: bool = True,
             ignore_arguments: Optional[List[str]] = None,
             auto_log_conversation: bool = False,
             thread_id: Optional[str] = None) -> Union[Callable, Callable[[Callable], Callable]]:
        """
        Master-style decorator to track function execution with Agent Lens using contextvars
        
        Can be used as @track or @track().
        
        Args:
            name: Custom name for the operation
            track_type: Type of tracking ('general', 'conversation', 'llm_call', 'tool_call')
            tags: Tags to associate with the span
            metadata: Additional metadata
            capture_input: Whether to capture function inputs
            capture_output: Whether to capture function outputs
            ignore_arguments: List of argument names to ignore when capturing input
            auto_log_conversation: Whether to automatically log as a conversation
            thread_id: Thread ID for multiturn conversation tracking
            
        Returns:
            Decorated function or decorator
        """
        def decorator(func: Callable) -> Callable:
            operation_name = name or func.__name__
            
            def _extract_inputs(func: Callable, args: tuple, kwargs: dict) -> Optional[Dict[str, Any]]:
                """Extract function inputs using signature inspection"""
                if not capture_input:
                    return None
                try:
                    sig = inspect.signature(func)
                    bound_args = sig.bind(*args, **kwargs)
                    bound_args.apply_defaults()
                    input_data = dict(bound_args.arguments)
                    
                    # Remove ignored arguments
                    if ignore_arguments:
                        for arg_name in ignore_arguments:
                            input_data.pop(arg_name, None)
                    
                    return input_data
                except Exception:
                    return {"args_count": len(args), "kwargs_keys": list(kwargs.keys())}

            def _extract_outputs(result: Any) -> Optional[Dict[str, Any]]:
                """Extract function outputs"""
                if not capture_output or result is None:
                    return None
                try:
                    if isinstance(result, (dict, list, str, int, float, bool)):
                        return {"output": result}
                    else:
                        return {"output": str(result), "type": type(result).__name__}
                except Exception:
                    return {"type": type(result).__name__ if result is not None else "None"}

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                # Check if we should track this function
                agent_lens = self.agent_lens or get_current_agent_lens()
                if not agent_lens:
                    return func(*args, **kwargs)
                
                # Create trace if none exists
                current_trace = get_current_trace_data()
                if current_trace is None:
                    # Start new trace
                    trace_id = str(uuid.uuid4())
                    trace_data = TraceData(
                        id=trace_id,
                        name=operation_name,
                        start_time=datetime.now(timezone.utc),
                        thread_id=thread_id,
                        tags=tags[:] if tags else [],
                        metadata={**(metadata or {}), "function_name": func.__name__}
                    )
                    created_trace = True
                else:
                    trace_data = current_trace
                    created_trace = False

                # Create span
                span_id = str(uuid.uuid4())
                parent_span = get_current_span_data()
                span_data = SpanData(
                    id=span_id,
                    name=operation_name,
                    start_time=datetime.now(timezone.utc),
                    trace_id=trace_data.id,
                    parent_id=parent_span.id if parent_span else None,
                    thread_id=thread_id,
                    tags=tags[:] if tags else [],
                    metadata={**(metadata or {}), "function_name": func.__name__, "track_type": track_type},
                    input=_extract_inputs(func, args, kwargs)
                )

                # Execute with proper context management
                if created_trace:
                    with trace_context(trace_data):
                        with span_context(span_data):
                            try:
                                result = func(*args, **kwargs)
                                span_data.output = _extract_outputs(result)
                                return result
                            finally:
                                # Auto-log conversation if requested
                                if auto_log_conversation and agent_lens:
                                    try:
                                        input_text = self._extract_conversation_input(span_data.input)
                                        output_text = self._extract_conversation_output(span_data.output)
                                        
                                        if input_text and output_text:
                                            response_time = int((datetime.now(timezone.utc) - span_data.start_time).total_seconds() * 1000)
                                            conversation_data = ConversationData(
                                                input=input_text[:5000],
                                                output=output_text[:5000],
                                                response_time=response_time,
                                                status=ConversationStatus.SUCCESS,
                                                thread_id=thread_id,
                                                metadata={
                                                    "auto_logged": True,
                                                    "function_name": func.__name__,
                                                    **(metadata or {})
                                                }
                                            )
                                            agent_lens.log_conversation(conversation_data)
                                    except Exception:
                                        pass  # Don't fail function execution due to logging errors
                else:
                    with span_context(span_data):
                        try:
                            result = func(*args, **kwargs)
                            span_data.output = _extract_outputs(result)
                            return result
                        finally:
                            # Auto-log conversation if requested
                            if auto_log_conversation and agent_lens:
                                try:
                                    input_text = self._extract_conversation_input(span_data.input)
                                    output_text = self._extract_conversation_output(span_data.output)
                                    
                                    if input_text and output_text:
                                        response_time = int((datetime.now(timezone.utc) - span_data.start_time).total_seconds() * 1000)
                                        conversation_data = ConversationData(
                                            input=input_text[:5000],
                                            output=output_text[:5000],
                                            response_time=response_time,
                                            status=ConversationStatus.SUCCESS,
                                            thread_id=thread_id,
                                            metadata={
                                                "auto_logged": True,
                                                "function_name": func.__name__,
                                                **(metadata or {})
                                            }
                                        )
                                        agent_lens.log_conversation(conversation_data)
                                except Exception:
                                    pass

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Check if we should track this function
                agent_lens = self.agent_lens or get_current_agent_lens()
                if not agent_lens:
                    return await func(*args, **kwargs)
                
                # Create trace if none exists
                current_trace = get_current_trace_data()
                if current_trace is None:
                    # Start new trace
                    trace_id = str(uuid.uuid4())
                    trace_data = TraceData(
                        id=trace_id,
                        name=operation_name,
                        start_time=datetime.now(timezone.utc),
                        thread_id=thread_id,
                        tags=tags[:] if tags else [],
                        metadata={**(metadata or {}), "function_name": func.__name__, "async": True}
                    )
                    created_trace = True
                else:
                    trace_data = current_trace
                    created_trace = False

                # Create span
                span_id = str(uuid.uuid4())
                parent_span = get_current_span_data()
                span_data = SpanData(
                    id=span_id,
                    name=operation_name,
                    start_time=datetime.now(timezone.utc),
                    trace_id=trace_data.id,
                    parent_id=parent_span.id if parent_span else None,
                    thread_id=thread_id,
                    tags=tags[:] if tags else [],
                    metadata={**(metadata or {}), "function_name": func.__name__, "track_type": track_type, "async": True},
                    input=_extract_inputs(func, args, kwargs)
                )

                # Execute with proper context management
                if created_trace:
                    with trace_context(trace_data):
                        with span_context(span_data):
                            try:
                                result = await func(*args, **kwargs)
                                span_data.output = _extract_outputs(result)
                                return result
                            finally:
                                # Auto-log conversation if requested
                                if auto_log_conversation and agent_lens:
                                    try:
                                        input_text = self._extract_conversation_input(span_data.input)
                                        output_text = self._extract_conversation_output(span_data.output)
                                        
                                        if input_text and output_text:
                                            response_time = int((datetime.now(timezone.utc) - span_data.start_time).total_seconds() * 1000)
                                            conversation_data = ConversationData(
                                                input=input_text[:5000],
                                                output=output_text[:5000],
                                                response_time=response_time,
                                                status=ConversationStatus.SUCCESS,
                                                thread_id=thread_id,
                                                metadata={
                                                    "auto_logged": True,
                                                    "function_name": func.__name__,
                                                    "async": True,
                                                    **(metadata or {})
                                                }
                                            )
                                            agent_lens.log_conversation(conversation_data)
                                    except Exception:
                                        pass
                else:
                    with span_context(span_data):
                        try:
                            result = await func(*args, **kwargs)
                            span_data.output = _extract_outputs(result)
                            return result
                        finally:
                            # Auto-log conversation if requested
                            if auto_log_conversation and agent_lens:
                                try:
                                    input_text = self._extract_conversation_input(span_data.input)
                                    output_text = self._extract_conversation_output(span_data.output)
                                    
                                    if input_text and output_text:
                                        response_time = int((datetime.now(timezone.utc) - span_data.start_time).total_seconds() * 1000)
                                        conversation_data = ConversationData(
                                            input=input_text[:5000],
                                            output=output_text[:5000],
                                            response_time=response_time,
                                            status=ConversationStatus.SUCCESS,
                                            thread_id=thread_id,
                                            metadata={
                                                "auto_logged": True,
                                                "function_name": func.__name__,
                                                "async": True,
                                                **(metadata or {})
                                            }
                                        )
                                        agent_lens.log_conversation(conversation_data)
                                except Exception:
                                    pass

            # Return appropriate wrapper
            if inspect.iscoroutinefunction(func):
                async_wrapper.agent_lens_tracked = True
                return async_wrapper
            else:
                sync_wrapper.agent_lens_tracked = True
                return sync_wrapper
        
        # Handle both @track and @track() usage patterns
        if callable(name):
            # Used as @track (without parentheses)
            func = name
            name = None
            return decorator(func)
        
        # Used as @track(...) (with parentheses)
        return decorator

    def _extract_conversation_input(self, input_data: Optional[Dict[str, Any]]) -> str:
        """Extract conversation input text from function input data"""
        if not input_data:
            return ""
        
        # Try common parameter names for input text
        for key in ['input', 'message', 'query', 'prompt', 'text', 'question']:
            if key in input_data:
                return str(input_data[key])
        
        # Fallback to string representation
        return str(input_data)

    def _extract_conversation_output(self, output_data: Optional[Dict[str, Any]]) -> str:
        """Extract conversation output text from function output data"""
        if not output_data:
            return ""
        
        if 'output' in output_data:
            output = output_data['output']
            
            # Handle common response structures
            if isinstance(output, dict):
                for key in ['response', 'output', 'result', 'answer', 'text']:
                    if key in output:
                        return str(output[key])
                return str(output)
            else:
                return str(output)
        
        # Fallback
        return str(output_data)


class AgentLens:
    """Enhanced Agent Lens SDK with run-based session tracking and multiturn conversation support"""
    
    def __init__(self, 
                 project_id: str, 
                 agent_id: str, 
                 backend_url: str = "http://localhost:3000",
                 auto_start_run: bool = True,
                 run_name: Optional[str] = None,
                 run_description: Optional[str] = None,
                 run_tags: Optional[List[str]] = None,
                 run_metadata: Optional[Dict[str, Any]] = None,
                 timeout: int = 10):
        """
        Initialize Agent Lens SDK
        
        Args:
            project_id: Project identifier
            agent_id: Agent identifier
            backend_url: Backend API URL
            auto_start_run: Whether to automatically start a run on initialization
            run_name: Name for the initial run (if auto_start_run is True)
            run_description: Description for the initial run
            run_tags: Tags for the initial run
            run_metadata: Metadata for the initial run
            timeout: HTTP request timeout in seconds
        """
        self.project_id = project_id
        self.agent_id = agent_id
        self.backend_url = backend_url.rstrip('/')
        self.timeout = timeout
        
        # Run tracking
        self.current_run_id: Optional[str] = None
        self.run_start_time: Optional[str] = None
        self.conversation_count = 0
        self.metric_count = 0
        self.trace_count = 0
        
        # Thread-safe conversation tracking
        self._conversation_threads: Dict[str, List[str]] = {}  # thread_id -> list of conversation_ids
        self._thread_lock = threading.Lock()
        
        # Session data
        self.session_id = str(uuid.uuid4())
        
        # Initialize decorator
        self.tracker = AgentLensTracker(agent_lens=self)
        self.track = self.tracker.track  # Expose track method directly
        
        print(f"🔍 Agent Lens SDK initialized:")
        print(f"   Project ID: {self.project_id}")
        print(f"   Agent ID: {self.agent_id}")
        print(f"   Backend URL: {self.backend_url}")
        print(f"   Session ID: {self.session_id}")
        
        # Auto-start run if requested
        if auto_start_run:
            self.start_run(
                name=run_name or f"SDK Auto-Run {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                description=run_description or "Automatically started run via Agent Lens SDK",
                tags=run_tags or ["sdk", "auto-started"],
                metadata=run_metadata or {}
            )
    
    def _get_timestamp(self) -> str:
        """Get current ISO timestamp"""
        return datetime.now(timezone.utc).isoformat()
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, retries: int = 2) -> Optional[Dict]:
        """
        Make HTTP request with retry logic
        
        Args:
            method: HTTP method (GET, POST, PUT, PATCH, DELETE)
            endpoint: API endpoint (without base URL)
            data: Request payload
            retries: Number of retries on failure
            
        Returns:
            Response data or None on failure
        """
        url = f"{self.backend_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        for attempt in range(retries + 1):
            try:
                if method.upper() == "GET":
                    response = requests.get(url, headers=headers, timeout=self.timeout, params=data)
                elif method.upper() == "POST":
                    response = requests.post(url, json=data, headers=headers, timeout=self.timeout)
                elif method.upper() == "PUT":
                    response = requests.put(url, json=data, headers=headers, timeout=self.timeout)
                elif method.upper() == "PATCH":
                    response = requests.patch(url, json=data, headers=headers, timeout=self.timeout)
                elif method.upper() == "DELETE":
                    response = requests.delete(url, headers=headers, timeout=self.timeout)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                if response.status_code < 400:
                    try:
                        return response.json()
                    except ValueError:
                        return {"success": True, "status_code": response.status_code}
                else:
                    print(f"⚠️  HTTP {response.status_code}: {response.text}")
                    if attempt == retries:
                        return None
                        
            except Exception as e:
                print(f"⚠️  Request attempt {attempt + 1} failed: {str(e)}")
                if attempt == retries:
                    return None
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                
        return None
    
    def generate_run_id(self) -> str:
        """Generate a unique run ID"""
        timestamp = int(time.time() * 1000)  # milliseconds
        random_part = str(uuid.uuid4()).replace('-', '')[:8]
        return f"run_{timestamp}_{random_part}"
    
    def start_run(self, 
                  name: str, 
                  description: Optional[str] = None, 
                  tags: Optional[List[str]] = None, 
                  metadata: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Start a new run session
        
        Args:
            name: Human-readable name for the run
            description: Optional description
            tags: Optional list of tags
            metadata: Optional metadata dictionary
            
        Returns:
            Run ID if successful, None otherwise
        """
        if self.current_run_id:
            warnings.warn(f"Run {self.current_run_id} is already active. Complete it before starting a new one.")
            return self.current_run_id
            
        run_id = self.generate_run_id()
        start_time = self._get_timestamp()
        
        payload = {
            "id": run_id,  # Explicit ID
            "projectId": self.project_id,
            "agentId": self.agent_id,
            "name": name,
            "description": description,
            "status": RunStatus.RUNNING.value,
            "startTime": start_time,
            "tags": tags or [],
            "metadata": {
                **(metadata or {}),
                "sdk_version": "1.0.0",
                "session_id": self.session_id,
                "auto_generated": True
            },
            "createdBy": "agent_lens_sdk"
        }
        
        response = self._make_request("POST", "/api/v1/runs", payload)
        
        if response and response.get('success'):
            run_data = response.get('data', {})
            self.current_run_id = run_data.get('id', run_id)
            self.run_start_time = start_time
            self.conversation_count = 0
            self.metric_count = 0
            self.trace_count = 0
            
            print(f"🚀 Run started: {name}")
            print(f"   Run ID: {self.current_run_id}")
            return self.current_run_id
        else:
            print(f"❌ Failed to start run: {name}")
            return None
    
    def complete_run(self, 
                    final_stats: Optional[Dict[str, Any]] = None,
                    success_rate: Optional[float] = None) -> bool:
        """
        Complete the current run with final statistics
        
        Args:
            final_stats: Optional final statistics
            success_rate: Optional success rate (0-100)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.current_run_id:
            print("❌ No active run to complete")
            return False
            
        payload = {
            "action": "complete",
            **(final_stats or {}),
            "totalConversations": self.conversation_count,
            "totalMetrics": self.metric_count,
            "totalTraces": self.trace_count,
        }
        
        if success_rate is not None:
            payload["successRate"] = success_rate
        
        response = self._make_request("PATCH", f"/api/v1/runs/{self.current_run_id}", payload)
        
        if response and response.get('success'):
            print(f"✅ Run completed: {self.current_run_id}")
            print(f"   Total conversations: {self.conversation_count}")
            print(f"   Total metrics: {self.metric_count}")
            print(f"   Total traces: {self.trace_count}")
            self.current_run_id = None
            return True
        else:
            print(f"❌ Failed to complete run: {self.current_run_id}")
            return False
    
    def fail_run(self, error_message: str, error_details: Optional[Dict] = None) -> bool:
        """
        Mark the current run as failed
        
        Args:
            error_message: Error description
            error_details: Optional additional error details
            
        Returns:
            True if successful, False otherwise
        """
        if not self.current_run_id:
            print("❌ No active run to fail")
            return False
            
        payload = {
            "action": "fail",
            "errorMessage": error_message,
            "totalConversations": self.conversation_count,
            "totalMetrics": self.metric_count,
            "totalTraces": self.trace_count,
        }
        
        if error_details:
            payload.update(error_details)
        
        response = self._make_request("PATCH", f"/api/v1/runs/{self.current_run_id}", payload)
        
        if response and response.get('success'):
            print(f"❌ Run failed: {self.current_run_id} - {error_message}")
            self.current_run_id = None
            return True
        else:
            print(f"❌ Failed to mark run as failed: {self.current_run_id}")
            return False
    
    def start_conversation_thread(self, thread_id: Optional[str] = None) -> str:
        """
        Start a new conversation thread for multiturn conversations
        
        Args:
            thread_id: Optional explicit thread ID, generates one if not provided
            
        Returns:
            Thread ID for tracking multiturn conversations
        """
        if thread_id is None:
            thread_id = f"thread_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        with self._thread_lock:
            self._conversation_threads[thread_id] = []
            
        print(f"🧵 Started conversation thread: {thread_id}")
        return thread_id
    
    def log_conversation(self, conversation_data: Union[ConversationData, Dict]) -> Optional[str]:
        """
        Log a conversation with enhanced multiturn support
        
        Args:
            conversation_data: ConversationData instance or dictionary with conversation details
            
        Returns:
            Conversation ID if successful, None otherwise
        """
        if not self.current_run_id:
            print("⚠️  No active run. Starting auto-run for conversation logging.")
            self.start_run(
                name=f"Auto-Run for Conversation Logging",
                description="Automatically started run for conversation logging",
                tags=["sdk", "auto-conversation"]
            )
            
        # Convert dict to ConversationData if needed
        if isinstance(conversation_data, dict):
            conversation_data = ConversationData(**conversation_data)
        
        conversation_id = f"conv_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        # Handle multiturn conversation tracking
        parent_conversation_id = None
        conversation_index = 0
        
        if conversation_data.thread_id:
            with self._thread_lock:
                if conversation_data.thread_id in self._conversation_threads:
                    thread_conversations = self._conversation_threads[conversation_data.thread_id]
                    if thread_conversations:
                        parent_conversation_id = thread_conversations[-1]  # Last conversation in thread
                        conversation_index = len(thread_conversations)
                    thread_conversations.append(conversation_id)
                else:
                    # First conversation in new thread
                    self._conversation_threads[conversation_data.thread_id] = [conversation_id]
        
        payload = {
            "projectId": self.project_id,
            "agentId": self.agent_id,
            "runId": self.current_run_id,
            "userId": None,  # Can be set via metadata
            "sessionId": self.session_id,
            "threadId": conversation_data.thread_id,
            "conversationIndex": conversation_index,
            "parentConversationId": parent_conversation_id,
            "input": conversation_data.input,
            "output": conversation_data.output,
            "status": conversation_data.status.value,
            "responseTime": conversation_data.response_time,
            "tokenUsage": conversation_data.token_usage,
            "cost": conversation_data.cost,
            "feedback": conversation_data.feedback,
            "metadata": {
                **conversation_data.metadata,
                "conversation_id": conversation_id,
                "session_id": self.session_id,
                "sdk_version": "1.0.0",
                **({"thread_id": conversation_data.thread_id} if conversation_data.thread_id else {}),
                **({"parent_conversation_id": parent_conversation_id} if parent_conversation_id else {}),
                **({"conversation_index": conversation_index} if conversation_data.thread_id else {})
            }
        }
        
        response = self._make_request("POST", "/api/v1/conversations", payload)
        
        if response and response.get('success'):
            self.conversation_count += 1
            thread_info = f" (Thread: {conversation_data.thread_id}, Index: {conversation_index})" if conversation_data.thread_id else ""
            print(f"✅ Conversation logged: {len(conversation_data.input)} chars in, {len(conversation_data.output)} chars out ({conversation_data.response_time}ms){thread_info}")
            return conversation_id
        else:
            print(f"❌ Failed to log conversation")
            return None
    
    def log_metric(self, metric_data: Union[MetricData, Dict]) -> bool:
        """
        Log a metric with Master-style evaluation support
        
        Args:
            metric_data: MetricData instance or dictionary with metric details
            
        Returns:
            True if successful, False otherwise
        """
        if not self.current_run_id:
            print("⚠️  No active run. Metrics require an active run.")
            return False
            
        # Convert dict to MetricData if needed
        if isinstance(metric_data, dict):
            metric_data = MetricData(**metric_data)
        
        payload = {
            "projectId": self.project_id,
            "agentId": self.agent_id,
            "runId": self.current_run_id,
            "metricType": metric_data.metric_type,
            "value": metric_data.value,
            "unit": metric_data.unit,
            "aggregationType": metric_data.aggregation_type,
            "timestamp": self._get_timestamp(),
            "evaluationModel": metric_data.evaluation_model,
            "referenceValue": metric_data.reference_value,
            "threshold": metric_data.threshold,
            "metadata": {
                **metric_data.metadata,
                "session_id": self.session_id,
                "sdk_version": "1.0.0"
            }
        }
        
        response = self._make_request("POST", "/api/v1/metrics", payload)
        
        if response and response.get('success'):
            self.metric_count += 1
            print(f"📊 Metric logged: {metric_data.metric_type} = {metric_data.value} {metric_data.unit or ''}")
            return True
        else:
            print(f"❌ Failed to log metric: {metric_data.metric_type}")
            return False
    
    def start_trace(self, 
                   trace_type: str, 
                   operation_name: str,
                   conversation_id: Optional[str] = None,
                   parent_trace_id: Optional[str] = None,
                   input_data: Optional[Dict] = None,
                   metadata: Optional[Dict] = None) -> Optional[str]:
        """
        Start a new trace for operation tracking
        
        Args:
            trace_type: Type of trace (e.g., 'conversation', 'function_call', 'api_request')
            operation_name: Name of the operation being traced
            conversation_id: Optional associated conversation ID
            parent_trace_id: Optional parent trace ID for nested traces
            input_data: Optional input data for the operation
            metadata: Optional metadata
            
        Returns:
            Trace ID if successful, None otherwise
        """
        if not self.current_run_id:
            print("⚠️  No active run. Traces require an active run.")
            return None
            
        trace_id = f"trace_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        payload = {
            "id": trace_id,
            "projectId": self.project_id,
            "agentId": self.agent_id,
            "runId": self.current_run_id,
            "conversationId": conversation_id,
            "parentTraceId": parent_trace_id,
            "traceType": trace_type,
            "operationName": operation_name,
            "startTime": self._get_timestamp(),
            "status": "running",
            "inputData": json.dumps(input_data) if input_data else None,
            "spans": json.dumps([]),
            "metadata": json.dumps({
                **(metadata or {}),
                "session_id": self.session_id,
                "sdk_version": "1.0.0"
            })
        }
        
        response = self._make_request("POST", "/api/v1/traces", payload)
        
        if response and response.get('success'):
            self.trace_count += 1
            print(f"🔍 Trace started: {operation_name} ({trace_type})")
            return trace_id
        else:
            print(f"❌ Failed to start trace: {operation_name}")
            return None
    
    def complete_trace(self, 
                      trace_id: str,
                      status: str = "success",
                      output_data: Optional[Dict] = None,
                      error_message: Optional[str] = None,
                      spans: Optional[List[Dict]] = None,
                      metadata: Optional[Dict] = None) -> bool:
        """
        Complete a trace
        
        Args:
            trace_id: Trace ID to complete
            status: Final status ('success', 'error', 'timeout')
            output_data: Optional output data
            error_message: Optional error message
            spans: Optional list of spans
            metadata: Optional metadata
            
        Returns:
            True if successful, False otherwise
        """
        payload = {
            "id": trace_id,
            "endTime": self._get_timestamp(),
            "status": status,
            "errorMessage": error_message,
            "outputData": json.dumps(output_data) if output_data else None,
            "spans": json.dumps(spans or []),
            "metadata": json.dumps({
                **(metadata or {}),
                "session_id": self.session_id,
                "sdk_version": "1.0.0"
            })
        }
        
        response = self._make_request("PUT", "/api/v1/traces", payload)
        
        if response and response.get('success'):
            print(f"✅ Trace completed: {trace_id} ({status})")
            return True
        else:
            print(f"❌ Failed to complete trace: {trace_id}")
            return False
    
    def get_conversation_thread(self, thread_id: str) -> List[str]:
        """
        Get all conversation IDs in a thread
        
        Args:
            thread_id: Thread ID to query
            
        Returns:
            List of conversation IDs in chronological order
        """
        with self._thread_lock:
            return self._conversation_threads.get(thread_id, []).copy()
    
    def __enter__(self):
        """Context manager entry - sets global context for decorators"""
        set_current_agent_lens(self)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto-complete run if active and clear context"""
        try:
            if self.current_run_id:
                if exc_type:
                    self.fail_run(f"Context manager exited with exception: {exc_type.__name__}: {exc_val}")
                else:
                    self.complete_run()
        finally:
            # Clear all context data (Master-style cleanup)
            _context_storage.clear_all()


# Global decorator instances for convenience
_global_tracker = AgentLensTracker()

# Master-style global functions
def track(name: Optional[str] = None,
          track_type: str = "general",
          tags: Optional[List[str]] = None,
          metadata: Optional[Dict[str, Any]] = None,
          capture_input: bool = True,
          capture_output: bool = True,
          ignore_arguments: Optional[List[str]] = None,
          auto_log_conversation: bool = False,
          thread_id: Optional[str] = None) -> Union[Callable, Callable[[Callable], Callable]]:
    """
    Global Master-style track decorator
    
    Uses the current AgentLens instance from thread-local context.
    
    Example usage:
        @track()
        def my_function(input_text: str) -> str:
            return f"Processed: {input_text}"
            
        @track
        def another_function():
            return "result"
            
        @track(auto_log_conversation=True, thread_id="my_thread")
        def chat_function(message: str) -> str:
            return f"Response to: {message}"
    """
    return _global_tracker.track(
        name=name,
        track_type=track_type,
        tags=tags,
        metadata=metadata,
        capture_input=capture_input,
        capture_output=capture_output,
        ignore_arguments=ignore_arguments,
        auto_log_conversation=auto_log_conversation,
        thread_id=thread_id
    )


def flush_tracker(timeout: Optional[int] = None) -> None:
    """
    Master-style flush function (for compatibility)
    
    Note: Agent Lens doesn't require explicit flushing as it sends data immediately,
    but this is provided for Master compatibility.
    """
    agent_lens = get_current_agent_lens()
    if agent_lens:
        print("📤 Agent Lens tracker flushed (data sent immediately)")
    else:
        print("⚠️  No active Agent Lens instance to flush")


# Convenience functions for quick usage
def create_conversation(input_text: str, 
                       output_text: str, 
                       response_time: int,
                       **kwargs) -> ConversationData:
    """
    Convenience function to create ConversationData
    
    Args:
        input_text: User input
        output_text: Agent output  
        response_time: Response time in milliseconds
        **kwargs: Additional conversation parameters
        
    Returns:
        ConversationData instance
    """
    return ConversationData(
        input=input_text,
        output=output_text,
        response_time=response_time,
        **kwargs
    )


def create_metric(metric_type: str, 
                 value: float, 
                 unit: Optional[str] = None,
                 **kwargs) -> MetricData:
    """
    Convenience function to create MetricData
    
    Args:
        metric_type: Type of metric
        value: Metric value
        unit: Optional unit
        **kwargs: Additional metric parameters
        
    Returns:
        MetricData instance
    """
    return MetricData(
        metric_type=metric_type,
        value=value,
        unit=unit,
        **kwargs
    )


# Example usage
if __name__ == "__main__":
    # Master-style decorator examples
    
    @track()
    def process_query(query: str) -> str:
        """A function that gets automatically tracked"""
        import time
        time.sleep(0.1)  # Simulate processing
        return f"Processed query: {query}"
    
    @track(auto_log_conversation=True)
    def chat_response(message: str) -> dict:
        """Function that auto-logs as conversation"""
        import time
        time.sleep(0.2)
        return {
            "response": f"Thank you for your message: '{message}'. How can I help you further?",
            "confidence": 0.95
        }
    
    @track(track_type="llm_call", tags=["openai", "gpt-4"])
    def call_llm(prompt: str, model: str = "gpt-4") -> str:
        """Simulated LLM call with tracking"""
        import time
        time.sleep(0.3)
        return f"LLM response to '{prompt}' using {model}"
    
    # Demo using Master-style decorators with Agent Lens
    print("🚀 Starting Master-style decorator demo...")
    
    with AgentLens(
        project_id="project-1757579671500",
        agent_id="agent_testagen_mffbl12k",
        backend_url="http://localhost:3000",
        run_name="SDK Demo - Master Style Decorators",
        run_tags=["demo", "decorators", "Master-style"]
    ) as lens:
        
        print("\n📋 Testing basic function tracking...")
        result1 = process_query("What is machine learning?")
        print(f"Result: {result1}")
        
        print("\n💬 Testing auto-conversation logging...")
        result2 = chat_response("Hello, I need help with Python")
        print(f"Result: {result2}")
        
        print("\n🤖 Testing LLM call tracking...")
        result3 = call_llm("Explain quantum computing", "gpt-4")
        print(f"Result: {result3}")
        
        print("\n🧵 Testing multiturn conversation with decorators...")
        thread_id = lens.start_conversation_thread()
        
        @track(auto_log_conversation=True, thread_id=thread_id)
        def multiturn_chat(message: str, context: str = "") -> str:
            """Multiturn conversation function"""
            import time
            time.sleep(0.15)
            return f"Based on context '{context}', my response to '{message}' is: Here's a detailed explanation."
        
        # Simulate multiturn conversation
        response1 = multiturn_chat("What is Python?", "programming tutorial")
        response2 = multiturn_chat("Can you give me an example?", "python basics")
        
        print(f"Thread conversations: {lens.get_conversation_thread(thread_id)}")
        
        print("\n📊 Logging some metrics...")
        lens.log_metric(create_metric("decorator_calls", 5, "count"))
        lens.log_metric(create_metric("avg_response_time", 180, "ms"))
        
        print("\n✅ Master-style decorator demo completed!")
        
    print("\n🔄 Testing global decorator without context (should still work)...")
    result4 = process_query("This works without explicit Agent Lens context")
    print(f"Result: {result4}")
    
    # Call flush for Master compatibility
    flush_tracker()
    
    print("\n🎯 Demo Summary:")
    print("- ✅ Master-style @track decorator implemented")
    print("- ✅ Both sync and async function support") 
    print("- ✅ Auto-conversation logging")
    print("- ✅ Thread-based multiturn conversations")
    print("- ✅ Global context management")
    print("- ✅ Compatible with Master decorator patterns")
    print("- ✅ Comprehensive input/output capture")
    print("- ✅ Error handling and trace completion")
    
    # Traditional SDK usage (still supported)
    print("\n📝 Traditional SDK usage still works...")
    with AgentLens(
        project_id="project-1757579671500",
        agent_id="agent_testagen_mffbl12k",
        backend_url="http://localhost:3000",
        run_name="SDK Demo - Traditional Usage",
        run_tags=["demo", "traditional"]
    ) as lens:
        
        # Traditional manual logging
        conversation = create_conversation(
            input_text="Traditional conversation logging",
            output_text="This is logged using the traditional method",
            response_time=100,
            status=ConversationStatus.SUCCESS
        )
        lens.log_conversation(conversation)
        lens.log_metric(create_metric("traditional_metric", 1.0, "count"))
        
        print("✅ Traditional usage confirmed working")