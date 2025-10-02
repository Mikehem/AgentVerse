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
    CustomMetric, LLMAsJudgeMetric,
    # Advanced metrics with backend integration
    AdvancedMetricsClient, MetricType, EvaluationModel,
    BatchEvaluationConfig, EnhancedHallucinationMetric,
    EnhancedRelevanceMetric, AdvancedBatchEvaluator,
    evaluate_hallucination, evaluate_hallucination_sync,
    # G-Eval metrics
    GEvalMetric, evaluate_g_eval, evaluate_g_eval_sync
)

# LLM integrations
from .llm import LLMProvider, OpenAIProvider, AzureOpenAIProvider

# Configuration
from .core.config import SprintLensConfig

# Management utilities
from .management import ProjectManager, AgentManager, DistributedTraceSetup

# Format conversion utilities
from .utils.format_converter import (
    DataFormatConverter,
    dataframe_to_dataset,
    dataset_to_dataframe,
    json_to_dataset,
    dataset_to_json,
    dataframe_to_json,
    json_to_dataframe,
    dataframe_to_csv,
    csv_to_dataframe
)

# Smart detection utilities
from .utils.smart_detection import (
    SmartColumnDetector,
    ColumnSuggestion,
    DetectionResult,
    detect_column_types
)

# Query builder utilities
from .utils.query_builder import (
    QueryBuilder,
    QueryResult,
    QueryOperator,
    LogicalOperator
)

# Schema validation utilities
from .utils.schema_validation import (
    DatasetSchema,
    SchemaField,
    SchemaValidator,
    SchemaBuilder,
    ValidationResult,
    FieldType,
    FieldConstraint,
    ValidationSeverity,
    create_prediction_schema,
    create_classification_schema,
    create_qa_schema
)

# Data profiling utilities
from .utils.data_profiling import (
    DataProfiler,
    DatasetProfile,
    FieldProfile,
    StatisticalSummary,
    CategoricalSummary,
    DataQualityMetrics,
    create_dashboard_data
)

# Advanced file format utilities
from .utils.file_formats import (
    FileFormat,
    FileInfo,
    ParseResult,
    parse_file,
    detect_file_format,
    get_supported_formats,
    check_dependencies
)

# Dataset versioning utilities
from .utils.dataset_versioning import (
    DatasetVersionManager,
    DatasetVersion,
    DatasetBranch,
    VersionDiff,
    InMemoryVersionStorage,
    create_version_manager,
    compare_versions,
    create_snapshot
)

# Data visualization utilities
from .utils.data_visualization import (
    DataVisualizer,
    ChartData,
    DashboardLayout,
    create_quick_histogram,
    create_quick_pie_chart,
    create_dashboard_from_profile
)

# Data lineage tracking utilities
from .utils.data_lineage import (
    DataLineageTracker,
    LineageEvent,
    LineageRelationship,
    LineageGraph,
    DataAsset,
    LineageMetadata,
    OperationType,
    LineageNodeType,
    create_lineage_tracker,
    track_dataset_creation,
    track_data_transformation
)

# Cloud storage integration utilities
from .utils.cloud_storage import (
    CloudStorageManager,
    CloudDataset,
    StorageLocation,
    CloudCredentials,
    SyncResult,
    CloudProvider,
    StorageClass,
    SyncStatus,
    DatasetShard,
    CloudStorageProvider,
    LocalFileSystemProvider,
    MockS3Provider,
    create_local_credentials,
    create_s3_credentials,
    create_storage_location,
    quick_upload_dataset
)

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
    
    # Advanced metrics with backend integration
    "AdvancedMetricsClient",
    "MetricType",
    "EvaluationModel",
    "BatchEvaluationConfig",
    "EnhancedHallucinationMetric",
    "EnhancedRelevanceMetric", 
    "AdvancedBatchEvaluator",
    "evaluate_hallucination",
    "evaluate_hallucination_sync",
    # G-Eval metrics
    "GEvalMetric",
    "evaluate_g_eval",
    "evaluate_g_eval_sync",
    
    # LLM integrations
    "LLMProvider",
    "OpenAIProvider", 
    "AzureOpenAIProvider",
    
    # Management utilities
    "ProjectManager",
    "AgentManager",
    "DistributedTraceSetup",
    
    # Format conversion utilities
    "DataFormatConverter",
    "dataframe_to_dataset",
    "dataset_to_dataframe",
    "json_to_dataset",
    "dataset_to_json",
    "dataframe_to_json",
    "json_to_dataframe",
    "dataframe_to_csv",
    "csv_to_dataframe",
    
    # Smart detection utilities
    "SmartColumnDetector",
    "ColumnSuggestion",
    "DetectionResult",
    "detect_column_types",
    
    # Query builder utilities
    "QueryBuilder",
    "QueryResult",
    "QueryOperator",
    "LogicalOperator",
    
    # Schema validation utilities
    "DatasetSchema",
    "SchemaField",
    "SchemaValidator",
    "SchemaBuilder",
    "ValidationResult",
    "FieldType",
    "FieldConstraint",
    "ValidationSeverity",
    "create_prediction_schema",
    "create_classification_schema",
    "create_qa_schema",
    
    # Data profiling utilities
    "DataProfiler",
    "DatasetProfile",
    "FieldProfile",
    "StatisticalSummary",
    "CategoricalSummary",
    "DataQualityMetrics",
    "create_dashboard_data",
    
    # Advanced file format utilities
    "FileFormat",
    "FileInfo",
    "ParseResult",
    "parse_file",
    "detect_file_format",
    "get_supported_formats",
    "check_dependencies",
    
    # Dataset versioning utilities
    "DatasetVersionManager",
    "DatasetVersion",
    "DatasetBranch",
    "VersionDiff",
    "InMemoryVersionStorage",
    "create_version_manager",
    "compare_versions",
    "create_snapshot",
    
    # Data visualization utilities
    "DataVisualizer",
    "ChartData",
    "DashboardLayout",
    "create_quick_histogram",
    "create_quick_pie_chart",
    "create_dashboard_from_profile",
    
    # Data lineage tracking utilities
    "DataLineageTracker",
    "LineageEvent",
    "LineageRelationship", 
    "LineageGraph",
    "DataAsset",
    "LineageMetadata",
    "OperationType",
    "LineageNodeType",
    "create_lineage_tracker",
    "track_dataset_creation",
    "track_data_transformation",
]