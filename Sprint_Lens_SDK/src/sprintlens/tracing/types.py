"""
Type definitions for tracing components.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field


class TraceStatus(str, Enum):
    """Status of a trace."""
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


class SpanType(str, Enum):
    """Type of span operation."""
    LLM = "llm"
    RETRIEVAL = "retrieval"
    EMBEDDING = "embedding"
    PROCESSING = "processing"
    DATABASE = "database"
    HTTP = "http"
    CUSTOM = "custom"


class MetricValue(BaseModel):
    """A metric value with optional metadata."""
    value: Union[float, int, str, bool]
    unit: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class InputOutput(BaseModel):
    """Input/Output data container."""
    data: Any
    content_type: str = "application/json"
    size_bytes: Optional[int] = None
    truncated: bool = False


class SpanData(BaseModel):
    """Complete span data structure."""
    id: str
    trace_id: str
    parent_id: Optional[str] = None
    name: str
    span_type: SpanType = SpanType.CUSTOM
    
    # Timing
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    
    # Data
    input: Optional[InputOutput] = None
    output: Optional[InputOutput] = None
    
    # Metadata
    tags: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    metrics: Dict[str, MetricValue] = Field(default_factory=dict)
    
    # Status
    status: TraceStatus = TraceStatus.RUNNING
    error: Optional[Dict[str, Any]] = None
    
    # Context
    model: Optional[str] = None
    provider: Optional[str] = None
    version: Optional[str] = None
    
    # Performance metrics
    tokens_usage: Optional[Dict[str, int]] = None
    cost: Optional[float] = None


class TraceData(BaseModel):
    """Complete trace data structure."""
    id: str
    name: str
    
    # Project context
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    
    # Timing
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    
    # Data
    input: Optional[InputOutput] = None
    output: Optional[InputOutput] = None
    
    # Metadata
    tags: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    metrics: Dict[str, MetricValue] = Field(default_factory=dict)
    
    # Status
    status: TraceStatus = TraceStatus.RUNNING
    error: Optional[Dict[str, Any]] = None
    
    # Spans
    spans: List[SpanData] = Field(default_factory=list)
    
    # Feedback and scoring
    feedback: Optional[Dict[str, Any]] = None
    scores: Optional[Dict[str, float]] = None
    
    # User context
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    
    # Total metrics
    total_tokens: Optional[int] = None
    total_cost: Optional[float] = None


class TraceFilter(BaseModel):
    """Filter options for trace queries."""
    project_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    tags: Optional[Dict[str, str]] = None
    status: Optional[TraceStatus] = None
    limit: int = 100
    offset: int = 0


class SpanFilter(BaseModel):
    """Filter options for span queries."""
    trace_id: Optional[str] = None
    span_type: Optional[SpanType] = None
    name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
    offset: int = 0


class TracingConfig(BaseModel):
    """Configuration for tracing behavior."""
    # Capture settings
    capture_input: bool = True
    capture_output: bool = True
    capture_exception: bool = True
    
    # Data limits
    max_input_size: int = 1024 * 1024  # 1MB
    max_output_size: int = 1024 * 1024  # 1MB
    max_error_message_length: int = 10000
    
    # Sampling
    sample_rate: float = 1.0  # 100% sampling by default
    
    # Buffering
    buffer_size: int = 1000
    flush_interval: float = 10.0  # seconds
    
    # Performance
    async_processing: bool = True
    batch_size: int = 50