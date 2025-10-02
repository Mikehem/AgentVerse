"""
Sprint Lens Evaluation Metrics

This module provides a comprehensive set of evaluation metrics for AI applications,
including built-in metrics, LLM-based metrics, and a framework for custom metrics.
"""

import asyncio
import json
import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union, Callable, Awaitable
from enum import Enum

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class MetricResult:
    """Result of a metric evaluation."""
    
    name: str
    value: float
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "value": self.value,
            "reason": self.reason,
            "details": self.details,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        }


@dataclass 
class ScoreResult:
    """Result of a single score calculation."""
    
    value: float
    name: str
    reason: Optional[str] = None
    
    def to_metric_result(self, details: Optional[Dict[str, Any]] = None) -> MetricResult:
        """Convert to MetricResult."""
        return MetricResult(
            name=self.name,
            value=self.value,
            reason=self.reason,
            details=details or {}
        )


class BaseMetric(ABC):
    """Abstract base class for all evaluation metrics."""
    
    def __init__(self, name: Optional[str] = None, **kwargs):
        self.name = name or self.__class__.__name__
        self.metadata = kwargs
        
    @abstractmethod
    def score(self, **kwargs) -> Union[ScoreResult, List[ScoreResult]]:
        """
        Calculate the metric score.
        
        Args:
            **kwargs: Metric-specific arguments (input, output, expected, context, etc.)
            
        Returns:
            ScoreResult or list of ScoreResults
        """
        pass
    
    async def score_async(self, **kwargs) -> Union[ScoreResult, List[ScoreResult]]:
        """Async version of score method."""
        return self.score(**kwargs)
    
    def evaluate(self, **kwargs) -> MetricResult:
        """
        Evaluate and return a MetricResult.
        
        Args:
            **kwargs: Metric-specific arguments
            
        Returns:
            MetricResult with score and details
        """
        try:
            result = self.score(**kwargs)
            
            if isinstance(result, list):
                # Multi-score metric
                primary_score = result[0] if result else ScoreResult(0.0, self.name)
                return MetricResult(
                    name=self.name,
                    value=primary_score.value,
                    reason=primary_score.reason,
                    details={
                        "scores": [r.to_metric_result().to_dict() for r in result],
                        "primary_score": primary_score.to_metric_result().to_dict()
                    }
                )
            else:
                # Single score metric
                return result.to_metric_result()
                
        except Exception as e:
            logger.error(f"Error evaluating metric {self.name}: {e}")
            return MetricResult(
                name=self.name,
                value=0.0,
                reason=f"Error: {str(e)}",
                details={"error": str(e)}
            )
    
    async def evaluate_async(self, **kwargs) -> MetricResult:
        """Async version of evaluate method."""
        try:
            result = await self.score_async(**kwargs)
            
            if isinstance(result, list):
                # Multi-score metric
                primary_score = result[0] if result else ScoreResult(0.0, self.name)
                return MetricResult(
                    name=self.name,
                    value=primary_score.value,
                    reason=primary_score.reason,
                    details={
                        "scores": [r.to_metric_result().to_dict() for r in result],
                        "primary_score": primary_score.to_metric_result().to_dict()
                    }
                )
            else:
                # Single score metric
                return result.to_metric_result()
                
        except Exception as e:
            logger.error(f"Error evaluating metric {self.name}: {e}")
            return MetricResult(
                name=self.name,
                value=0.0,
                reason=f"Error: {str(e)}",
                details={"error": str(e)}
            )


class CustomMetric(BaseMetric):
    """
    Base class for user-defined custom metrics.
    
    Users can subclass this to create domain-specific evaluation criteria.
    
    Example:
        class SentimentPositivityMetric(CustomMetric):
            def score(self, output: str, **kwargs) -> ScoreResult:
                # Custom sentiment analysis logic
                positivity_score = analyze_sentiment(output)
                return ScoreResult(
                    value=positivity_score,
                    name="sentiment_positivity",
                    reason=f"Sentiment analysis yielded {positivity_score:.2f}"
                )
    """
    
    def __init__(self, name: Optional[str] = None, score_func: Optional[Callable] = None, **kwargs):
        super().__init__(name, **kwargs)
        self._score_func = score_func
        
    def score(self, **kwargs) -> Union[ScoreResult, List[ScoreResult]]:
        """
        Default implementation that calls the provided score function.
        Override this method for custom scoring logic.
        """
        if self._score_func:
            return self._score_func(**kwargs)
        else:
            raise NotImplementedError("Must override score method or provide score_func")


