"""
Span implementation for Sprint Lens SDK.

A span represents an individual operation within a trace, such as an LLM call,
database query, or processing step.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union, TYPE_CHECKING

from .types import SpanData, SpanType, TraceStatus, InputOutput, MetricValue
from .context import SpanContext
from ..utils.logging import get_logger
from ..utils.serialization import serialize_safely, calculate_size

if TYPE_CHECKING:
    from .trace import Trace

logger = get_logger(__name__)


class Span:
    """
    A span represents an individual operation within a trace.
    
    Spans track timing, input/output, and metadata for specific operations
    like LLM calls, database queries, or processing steps.
    
    Example:
        >>> with trace.span("llm-call") as span:
        ...     span.set_input({"prompt": "Hello world"})
        ...     response = call_llm("Hello world")
        ...     span.set_output({"response": response})
        ...     span.add_metric("tokens", 150)
    """

    def __init__(
        self,
        name: str,
        trace: 'Trace',
        span_id: Optional[str] = None,
        parent: Optional['Span'] = None,
        span_type: SpanType = SpanType.CUSTOM,
        input_data: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[Dict[str, str]] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
        version: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize a new span.
        
        Args:
            name: Human-readable name for the span
            trace: Parent trace object
            span_id: Optional custom span ID (generates UUID if not provided)
            parent: Parent span for nested operations
            span_type: Type of operation this span represents
            input_data: Input data for the span
            metadata: Additional metadata
            tags: Tags for categorization and filtering
            model: Model name (for LLM operations)
            provider: Provider name (e.g., "openai", "anthropic")
            version: Model/API version
            **kwargs: Additional span parameters
        """
        self.id = span_id or str(uuid.uuid4())
        self.name = name
        self.trace = trace
        self.trace_id = trace.id
        self.parent_id = parent.id if parent else None
        self.span_type = span_type
        
        # Timing
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.duration_ms: Optional[float] = None
        
        # Data
        self._input = self._create_input_output(input_data) if input_data is not None else None
        self._output: Optional[InputOutput] = None
        
        # Metadata
        self.tags = tags or {}
        self.metadata = metadata or {}
        self.metrics: Dict[str, MetricValue] = {}
        
        # Status
        self.status = TraceStatus.RUNNING
        self.error: Optional[Dict[str, Any]] = None
        
        # Context information
        self.model = model
        self.provider = provider
        self.version = version
        
        # Performance metrics
        self.tokens_usage: Optional[Dict[str, int]] = None
        self.cost: Optional[float] = None
        
        # State tracking
        self._started = False
        self._finished = False
        
        logger.debug("Created span", extra={
            "span_id": self.id,
            "span_name": name,
            "trace_id": self.trace_id,
            "parent_id": self.parent_id,
            "span_type": span_type.value
        })

    def _create_input_output(self, data: Any) -> InputOutput:
        """Create InputOutput object from data."""
        serialized = serialize_safely(data)
        return InputOutput(
            data=serialized,
            content_type="application/json",
            size_bytes=calculate_size(serialized)
        )

    def _start(self) -> None:
        """Internal method to start the span timing."""
        if self._started:
            return
        
        self.start_time = datetime.now(timezone.utc)
        self._started = True
        
        logger.debug("Span started", extra={
            "span_id": self.id,
            "trace_id": self.trace_id
        })

    def _finish(self) -> None:
        """Internal method to finish the span timing."""
        if self._finished:
            return
        
        if not self._started:
            self._start()
        
        self.end_time = datetime.now(timezone.utc)
        self.duration_ms = (self.end_time - self.start_time).total_seconds() * 1000
        
        # Set final status if not already set to error
        if self.status == TraceStatus.RUNNING:
            self.status = TraceStatus.COMPLETED
        
        self._finished = True
        
        logger.debug("Span finished", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "span_name": self.name,
            "duration_ms": self.duration_ms,
            "status": self.status.value
        })

    def set_input(self, input_data: Any) -> None:
        """
        Set input data for the span.
        
        Args:
            input_data: Input data to store
        """
        self._input = self._create_input_output(input_data)
        logger.debug("Set span input", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "size_bytes": self._input.size_bytes
        })

    def set_output(self, output_data: Any) -> None:
        """
        Set output data for the span.
        
        Args:
            output_data: Output data to store
        """
        self._output = self._create_input_output(output_data)
        logger.debug("Set span output", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "size_bytes": self._output.size_bytes
        })

    def add_tag(self, key: str, value: str) -> None:
        """
        Add a tag to the span.
        
        Args:
            key: Tag key
            value: Tag value
        """
        self.tags[key] = value
        logger.debug("Added span tag", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "tag_key": key,
            "tag_value": value
        })

    def add_tags(self, tags: Dict[str, str]) -> None:
        """
        Add multiple tags to the span.
        
        Args:
            tags: Dictionary of tags to add
        """
        self.tags.update(tags)
        logger.debug("Added span tags", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "tag_count": len(tags)
        })

    def set_metadata(self, key: str, value: Any) -> None:
        """
        Set metadata value.
        
        Args:
            key: Metadata key
            value: Metadata value
        """
        self.metadata[key] = value

    def add_metric(self, name: str, value: Union[float, int, str, bool], unit: Optional[str] = None) -> None:
        """
        Add a metric to the span.
        
        Args:
            name: Metric name
            value: Metric value
            unit: Optional unit of measurement
        """
        self.metrics[name] = MetricValue(value=value, unit=unit)
        logger.debug("Added span metric", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "metric_name": name,
            "metric_value": value
        })

    def set_model_info(self, model: str, provider: Optional[str] = None, version: Optional[str] = None) -> None:
        """
        Set model information for the span.
        
        Args:
            model: Model name
            provider: Provider name
            version: Model version
        """
        self.model = model
        self.provider = provider
        self.version = version
        
        logger.debug("Set span model info", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "model": model,
            "provider": provider
        })

    def set_token_usage(
        self,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        **kwargs
    ) -> None:
        """
        Set token usage information for LLM operations.
        
        Args:
            prompt_tokens: Number of tokens in the prompt
            completion_tokens: Number of tokens in the completion
            total_tokens: Total token count
            **kwargs: Additional token metrics
        """
        usage = {}
        
        if prompt_tokens is not None:
            usage["prompt_tokens"] = prompt_tokens
        if completion_tokens is not None:
            usage["completion_tokens"] = completion_tokens
        if total_tokens is not None:
            usage["total_tokens"] = total_tokens
        
        usage.update(kwargs)
        
        self.tokens_usage = usage
        
        # Also add as metrics
        for key, value in usage.items():
            self.add_metric(key, value, unit="tokens")
        
        logger.debug("Set span token usage", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "total_tokens": total_tokens or sum(usage.values()) if usage else 0
        })

    def set_cost(self, cost: float, currency: str = "USD") -> None:
        """
        Set cost information for the operation.
        
        Args:
            cost: Cost of the operation
            currency: Currency code (default: USD)
        """
        self.cost = cost
        self.add_metric("cost", cost, unit=currency)
        
        logger.debug("Set span cost", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "cost": cost,
            "currency": currency
        })

    def set_status(self, status: TraceStatus) -> None:
        """
        Set span status.
        
        Args:
            status: New status
        """
        self.status = status
        logger.debug("Set span status", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "status": status.value
        })

    def set_error(self, error: Exception) -> None:
        """
        Set error information for the span.
        
        Args:
            error: Exception that occurred
        """
        self.status = TraceStatus.ERROR
        self.error = {
            "type": error.__class__.__name__,
            "message": str(error),
            "traceback": getattr(error, "__traceback__", None)
        }
        
        logger.warning("Set span error", extra={
            "span_id": self.id,
            "trace_id": self.trace_id,
            "error_type": self.error["type"],
            "error_message": self.error["message"]
        })

    def create_child_span(
        self,
        name: str,
        span_type: SpanType = SpanType.CUSTOM,
        **kwargs
    ) -> 'Span':
        """
        Create a child span within this span.
        
        Args:
            name: Name of the child span
            span_type: Type of span operation
            **kwargs: Additional span parameters
            
        Returns:
            New child span object
        """
        return self.trace.span(
            name=name,
            span_type=span_type,
            parent=self,
            **kwargs
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert span to dictionary representation.
        
        Returns:
            Dictionary containing all span data
        """
        return {
            "id": self.id,
            "trace_id": self.trace_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "span_type": self.span_type.value,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_ms": self.duration_ms,
            "input": self._input.model_dump() if self._input else None,
            "output": self._output.model_dump() if self._output else None,
            "tags": self.tags,
            "metadata": self.metadata,
            "metrics": {k: v.model_dump() for k, v in self.metrics.items()},
            "status": self.status.value,
            "error": self.error,
            "model": self.model,
            "provider": self.provider,
            "version": self.version,
            "tokens_usage": self.tokens_usage,
            "cost": self.cost
        }

    def to_span_data(self) -> SpanData:
        """
        Convert to SpanData pydantic model.
        
        Returns:
            SpanData model instance
        """
        return SpanData(
            id=self.id,
            trace_id=self.trace_id,
            parent_id=self.parent_id,
            name=self.name,
            span_type=self.span_type,
            start_time=self.start_time or datetime.now(timezone.utc),
            end_time=self.end_time,
            duration_ms=self.duration_ms,
            input=self._input,
            output=self._output,
            tags=self.tags,
            metadata=self.metadata,
            metrics=self.metrics,
            status=self.status,
            error=self.error,
            model=self.model,
            provider=self.provider,
            version=self.version,
            tokens_usage=self.tokens_usage,
            cost=self.cost
        )

    def finish(self) -> None:
        """
        Finish the span and calculate timing.
        
        This marks the span as complete and calculates the duration.
        """
        self._finish()

    @property
    def is_started(self) -> bool:
        """Check if span is started."""
        return self._started

    @property
    def is_finished(self) -> bool:
        """Check if span is finished."""
        return self._finished

    @property
    def input(self) -> Optional[InputOutput]:
        """Get span input data."""
        return self._input

    @property
    def output(self) -> Optional[InputOutput]:
        """Get span output data."""
        return self._output

    def __enter__(self) -> 'Span':
        """Context manager entry."""
        return SpanContext(self).__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        return SpanContext(self).__exit__(exc_type, exc_val, exc_tb)

    async def __aenter__(self) -> 'Span':
        """Async context manager entry."""
        return await SpanContext(self).__aenter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        return await SpanContext(self).__aexit__(exc_type, exc_val, exc_tb)

    def __repr__(self) -> str:
        return (
            f"Span(id='{self.id}', name='{self.name}', "
            f"type={self.span_type.value}, status={self.status.value})"
        )