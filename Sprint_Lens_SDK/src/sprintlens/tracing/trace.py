"""
Trace implementation for Sprint Lens SDK.

A trace represents a complete workflow or operation, containing multiple spans
that track individual steps within the workflow.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, Union, TYPE_CHECKING

from .types import TraceData, TraceStatus, InputOutput, MetricValue
from .context import TraceContext, get_current_span
from ..utils.logging import get_logger
from ..utils.serialization import serialize_safely, calculate_size

if TYPE_CHECKING:
    from ..core.client import SprintLensClient
    from .span import Span

logger = get_logger(__name__)


class Trace:
    """
    A trace represents a complete AI workflow or operation.
    
    Traces contain spans which represent individual operations within
    the workflow. Traces are the top-level unit for observability.
    
    Example:
        >>> trace = client.create_trace("llm-workflow")
        >>> with trace.span("data-preparation") as span:
        ...     span.set_input({"query": "user question"})
        ...     result = prepare_data(query)
        ...     span.set_output({"processed": result})
        >>> await trace.finish()
    """

    def __init__(
        self,
        name: str,
        client: 'SprintLensClient',
        trace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        project_name: Optional[str] = None,
        input_data: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize a new trace.
        
        Args:
            name: Human-readable name for the trace
            client: Sprint Lens client instance
            trace_id: Optional custom trace ID (generates UUID if not provided)
            project_id: ID of associated project
            project_name: Name of associated project
            input_data: Input data for the trace
            metadata: Additional metadata
            tags: Tags for categorization and filtering
            user_id: ID of user initiating the trace
            session_id: Session ID for grouping related traces
            **kwargs: Additional trace parameters
        """
        self.id = trace_id or str(uuid.uuid4())
        self.name = name
        self._client = client
        
        # Project context
        self.project_id = project_id or client.config.project_name
        self.project_name = project_name or client.config.project_name
        
        # Timing
        self.start_time = datetime.utcnow()
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
        
        # Context
        self.user_id = user_id
        self.session_id = session_id
        
        # Spans
        self._spans: List['Span'] = []
        self._span_lookup: Dict[str, 'Span'] = {}
        
        # Feedback and scoring
        self.feedback: Optional[Dict[str, Any]] = None
        self.scores: Optional[Dict[str, float]] = None
        
        # State tracking
        self._finished = False
        self._flushed = False
        
        logger.debug("Created trace", extra={
            "trace_id": self.id,
            "name": name,
            "project_id": self.project_id
        })

    def _create_input_output(self, data: Any) -> InputOutput:
        """Create InputOutput object from data."""
        serialized = serialize_safely(data)
        return InputOutput(
            data=serialized,
            content_type="application/json",
            size_bytes=calculate_size(serialized)
        )

    def set_input(self, input_data: Any) -> None:
        """
        Set input data for the trace.
        
        Args:
            input_data: Input data to store
        """
        self._input = self._create_input_output(input_data)
        logger.debug("Set trace input", extra={
            "trace_id": self.id,
            "size_bytes": self._input.size_bytes
        })

    def set_output(self, output_data: Any) -> None:
        """
        Set output data for the trace.
        
        Args:
            output_data: Output data to store
        """
        self._output = self._create_input_output(output_data)
        logger.debug("Set trace output", extra={
            "trace_id": self.id,
            "size_bytes": self._output.size_bytes
        })

    def add_tag(self, key: str, value: str) -> None:
        """
        Add a tag to the trace.
        
        Args:
            key: Tag key
            value: Tag value
        """
        self.tags[key] = value
        logger.debug("Added trace tag", extra={
            "trace_id": self.id,
            "tag_key": key,
            "tag_value": value
        })

    def add_tags(self, tags: Dict[str, str]) -> None:
        """
        Add multiple tags to the trace.
        
        Args:
            tags: Dictionary of tags to add
        """
        self.tags.update(tags)
        logger.debug("Added trace tags", extra={
            "trace_id": self.id,
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
        Add a metric to the trace.
        
        Args:
            name: Metric name
            value: Metric value
            unit: Optional unit of measurement
        """
        self.metrics[name] = MetricValue(value=value, unit=unit)
        logger.debug("Added trace metric", extra={
            "trace_id": self.id,
            "metric_name": name,
            "metric_value": value
        })

    def span(
        self,
        name: str,
        span_type: Optional[str] = None,
        parent: Optional['Span'] = None,
        **kwargs
    ) -> 'Span':
        """
        Create a child span within this trace.
        
        Args:
            name: Name of the span
            span_type: Type of span operation
            parent: Parent span (uses current span if not provided)
            **kwargs: Additional span parameters
            
        Returns:
            New span object
        """
        from .span import Span, SpanType
        
        # Determine parent span
        if parent is None:
            parent = get_current_span()
        
        # Convert string span type to enum
        if isinstance(span_type, str):
            try:
                span_type_enum = SpanType(span_type)
            except ValueError:
                span_type_enum = SpanType.CUSTOM
        else:
            span_type_enum = span_type or SpanType.CUSTOM
        
        # Create span
        span = Span(
            name=name,
            trace=self,
            parent=parent,
            span_type=span_type_enum,
            **kwargs
        )
        
        # Register span
        self._spans.append(span)
        self._span_lookup[span.id] = span
        
        logger.debug("Created span", extra={
            "trace_id": self.id,
            "span_id": span.id,
            "span_name": name,
            "parent_id": parent.id if parent else None
        })
        
        return span

    def get_span(self, span_id: str) -> Optional['Span']:
        """
        Get span by ID.
        
        Args:
            span_id: ID of span to retrieve
            
        Returns:
            Span object or None if not found
        """
        return self._span_lookup.get(span_id)

    def get_spans(self) -> List['Span']:
        """
        Get all spans in this trace.
        
        Returns:
            List of span objects
        """
        return self._spans.copy()

    def set_status(self, status: TraceStatus) -> None:
        """
        Set trace status.
        
        Args:
            status: New status
        """
        self.status = status
        logger.debug("Set trace status", extra={
            "trace_id": self.id,
            "status": status.value
        })

    def set_error(self, error: Exception) -> None:
        """
        Set error information for the trace.
        
        Args:
            error: Exception that occurred
        """
        self.status = TraceStatus.ERROR
        self.error = {
            "type": error.__class__.__name__,
            "message": str(error),
            "traceback": getattr(error, "__traceback__", None)
        }
        
        logger.warning("Set trace error", extra={
            "trace_id": self.id,
            "error_type": self.error["type"],
            "error_message": self.error["message"]
        })

    def _handle_exception(self, exception: Exception) -> None:
        """Internal method to handle exceptions in context managers."""
        if exception and not self.error:
            self.set_error(exception)

    def add_feedback(self, name: str, value: Any, **metadata) -> None:
        """
        Add feedback to the trace.
        
        Args:
            name: Feedback name
            value: Feedback value
            **metadata: Additional feedback metadata
        """
        if self.feedback is None:
            self.feedback = {}
        
        self.feedback[name] = {
            "value": value,
            "timestamp": datetime.utcnow().isoformat(),
            **metadata
        }
        
        logger.debug("Added trace feedback", extra={
            "trace_id": self.id,
            "feedback_name": name,
            "feedback_value": value
        })

    def add_score(self, name: str, score: float) -> None:
        """
        Add a score to the trace.
        
        Args:
            name: Score name
            score: Score value (typically 0.0 to 1.0)
        """
        if self.scores is None:
            self.scores = {}
        
        self.scores[name] = score
        
        logger.debug("Added trace score", extra={
            "trace_id": self.id,
            "score_name": name,
            "score_value": score
        })

    def finish(self) -> None:
        """
        Mark the trace as finished and calculate final metrics.
        
        This should be called when the trace is complete to finalize
        timing and trigger any background processing.
        """
        if self._finished:
            return
        
        self.end_time = datetime.utcnow()
        self.duration_ms = (self.end_time - self.start_time).total_seconds() * 1000
        
        # Finalize any unfinished spans
        for span in self._spans:
            if not span.is_finished:
                span._finish()
        
        # Set final status if not already set to error
        if self.status == TraceStatus.RUNNING:
            self.status = TraceStatus.COMPLETED
        
        self._finished = True
        
        # Calculate aggregate metrics
        self._calculate_aggregate_metrics()
        
        logger.info("Trace finished", extra={
            "trace_id": self.id,
            "trace_name": self.name,
            "duration_ms": self.duration_ms,
            "span_count": len(self._spans),
            "status": self.status.value
        })

    async def finish_async(self) -> None:
        """
        Async version of finish() that also flushes to backend.
        """
        self.finish()
        
        # Flush to backend
        if not self._flushed:
            await self.flush()

    def _calculate_aggregate_metrics(self) -> None:
        """Calculate aggregate metrics from spans."""
        total_tokens = 0
        total_cost = 0.0
        
        for span in self._spans:
            if span.tokens_usage:
                total_tokens += sum(span.tokens_usage.values())
            
            if span.cost:
                total_cost += span.cost
        
        if total_tokens > 0:
            self.add_metric("total_tokens", total_tokens)
        
        if total_cost > 0:
            self.add_metric("total_cost", total_cost, unit="USD")

    async def flush(self) -> None:
        """
        Flush trace data to Sprint Agent Lens backend.
        
        Sends the complete trace with all spans to the backend
        for storage and analysis.
        """
        if self._flushed:
            return
        
        try:
            trace_data = self.to_dict()
            await self._client._add_trace_to_buffer(trace_data)
            self._flushed = True
            
            logger.debug("Trace flushed to backend", extra={
                "trace_id": self.id
            })
            
        except Exception as e:
            logger.error("Failed to flush trace", extra={
                "trace_id": self.id,
                "error": str(e)
            })
            raise

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert trace to dictionary representation.
        
        Returns:
            Dictionary containing all trace data
        """
        span_dicts = [span.to_dict() for span in self._spans]
        
        return {
            "id": self.id,
            "name": self.name,
            "project_id": self.project_id,
            "project_name": self.project_name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_ms": self.duration_ms,
            "input": self._input.dict() if self._input else None,
            "output": self._output.dict() if self._output else None,
            "tags": self.tags,
            "metadata": self.metadata,
            "metrics": {k: v.dict() for k, v in self.metrics.items()},
            "status": self.status.value,
            "error": self.error,
            "spans": span_dicts,
            "feedback": self.feedback,
            "scores": self.scores,
            "user_id": self.user_id,
            "session_id": self.session_id
        }

    def to_trace_data(self) -> TraceData:
        """
        Convert to TraceData pydantic model.
        
        Returns:
            TraceData model instance
        """
        span_data = [span.to_span_data() for span in self._spans]
        
        return TraceData(
            id=self.id,
            name=self.name,
            project_id=self.project_id,
            project_name=self.project_name,
            start_time=self.start_time,
            end_time=self.end_time,
            duration_ms=self.duration_ms,
            input=self._input,
            output=self._output,
            tags=self.tags,
            metadata=self.metadata,
            metrics=self.metrics,
            status=self.status,
            error=self.error,
            spans=span_data,
            feedback=self.feedback,
            scores=self.scores,
            user_id=self.user_id,
            session_id=self.session_id
        )

    @property
    def is_finished(self) -> bool:
        """Check if trace is finished."""
        return self._finished

    @property
    def is_flushed(self) -> bool:
        """Check if trace has been flushed to backend."""
        return self._flushed

    @property
    def input(self) -> Optional[InputOutput]:
        """Get trace input data."""
        return self._input

    @property
    def output(self) -> Optional[InputOutput]:
        """Get trace output data."""
        return self._output

    def __enter__(self) -> 'Trace':
        """Context manager entry."""
        return TraceContext(self).__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        return TraceContext(self).__exit__(exc_type, exc_val, exc_tb)

    async def __aenter__(self) -> 'Trace':
        """Async context manager entry."""
        return await TraceContext(self).__aenter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await TraceContext(self).__aexit__(exc_type, exc_val, exc_tb)
        if not exc_type:  # Only flush if no exception
            await self.finish_async()

    def __repr__(self) -> str:
        return (
            f"Trace(id='{self.id}', name='{self.name}', "
            f"status={self.status.value}, spans={len(self._spans)})"
        )