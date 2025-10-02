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
    CustomMetric, LLMAsJudgeMetric, CometStyleCustomMetric, CometLLMJudgeMetric,
    
    # Base classes
    BaseMetric, MetricResult, ScoreResult
)
from .dataset import EvaluationDataset, DatasetItem
from .batch import BatchEvaluator
from .statistical import StatisticalAnalyzer

# Advanced metrics with backend integration
from .advanced_metrics import (
    AdvancedMetricsClient, MetricType, EvaluationModel,
    BatchEvaluationConfig, EnhancedHallucinationMetric,
    EnhancedRelevanceMetric, GEvalMetric, ModerationMetric, UsefulnessMetric, AnswerRelevanceMetric, ContextPrecisionMetric, ContextRecallMetric, ConversationalCoherenceMetric, SessionCompletenessQuality, UserFrustrationMetric, BatchEvaluator as AdvancedBatchEvaluator,
    evaluate_hallucination, evaluate_hallucination_sync, evaluate_g_eval, evaluate_g_eval_sync,
    evaluate_moderation, evaluate_moderation_sync, evaluate_usefulness, evaluate_usefulness_sync,
    evaluate_answer_relevance, evaluate_answer_relevance_sync, evaluate_context_precision, evaluate_context_precision_sync,
    evaluate_context_recall, evaluate_context_recall_sync, evaluate_conversational_coherence, evaluate_conversational_coherence_sync,
    evaluate_session_completeness_quality, evaluate_session_completeness_quality_sync, evaluate_user_frustration, evaluate_user_frustration_sync
)

# Custom model integration
from .models import (
    AgentLensBaseModel, ModelResponse, LiteLLMChatModel, 
    CustomOpenAICompatibleModel, HuggingFaceModel
)

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
    "CustomMetric", "LLMAsJudgeMetric", "CometStyleCustomMetric", "CometLLMJudgeMetric",
    
    # Base classes
    "BaseMetric", "MetricResult", "ScoreResult",
    
    # Dataset and batch processing
    "EvaluationDataset", "DatasetItem", "BatchEvaluator",
    
    # Statistical analysis
    "StatisticalAnalyzer",
    
    # Advanced metrics with backend integration
    "AdvancedMetricsClient", "MetricType", "EvaluationModel",
    "BatchEvaluationConfig", "EnhancedHallucinationMetric",
    "EnhancedRelevanceMetric", "GEvalMetric", "ModerationMetric", "UsefulnessMetric", "AnswerRelevanceMetric", "ContextPrecisionMetric", "ContextRecallMetric", "ConversationalCoherenceMetric", "SessionCompletenessQuality", "UserFrustrationMetric", "AdvancedBatchEvaluator",
    "evaluate_hallucination", "evaluate_hallucination_sync", "evaluate_g_eval", "evaluate_g_eval_sync",
    "evaluate_moderation", "evaluate_moderation_sync", "evaluate_usefulness", "evaluate_usefulness_sync",
    "evaluate_answer_relevance", "evaluate_answer_relevance_sync", "evaluate_context_precision", "evaluate_context_precision_sync",
    "evaluate_context_recall", "evaluate_context_recall_sync", "evaluate_conversational_coherence", "evaluate_conversational_coherence_sync",
    "evaluate_session_completeness_quality", "evaluate_session_completeness_quality_sync", "evaluate_user_frustration", "evaluate_user_frustration_sync",
    
    # Custom model integration
    "AgentLensBaseModel", "ModelResponse", "LiteLLMChatModel", 
    "CustomOpenAICompatibleModel", "HuggingFaceModel"
]