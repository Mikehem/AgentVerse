"""
Batch evaluation capabilities for Sprint Lens.

This module provides utilities for running evaluations on large datasets
with progress tracking, parallel processing, and result aggregation.
"""

import asyncio
import time
from typing import List, Dict, Any, Optional, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime
import uuid

from .evaluator import Evaluator, EvaluationResult
from .dataset import EvaluationDataset, DatasetItem
from .metrics import BaseMetric
from ..tracing.trace import Trace
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class BatchProgress:
    """Progress information for batch evaluation."""
    
    batch_id: str
    total_items: int
    completed_items: int = 0
    failed_items: int = 0
    start_time: str = field(default_factory=lambda: datetime.now().isoformat())
    last_update: str = field(default_factory=lambda: datetime.now().isoformat())
    
    @property
    def progress_percentage(self) -> float:
        """Get progress as percentage."""
        if self.total_items == 0:
            return 100.0
        return (self.completed_items / self.total_items) * 100.0
    
    @property
    def is_complete(self) -> bool:
        """Check if batch evaluation is complete."""
        return self.completed_items + self.failed_items >= self.total_items
    
    def update(self, completed: Optional[int] = None, failed: Optional[int] = None) -> None:
        """Update progress counters."""
        if completed is not None:
            self.completed_items += completed
        if failed is not None:
            self.failed_items += failed
        self.last_update = datetime.now().isoformat()


@dataclass
class BatchResult:
    """Result of batch evaluation."""
    
    batch_id: str
    dataset_name: str
    total_items: int
    successful_items: int
    failed_items: int
    results: List[EvaluationResult]
    aggregated_metrics: Dict[str, float]
    duration_ms: float
    start_time: str
    end_time: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def success_rate(self) -> float:
        """Get success rate as percentage."""
        if self.total_items == 0:
            return 100.0
        return (self.successful_items / self.total_items) * 100.0
    
    def get_metric_scores(self, metric_name: str) -> List[Optional[float]]:
        """Get all scores for a specific metric."""
        return [result.get_metric_score(metric_name) for result in self.results]
    
    def get_metric_statistics(self, metric_name: str) -> Dict[str, float]:
        """Get statistics for a specific metric."""
        scores = [score for score in self.get_metric_scores(metric_name) if score is not None]
        
        if not scores:
            return {"count": 0, "mean": 0.0, "min": 0.0, "max": 0.0, "std": 0.0}
        
        import statistics
        
        return {
            "count": len(scores),
            "mean": statistics.mean(scores),
            "min": min(scores),
            "max": max(scores),
            "std": statistics.stdev(scores) if len(scores) > 1 else 0.0
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "batch_id": self.batch_id,
            "dataset_name": self.dataset_name,
            "total_items": self.total_items,
            "successful_items": self.successful_items,
            "failed_items": self.failed_items,
            "success_rate": self.success_rate,
            "aggregated_metrics": self.aggregated_metrics,
            "duration_ms": self.duration_ms,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "metadata": self.metadata,
            "results": [result.to_dict() for result in self.results]
        }


