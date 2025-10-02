"""
Custom evaluation metrics for Sprint Lens.

This module provides facilities for creating custom evaluation metrics.
"""

import asyncio
import time
from typing import List, Any, Dict, Optional, Callable, Awaitable, Union
from dataclasses import dataclass

from .base import BaseMetric, MetricResult, ScoreResult
from .llm_based import LLMBasedMetric, LLMJudgeConfig
from ...llm.providers import LLMProvider


class CustomMetric(BaseMetric):
    """
    Custom metric that allows users to define their own evaluation logic.
    
    This class enables users to create metrics with custom evaluation functions
    without needing to subclass BaseMetric.
    """
    
    def __init__(
        self,
        name: str,
        evaluation_fn: Callable[[List[Any], List[Any]], float],
        description: Optional[str] = None,
        async_evaluation_fn: Optional[Callable[[List[Any], List[Any]], Awaitable[float]]] = None,
        supports_types: Optional[List[type]] = None,
        **kwargs
    ):
        """
        Initialize custom metric.
        
        Args:
            name: Metric name
            evaluation_fn: Function that takes (predictions, ground_truth) and returns a score
            description: Human-readable description
            async_evaluation_fn: Optional async version of evaluation function
            supports_types: List of data types this metric supports
            **kwargs: Additional configuration
        """
        super().__init__(name=name, description=description, **kwargs)
        self.evaluation_fn = evaluation_fn
        self.async_evaluation_fn = async_evaluation_fn
        self.supported_types = supports_types or []
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Execute custom evaluation function."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            # Execute custom evaluation function
            score = self.evaluation_fn(predictions, ground_truth)
            
            # Validate score
            if not isinstance(score, (int, float)):
                raise ValueError(f"Evaluation function must return a numeric score, got {type(score)}")
            
            score = float(score)
            
            return self._create_result(
                value=score,
                details={
                    "custom_metric": True,
                    "function_name": getattr(self.evaluation_fn, '__name__', 'anonymous'),
                    "score": score
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)
    
    async def evaluate_async(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Execute custom async evaluation function."""
        if self.async_evaluation_fn:
            start_time = time.time()
            
            try:
                self._validate_inputs(predictions, ground_truth)
                
                # Execute custom async evaluation function
                score = await self.async_evaluation_fn(predictions, ground_truth)
                
                # Validate score
                if not isinstance(score, (int, float)):
                    raise ValueError(f"Async evaluation function must return a numeric score, got {type(score)}")
                
                score = float(score)
                
                return self._create_result(
                    value=score,
                    details={
                        "custom_metric": True,
                        "async": True,
                        "function_name": getattr(self.async_evaluation_fn, '__name__', 'anonymous'),
                        "score": score
                    },
                    start_time=start_time
                )
                
            except Exception as e:
                return self._create_result(error=str(e), start_time=start_time)
        else:
            # Fall back to sync version
            return self.evaluate(predictions, ground_truth, **kwargs)
    
    def supports_type(self, data_type: type) -> bool:
        """Check if this metric supports the given data type."""
        if not self.supported_types:
            return True  # Support all types if none specified
        return data_type in self.supported_types or any(
            issubclass(data_type, supported_type) for supported_type in self.supported_types
        )


class LLMAsJudgeMetric(LLMBasedMetric):
    """
    Custom LLM-based metric that uses a user-defined prompt template.
    
    This allows users to create custom LLM evaluation metrics by providing
    their own prompt templates and parsing logic.
    """
    
    def __init__(
        self,
        name: str,
        prompt_template: str,
        system_prompt: Optional[str] = None,
        response_parser: Optional[Callable[[str], Dict[str, Any]]] = None,
        llm_provider: Optional[LLMProvider] = None,
        config: Optional[LLMJudgeConfig] = None,
        **kwargs
    ):
        """
        Initialize custom LLM judge metric.
        
        Args:
            name: Metric name
            prompt_template: Template for evaluation prompt (can use {prediction}, {ground_truth}, {context})
            system_prompt: Optional system prompt for the LLM
            response_parser: Optional function to parse LLM response into structured result
            llm_provider: LLM provider instance
            config: LLM configuration
            **kwargs: Additional configuration
        """
        super().__init__(
            name=name,
            llm_provider=llm_provider,
            config=config,
            **kwargs
        )
        self.prompt_template = prompt_template
        self.custom_system_prompt = system_prompt
        self.response_parser = response_parser
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for this metric."""
        return self.custom_system_prompt or super()._get_system_prompt()
    
    def _get_evaluation_prompt(
        self, 
        prediction: str, 
        ground_truth: Optional[str] = None,
        context: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate evaluation prompt from template."""
        try:
            return self.prompt_template.format(
                prediction=prediction,
                ground_truth=ground_truth or "",
                context=context or "",
                **kwargs
            )
        except KeyError as e:
            raise ValueError(f"Missing variable in prompt template: {e}")
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response using custom parser or default logic."""
        if self.response_parser:
            try:
                result = self.response_parser(response)
                # Ensure required fields are present
                if "score" not in result:
                    raise ValueError("Custom parser must return a dict with 'score' field")
                return result
            except Exception as e:
                return {
                    "score": 0.0,
                    "error": f"Parser error: {str(e)}",
                    "raw_response": response
                }
        else:
            return super()._parse_llm_response(response)


# Utility functions for creating common custom metrics

def create_threshold_metric(
    name: str,
    threshold_fn: Callable[[Any, Any], bool],
    description: Optional[str] = None
) -> CustomMetric:
    """
    Create a custom metric based on a threshold function.
    
    Args:
        name: Metric name
        threshold_fn: Function that takes (prediction, ground_truth) and returns True/False
        description: Optional description
        
    Returns:
        CustomMetric that returns percentage of items passing the threshold
    """
    def evaluation_fn(predictions: List[Any], ground_truth: List[Any]) -> float:
        passing = sum(1 for p, gt in zip(predictions, ground_truth) if threshold_fn(p, gt))
        return passing / len(predictions) if predictions else 0.0
    
    return CustomMetric(
        name=name,
        evaluation_fn=evaluation_fn,
        description=description or f"Threshold-based metric: {name}"
    )


def create_distance_metric(
    name: str,
    distance_fn: Callable[[Any, Any], float],
    normalize: bool = True,
    invert: bool = True,
    description: Optional[str] = None
) -> CustomMetric:
    """
    Create a custom metric based on a distance function.
    
    Args:
        name: Metric name
        distance_fn: Function that takes (prediction, ground_truth) and returns distance
        normalize: Whether to normalize distances
        invert: Whether to invert distances (so lower distance = higher score)
        description: Optional description
        
    Returns:
        CustomMetric that returns average similarity score
    """
    def evaluation_fn(predictions: List[Any], ground_truth: List[Any]) -> float:
        distances = [distance_fn(p, gt) for p, gt in zip(predictions, ground_truth)]
        
        if not distances:
            return 0.0
        
        if normalize and distances:
            max_distance = max(distances) if max(distances) > 0 else 1.0
            distances = [d / max_distance for d in distances]
        
        avg_distance = sum(distances) / len(distances)
        
        if invert:
            return 1.0 - avg_distance
        else:
            return avg_distance
    
    return CustomMetric(
        name=name,
        evaluation_fn=evaluation_fn,
        description=description or f"Distance-based metric: {name}"
    )


def create_regex_metric(
    name: str,
    pattern: str,
    match_ground_truth: bool = False,
    description: Optional[str] = None
) -> CustomMetric:
    """
    Create a custom metric based on regex pattern matching.
    
    Args:
        name: Metric name
        pattern: Regex pattern to match
        match_ground_truth: If True, check if prediction matches same pattern as ground truth
        description: Optional description
        
    Returns:
        CustomMetric that returns percentage of predictions matching the pattern
    """
    import re
    compiled_pattern = re.compile(pattern)
    
    def evaluation_fn(predictions: List[Any], ground_truth: List[Any]) -> float:
        if match_ground_truth:
            # Check if predictions match the same pattern as ground truth
            matches = 0
            for pred, gt in zip(predictions, ground_truth):
                pred_match = bool(compiled_pattern.search(str(pred)))
                gt_match = bool(compiled_pattern.search(str(gt)))
                if pred_match == gt_match:
                    matches += 1
            return matches / len(predictions) if predictions else 0.0
        else:
            # Check if predictions match the pattern
            matches = sum(1 for pred in predictions if compiled_pattern.search(str(pred)))
            return matches / len(predictions) if predictions else 0.0
    
    return CustomMetric(
        name=name,
        evaluation_fn=evaluation_fn,
        description=description or f"Regex-based metric: {name}",
        supports_types=[str]
    )


def create_length_metric(
    name: str,
    target_length: Optional[int] = None,
    tolerance: float = 0.1,
    description: Optional[str] = None
) -> CustomMetric:
    """
    Create a custom metric based on text length.
    
    Args:
        name: Metric name
        target_length: Target length (if None, compares to ground truth length)
        tolerance: Tolerance as fraction of target length
        description: Optional description
        
    Returns:
        CustomMetric that evaluates length similarity
    """
    def evaluation_fn(predictions: List[Any], ground_truth: List[Any]) -> float:
        scores = []
        
        for pred, gt in zip(predictions, ground_truth):
            pred_len = len(str(pred))
            
            if target_length is not None:
                target = target_length
            else:
                target = len(str(gt))
            
            if target == 0:
                score = 1.0 if pred_len == 0 else 0.0
            else:
                diff = abs(pred_len - target) / target
                score = max(0.0, 1.0 - diff / tolerance)
            
            scores.append(score)
        
        return sum(scores) / len(scores) if scores else 0.0
    
    return CustomMetric(
        name=name,
        evaluation_fn=evaluation_fn,
        description=description or f"Length-based metric: {name}",
        supports_types=[str]
    )


# Comet/AgentLens-style Custom Metrics

class CometStyleCustomMetric(BaseMetric):
    """
    Custom metric following Comet/AgentLens patterns.
    
    Users subclass this and implement the score() method to return ScoreResult or List[ScoreResult].
    This follows the pattern from https://www.comet.com/docs/opik/evaluation/metrics/custom_metric
    """
    
    def __init__(self, name: Optional[str] = None, **kwargs):
        super().__init__(name=name or self.__class__.__name__, **kwargs)
    
    def score(self, input: str = "", output: str = "", **kwargs) -> Union[ScoreResult, List[ScoreResult]]:
        """
        Calculate the metric score.
        
        Args:
            input: The input/question
            output: The model's output/response
            **kwargs: Additional arguments (context, expected, etc.)
            
        Returns:
            ScoreResult or list of ScoreResults
        """
        raise NotImplementedError("Subclasses must implement the score method")
    
    async def score_async(self, input: str = "", output: str = "", **kwargs) -> Union[ScoreResult, List[ScoreResult]]:
        """Async version of score method."""
        return self.score(input=input, output=output, **kwargs)
    
    def evaluate(self, predictions: List[Any], ground_truth: List[Any], **kwargs) -> MetricResult:
        """
        Evaluate using the Comet-style score method.
        
        Converts between the legacy interface and the new score-based interface.
        """
        start_time = time.time()
        
        try:
            # For single item evaluation, use first prediction
            if predictions:
                input_text = ground_truth[0] if ground_truth else ""
                output_text = str(predictions[0])
                
                # Extract additional context from kwargs
                context = kwargs.get("context", "")
                
                result = self.score(input=input_text, output=output_text, context=context, **kwargs)
                
                if isinstance(result, list):
                    # Multi-score metric
                    primary_score = result[0] if result else ScoreResult(0.0, self.name)
                    return MetricResult(
                        name=self.name,
                        value=primary_score.value,
                        details={
                            "scores": [r.to_metric_result().to_dict() for r in result],
                            "primary_score": primary_score.to_metric_result().to_dict(),
                            "reason": primary_score.reason
                        },
                        duration_ms=(time.time() - start_time) * 1000
                    )
                else:
                    # Single score metric
                    return MetricResult(
                        name=self.name,
                        value=result.value,
                        details={"reason": result.reason} if result.reason else {},
                        duration_ms=(time.time() - start_time) * 1000
                    )
            else:
                return MetricResult(
                    name=self.name,
                    value=0.0,
                    error="No predictions provided",
                    duration_ms=(time.time() - start_time) * 1000
                )
                
        except Exception as e:
            return MetricResult(
                name=self.name,
                value=0.0,
                error=str(e),
                duration_ms=(time.time() - start_time) * 1000
            )
    
    async def evaluate_async(self, predictions: List[Any], ground_truth: List[Any], **kwargs) -> MetricResult:
        """Async version of evaluate method."""
        start_time = time.time()
        
        try:
            # For single item evaluation, use first prediction
            if predictions:
                input_text = ground_truth[0] if ground_truth else ""
                output_text = str(predictions[0])
                
                # Extract additional context from kwargs
                context = kwargs.get("context", "")
                
                result = await self.score_async(input=input_text, output=output_text, context=context, **kwargs)
                
                if isinstance(result, list):
                    # Multi-score metric
                    primary_score = result[0] if result else ScoreResult(0.0, self.name)
                    return MetricResult(
                        name=self.name,
                        value=primary_score.value,
                        details={
                            "scores": [r.to_metric_result().to_dict() for r in result],
                            "primary_score": primary_score.to_metric_result().to_dict(),
                            "reason": primary_score.reason
                        },
                        duration_ms=(time.time() - start_time) * 1000
                    )
                else:
                    # Single score metric
                    return MetricResult(
                        name=self.name,
                        value=result.value,
                        details={"reason": result.reason} if result.reason else {},
                        duration_ms=(time.time() - start_time) * 1000
                    )
            else:
                return MetricResult(
                    name=self.name,
                    value=0.0,
                    error="No predictions provided",
                    duration_ms=(time.time() - start_time) * 1000
                )
                
        except Exception as e:
            return MetricResult(
                name=self.name,
                value=0.0,
                error=str(e),
                duration_ms=(time.time() - start_time) * 1000
            )


class CometLLMJudgeMetric(CometStyleCustomMetric):
    """
    LLM-powered custom metric following Comet patterns.
    
    This metric uses an LLM to evaluate responses with custom prompts.
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
{{
  "score": <float between 0.0 and 1.0>,
  "reason": "<your explanation>"
}}"""
    
    def _get_llm_client(self):
        """Initialize LLM client (using LiteLLM for provider flexibility)."""
        if self._llm_client is None:
            try:
                import litellm
                self._llm_client = litellm
            except ImportError:
                raise ImportError("LiteLLM is required for LLM-powered metrics. Install with: pip install litellm")
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
                import json
                result_data = json.loads(content)
                score = float(result_data.get("score", 0.0))
                reason = result_data.get("reason", "No explanation provided")
            except (json.JSONDecodeError, ValueError) as e:
                # Fallback: try to extract score from text
                import re
                score_match = re.search(r"score[\":\s]*([0-9.]+)", content, re.IGNORECASE)
                score = float(score_match.group(1)) if score_match else 0.5
                reason = f"Parsed from response: {content[:100]}..."
            
            return ScoreResult(
                value=max(0.0, min(1.0, score)),  # Clamp to [0, 1]
                name=self.name,
                reason=reason
            )
            
        except Exception as e:
            return ScoreResult(
                value=0.0,
                name=self.name,
                reason=f"LLM evaluation failed: {str(e)}"
            )