"""
Sprint Lens Evaluation Framework

Comprehensive evaluation capabilities for AI applications including:
- Built-in metrics (accuracy, precision, recall, F1, etc.)
- LLM-based evaluation metrics 
- Custom metric definitions
- Batch evaluation support
- Statistical analysis tools
"""

from .evaluator import Evaluator, EvaluationResult
from .metrics import (
    # Built-in metrics
    AccuracyMetric, PrecisionMetric, RecallMetric, F1Metric,
    BleuMetric, RougeMetric, BertScoreMetric,
    ExactMatchMetric, LevenshteinDistanceMetric,
    SimilarityMetric, ContainmentMetric,
    
    # LLM-based metrics
    RelevanceMetric, FactualConsistencyMetric, CoherenceMetric,
    HallucinationMetric, ToxicityMetric, BiasMetric,
    GroundednessMetric, FluencyMetric, ConcisenessMetric,
    
    # Custom metrics
    CustomMetric, LLMAsJudgeMetric,
    
    # Base classes
    BaseMetric, MetricResult
)
from .dataset import EvaluationDataset, DatasetItem
from .batch import BatchEvaluator
from .statistical import StatisticalAnalyzer

__all__ = [
    # Core evaluation
    "Evaluator", "EvaluationResult",
    
    # Built-in metrics
    "AccuracyMetric", "PrecisionMetric", "RecallMetric", "F1Metric",
    "BleuMetric", "RougeMetric", "BertScoreMetric",
    "ExactMatchMetric", "LevenshteinDistanceMetric",
    "SimilarityMetric", "ContainmentMetric",
    
    # LLM-based metrics
    "RelevanceMetric", "FactualConsistencyMetric", "CoherenceMetric",
    "HallucinationMetric", "ToxicityMetric", "BiasMetric",
    "GroundednessMetric", "FluencyMetric", "ConcisenessMetric",
    
    # Custom metrics
    "CustomMetric", "LLMAsJudgeMetric",
    
    # Base classes
    "BaseMetric", "MetricResult",
    
    # Dataset and batch processing
    "EvaluationDataset", "DatasetItem", "BatchEvaluator",
    
    # Statistical analysis
    "StatisticalAnalyzer"
]