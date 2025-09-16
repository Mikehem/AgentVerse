"""
Core evaluator class for Sprint Lens evaluation framework.
"""

import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Union, Callable, Awaitable
from dataclasses import dataclass, field

from .metrics import BaseMetric, MetricResult
from ..tracing.trace import Trace
from ..tracing.types import SpanType
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class EvaluationResult:
    """Result of an evaluation run."""
    
    evaluation_id: str
    trace_id: Optional[str] = None
    dataset_name: Optional[str] = None
    metrics: Dict[str, MetricResult] = field(default_factory=dict)
    overall_score: Optional[float] = None
    item_count: int = 0
    duration_ms: Optional[float] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_metric_score(self, metric_name: str) -> Optional[float]:
        """Get score for a specific metric."""
        if metric_name in self.metrics:
            return self.metrics[metric_name].value
        return None
    
    def get_metric_details(self, metric_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed results for a specific metric."""
        if metric_name in self.metrics:
            return self.metrics[metric_name].details
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "evaluation_id": self.evaluation_id,
            "trace_id": self.trace_id,
            "dataset_name": self.dataset_name,
            "metrics": {name: result.to_dict() for name, result in self.metrics.items()},
            "overall_score": self.overall_score,
            "item_count": self.item_count,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        }


class Evaluator:
    """
    Main evaluator class for running evaluations with multiple metrics.
    
    Example:
        >>> evaluator = Evaluator([AccuracyMetric(), F1Metric()])
        >>> result = await evaluator.evaluate_async(predictions, ground_truth)
        >>> print(f"Accuracy: {result.get_metric_score('accuracy')}")
    """
    
    def __init__(
        self, 
        metrics: List[BaseMetric],
        trace: Optional[Trace] = None,
        evaluation_name: Optional[str] = None
    ):
        """
        Initialize evaluator with metrics.
        
        Args:
            metrics: List of metric instances to evaluate
            trace: Optional trace to capture evaluation steps
            evaluation_name: Human-readable name for this evaluation
        """
        self.metrics = {metric.name: metric for metric in metrics}
        self.trace = trace
        self.evaluation_name = evaluation_name or "evaluation"
        
        logger.debug(f"Initialized evaluator with {len(self.metrics)} metrics")
    
    def add_metric(self, metric: BaseMetric) -> None:
        """Add a metric to the evaluator."""
        self.metrics[metric.name] = metric
        logger.debug(f"Added metric: {metric.name}")
    
    def remove_metric(self, metric_name: str) -> None:
        """Remove a metric from the evaluator."""
        if metric_name in self.metrics:
            del self.metrics[metric_name]
            logger.debug(f"Removed metric: {metric_name}")
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        dataset_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        """
        Synchronous evaluation of predictions against ground truth.
        
        Args:
            predictions: List of predicted values
            ground_truth: List of ground truth values
            dataset_name: Optional name of dataset being evaluated
            metadata: Optional metadata to include in results
            
        Returns:
            EvaluationResult with scores from all metrics
        """
        return asyncio.run(self.evaluate_async(
            predictions, ground_truth, dataset_name, metadata
        ))
    
    async def evaluate_async(
        self,
        predictions: List[Any], 
        ground_truth: List[Any],
        dataset_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        """
        Asynchronous evaluation of predictions against ground truth.
        
        Args:
            predictions: List of predicted values
            ground_truth: List of ground truth values  
            dataset_name: Optional name of dataset being evaluated
            metadata: Optional metadata to include in results
            
        Returns:
            EvaluationResult with scores from all metrics
        """
        evaluation_id = str(uuid.uuid4())
        start_time = datetime.now()
        
        if len(predictions) != len(ground_truth):
            raise ValueError("Predictions and ground truth must have same length")
        
        # Create evaluation trace if parent trace provided
        eval_trace = None
        if self.trace:
            eval_trace = self.trace.span(
                f"{self.evaluation_name}_evaluation",
                span_type=SpanType.CUSTOM
            ).__enter__()
            
            eval_trace.set_input({
                "evaluation_id": evaluation_id,
                "dataset_name": dataset_name,
                "item_count": len(predictions),
                "metrics": list(self.metrics.keys()),
                "metadata": metadata or {}
            })
        
        try:
            # Run all metrics
            metric_results = {}
            
            # Execute metrics in parallel for better performance
            tasks = []
            for metric_name, metric in self.metrics.items():
                task = self._evaluate_metric_async(
                    metric, predictions, ground_truth, eval_trace
                )
                tasks.append((metric_name, task))
            
            # Wait for all metrics to complete
            for metric_name, task in tasks:
                try:
                    result = await task
                    metric_results[metric_name] = result
                    
                    logger.debug(f"Metric {metric_name} completed: {result.value}")
                    
                except Exception as e:
                    logger.error(f"Metric {metric_name} failed: {str(e)}")
                    # Create error result
                    metric_results[metric_name] = MetricResult(
                        name=metric_name,
                        value=0.0,
                        error=str(e),
                        details={"error": True, "exception": str(e)}
                    )
            
            # Calculate overall score (average of all metrics)
            valid_scores = [
                result.value for result in metric_results.values()
                if result.value is not None and result.error is None
            ]
            overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else None
            
            end_time = datetime.now()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            # Create result
            result = EvaluationResult(
                evaluation_id=evaluation_id,
                trace_id=eval_trace.trace_id if eval_trace else None,
                dataset_name=dataset_name,
                metrics=metric_results,
                overall_score=overall_score,
                item_count=len(predictions),
                duration_ms=duration_ms,
                metadata=metadata or {}
            )
            
            # Set trace output
            if eval_trace:
                eval_trace.set_output({
                    "evaluation_result": result.to_dict(),
                    "overall_score": overall_score,
                    "successful_metrics": len([r for r in metric_results.values() if r.error is None])
                })
                eval_trace.add_metric("overall_score", overall_score or 0.0)
                eval_trace.add_metric("duration_ms", duration_ms)
            
            logger.info(f"Evaluation completed: {evaluation_id}, score: {overall_score}")
            
            return result
            
        except Exception as e:
            logger.error(f"Evaluation failed: {str(e)}")
            if eval_trace:
                eval_trace.set_error(e)
            raise
            
        finally:
            if eval_trace:
                eval_trace.__exit__(None, None, None)
    
    async def _evaluate_metric_async(
        self, 
        metric: BaseMetric, 
        predictions: List[Any], 
        ground_truth: List[Any],
        parent_span = None
    ) -> MetricResult:
        """Evaluate a single metric with optional tracing."""
        
        # Create span for metric evaluation
        metric_span = None
        if parent_span:
            metric_span = parent_span.create_child_span(
                f"metric_{metric.name}",
                span_type=SpanType.CUSTOM
            ).__enter__()
            
            metric_span.set_input({
                "metric_name": metric.name,
                "metric_type": type(metric).__name__,
                "item_count": len(predictions)
            })
        
        try:
            # Check if metric supports async evaluation
            if hasattr(metric, 'evaluate_async') and callable(getattr(metric, 'evaluate_async')):
                result = await metric.evaluate_async(predictions, ground_truth)
            else:
                # Run synchronous metric in thread pool
                result = await asyncio.get_event_loop().run_in_executor(
                    None, metric.evaluate, predictions, ground_truth
                )
            
            if metric_span:
                metric_span.set_output({
                    "metric_result": result.to_dict(),
                    "score": result.value
                })
                metric_span.add_metric("metric_score", result.value or 0.0)
            
            return result
            
        except Exception as e:
            if metric_span:
                metric_span.set_error(e)
            raise
            
        finally:
            if metric_span:
                metric_span.__exit__(None, None, None)
    
    def evaluate_single(
        self, 
        prediction: Any, 
        ground_truth: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        """
        Evaluate a single prediction-ground_truth pair.
        
        Args:
            prediction: Single predicted value
            ground_truth: Single ground truth value
            metadata: Optional metadata
            
        Returns:
            EvaluationResult for single item
        """
        return self.evaluate([prediction], [ground_truth], metadata=metadata)
    
    async def evaluate_single_async(
        self, 
        prediction: Any, 
        ground_truth: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        """
        Asynchronously evaluate a single prediction-ground_truth pair.
        
        Args:
            prediction: Single predicted value
            ground_truth: Single ground truth value
            metadata: Optional metadata
            
        Returns:
            EvaluationResult for single item
        """
        return await self.evaluate_async([prediction], [ground_truth], metadata=metadata)
    
    def get_metric_names(self) -> List[str]:
        """Get list of metric names in this evaluator."""
        return list(self.metrics.keys())
    
    def get_metric(self, name: str) -> Optional[BaseMetric]:
        """Get metric by name."""
        return self.metrics.get(name)