class LLMAsJudgeMetric(CustomMetric):
    """
    Custom metric that uses an LLM to evaluate responses.
    
    This metric leverages language models to perform nuanced evaluation
    that may be difficult to capture with traditional metrics.
    """
    
    def __init__(
        self,
        name: Optional[str] = None,
        model_name: str = "gpt-4o-mini",
        api_key: Optional[str] = None,
        prompt_template: Optional[str] = None,
        scoring_criteria: Optional[str] = None,
        **kwargs
    ):
        super().__init__(name, **kwargs)
        self.model_name = model_name
        self.api_key = api_key
        self.prompt_template = prompt_template or self._default_prompt_template()
        self.scoring_criteria = scoring_criteria or "Overall quality and helpfulness"
        self._llm_client = None
        
    def _default_prompt_template(self) -> str:
        """Default prompt template for LLM evaluation."""
        return """You are an expert evaluator. Please evaluate the following response based on the criteria: {criteria}

Input: {input}
Output: {output}
Context: {context}

Please provide:
1. A score from 0.0 to 1.0 (where 1.0 is excellent)
2. A brief explanation of your reasoning

Respond in JSON format:
{
  "score": <float between 0.0 and 1.0>,
  "reason": "<your explanation>"
}"""
    
    def _get_llm_client(self):
        """Initialize LLM client (using LiteLLM for provider flexibility)."""
        if self._llm_client is None:
            try:
                import litellm
                self._llm_client = litellm
            except ImportError:
                raise ImportError("LiteLLM is required for LLMAsJudgeMetric. Install with: pip install litellm")
        return self._llm_client
    
    def score(self, input: str = "", output: str = "", context: str = "", **kwargs) -> ScoreResult:
        """Score using LLM evaluation."""
        try:
            llm = self._get_llm_client()
            
            # Format prompt
            prompt = self.prompt_template.format(
                criteria=self.scoring_criteria,
                input=input,
                output=output,
                context=context
            )
            
            # Call LLM
            response = llm.completion(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                api_key=self.api_key,
                temperature=0.1
            )
            
            # Parse response
            content = response.choices[0].message.content
            try:
                result_data = json.loads(content)
                score = float(result_data.get("score", 0.0))
                reason = result_data.get("reason", "No explanation provided")
            except (json.JSONDecodeError, ValueError) as e:
                # Fallback: try to extract score from text
                score_match = re.search(r"score[\":\s]*([0-9.]+)", content, re.IGNORECASE)
                score = float(score_match.group(1)) if score_match else 0.5
                reason = f"Parsed from response: {content[:100]}..."
            
            return ScoreResult(
                value=max(0.0, min(1.0, score)),  # Clamp to [0, 1]
                name=self.name,
                reason=reason
            )
            
        except Exception as e:
            logger.error(f"Error in LLM evaluation: {e}")
            return ScoreResult(
                value=0.0,
                name=self.name,
                reason=f"Evaluation failed: {str(e)}"
            )


# Built-in Metrics

class AccuracyMetric(BaseMetric):
    """Exact match accuracy metric."""
    
    def score(self, output: str, expected: str, **kwargs) -> ScoreResult:
        """Calculate exact match accuracy."""
        is_match = output.strip().lower() == expected.strip().lower()
        return ScoreResult(
            value=1.0 if is_match else 0.0,
            name="accuracy",
            reason=f"{'Exact' if is_match else 'No'} match with expected output"
        )


class PrecisionMetric(BaseMetric):
    """Precision metric for classification tasks."""
    
    def score(self, predictions: List[str], ground_truth: List[str], **kwargs) -> ScoreResult:
        """Calculate precision score."""
        if not predictions or not ground_truth:
            return ScoreResult(value=0.0, name="precision", reason="Empty predictions or ground truth")
        
        # Simple token-based precision
        pred_tokens = set(" ".join(predictions).split())
        true_tokens = set(" ".join(ground_truth).split())
        
        if not pred_tokens:
            precision = 0.0
        else:
            precision = len(pred_tokens.intersection(true_tokens)) / len(pred_tokens)
        
        return ScoreResult(
            value=precision,
            name="precision",
            reason=f"Token-based precision: {precision:.3f}"
        )


