"""
Built-in evaluation metrics for Sprint Lens.

This module contains standard machine learning and NLP evaluation metrics.
"""

import time
import re
from typing import List, Any, Dict, Optional, Set, Union
from collections import Counter
import difflib

from .base import BaseMetric, MetricResult, NumericMetric, TextMetric, ClassificationMetric


class AccuracyMetric(ClassificationMetric):
    """Accuracy metric for classification tasks."""
    
    def __init__(self, **kwargs):
        super().__init__(name="accuracy", description="Classification accuracy", **kwargs)
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate accuracy score."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            correct = sum(1 for p, gt in zip(predictions, ground_truth) if p == gt)
            total = len(predictions)
            accuracy = correct / total if total > 0 else 0.0
            
            return self._create_result(
                value=accuracy,
                details={
                    "correct": correct,
                    "total": total,
                    "accuracy": accuracy
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class PrecisionMetric(ClassificationMetric):
    """Precision metric for classification tasks."""
    
    def __init__(self, average: str = "weighted", **kwargs):
        super().__init__(
            name="precision", 
            description="Classification precision", 
            average=average,
            **kwargs
        )
        self.average = average
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate precision score."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            # Get unique classes
            classes = sorted(set(ground_truth + predictions))
            
            if len(classes) <= 1:
                return self._create_result(
                    value=1.0 if len(classes) == 1 else 0.0,
                    details={"classes": classes, "average": self.average},
                    start_time=start_time
                )
            
            # Calculate precision for each class
            class_precisions = {}
            class_counts = Counter(predictions)
            
            for cls in classes:
                tp = sum(1 for p, gt in zip(predictions, ground_truth) if p == cls and gt == cls)
                predicted_positive = class_counts.get(cls, 0)
                
                if predicted_positive == 0:
                    class_precisions[cls] = 0.0
                else:
                    class_precisions[cls] = tp / predicted_positive
            
            # Calculate average precision
            if self.average == "macro":
                precision = sum(class_precisions.values()) / len(class_precisions)
            elif self.average == "weighted":
                gt_counts = Counter(ground_truth)
                total = sum(gt_counts.values())
                precision = sum(
                    class_precisions[cls] * gt_counts.get(cls, 0) / total 
                    for cls in classes
                )
            else:  # micro
                tp_total = sum(
                    sum(1 for p, gt in zip(predictions, ground_truth) if p == cls and gt == cls)
                    for cls in classes
                )
                predicted_total = len(predictions)
                precision = tp_total / predicted_total if predicted_total > 0 else 0.0
            
            return self._create_result(
                value=precision,
                details={
                    "precision": precision,
                    "class_precisions": class_precisions,
                    "average": self.average,
                    "classes": classes
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class RecallMetric(ClassificationMetric):
    """Recall metric for classification tasks."""
    
    def __init__(self, average: str = "weighted", **kwargs):
        super().__init__(
            name="recall", 
            description="Classification recall", 
            average=average,
            **kwargs
        )
        self.average = average
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate recall score."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            # Get unique classes
            classes = sorted(set(ground_truth + predictions))
            
            if len(classes) <= 1:
                return self._create_result(
                    value=1.0 if len(classes) == 1 else 0.0,
                    details={"classes": classes, "average": self.average},
                    start_time=start_time
                )
            
            # Calculate recall for each class
            class_recalls = {}
            gt_counts = Counter(ground_truth)
            
            for cls in classes:
                tp = sum(1 for p, gt in zip(predictions, ground_truth) if p == cls and gt == cls)
                actual_positive = gt_counts.get(cls, 0)
                
                if actual_positive == 0:
                    class_recalls[cls] = 0.0
                else:
                    class_recalls[cls] = tp / actual_positive
            
            # Calculate average recall
            if self.average == "macro":
                recall = sum(class_recalls.values()) / len(class_recalls)
            elif self.average == "weighted":
                total = sum(gt_counts.values())
                recall = sum(
                    class_recalls[cls] * gt_counts.get(cls, 0) / total 
                    for cls in classes
                )
            else:  # micro
                tp_total = sum(
                    sum(1 for p, gt in zip(predictions, ground_truth) if p == cls and gt == cls)
                    for cls in classes
                )
                actual_total = len(ground_truth)
                recall = tp_total / actual_total if actual_total > 0 else 0.0
            
            return self._create_result(
                value=recall,
                details={
                    "recall": recall,
                    "class_recalls": class_recalls,
                    "average": self.average,
                    "classes": classes
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class F1Metric(ClassificationMetric):
    """F1 score metric for classification tasks."""
    
    def __init__(self, average: str = "weighted", **kwargs):
        super().__init__(
            name="f1", 
            description="F1 score", 
            average=average,
            **kwargs
        )
        self.average = average
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate F1 score."""
        start_time = time.time()
        
        try:
            # Calculate precision and recall first
            precision_metric = PrecisionMetric(average=self.average)
            recall_metric = RecallMetric(average=self.average)
            
            precision_result = precision_metric.evaluate(predictions, ground_truth)
            recall_result = recall_metric.evaluate(predictions, ground_truth)
            
            if precision_result.error or recall_result.error:
                error_msg = precision_result.error or recall_result.error
                return self._create_result(error=error_msg, start_time=start_time)
            
            precision = precision_result.value
            recall = recall_result.value
            
            # Calculate F1 score
            if precision + recall == 0:
                f1 = 0.0
            else:
                f1 = 2 * (precision * recall) / (precision + recall)
            
            return self._create_result(
                value=f1,
                details={
                    "f1": f1,
                    "precision": precision,
                    "recall": recall,
                    "average": self.average,
                    "precision_details": precision_result.details,
                    "recall_details": recall_result.details
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class ExactMatchMetric(TextMetric):
    """Exact string match metric."""
    
    def __init__(self, case_sensitive: bool = True, **kwargs):
        super().__init__(
            name="exact_match", 
            description="Exact string matching", 
            case_sensitive=case_sensitive,
            **kwargs
        )
        self.case_sensitive = case_sensitive
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate exact match score."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            matches = 0
            for pred, gt in zip(predictions, ground_truth):
                if self.case_sensitive:
                    if pred == gt:
                        matches += 1
                else:
                    if pred.lower() == gt.lower():
                        matches += 1
            
            exact_match = matches / len(predictions) if predictions else 0.0
            
            return self._create_result(
                value=exact_match,
                details={
                    "exact_match": exact_match,
                    "matches": matches,
                    "total": len(predictions),
                    "case_sensitive": self.case_sensitive
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class LevenshteinDistanceMetric(TextMetric):
    """Levenshtein distance metric for text similarity."""
    
    def __init__(self, normalize: bool = True, **kwargs):
        super().__init__(
            name="levenshtein", 
            description="Levenshtein distance similarity", 
            normalize=normalize,
            **kwargs
        )
        self.normalize = normalize
    
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
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate Levenshtein distance similarity."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            distances = []
            similarities = []
            
            for pred, gt in zip(predictions, ground_truth):
                distance = self._levenshtein_distance(pred, gt)
                distances.append(distance)
                
                if self.normalize:
                    max_len = max(len(pred), len(gt))
                    similarity = 1.0 - (distance / max_len) if max_len > 0 else 1.0
                else:
                    similarity = distance  # Raw distance (lower is better)
                
                similarities.append(similarity)
            
            # Average similarity
            avg_similarity = sum(similarities) / len(similarities) if similarities else 0.0
            avg_distance = sum(distances) / len(distances) if distances else 0.0
            
            return self._create_result(
                value=avg_similarity,
                details={
                    "average_similarity": avg_similarity,
                    "average_distance": avg_distance,
                    "distances": distances,
                    "similarities": similarities,
                    "normalize": self.normalize
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class SimilarityMetric(TextMetric):
    """Text similarity using difflib SequenceMatcher."""
    
    def __init__(self, **kwargs):
        super().__init__(
            name="similarity", 
            description="Text similarity using sequence matching",
            **kwargs
        )
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate text similarity scores."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            similarities = []
            
            for pred, gt in zip(predictions, ground_truth):
                similarity = difflib.SequenceMatcher(None, pred, gt).ratio()
                similarities.append(similarity)
            
            avg_similarity = sum(similarities) / len(similarities) if similarities else 0.0
            
            return self._create_result(
                value=avg_similarity,
                details={
                    "average_similarity": avg_similarity,
                    "similarities": similarities,
                    "min_similarity": min(similarities) if similarities else 0.0,
                    "max_similarity": max(similarities) if similarities else 0.0
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class ContainmentMetric(TextMetric):
    """Text containment metric (substring matching)."""
    
    def __init__(self, case_sensitive: bool = True, **kwargs):
        super().__init__(
            name="containment", 
            description="Text containment checking", 
            case_sensitive=case_sensitive,
            **kwargs
        )
        self.case_sensitive = case_sensitive
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate containment scores."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            containments = []
            
            for pred, gt in zip(predictions, ground_truth):
                if not self.case_sensitive:
                    pred = pred.lower()
                    gt = gt.lower()
                
                # Check both directions
                pred_in_gt = pred in gt
                gt_in_pred = gt in pred
                
                # Score based on containment
                if pred == gt:
                    score = 1.0
                elif pred_in_gt or gt_in_pred:
                    score = 0.5
                else:
                    score = 0.0
                
                containments.append(score)
            
            avg_containment = sum(containments) / len(containments) if containments else 0.0
            
            return self._create_result(
                value=avg_containment,
                details={
                    "average_containment": avg_containment,
                    "containments": containments,
                    "case_sensitive": self.case_sensitive
                },
                start_time=start_time
            )
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


# Placeholder metrics for advanced NLP metrics (would require additional dependencies)
class BleuMetric(TextMetric):
    """BLEU score metric for machine translation evaluation."""
    
    def __init__(self, **kwargs):
        super().__init__(
            name="bleu", 
            description="BLEU score for translation quality",
            **kwargs
        )
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate BLEU score."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            # Simplified BLEU implementation (would need nltk or similar for full implementation)
            # For now, return similarity-based approximation
            similarity_metric = SimilarityMetric()
            result = similarity_metric.evaluate(predictions, ground_truth)
            
            # Modify result for BLEU
            if result.value is not None:
                result.name = self.name
                result.details.update({"bleu_approximation": True})
            
            return result
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class RougeMetric(TextMetric):
    """ROUGE score metric for summarization evaluation."""
    
    def __init__(self, rouge_type: str = "rouge-1", **kwargs):
        super().__init__(
            name="rouge", 
            description="ROUGE score for summarization quality",
            rouge_type=rouge_type,
            **kwargs
        )
        self.rouge_type = rouge_type
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate ROUGE score."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            # Simplified ROUGE implementation (would need rouge-score library for full implementation)
            # For now, return similarity-based approximation
            similarity_metric = SimilarityMetric()
            result = similarity_metric.evaluate(predictions, ground_truth)
            
            # Modify result for ROUGE
            if result.value is not None:
                result.name = self.name
                result.details.update({
                    "rouge_type": self.rouge_type,
                    "rouge_approximation": True
                })
            
            return result
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)


class BertScoreMetric(TextMetric):
    """BERTScore metric for semantic similarity evaluation."""
    
    def __init__(self, model: str = "bert-base-uncased", **kwargs):
        super().__init__(
            name="bertscore", 
            description="BERTScore for semantic similarity",
            model=model,
            **kwargs
        )
        self.model = model
    
    def evaluate(
        self, 
        predictions: List[Any], 
        ground_truth: List[Any],
        **kwargs
    ) -> MetricResult:
        """Calculate BERTScore."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            # Simplified BERTScore implementation (would need bert-score library for full implementation)
            # For now, return similarity-based approximation
            similarity_metric = SimilarityMetric()
            result = similarity_metric.evaluate(predictions, ground_truth)
            
            # Modify result for BERTScore
            if result.value is not None:
                result.name = self.name
                result.details.update({
                    "model": self.model,
                    "bertscore_approximation": True
                })
            
            return result
            
        except Exception as e:
            return self._create_result(error=str(e), start_time=start_time)