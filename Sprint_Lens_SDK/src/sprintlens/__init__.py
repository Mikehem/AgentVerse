"""
Sprint Lens SDK - Enterprise AI Observability and Evaluation Platform

The Sprint Lens SDK provides comprehensive tracing, evaluation, and monitoring
capabilities for AI applications, with seamless integration to the Sprint Agent
Lens backend platform.

Example usage:
    >>> import sprintlens
    >>> 
    >>> # Configure the SDK
    >>> sprintlens.configure(
    ...     url="https://your-backend.com",
    ...     username="your-username", 
    ...     password="your-password"
    ... )
    >>> 
    >>> # Trace AI functions automatically
    >>> @sprintlens.track
    ... def my_ai_function(prompt: str) -> str:
    ...     return f"AI response to: {prompt}"
    >>> 
    >>> # Use the function - traces are automatically captured
    >>> result = my_ai_function("Hello, Sprint Lens!")

For more information, visit: https://docs.sprintagentlens.com
"""

from . import _logging, environment, package_version
from .core.client import SprintLensClient, configure, get_client
from .tracing.decorator import track
from .tracing.trace import Trace
from .tracing.span import Span
from .tracing.context import set_current_trace, get_current_trace

# Evaluation framework
from .evaluation import (
    Evaluator, EvaluationResult, EvaluationDataset, DatasetItem,
    BatchEvaluator, StatisticalAnalyzer,
    BaseMetric, MetricResult,
    AccuracyMetric, PrecisionMetric, RecallMetric, F1Metric,
    ExactMatchMetric, SimilarityMetric, ContainmentMetric,
    RelevanceMetric, FactualConsistencyMetric, CoherenceMetric,
    CustomMetric, LLMAsJudgeMetric
)

# LLM integrations
from .llm import LLMProvider, OpenAIProvider, AzureOpenAIProvider

# Configuration
from .core.config import SprintLensConfig

# Setup logging
_logging.setup()

# Version information
__version__ = package_version.VERSION

# Public API exports
__all__ = [
    # Core
    "__version__",
    "SprintLensClient",
    "SprintLensConfig",
    "configure", 
    "get_client",
    
    # Tracing
    "track",
    "Trace",
    "Span",
    "set_current_trace",
    "get_current_trace",
    
    # Evaluation framework
    "Evaluator",
    "EvaluationResult", 
    "EvaluationDataset",
    "DatasetItem",
    "BatchEvaluator",
    "StatisticalAnalyzer",
    
    # Metrics
    "BaseMetric",
    "MetricResult",
    "AccuracyMetric",
    "PrecisionMetric", 
    "RecallMetric",
    "F1Metric",
    "ExactMatchMetric",
    "SimilarityMetric",
    "ContainmentMetric",
    "RelevanceMetric",
    "FactualConsistencyMetric",
    "CoherenceMetric",
    "CustomMetric",
    "LLMAsJudgeMetric",
    
    # LLM integrations
    "LLMProvider",
    "OpenAIProvider", 
    "AzureOpenAIProvider",
]