"""
SprintAgentLens Tracing SDK
Enhanced Opik-style tracing for agent observability and performance monitoring.
"""

import asyncio
import functools
import inspect
import json
import logging
import threading
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union, TypeVar, Generic
import requests
from concurrent.futures import ThreadPoolExecutor


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TraceType(Enum):
    """Types of traces that can be logged."""
    CONVERSATION = "conversation"
    TASK = "task" 
    FUNCTION_CALL = "function_call"
    API_REQUEST = "api_request"
    LLM_CHAIN = "llm_chain"
    RETRIEVAL = "retrieval"
    PREPROCESSING = "preprocessing"


class TraceStatus(Enum):
    """Status of trace execution."""
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"


class Environment(Enum):
    """Deployment environment."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class Usage:
    """Token usage and cost tracking."""
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost: Optional[float] = None


@dataclass
class FeedbackScore:
    """Feedback scoring for trace quality."""
    name: str
    value: float
    category: Optional[str] = None
    reason: Optional[str] = None
    source: str = "user"  # user, auto, eval


@dataclass
class TraceSpan:
    """Individual span within a trace."""
    id: str
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    parent_span_id: Optional[str] = None


class TraceContext:
    """Thread-local context for managing trace state."""
    
    def __init__(self):
        self._local = threading.local()
        
    def get_current_trace(self) -> Optional['Trace']:
        """Get the current active trace."""
        return getattr(self._local, 'current_trace', None)
    
    def set_current_trace(self, trace: 'Trace') -> None:
        """Set the current active trace."""
        self._local.current_trace = trace
    
    def clear_current_trace(self) -> None:
        """Clear the current active trace."""
        if hasattr(self._local, 'current_trace'):
            delattr(self._local, 'current_trace')
    
    def get_current_span(self) -> Optional[TraceSpan]:
        """Get the current active span."""
        trace = self.get_current_trace()
        return trace.current_span if trace else None


# Global trace context
trace_context = TraceContext()


class Trace:
    """Enhanced trace object with comprehensive tracking capabilities."""
    
    def __init__(
        self,
        name: str,
        project_id: str,
        agent_id: str,
        trace_type: TraceType = TraceType.FUNCTION_CALL,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        parent_trace_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        model_name: Optional[str] = None,
        model_parameters: Optional[Dict[str, Any]] = None,
        environment: Environment = Environment.DEVELOPMENT,
        capture_input: bool = True,
        capture_output: bool = True,
        auto_end: bool = True
    ):
        self.id = f"trace_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        self.name = name
        self.project_id = project_id
        self.agent_id = agent_id
        self.trace_type = trace_type
        self.session_id = session_id
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.parent_trace_id = parent_trace_id
        self.tags = tags or []
        self.metadata = metadata or {}
        self.model_name = model_name
        self.model_parameters = model_parameters or {}
        self.environment = environment
        self.capture_input = capture_input
        self.capture_output = capture_output
        self.auto_end = auto_end
        
        # Timing and status
        self.start_time = datetime.utcnow()
        self.end_time: Optional[datetime] = None
        self.duration_ms: Optional[float] = None
        self.status = TraceStatus.RUNNING
        
        # Data tracking
        self.input_data: Optional[Dict[str, Any]] = None
        self.output_data: Optional[Dict[str, Any]] = None
        self.error_message: Optional[str] = None
        self.error_type: Optional[str] = None
        self.error_code: Optional[str] = None
        self.stack_trace: Optional[str] = None
        
        # Performance metrics
        self.latency_ms: Optional[float] = None
        self.throughput_tokens_per_second: Optional[float] = None
        
        # Usage and cost
        self.usage: Optional[Usage] = None
        
        # Quality metrics
        self.quality_score: Optional[float] = None
        self.relevance_score: Optional[float] = None
        self.factuality_score: Optional[float] = None
        self.hallucination_score: Optional[float] = None
        
        # Feedback
        self.feedback_scores: List[FeedbackScore] = []
        
        # Spans and context
        self.spans: List[TraceSpan] = []
        self.current_span: Optional[TraceSpan] = None
        self.context_window: List[Dict[str, Any]] = []
        
        # Threading
        self._span_lock = threading.Lock()
        
    def start_span(
        self, 
        name: str, 
        input_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TraceSpan:
        """Start a new span within the trace."""
        with self._span_lock:
            span = TraceSpan(
                id=f"span_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}",
                name=name,
                start_time=datetime.utcnow(),
                input_data=input_data,
                metadata=metadata,
                parent_span_id=self.current_span.id if self.current_span else None
            )
            self.spans.append(span)
            self.current_span = span
            return span
    
    def end_span(
        self, 
        output_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """End the current span."""
        if self.current_span:
            self.current_span.end_time = datetime.utcnow()
            self.current_span.duration_ms = (
                self.current_span.end_time - self.current_span.start_time
            ).total_seconds() * 1000
            
            if output_data:
                self.current_span.output_data = output_data
            if metadata:
                self.current_span.metadata = {
                    **(self.current_span.metadata or {}), 
                    **metadata
                }
            
            # Find parent span
            with self._span_lock:
                parent_span = None
                if self.current_span.parent_span_id:
                    parent_span = next(
                        (s for s in self.spans if s.id == self.current_span.parent_span_id),
                        None
                    )
                self.current_span = parent_span
    
    def add_feedback(
        self, 
        name: str, 
        value: float, 
        category: Optional[str] = None,
        reason: Optional[str] = None,
        source: str = "user"
    ) -> None:
        """Add feedback score to the trace."""
        feedback = FeedbackScore(
            name=name,
            value=value,
            category=category,
            reason=reason,
            source=source
        )
        self.feedback_scores.append(feedback)
    
    def update_usage(
        self,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        cost: Optional[float] = None
    ) -> None:
        """Update token usage information."""
        if not self.usage:
            self.usage = Usage()
        
        if prompt_tokens is not None:
            self.usage.prompt_tokens = prompt_tokens
        if completion_tokens is not None:
            self.usage.completion_tokens = completion_tokens
        if cost is not None:
            self.usage.cost = cost
            
        if self.usage.prompt_tokens and self.usage.completion_tokens:
            self.usage.total_tokens = self.usage.prompt_tokens + self.usage.completion_tokens
            
        # Calculate throughput
        if self.usage.total_tokens and self.duration_ms:
            self.throughput_tokens_per_second = (
                self.usage.total_tokens / (self.duration_ms / 1000)
            )
    
    def set_input(self, input_data: Any) -> None:
        """Set input data for the trace."""
        if self.capture_input:
            self.input_data = self._serialize_data(input_data)
    
    def set_output(self, output_data: Any) -> None:
        """Set output data for the trace."""
        if self.capture_output:
            self.output_data = self._serialize_data(output_data)
    
    def set_error(
        self, 
        error: Exception, 
        error_type: Optional[str] = None,
        error_code: Optional[str] = None
    ) -> None:
        """Set error information for the trace."""
        self.status = TraceStatus.ERROR
        self.error_message = str(error)
        self.error_type = error_type or type(error).__name__
        self.error_code = error_code
        
        # Capture stack trace
        import traceback
        self.stack_trace = traceback.format_exc()
    
    def end(self, output_data: Optional[Any] = None) -> None:
        """End the trace."""
        self.end_time = datetime.utcnow()
        self.duration_ms = (self.end_time - self.start_time).total_seconds() * 1000
        self.latency_ms = self.duration_ms
        
        if output_data is not None:
            self.set_output(output_data)
        
        if self.status == TraceStatus.RUNNING:
            self.status = TraceStatus.SUCCESS
        
        # Clear from context
        if trace_context.get_current_trace() == self:
            trace_context.clear_current_trace()
    
    def _serialize_data(self, data: Any) -> Any:
        """Serialize data for storage."""
        try:
            if isinstance(data, (dict, list, str, int, float, bool, type(None))):
                return data
            elif hasattr(data, '__dict__'):
                return data.__dict__
            else:
                return str(data)
        except Exception:
            return str(data)
    
    def _serialize_value(self, value: Any) -> Any:
        """Helper to serialize values for JSON compatibility."""
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool, list, dict)):
            if isinstance(value, dict):
                return {k: self._serialize_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [self._serialize_value(item) for item in value]
            return value
        elif hasattr(value, '__dict__'):
            # Convert object to string representation for metadata
            return f"{value.__class__.__name__}({getattr(value, '__dict__', {})})"
        else:
            return str(value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trace to dictionary for API submission."""
        return {
            'id': self.id,
            'operationName': self.name,
            'projectId': self.project_id,
            'agentId': self.agent_id,
            'traceType': self.trace_type.value,
            'sessionId': self.session_id,
            'userId': self.user_id,
            'conversationId': self.conversation_id,
            'parentTraceId': self.parent_trace_id,
            'startTime': self.start_time.isoformat() + 'Z',
            'endTime': self.end_time.isoformat() + 'Z' if self.end_time else None,
            'duration': self.duration_ms,
            'status': self.status.value,
            'inputData': self._serialize_value(self.input_data),
            'outputData': self._serialize_value(self.output_data),
            'errorMessage': self.error_message,
            'errorType': self.error_type,
            'errorCode': self.error_code,
            'stackTrace': self.stack_trace,
            'tags': self.tags,
            'metadata': self._serialize_value(self.metadata),
            'modelName': self.model_name,
            'modelParameters': self._serialize_value(self.model_parameters),
            'environment': self.environment.value,
            'latencyMs': self.latency_ms,
            'throughputTokensPerSecond': self.throughput_tokens_per_second,
            'usage': asdict(self.usage) if self.usage else None,
            'qualityScore': self.quality_score,
            'relevanceScore': self.relevance_score,
            'factualityScore': self.factuality_score,
            'hallucinationScore': self.hallucination_score,
            'feedbackScores': [asdict(score) for score in self.feedback_scores],
            'spans': [asdict(span) for span in self.spans],
            'contextWindow': self._serialize_value(self.context_window)
        }


