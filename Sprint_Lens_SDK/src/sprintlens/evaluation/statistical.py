"""
Statistical analysis utilities for Sprint Lens evaluation results.

This module provides tools for analyzing evaluation results, computing
statistical significance, and generating insights from evaluation data.
"""

import math
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
import statistics

from .evaluator import EvaluationResult
from .batch import BatchResult
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class StatisticalTest:
    """Result of a statistical test."""
    
    test_name: str
    test_statistic: float
    p_value: float
    significant: bool
    confidence_level: float
    effect_size: Optional[float] = None
    description: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "test_name": self.test_name,
            "test_statistic": self.test_statistic,
            "p_value": self.p_value,
            "significant": self.significant,
            "confidence_level": self.confidence_level,
            "effect_size": self.effect_size,
            "description": self.description
        }


@dataclass
class DescriptiveStats:
    """Descriptive statistics for a dataset."""
    
    count: int
    mean: float
    median: float
    std_dev: float
    variance: float
    min_value: float
    max_value: float
    q1: float  # 25th percentile
    q3: float  # 75th percentile
    iqr: float  # Interquartile range
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "count": self.count,
            "mean": self.mean,
            "median": self.median,
            "std_dev": self.std_dev,
            "variance": self.variance,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "q1": self.q1,
            "q3": self.q3,
            "iqr": self.iqr,
            "skewness": self.skewness,
            "kurtosis": self.kurtosis
        }


@dataclass
class ComparisonAnalysis:
    """Analysis comparing two sets of evaluation results."""
    
    name1: str
    name2: str
    stats1: DescriptiveStats
    stats2: DescriptiveStats
    statistical_tests: List[StatisticalTest] = field(default_factory=list)
    confidence_interval_diff: Optional[Tuple[float, float]] = None
    effect_size: Optional[float] = None
    interpretation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name1": self.name1,
            "name2": self.name2,
            "stats1": self.stats1.to_dict(),
            "stats2": self.stats2.to_dict(),
            "statistical_tests": [test.to_dict() for test in self.statistical_tests],
            "confidence_interval_diff": self.confidence_interval_diff,
            "effect_size": self.effect_size,
            "interpretation": self.interpretation
        }