class RecallMetric(BaseMetric):
    """Recall metric for classification tasks."""
    
    def score(self, predictions: List[str], ground_truth: List[str], **kwargs) -> ScoreResult:
        """Calculate recall score."""
        if not predictions or not ground_truth:
            return ScoreResult(value=0.0, name="recall", reason="Empty predictions or ground truth")
        
        # Simple token-based recall
        pred_tokens = set(" ".join(predictions).split())
        true_tokens = set(" ".join(ground_truth).split())
        
        if not true_tokens:
            recall = 0.0
        else:
            recall = len(pred_tokens.intersection(true_tokens)) / len(true_tokens)
        
        return ScoreResult(
            value=recall,
            name="recall",
            reason=f"Token-based recall: {recall:.3f}"
        )


class F1Metric(BaseMetric):
    """F1 score metric."""
    
    def score(self, predictions: List[str], ground_truth: List[str], **kwargs) -> ScoreResult:
        """Calculate F1 score."""
        # Calculate precision and recall
        precision_metric = PrecisionMetric()
        recall_metric = RecallMetric()
        
        precision_result = precision_metric.score(predictions, ground_truth)
        recall_result = recall_metric.score(predictions, ground_truth)
        
        precision = precision_result.value
        recall = recall_result.value
        
        if precision + recall == 0:
            f1 = 0.0
        else:
            f1 = 2 * (precision * recall) / (precision + recall)
        
        return ScoreResult(
            value=f1,
            name="f1",
            reason=f"F1 score from precision={precision:.3f}, recall={recall:.3f}"
        )


class ExactMatchMetric(BaseMetric):
    """Exact string match metric."""
    
    def score(self, output: str, expected: str, case_sensitive: bool = False, **kwargs) -> ScoreResult:
        """Calculate exact match score."""
        if case_sensitive:
            is_match = output == expected
        else:
            is_match = output.lower() == expected.lower()
        
        return ScoreResult(
            value=1.0 if is_match else 0.0,
            name="exact_match",
            reason=f"{'Exact' if is_match else 'No'} match ({'case-sensitive' if case_sensitive else 'case-insensitive'})"
        )


class ContainmentMetric(BaseMetric):
    """Check if expected content is contained in output."""
    
    def score(self, output: str, expected: str, case_sensitive: bool = False, **kwargs) -> ScoreResult:
        """Calculate containment score."""
        if case_sensitive:
            contains = expected in output
        else:
            contains = expected.lower() in output.lower()
        
        return ScoreResult(
            value=1.0 if contains else 0.0,
            name="containment",
            reason=f"Expected text {'found' if contains else 'not found'} in output"
        )


class SimilarityMetric(BaseMetric):
    """String similarity metric using various algorithms."""
    
    def __init__(self, algorithm: str = "cosine", **kwargs):
        super().__init__(**kwargs)
        self.algorithm = algorithm
    
    def score(self, output: str, expected: str, **kwargs) -> ScoreResult:
        """Calculate similarity score."""
        try:
            if self.algorithm == "cosine":
                similarity = self._cosine_similarity(output, expected)
            elif self.algorithm == "jaccard":
                similarity = self._jaccard_similarity(output, expected)
            else:
                similarity = self._simple_similarity(output, expected)
            
            return ScoreResult(
                value=similarity,
                name="similarity",
                reason=f"{self.algorithm.capitalize()} similarity: {similarity:.3f}"
            )
        except Exception as e:
            return ScoreResult(
                value=0.0,
                name="similarity",
                reason=f"Error calculating similarity: {e}"
            )
    
    def _simple_similarity(self, text1: str, text2: str) -> float:
        """Simple token overlap similarity."""
        tokens1 = set(text1.lower().split())
        tokens2 = set(text2.lower().split())
        
        if not tokens1 and not tokens2:
            return 1.0
        if not tokens1 or not tokens2:
            return 0.0
        
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        
        return len(intersection) / len(union)
    
    def _jaccard_similarity(self, text1: str, text2: str) -> float:
        """Jaccard similarity coefficient."""
        return self._simple_similarity(text1, text2)  # Same as simple for now
    
    def _cosine_similarity(self, text1: str, text2: str) -> float:
        """Cosine similarity (simplified version)."""
        tokens1 = text1.lower().split()
        tokens2 = text2.lower().split()
        
        # Create vocabulary
        vocab = list(set(tokens1 + tokens2))
        if not vocab:
            return 1.0
        
        # Create vectors
        vec1 = [tokens1.count(word) for word in vocab]
        vec2 = [tokens2.count(word) for word in vocab]
        
        # Calculate cosine similarity
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)