class SprintTraceClient:
    """Client for sending traces to SprintAgentLens backend."""
    
    def __init__(
        self, 
        base_url: str = "http://localhost:3001",
        api_key: Optional[str] = None,
        batch_size: int = 10,
        flush_interval: float = 30.0,
        async_mode: bool = True
    ):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.async_mode = async_mode
        
        # Batching
        self._trace_buffer: List[Trace] = []
        self._buffer_lock = threading.Lock()
        self._last_flush = time.time()
        
        # Async execution
        if async_mode:
            self._executor = ThreadPoolExecutor(max_workers=2)
            self._start_flush_timer()
        
    def _start_flush_timer(self) -> None:
        """Start periodic flush timer."""
        def flush_periodically():
            while True:
                time.sleep(self.flush_interval)
                try:
                    self.flush()
                except Exception as e:
                    logger.error(f"Error during periodic flush: {e}")
        
        if self.async_mode:
            self._executor.submit(flush_periodically)
    
    def log_trace(self, trace: Trace) -> None:
        """Log a trace (buffered or immediate)."""
        if self.async_mode:
            with self._buffer_lock:
                self._trace_buffer.append(trace)
                if len(self._trace_buffer) >= self.batch_size:
                    self._executor.submit(self._flush_buffer)
        else:
            self._send_trace(trace)
    
    def flush(self) -> None:
        """Flush all buffered traces."""
        if self.async_mode:
            self._flush_buffer()
    
    def _flush_buffer(self) -> None:
        """Internal buffer flush."""
        with self._buffer_lock:
            if not self._trace_buffer:
                return
            
            traces_to_send = self._trace_buffer[:]
            self._trace_buffer.clear()
        
        try:
            self._send_traces_batch(traces_to_send)
            self._last_flush = time.time()
        except Exception as e:
            logger.error(f"Failed to send trace batch: {e}")
            # Re-add traces to buffer for retry
            with self._buffer_lock:
                self._trace_buffer.extend(traces_to_send)
    
    def _send_trace(self, trace: Trace) -> None:
        """Send single trace to backend."""
        try:
            headers = {'Content-Type': 'application/json'}
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            response = requests.post(
                f"{self.base_url}/api/v1/traces",
                json=trace.to_dict(),
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            logger.debug(f"Successfully sent trace: {trace.id}")
            
        except Exception as e:
            logger.error(f"Failed to send trace {trace.id}: {e}")
            raise
    
    def _send_traces_batch(self, traces: List[Trace]) -> None:
        """Send batch of traces to backend."""
        if not traces:
            return
            
        try:
            headers = {'Content-Type': 'application/json'}
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            payload = [trace.to_dict() for trace in traces]
            
            response = requests.post(
                f"{self.base_url}/api/v1/traces",
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Successfully sent {len(traces)} traces")
            
        except Exception as e:
            logger.error(f"Failed to send trace batch: {e}")
            raise


# Global client instance
_client: Optional[SprintTraceClient] = None


def configure(
    base_url: str = "http://localhost:3001",
    api_key: Optional[str] = None,
    **kwargs
) -> None:
    """Configure the global trace client."""
    global _client
    _client = SprintTraceClient(base_url=base_url, api_key=api_key, **kwargs)


def get_client() -> SprintTraceClient:
    """Get the global trace client."""
    if _client is None:
        configure()
    return _client


# Decorator for automatic tracing
T = TypeVar('T', bound=Callable[..., Any])


def track(
    name: Optional[str] = None,
    project_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    trace_type: TraceType = TraceType.FUNCTION_CALL,
    capture_input: bool = True,
    capture_output: bool = True,
    tags: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    model_name: Optional[str] = None,
    ignore_args: Optional[List[str]] = None
) -> Callable[[T], T]:
    """
    Decorator for automatic function tracing.
    
    Usage:
        @track(project_id="my_project", agent_id="my_agent")
        def my_function(x, y):
            return x + y
    """
    def decorator(func: T) -> T:
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Create trace
            trace_name = name or func.__name__
            trace_project_id = project_id or kwargs.pop('project_id', 'default')
            trace_agent_id = agent_id or kwargs.pop('agent_id', 'default')
            
            trace = Trace(
                name=trace_name,
                project_id=trace_project_id,
                agent_id=trace_agent_id,
                trace_type=trace_type,
                tags=tags,
                metadata=metadata,
                model_name=model_name,
                capture_input=capture_input,
                capture_output=capture_output
            )
            
            # Set as current trace
            previous_trace = trace_context.get_current_trace()
            trace_context.set_current_trace(trace)
            
            try:
                # Capture input
                if capture_input:
                    input_data = {}
                    sig = inspect.signature(func)
                    bound_args = sig.bind(*args, **kwargs)
                    bound_args.apply_defaults()
                    
                    for param_name, param_value in bound_args.arguments.items():
                        if ignore_args and param_name in ignore_args:
                            continue
                        input_data[param_name] = param_value
                    
                    trace.set_input(input_data)
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Capture output
                if capture_output:
                    trace.set_output(result)
                
                return result
                
            except Exception as e:
                trace.set_error(e)
                raise
            finally:
                trace.end()
                get_client().log_trace(trace)
                trace_context.set_current_trace(previous_trace)
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Similar implementation for async functions
            trace_name = name or func.__name__
            trace_project_id = project_id or kwargs.pop('project_id', 'default')
            trace_agent_id = agent_id or kwargs.pop('agent_id', 'default')
            
            trace = Trace(
                name=trace_name,
                project_id=trace_project_id,
                agent_id=trace_agent_id,
                trace_type=trace_type,
                tags=tags,
                metadata=metadata,
                model_name=model_name,
                capture_input=capture_input,
                capture_output=capture_output
            )
            
            previous_trace = trace_context.get_current_trace()
            trace_context.set_current_trace(trace)
            
            try:
                if capture_input:
                    input_data = {}
                    sig = inspect.signature(func)
                    bound_args = sig.bind(*args, **kwargs)
                    bound_args.apply_defaults()
                    
                    for param_name, param_value in bound_args.arguments.items():
                        if ignore_args and param_name in ignore_args:
                            continue
                        input_data[param_name] = param_value
                    
                    trace.set_input(input_data)
                
                result = await func(*args, **kwargs)
                
                if capture_output:
                    trace.set_output(result)
                
                return result
                
            except Exception as e:
                trace.set_error(e)
                raise
            finally:
                trace.end()
                get_client().log_trace(trace)
                trace_context.set_current_trace(previous_trace)
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


@contextmanager
def trace_context_manager(
    name: str,
    project_id: str,
    agent_id: str,
    **kwargs
):
    """Context manager for manual trace creation."""
    trace = Trace(
        name=name,
        project_id=project_id,
        agent_id=agent_id,
        **kwargs
    )
    
    previous_trace = trace_context.get_current_trace()
    trace_context.set_current_trace(trace)
    
    try:
        yield trace
    except Exception as e:
        trace.set_error(e)
        raise
    finally:
        trace.end()
        get_client().log_trace(trace)
        trace_context.set_current_trace(previous_trace)


@asynccontextmanager
async def async_trace_context_manager(
    name: str,
    project_id: str,
    agent_id: str,
    **kwargs
):
    """Async context manager for manual trace creation."""
    trace = Trace(
        name=name,
        project_id=project_id,
        agent_id=agent_id,
        **kwargs
    )
    
    previous_trace = trace_context.get_current_trace()
    trace_context.set_current_trace(trace)
    
    try:
        yield trace
    except Exception as e:
        trace.set_error(e)
        raise
    finally:
        trace.end()
        get_client().log_trace(trace)
        trace_context.set_current_trace(previous_trace)


def update_current_trace(**kwargs) -> None:
    """Update current trace with additional metadata."""
    current_trace = trace_context.get_current_trace()
    if current_trace:
        for key, value in kwargs.items():
            if hasattr(current_trace, key):
                setattr(current_trace, key, value)


def add_trace_feedback(
    name: str, 
    value: float, 
    category: Optional[str] = None,
    reason: Optional[str] = None
) -> None:
    """Add feedback to current trace."""
    current_trace = trace_context.get_current_trace()
    if current_trace:
        current_trace.add_feedback(name, value, category, reason)


def update_trace_usage(
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    cost: Optional[float] = None
) -> None:
    """Update usage for current trace."""
    current_trace = trace_context.get_current_trace()
    if current_trace:
        current_trace.update_usage(prompt_tokens, completion_tokens, cost)