"""
Comprehensive metrics library for Sprint Lens evaluation framework.

Includes built-in metrics, LLM-based metrics, and custom metric capabilities.
"""

from .base import BaseMetric, MetricResult
from .builtin import (
    AccuracyMetric, PrecisionMetric, RecallMetric, F1Metric,
    BleuMetric, RougeMetric, BertScoreMetric,
    ExactMatchMetric, LevenshteinDistanceMetric,
    SimilarityMetric, ContainmentMetric
)
from .llm_based import (
    RelevanceMetric, FactualConsistencyMetric, CoherenceMetric,
    HallucinationMetric, ToxicityMetric, BiasMetric,
    GroundednessMetric, FluencyMetric, ConcisenessMetric
)
from .custom import CustomMetric, LLMAsJudgeMetric

__all__ = [
    # Base classes
    "BaseMetric", "MetricResult",
    
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
    "CustomMetric", "LLMAsJudgeMetric"
]