class LevenshteinDistanceMetric(BaseMetric):
    """Levenshtein edit distance metric."""
    
    def score(self, output: str, expected: str, normalize: bool = True, **kwargs) -> ScoreResult:
        """Calculate Levenshtein distance score."""
        distance = self._levenshtein_distance(output, expected)
        
        if normalize:
            max_len = max(len(output), len(expected))
            if max_len == 0:
                score = 1.0
            else:
                score = 1.0 - (distance / max_len)
        else:
            score = float(distance)
        
        return ScoreResult(
            value=score,
            name="levenshtein",
            reason=f"Edit distance: {distance}, normalized score: {score:.3f}" if normalize else f"Edit distance: {distance}"
        )
    
    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings."""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]


# LLM-based Metrics (simplified versions - more sophisticated ones in advanced_metrics.py)

class RelevanceMetric(BaseMetric):
    """Basic relevance metric."""
    
    def score(self, output: str, input: str, **kwargs) -> ScoreResult:
        """Calculate relevance score based on keyword overlap."""
        input_words = set(input.lower().split())
        output_words = set(output.lower().split())
        
        if not input_words:
            return ScoreResult(value=0.0, name="relevance", reason="Empty input")
        
        overlap = input_words.intersection(output_words)
        relevance = len(overlap) / len(input_words)
        
        return ScoreResult(
            value=relevance,
            name="relevance",
            reason=f"Keyword overlap relevance: {relevance:.3f}"
        )


class FactualConsistencyMetric(BaseMetric):
    """Basic factual consistency metric."""
    
    def score(self, output: str, context: str, **kwargs) -> ScoreResult:
        """Calculate factual consistency based on context overlap."""
        context_words = set(context.lower().split())
        output_words = set(output.lower().split())
        
        if not context_words:
            return ScoreResult(value=0.5, name="factual_consistency", reason="No context provided")
        
        # Check for contradictory terms (simple heuristic)
        contradiction_terms = {"not", "no", "never", "opposite", "contrary", "false"}
        contradictions = output_words.intersection(contradiction_terms)
        
        if contradictions:
            consistency = 0.3  # Lower score for potential contradictions
        else:
            overlap = context_words.intersection(output_words)
            consistency = min(1.0, len(overlap) / len(context_words) + 0.5)
        
        return ScoreResult(
            value=consistency,
            name="factual_consistency",
            reason=f"Context-based consistency: {consistency:.3f}"
        )


class CoherenceMetric(BaseMetric):
    """Basic coherence metric."""
    
    def score(self, output: str, **kwargs) -> ScoreResult:
        """Calculate coherence based on sentence structure."""
        sentences = output.split('.')
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return ScoreResult(value=0.0, name="coherence", reason="No sentences found")
        
        # Simple coherence heuristics
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
        has_transitions = any(word in output.lower() for word in ["however", "therefore", "furthermore", "moreover", "additionally"])
        
        # Basic scoring
        length_score = min(1.0, avg_sentence_length / 10)  # Penalize very short or very long sentences
        transition_score = 0.2 if has_transitions else 0.0
        
        coherence = (length_score + transition_score) / 1.2
        
        return ScoreResult(
            value=coherence,
            name="coherence",
            reason=f"Structure-based coherence: {coherence:.3f}"
        )


class HallucinationMetric(BaseMetric):
    """Basic hallucination detection metric."""
    
    def score(self, output: str, context: str, **kwargs) -> ScoreResult:
        """Detect potential hallucinations based on context."""
        if not context:
            return ScoreResult(value=0.5, name="hallucination", reason="No context for comparison")
        
        context_words = set(context.lower().split())
        output_words = set(output.lower().split())
        
        # Check for factual claims not in context
        factual_indicators = {"is", "are", "was", "were", "will", "would", "can", "could", "must", "should"}
        fact_words = output_words.intersection(factual_indicators)
        
        if fact_words:
            # Check if factual claims are supported by context
            supported_facts = context_words.intersection(output_words)
            if len(supported_facts) < len(fact_words):
                hallucination_score = 0.7  # Higher score indicates more hallucination
            else:
                hallucination_score = 0.2
        else:
            hallucination_score = 0.1  # Low hallucination if no factual claims
        
        return ScoreResult(
            value=hallucination_score,
            name="hallucination",
            reason=f"Context-based hallucination detection: {hallucination_score:.3f}"
        )


# Placeholder metrics for compatibility with __init__.py

class ToxicityMetric(BaseMetric):
    def score(self, output: str, **kwargs) -> ScoreResult:
        toxic_words = {"hate", "stupid", "idiot", "terrible", "awful"}
        output_words = set(output.lower().split())
        toxicity = len(output_words.intersection(toxic_words)) / len(output_words) if output_words else 0.0
        return ScoreResult(value=toxicity, name="toxicity", reason=f"Simple toxicity check: {toxicity:.3f}")


class BiasMetric(BaseMetric):
    def score(self, output: str, **kwargs) -> ScoreResult:
        # Simplified bias detection
        return ScoreResult(value=0.1, name="bias", reason="Simplified bias metric")


class GroundednessMetric(BaseMetric):
    def score(self, output: str, context: str, **kwargs) -> ScoreResult:
        if not context:
            return ScoreResult(value=0.0, name="groundedness", reason="No context provided")
        context_overlap = len(set(output.lower().split()).intersection(set(context.lower().split())))
        groundedness = min(1.0, context_overlap / len(output.split()) if output.split() else 0)
        return ScoreResult(value=groundedness, name="groundedness", reason=f"Context grounding: {groundedness:.3f}")


class FluencyMetric(BaseMetric):
    def score(self, output: str, **kwargs) -> ScoreResult:
        # Simple fluency based on sentence structure
        sentences = [s.strip() for s in output.split('.') if s.strip()]
        if not sentences:
            return ScoreResult(value=0.0, name="fluency", reason="No sentences found")
        avg_length = sum(len(s.split()) for s in sentences) / len(sentences)
        fluency = min(1.0, avg_length / 15)  # Optimal around 15 words per sentence
        return ScoreResult(value=fluency, name="fluency", reason=f"Structure-based fluency: {fluency:.3f}")


class ConcisenessMetric(BaseMetric):
    def score(self, output: str, **kwargs) -> ScoreResult:
        word_count = len(output.split())
        if word_count == 0:
            return ScoreResult(value=0.0, name="conciseness", reason="Empty output")
        # Reward shorter responses (adjust threshold as needed)
        conciseness = max(0.0, 1.0 - (word_count - 50) / 200) if word_count > 50 else 1.0
        return ScoreResult(value=conciseness, name="conciseness", reason=f"Length-based conciseness: {conciseness:.3f}")


# Text Quality Metrics (require external libraries)

class BleuMetric(BaseMetric):
    """BLEU score metric (requires nltk)."""
    
    def score(self, output: str, reference: str, **kwargs) -> ScoreResult:
        try:
            from nltk.translate.bleu_score import sentence_bleu
            reference_tokens = [reference.split()]
            candidate_tokens = output.split()
            bleu_score = sentence_bleu(reference_tokens, candidate_tokens)
            return ScoreResult(value=bleu_score, name="bleu", reason=f"BLEU score: {bleu_score:.3f}")
        except ImportError:
            return ScoreResult(value=0.0, name="bleu", reason="NLTK not available for BLEU calculation")


class RougeMetric(BaseMetric):
    """ROUGE score metric (requires rouge-score)."""
    
    def score(self, output: str, reference: str, **kwargs) -> ScoreResult:
        try:
            from rouge_score import rouge_scorer
            scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
            scores = scorer.score(reference, output)
            rouge_l = scores['rougeL'].fmeasure
            return ScoreResult(value=rouge_l, name="rouge", reason=f"ROUGE-L F1: {rouge_l:.3f}")
        except ImportError:
            return ScoreResult(value=0.0, name="rouge", reason="rouge-score not available")


class BertScoreMetric(BaseMetric):
    """BERTScore metric (requires bert-score)."""
    
    def score(self, output: str, reference: str, **kwargs) -> ScoreResult:
        try:
            from bert_score import score
            P, R, F1 = score([output], [reference], lang="en", verbose=False)
            bert_score = F1.item()
            return ScoreResult(value=bert_score, name="bert_score", reason=f"BERTScore F1: {bert_score:.3f}")
        except ImportError:
            return ScoreResult(value=0.0, name="bert_score", reason="bert-score not available")