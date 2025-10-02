"""
Base classes for Sprint Lens evaluation metrics.

This module provides the foundation for all metrics in the evaluation framework.
"""

from abc import ABC, abstractmethod
from typing import List, Any, Dict, Optional, Union
from dataclasses import dataclass, field
import time
from datetime import datetime


@dataclass 
class ScoreResult:
    """Result of a single score calculation (compatible with Comet/AgentLens patterns)."""
    
    value: float
    name: str
    reason: Optional[str] = None
    
    def to_metric_result(self, details: Optional[Dict[str, Any]] = None) -> "MetricResult":
        """Convert to MetricResult."""
        return MetricResult(
            name=self.name,
            value=self.value,
            details=details or {"reason": self.reason} if self.reason else {}
        )


@dataclass
class MetricResult:
    """Result of a metric evaluation."""
    
    name: str
    value: Optional[float] = None
    error: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    duration_ms: Optional[float] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "value": self.value,
            "error": self.error,
            "details": self.details,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp
        }
    
    def is_successful(self) -> bool:
        """Check if metric evaluation was successful."""
        return self.error is None and self.value is not None
    
    def get_score(self) -> float:
        """Get numeric score, returning 0.0 if evaluation failed."""
        return self.value if self.value is not None else 0.0


class BaseMetric(ABC):
    """
    Base class for all evaluation metrics.
    
    This abstract class defines the interface that all metrics must implement.
    Metrics can be synchronous or asynchronous, built-in or custom.
    """
    
    def __init__(
        self, 
        name: Optional[str] = None,
        description: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize base metric.
        
        Args:
            name: Metric name (defaults to class name if not provided)
            description: Human-readable description of what this metric measures
            **kwargs: Additional configuration parameters
        """
        self.name = name or self.__class__.__name__.lower().replace('metric', '')
        self.description = description or f"{self.__class__.__name__} evaluation metric"
        self.config = kwargs
    
    @abstractmethod
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """
        Evaluate predictions against ground truth.
        
        Args:
            predictions: List of predicted values
            ground_truth: List of ground truth values
            **kwargs: Additional evaluation parameters
            
        Returns:
            MetricResult containing the evaluation score and details
        """
        pass
    
    async def evaluate_async(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """
        Asynchronous evaluation (default implementation calls sync version).
        
        Args:
            predictions: List of predicted values
            ground_truth: List of ground truth values
            **kwargs: Additional evaluation parameters
            
        Returns:
            MetricResult containing the evaluation score and details
        """
        return self.evaluate(predictions, ground_truth, **kwargs)
    
    def _validate_inputs(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any]
    ) -> None:
        """
        Validate input data for evaluation.
        
        Args:
            predictions: List of predicted values
            ground_truth: List of ground truth values
            
        Raises:
            ValueError: If inputs are invalid
        """
        if not isinstance(predictions, list):
            raise ValueError("Predictions must be a list")
        
        if not isinstance(ground_truth, list):
            raise ValueError("Ground truth must be a list")
        
        if len(predictions) != len(ground_truth):
            raise ValueError(
                f"Predictions ({len(predictions)}) and ground truth ({len(ground_truth)}) "
                "must have the same length"
            )
        
        if len(predictions) == 0:
            raise ValueError("Cannot evaluate empty lists")
    
    def _create_result(
        self, 
        value: Optional[float] = None,
        error: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        start_time: Optional[float] = None
    ) -> MetricResult:
        """
        Create a MetricResult with timing information.
        
        Args:
            value: Metric score value
            error: Error message if evaluation failed
            details: Additional details about the evaluation
            start_time: Start time for duration calculation
            
        Returns:
            MetricResult instance
        """
        duration_ms = None
        if start_time is not None:
            duration_ms = (time.time() - start_time) * 1000
        
        return MetricResult(
            name=self.name,
            value=value,
            error=error,
            details=details or {},
            duration_ms=duration_ms
        )
    
    def supports_type(self, data_type: type) -> bool:
        """
        Check if this metric supports the given data type.
        
        Args:
            data_type: Type to check support for
            
        Returns:
            True if metric supports this data type
        """
        # Default implementation accepts any type
        return True
    
    def get_config(self) -> Dict[str, Any]:
        """Get metric configuration."""
        return {
            "name": self.name,
            "description": self.description,
            "type": self.__class__.__name__,
            **self.config
        }
    
    def __str__(self) -> str:
        return f"{self.__class__.__name__}(name='{self.name}')"
    
    def __repr__(self) -> str:
        return self.__str__()


class NumericMetric(BaseMetric):
    """Base class for metrics that work with numeric data."""
    
    def supports_type(self, data_type: type) -> bool:
        """Check if this metric supports numeric types."""
        return data_type in (int, float, complex) or issubclass(data_type, (int, float, complex))
    
    def _validate_inputs(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any]
    ) -> None:
        """Validate that inputs are numeric."""
        super()._validate_inputs(predictions, ground_truth)
        
        # Check that all predictions are numeric
        for i, pred in enumerate(predictions):
            if not isinstance(pred, (int, float, complex)):
                raise ValueError(f"Prediction at index {i} is not numeric: {type(pred)}")
        
        # Check that all ground truth values are numeric
        for i, gt in enumerate(ground_truth):
            if not isinstance(gt, (int, float, complex)):
                raise ValueError(f"Ground truth at index {i} is not numeric: {type(gt)}")


class TextMetric(BaseMetric):
    """Base class for metrics that work with text data."""
    
    def supports_type(self, data_type: type) -> bool:
        """Check if this metric supports text types."""
        return data_type == str or issubclass(data_type, str)
    
    def _validate_inputs(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any]
    ) -> None:
        """Validate that inputs are strings."""
        super()._validate_inputs(predictions, ground_truth)
        
        # Check that all predictions are strings
        for i, pred in enumerate(predictions):
            if not isinstance(pred, str):
                raise ValueError(f"Prediction at index {i} is not a string: {type(pred)}")
        
        # Check that all ground truth values are strings
        for i, gt in enumerate(ground_truth):
            if not isinstance(gt, str):
                raise ValueError(f"Ground truth at index {i} is not a string: {type(gt)}")


class ClassificationMetric(BaseMetric):
    """Base class for classification metrics."""
    
    def __init__(self, classes: Optional[List[str]] = None, **kwargs):
        """
        Initialize classification metric.
        
        Args:
            classes: List of class names/labels
            **kwargs: Additional configuration
        """
        super().__init__(**kwargs)
        self.classes = classes
    
    def _validate_inputs(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any]
    ) -> None:
        """Validate classification inputs."""
        super()._validate_inputs(predictions, ground_truth)
        
        if self.classes:
            # Check that all predictions are in the class set
            class_set = set(self.classes)
            for i, pred in enumerate(predictions):
                if pred not in class_set:
                    raise ValueError(f"Prediction at index {i} not in classes: {pred}")
            
            # Check that all ground truth values are in the class set
            for i, gt in enumerate(ground_truth):
                if gt not in class_set:
                    raise ValueError(f"Ground truth at index {i} not in classes: {gt}")