class BatchEvaluator:
    """
    Batch evaluator for processing large datasets.
    
    Provides capabilities for:
    - Parallel evaluation processing
    - Progress tracking
    - Result aggregation
    - Error handling and recovery
    """
    
    def __init__(
        self,
        evaluator: Evaluator,
        batch_size: int = 100,
        max_concurrent: int = 10,
        progress_callback: Optional[Callable[[BatchProgress], None]] = None,
        trace: Optional[Trace] = None
    ):
        """
        Initialize batch evaluator.
        
        Args:
            evaluator: Evaluator instance to use
            batch_size: Number of items to process in each batch
            max_concurrent: Maximum concurrent evaluations
            progress_callback: Optional callback for progress updates
            trace: Optional trace for capturing batch evaluation
        """
        self.evaluator = evaluator
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent
        self.progress_callback = progress_callback
        self.trace = trace
        
        logger.debug(f"Initialized batch evaluator with batch_size={batch_size}, max_concurrent={max_concurrent}")
    
    def evaluate_dataset(
        self, 
        dataset: EvaluationDataset,
        metadata: Optional[Dict[str, Any]] = None
    ) -> BatchResult:
        """
        Synchronously evaluate an entire dataset.
        
        Args:
            dataset: Dataset to evaluate
            metadata: Optional metadata for the batch
            
        Returns:
            BatchResult with aggregated results
        """
        return asyncio.run(self.evaluate_dataset_async(dataset, metadata))
    
    async def evaluate_dataset_async(
        self, 
        dataset: EvaluationDataset,
        metadata: Optional[Dict[str, Any]] = None
    ) -> BatchResult:
        """
        Asynchronously evaluate an entire dataset.
        
        Args:
            dataset: Dataset to evaluate
            metadata: Optional metadata for the batch
            
        Returns:
            BatchResult with aggregated results
        """
        batch_id = str(uuid.uuid4())
        start_time = datetime.now()
        
        # Initialize progress tracking
        progress = BatchProgress(
            batch_id=batch_id,
            total_items=len(dataset)
        )
        
        # Create batch trace if parent trace provided
        batch_trace = None
        if self.trace:
            batch_trace = self.trace.span(
                f"batch_evaluation_{dataset.name}",
                span_type="custom"
            ).__enter__()
            
            batch_trace.set_input({
                "batch_id": batch_id,
                "dataset_name": dataset.name,
                "dataset_size": len(dataset),
                "batch_size": self.batch_size,
                "max_concurrent": self.max_concurrent,
                "metrics": self.evaluator.get_metric_names()
            })
        
        try:
            # Process dataset in batches
            results = []
            semaphore = asyncio.Semaphore(self.max_concurrent)
            
            # Create batches
            batches = []
            for i in range(0, len(dataset), self.batch_size):
                batch_items = dataset.items[i:i + self.batch_size]
                batches.append((i, batch_items))
            
            # Process batches concurrently
            tasks = [
                self._evaluate_batch_async(batch_idx, items, semaphore, progress)
                for batch_idx, items in batches
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Collect results
            successful_items = 0
            failed_items = 0
            
            for batch_result in batch_results:
                if isinstance(batch_result, Exception):
                    logger.error(f"Batch failed: {str(batch_result)}")
                    failed_items += self.batch_size  # Assume entire batch failed
                else:
                    results.extend(batch_result)
                    successful_items += len(batch_result)
            
            # Calculate aggregated metrics
            aggregated_metrics = self._aggregate_metrics(results)
            
            end_time = datetime.now()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            # Create batch result
            batch_result = BatchResult(
                batch_id=batch_id,
                dataset_name=dataset.name,
                total_items=len(dataset),
                successful_items=successful_items,
                failed_items=failed_items,
                results=results,
                aggregated_metrics=aggregated_metrics,
                duration_ms=duration_ms,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                metadata=metadata or {}
            )
            
            # Set trace output
            if batch_trace:
                batch_trace.set_output({
                    "batch_result": batch_result.to_dict(),
                    "success_rate": batch_result.success_rate,
                    "aggregated_metrics": aggregated_metrics
                })
                batch_trace.add_metric("success_rate", batch_result.success_rate)
                batch_trace.add_metric("duration_ms", duration_ms)
            
            logger.info(f"Batch evaluation completed: {batch_id}, success_rate: {batch_result.success_rate:.1f}%")
            
            return batch_result
            
        except Exception as e:
            logger.error(f"Batch evaluation failed: {str(e)}")
            if batch_trace:
                batch_trace.set_error(e)
            raise
            
        finally:
            if batch_trace:
                batch_trace.__exit__(None, None, None)
    
    async def _evaluate_batch_async(
        self,
        batch_idx: int,
        items: List[DatasetItem],
        semaphore: asyncio.Semaphore,
        progress: BatchProgress
    ) -> List[EvaluationResult]:
        """Evaluate a single batch of items."""
        async with semaphore:
            try:
                # Extract predictions and ground truths
                predictions = [item.prediction for item in items]
                ground_truths = [item.ground_truth for item in items]
                contexts = [item.context for item in items]
                
                # Create metadata for batch
                batch_metadata = {
                    "batch_idx": batch_idx,
                    "batch_size": len(items),
                    "item_ids": [item.id for item in items]
                }
                
                # Evaluate batch
                results = []
                
                # For now, evaluate items individually to get per-item results
                for i, (pred, gt, context) in enumerate(zip(predictions, ground_truths, contexts)):
                    try:
                        item_metadata = {
                            **batch_metadata,
                            "item_idx": i,
                            "item_id": items[i].id,
                            "context": context
                        }
                        
                        result = await self.evaluator.evaluate_single_async(
                            pred, gt, metadata=item_metadata
                        )
                        results.append(result)
                        
                        # Update progress
                        progress.update(completed=1)
                        
                    except Exception as e:
                        logger.error(f"Item evaluation failed: {str(e)}")
                        progress.update(failed=1)
                        
                        # Create error result
                        error_result = EvaluationResult(
                            evaluation_id=str(uuid.uuid4()),
                            dataset_name=f"batch_{batch_idx}",
                            item_count=1,
                            metadata={
                                **item_metadata,
                                "error": str(e)
                            }
                        )
                        results.append(error_result)
                
                # Call progress callback if provided
                if self.progress_callback:
                    self.progress_callback(progress)
                
                return results
                
            except Exception as e:
                logger.error(f"Batch {batch_idx} failed: {str(e)}")
                progress.update(failed=len(items))
                raise
    
    def _aggregate_metrics(self, results: List[EvaluationResult]) -> Dict[str, float]:
        """Aggregate metrics across all results."""
        if not results:
            return {}
        
        # Get all metric names
        metric_names = set()
        for result in results:
            metric_names.update(result.metrics.keys())
        
        aggregated = {}
        
        for metric_name in metric_names:
            scores = []
            for result in results:
                score = result.get_metric_score(metric_name)
                if score is not None:
                    scores.append(score)
            
            if scores:
                aggregated[metric_name] = sum(scores) / len(scores)
            else:
                aggregated[metric_name] = 0.0
        
        # Calculate overall score
        if aggregated:
            aggregated["overall_score"] = sum(aggregated.values()) / len(aggregated)
        else:
            aggregated["overall_score"] = 0.0
        
        return aggregated
    
    def evaluate_predictions(
        self,
        predictions: List[Any],
        ground_truths: List[Any],
        contexts: Optional[List[str]] = None,
        dataset_name: str = "batch_evaluation",
        metadata: Optional[Dict[str, Any]] = None
    ) -> BatchResult:
        """
        Evaluate lists of predictions and ground truths.
        
        Args:
            predictions: List of predictions
            ground_truths: List of ground truths
            contexts: Optional list of contexts
            dataset_name: Name for the temporary dataset
            metadata: Optional metadata
            
        Returns:
            BatchResult with evaluation results
        """
        # Create temporary dataset
        dataset = EvaluationDataset.from_lists(
            name=dataset_name,
            predictions=predictions,
            ground_truths=ground_truths,
            contexts=contexts,
            description="Temporary dataset for batch evaluation"
        )
        
        return self.evaluate_dataset(dataset, metadata)
    
    async def evaluate_predictions_async(
        self,
        predictions: List[Any],
        ground_truths: List[Any],
        contexts: Optional[List[str]] = None,
        dataset_name: str = "batch_evaluation",
        metadata: Optional[Dict[str, Any]] = None
    ) -> BatchResult:
        """
        Asynchronously evaluate lists of predictions and ground truths.
        
        Args:
            predictions: List of predictions
            ground_truths: List of ground truths
            contexts: Optional list of contexts
            dataset_name: Name for the temporary dataset
            metadata: Optional metadata
            
        Returns:
            BatchResult with evaluation results
        """
        # Create temporary dataset
        dataset = EvaluationDataset.from_lists(
            name=dataset_name,
            predictions=predictions,
            ground_truths=ground_truths,
            contexts=contexts,
            description="Temporary dataset for batch evaluation"
        )
        
        return await self.evaluate_dataset_async(dataset, metadata)