class StatisticalAnalyzer:
    """
    Statistical analyzer for evaluation results.
    
    Provides comprehensive statistical analysis capabilities including:
    - Descriptive statistics
    - Statistical significance testing
    - Effect size calculation
    - Confidence intervals
    - Comparative analysis
    """
    
    def __init__(self, confidence_level: float = 0.95):
        """
        Initialize statistical analyzer.
        
        Args:
            confidence_level: Confidence level for statistical tests and intervals
        """
        self.confidence_level = confidence_level
        self.alpha = 1.0 - confidence_level
        
        logger.debug(f"Initialized statistical analyzer with confidence level {confidence_level}")
    
    def compute_descriptive_stats(self, values: List[float]) -> DescriptiveStats:
        """
        Compute descriptive statistics for a list of values.
        
        Args:
            values: List of numeric values
            
        Returns:
            DescriptiveStats object with computed statistics
        """
        if not values:
            raise ValueError("Cannot compute statistics for empty list")
        
        # Remove None values
        clean_values = [v for v in values if v is not None]
        
        if not clean_values:
            raise ValueError("No valid values found after removing None values")
        
        # Sort for percentile calculations
        sorted_values = sorted(clean_values)
        n = len(clean_values)
        
        # Basic statistics
        mean_val = statistics.mean(clean_values)
        median_val = statistics.median(clean_values)
        std_dev = statistics.stdev(clean_values) if n > 1 else 0.0
        variance = statistics.variance(clean_values) if n > 1 else 0.0
        
        # Percentiles
        q1 = self._percentile(sorted_values, 0.25)
        q3 = self._percentile(sorted_values, 0.75)
        iqr = q3 - q1
        
        # Higher-order moments (optional, simplified implementation)
        skewness = self._compute_skewness(clean_values, mean_val, std_dev) if n > 2 else None
        kurtosis = self._compute_kurtosis(clean_values, mean_val, std_dev) if n > 3 else None
        
        return DescriptiveStats(
            count=n,
            mean=mean_val,
            median=median_val,
            std_dev=std_dev,
            variance=variance,
            min_value=min(clean_values),
            max_value=max(clean_values),
            q1=q1,
            q3=q3,
            iqr=iqr,
            skewness=skewness,
            kurtosis=kurtosis
        )
    
    def _percentile(self, sorted_values: List[float], percentile: float) -> float:
        """Compute percentile for sorted values."""
        if not sorted_values:
            return 0.0
        
        k = (len(sorted_values) - 1) * percentile
        f = math.floor(k)
        c = math.ceil(k)
        
        if f == c:
            return sorted_values[int(k)]
        
        d0 = sorted_values[int(f)] * (c - k)
        d1 = sorted_values[int(c)] * (k - f)
        return d0 + d1
    
    def _compute_skewness(self, values: List[float], mean_val: float, std_dev: float) -> float:
        """Compute skewness (third moment)."""
        if std_dev == 0:
            return 0.0
        
        n = len(values)
        skewness = sum(((x - mean_val) / std_dev) ** 3 for x in values) / n
        return skewness
    
    def _compute_kurtosis(self, values: List[float], mean_val: float, std_dev: float) -> float:
        """Compute kurtosis (fourth moment)."""
        if std_dev == 0:
            return 0.0
        
        n = len(values)
        kurtosis = sum(((x - mean_val) / std_dev) ** 4 for x in values) / n
        return kurtosis - 3.0  # Excess kurtosis (subtract 3 for normal distribution)
    
    def t_test_one_sample(
        self, 
        values: List[float], 
        null_hypothesis_mean: float = 0.0
    ) -> StatisticalTest:
        """
        Perform one-sample t-test.
        
        Args:
            values: Sample values
            null_hypothesis_mean: Mean value to test against
            
        Returns:
            StatisticalTest result
        """
        clean_values = [v for v in values if v is not None]
        
        if len(clean_values) < 2:
            return StatisticalTest(
                test_name="One-sample t-test",
                test_statistic=0.0,
                p_value=1.0,
                significant=False,
                confidence_level=self.confidence_level,
                description="Insufficient data for t-test"
            )
        
        mean_val = statistics.mean(clean_values)
        std_dev = statistics.stdev(clean_values)
        n = len(clean_values)
        
        # Calculate t-statistic
        if std_dev == 0:
            t_stat = float('inf') if mean_val != null_hypothesis_mean else 0.0
        else:
            t_stat = (mean_val - null_hypothesis_mean) / (std_dev / math.sqrt(n))
        
        # Approximate p-value using normal distribution (for large n)
        # For small n, this is less accurate but still provides guidance
        if abs(t_stat) == float('inf'):
            p_value = 0.0
        else:
            # Two-tailed test
            p_value = 2 * (1 - self._normal_cdf(abs(t_stat)))
        
        significant = p_value < self.alpha
        
        # Effect size (Cohen's d)
        effect_size = abs(t_stat) / math.sqrt(n) if n > 0 else 0.0
        
        return StatisticalTest(
            test_name="One-sample t-test",
            test_statistic=t_stat,
            p_value=p_value,
            significant=significant,
            confidence_level=self.confidence_level,
            effect_size=effect_size,
            description=f"Testing if mean differs from {null_hypothesis_mean}"
        )
    
    def t_test_two_sample(
        self, 
        values1: List[float], 
        values2: List[float],
        equal_variance: bool = False
    ) -> StatisticalTest:
        """
        Perform two-sample t-test.
        
        Args:
            values1: First sample
            values2: Second sample
            equal_variance: Whether to assume equal variance
            
        Returns:
            StatisticalTest result
        """
        clean_values1 = [v for v in values1 if v is not None]
        clean_values2 = [v for v in values2 if v is not None]
        
        if len(clean_values1) < 2 or len(clean_values2) < 2:
            return StatisticalTest(
                test_name="Two-sample t-test",
                test_statistic=0.0,
                p_value=1.0,
                significant=False,
                confidence_level=self.confidence_level,
                description="Insufficient data for two-sample t-test"
            )
        
        mean1 = statistics.mean(clean_values1)
        mean2 = statistics.mean(clean_values2)
        std1 = statistics.stdev(clean_values1)
        std2 = statistics.stdev(clean_values2)
        n1 = len(clean_values1)
        n2 = len(clean_values2)
        
        # Calculate t-statistic and degrees of freedom
        if equal_variance:
            # Pooled standard error
            pooled_std = math.sqrt(((n1 - 1) * std1**2 + (n2 - 1) * std2**2) / (n1 + n2 - 2))
            std_error = pooled_std * math.sqrt(1/n1 + 1/n2)
            df = n1 + n2 - 2
        else:
            # Welch's t-test
            std_error = math.sqrt(std1**2/n1 + std2**2/n2)
            if std_error == 0:
                t_stat = 0.0 if mean1 == mean2 else float('inf')
                p_value = 1.0 if mean1 == mean2 else 0.0
            else:
                # Welch-Satterthwaite equation for degrees of freedom
                df = (std1**2/n1 + std2**2/n2)**2 / (
                    (std1**2/n1)**2/(n1-1) + (std2**2/n2)**2/(n2-1)
                )
        
        if std_error > 0:
            t_stat = (mean1 - mean2) / std_error
            # Approximate p-value
            p_value = 2 * (1 - self._normal_cdf(abs(t_stat)))
        else:
            t_stat = 0.0 if mean1 == mean2 else float('inf')
            p_value = 1.0 if mean1 == mean2 else 0.0
        
        significant = p_value < self.alpha
        
        # Effect size (Cohen's d)
        pooled_std_for_effect = math.sqrt((std1**2 + std2**2) / 2)
        effect_size = abs(mean1 - mean2) / pooled_std_for_effect if pooled_std_for_effect > 0 else 0.0
        
        test_type = "Welch's t-test" if not equal_variance else "Student's t-test"
        
        return StatisticalTest(
            test_name=test_type,
            test_statistic=t_stat,
            p_value=p_value,
            significant=significant,
            confidence_level=self.confidence_level,
            effect_size=effect_size,
            description=f"Comparing means of two independent samples"
        )
    
    def _normal_cdf(self, x: float) -> float:
        """Approximate cumulative distribution function for standard normal."""
        # Using approximation for standard normal CDF
        if x < -8:
            return 0.0
        if x > 8:
            return 1.0
        
        # Abramowitz and Stegun approximation
        a1 = 0.254829592
        a2 = -0.284496736
        a3 = 1.421413741
        a4 = -1.453152027
        a5 = 1.061405429
        p = 0.3275911
        
        sign = 1 if x >= 0 else -1
        x = abs(x)
        
        t = 1.0 / (1.0 + p * x)
        y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
        
        return 0.5 * (1.0 + sign * y)
    
    def confidence_interval_mean(
        self, 
        values: List[float],
        confidence_level: Optional[float] = None
    ) -> Tuple[float, float]:
        """
        Compute confidence interval for the mean.
        
        Args:
            values: Sample values
            confidence_level: Confidence level (uses instance default if None)
            
        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        clean_values = [v for v in values if v is not None]
        
        if len(clean_values) < 2:
            mean_val = clean_values[0] if clean_values else 0.0
            return (mean_val, mean_val)
        
        conf_level = confidence_level or self.confidence_level
        alpha = 1.0 - conf_level
        
        mean_val = statistics.mean(clean_values)
        std_dev = statistics.stdev(clean_values)
        n = len(clean_values)
        
        # Use t-distribution critical value (approximated as z for large n)
        # For n > 30, t-distribution is approximately normal
        z_score = 1.96 if conf_level == 0.95 else 2.576  # 95% or 99% confidence
        
        margin_error = z_score * (std_dev / math.sqrt(n))
        
        return (mean_val - margin_error, mean_val + margin_error)
    
    def compare_evaluation_results(
        self, 
        results1: List[EvaluationResult],
        results2: List[EvaluationResult],
        metric_name: str,
        name1: str = "Model 1",
        name2: str = "Model 2"
    ) -> ComparisonAnalysis:
        """
        Compare evaluation results between two models/systems.
        
        Args:
            results1: First set of evaluation results
            results2: Second set of evaluation results
            metric_name: Name of metric to compare
            name1: Name for first model/system
            name2: Name for second model/system
            
        Returns:
            ComparisonAnalysis with detailed comparison
        """
        # Extract metric scores
        scores1 = [r.get_metric_score(metric_name) for r in results1]
        scores2 = [r.get_metric_score(metric_name) for r in results2]
        
        # Clean scores
        clean_scores1 = [s for s in scores1 if s is not None]
        clean_scores2 = [s for s in scores2 if s is not None]
        
        if not clean_scores1 or not clean_scores2:
            raise ValueError("No valid scores found for comparison")
        
        # Compute descriptive statistics
        stats1 = self.compute_descriptive_stats(clean_scores1)
        stats2 = self.compute_descriptive_stats(clean_scores2)
        
        # Perform statistical tests
        statistical_tests = []
        
        # Two-sample t-test
        t_test = self.t_test_two_sample(clean_scores1, clean_scores2)
        statistical_tests.append(t_test)
        
        # Confidence interval for difference of means
        diff_scores = [s1 - s2 for s1, s2 in zip(clean_scores1[:min(len(clean_scores1), len(clean_scores2))], 
                                                   clean_scores2[:min(len(clean_scores1), len(clean_scores2))])]
        
        if len(diff_scores) > 1:
            ci_diff = self.confidence_interval_mean(diff_scores)
        else:
            ci_diff = None
        
        # Effect size (Cohen's d)
        pooled_std = math.sqrt((stats1.variance + stats2.variance) / 2)
        effect_size = abs(stats1.mean - stats2.mean) / pooled_std if pooled_std > 0 else 0.0
        
        # Generate interpretation
        interpretation = self._interpret_comparison(stats1, stats2, statistical_tests, effect_size)
        
        return ComparisonAnalysis(
            name1=name1,
            name2=name2,
            stats1=stats1,
            stats2=stats2,
            statistical_tests=statistical_tests,
            confidence_interval_diff=ci_diff,
            effect_size=effect_size,
            interpretation=interpretation
        )
    
    def _interpret_comparison(
        self, 
        stats1: DescriptiveStats, 
        stats2: DescriptiveStats,
        tests: List[StatisticalTest],
        effect_size: float
    ) -> str:
        """Generate human-readable interpretation of comparison."""
        interpretation_parts = []
        
        # Mean comparison
        diff = stats1.mean - stats2.mean
        better_model = "Model 1" if diff > 0 else "Model 2"
        
        interpretation_parts.append(f"{better_model} has a higher mean score ({stats1.mean:.3f} vs {stats2.mean:.3f})")
        
        # Statistical significance
        significant_tests = [t for t in tests if t.significant]
        if significant_tests:
            interpretation_parts.append("The difference is statistically significant")
        else:
            interpretation_parts.append("The difference is not statistically significant")
        
        # Effect size interpretation
        if effect_size < 0.2:
            effect_desc = "negligible"
        elif effect_size < 0.5:
            effect_desc = "small"
        elif effect_size < 0.8:
            effect_desc = "medium"
        else:
            effect_desc = "large"
        
        interpretation_parts.append(f"Effect size is {effect_desc} (Cohen's d = {effect_size:.3f})")
        
        return ". ".join(interpretation_parts) + "."
    
    def analyze_batch_result(self, batch_result: BatchResult) -> Dict[str, Any]:
        """
        Analyze a batch evaluation result.
        
        Args:
            batch_result: BatchResult to analyze
            
        Returns:
            Dictionary with comprehensive analysis
        """
        analysis = {
            "basic_stats": {
                "total_items": batch_result.total_items,
                "success_rate": batch_result.success_rate,
                "duration_ms": batch_result.duration_ms
            },
            "metric_analyses": {},
            "performance_insights": []
        }
        
        # Analyze each metric
        for metric_name in batch_result.aggregated_metrics.keys():
            if metric_name == "overall_score":
                continue
                
            scores = batch_result.get_metric_scores(metric_name)
            clean_scores = [s for s in scores if s is not None]
            
            if clean_scores:
                stats = self.compute_descriptive_stats(clean_scores)
                
                # One-sample t-test against 0.5 (neutral performance)
                t_test = self.t_test_one_sample(clean_scores, 0.5)
                
                analysis["metric_analyses"][metric_name] = {
                    "descriptive_stats": stats.to_dict(),
                    "statistical_test": t_test.to_dict(),
                    "interpretation": self._interpret_metric_performance(stats, t_test)
                }
        
        # Generate performance insights
        analysis["performance_insights"] = self._generate_performance_insights(batch_result, analysis)
        
        return analysis
    
    def _interpret_metric_performance(
        self, 
        stats: DescriptiveStats, 
        t_test: StatisticalTest
    ) -> str:
        """Interpret performance for a single metric."""
        interpretation_parts = []
        
        # Performance level
        if stats.mean >= 0.8:
            performance = "excellent"
        elif stats.mean >= 0.6:
            performance = "good"
        elif stats.mean >= 0.4:
            performance = "moderate"
        else:
            performance = "poor"
        
        interpretation_parts.append(f"Performance is {performance} (mean = {stats.mean:.3f})")
        
        # Consistency
        cv = stats.std_dev / stats.mean if stats.mean > 0 else float('inf')
        if cv < 0.1:
            consistency = "highly consistent"
        elif cv < 0.3:
            consistency = "moderately consistent"
        else:
            consistency = "inconsistent"
        
        interpretation_parts.append(f"Results are {consistency} (CV = {cv:.3f})")
        
        # Statistical significance vs neutral
        if t_test.significant:
            direction = "above" if stats.mean > 0.5 else "below"
            interpretation_parts.append(f"Performance is significantly {direction} neutral (p < {1-t_test.confidence_level})")
        
        return ". ".join(interpretation_parts) + "."
    
    def _generate_performance_insights(
        self, 
        batch_result: BatchResult, 
        analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable performance insights."""
        insights = []
        
        # Overall success rate insight
        if batch_result.success_rate < 95:
            insights.append(f"Success rate is {batch_result.success_rate:.1f}% - consider investigating failed evaluations")
        
        # Metric performance insights
        metric_means = []
        for metric_name, metric_analysis in analysis["metric_analyses"].items():
            mean_score = metric_analysis["descriptive_stats"]["mean"]
            metric_means.append((metric_name, mean_score))
        
        if metric_means:
            # Best performing metric
            best_metric = max(metric_means, key=lambda x: x[1])
            worst_metric = min(metric_means, key=lambda x: x[1])
            
            insights.append(f"Best performing metric: {best_metric[0]} ({best_metric[1]:.3f})")
            insights.append(f"Worst performing metric: {worst_metric[0]} ({worst_metric[1]:.3f})")
            
            # Performance gap
            gap = best_metric[1] - worst_metric[1]
            if gap > 0.2:
                insights.append(f"Large performance gap ({gap:.3f}) between metrics - consider targeted improvements")
        
        return insights