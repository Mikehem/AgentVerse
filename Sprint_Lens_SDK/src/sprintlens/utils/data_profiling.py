"""
Data Profiling and Analytics Dashboard for Sprint Lens SDK

This module provides comprehensive data profiling capabilities for datasets,
generating detailed insights, statistics, and quality metrics that can be
used to create interactive dashboards and reports.

Features:
- Statistical analysis and distribution profiling
- Data quality assessment and reporting
- Performance metrics and benchmarking
- Anomaly detection and outlier identification
- Trend analysis and temporal patterns
- Interactive dashboard data preparation
- Export capabilities for visualization tools
"""

import json
import math
import statistics
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import re

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Optional dependencies
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


@dataclass
class StatisticalSummary:
    """Statistical summary for numerical data."""
    
    count: int
    mean: float
    median: float
    mode: Optional[float]
    std_dev: float
    variance: float
    min_value: float
    max_value: float
    range_value: float
    quartiles: Dict[str, float]
    outliers: List[float] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "count": self.count,
            "mean": round(self.mean, 4),
            "median": self.median,
            "mode": self.mode,
            "standard_deviation": round(self.std_dev, 4),
            "variance": round(self.variance, 4),
            "minimum": self.min_value,
            "maximum": self.max_value,
            "range": self.range_value,
            "quartiles": self.quartiles,
            "outlier_count": len(self.outliers),
            "outliers": self.outliers[:10] if len(self.outliers) > 10 else self.outliers  # Limit for display
        }


@dataclass
class CategoricalSummary:
    """Statistical summary for categorical data."""
    
    count: int
    unique_count: int
    most_frequent: str
    most_frequent_count: int
    least_frequent: str
    least_frequent_count: int
    distribution: Dict[str, int]
    entropy: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "count": self.count,
            "unique_values": self.unique_count,
            "most_frequent": {
                "value": self.most_frequent,
                "count": self.most_frequent_count,
                "percentage": round((self.most_frequent_count / self.count) * 100, 2)
            },
            "least_frequent": {
                "value": self.least_frequent,
                "count": self.least_frequent_count,
                "percentage": round((self.least_frequent_count / self.count) * 100, 2)
            },
            "distribution": self.distribution,
            "entropy": round(self.entropy, 4),
            "diversity_index": round(self.unique_count / self.count, 4) if self.count > 0 else 0
        }


@dataclass
class DataQualityMetrics:
    """Data quality assessment metrics."""
    
    total_records: int
    complete_records: int
    incomplete_records: int
    duplicate_records: int
    null_count: int
    null_percentage: float
    completeness_score: float
    consistency_score: float
    validity_score: float
    overall_quality_score: float
    issues: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "total_records": self.total_records,
            "complete_records": self.complete_records,
            "incomplete_records": self.incomplete_records,
            "duplicate_records": self.duplicate_records,
            "null_count": self.null_count,
            "null_percentage": round(self.null_percentage, 2),
            "completeness_score": round(self.completeness_score, 2),
            "consistency_score": round(self.consistency_score, 2),
            "validity_score": round(self.validity_score, 2),
            "overall_quality_score": round(self.overall_quality_score, 2),
            "quality_grade": self._get_quality_grade(),
            "issues": self.issues[:10] if len(self.issues) > 10 else self.issues  # Limit for display
        }
    
    def _get_quality_grade(self) -> str:
        """Get quality grade based on overall score."""
        if self.overall_quality_score >= 90:
            return "A"
        elif self.overall_quality_score >= 80:
            return "B"
        elif self.overall_quality_score >= 70:
            return "C"
        elif self.overall_quality_score >= 60:
            return "D"
        else:
            return "F"


@dataclass
class FieldProfile:
    """Comprehensive profile for a single field."""
    
    name: str
    data_type: str
    statistical_summary: Optional[StatisticalSummary] = None
    categorical_summary: Optional[CategoricalSummary] = None
    null_count: int = 0
    null_percentage: float = 0.0
    unique_count: int = 0
    sample_values: List[Any] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    quality_issues: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        result = {
            "name": self.name,
            "data_type": self.data_type,
            "null_count": self.null_count,
            "null_percentage": round(self.null_percentage, 2),
            "unique_count": self.unique_count,
            "sample_values": self.sample_values,
            "patterns": self.patterns,
            "quality_issues": self.quality_issues
        }
        
        if self.statistical_summary:
            result["statistical_summary"] = self.statistical_summary.to_dict()
        
        if self.categorical_summary:
            result["categorical_summary"] = self.categorical_summary.to_dict()
        
        return result


@dataclass
class DatasetProfile:
    """Comprehensive dataset profile."""
    
    name: str
    total_records: int
    total_fields: int
    field_profiles: List[FieldProfile]
    data_quality: DataQualityMetrics
    correlations: Dict[str, Dict[str, float]] = field(default_factory=dict)
    temporal_patterns: Dict[str, Any] = field(default_factory=dict)
    anomalies: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "total_records": self.total_records,
            "total_fields": self.total_fields,
            "field_profiles": [fp.to_dict() for fp in self.field_profiles],
            "data_quality": self.data_quality.to_dict(),
            "correlations": self.correlations,
            "temporal_patterns": self.temporal_patterns,
            "anomalies": self.anomalies,
            "recommendations": self.recommendations,
            "created_at": self.created_at,
            "summary": {
                "quality_grade": self.data_quality._get_quality_grade(),
                "completeness": round(self.data_quality.completeness_score, 1),
                "numerical_fields": len([fp for fp in self.field_profiles if fp.statistical_summary]),
                "categorical_fields": len([fp for fp in self.field_profiles if fp.categorical_summary]),
                "high_quality_fields": len([fp for fp in self.field_profiles if len(fp.quality_issues) == 0])
            }
        }


class DataProfiler:
    """Comprehensive data profiling engine."""
    
    def __init__(self):
        self.logger = get_logger(__name__)
    
    def profile_dataset(self, data: List[Dict[str, Any]], name: str = "unnamed_dataset") -> DatasetProfile:
        """
        Generate comprehensive profile for a dataset.
        
        Args:
            data: Dataset to profile
            name: Dataset name
            
        Returns:
            DatasetProfile with complete analysis
        """
        if not data or not isinstance(data, list):
            raise ValueError("Data must be a non-empty list of dictionaries")
        
        self.logger.info(f"Starting profiling for dataset '{name}' with {len(data)} records")
        
        # Extract field information
        all_fields = set()
        for record in data:
            if isinstance(record, dict):
                all_fields.update(record.keys())
        
        field_names = sorted(list(all_fields))
        total_records = len(data)
        
        # Profile each field
        field_profiles = []
        for field_name in field_names:
            field_profile = self._profile_field(data, field_name)
            field_profiles.append(field_profile)
        
        # Assess data quality
        data_quality = self._assess_data_quality(data, field_profiles)
        
        # Calculate correlations for numerical fields
        correlations = self._calculate_correlations(data, field_profiles)
        
        # Detect temporal patterns
        temporal_patterns = self._detect_temporal_patterns(data, field_profiles)
        
        # Detect anomalies
        anomalies = self._detect_anomalies(data, field_profiles)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(field_profiles, data_quality)
        
        profile = DatasetProfile(
            name=name,
            total_records=total_records,
            total_fields=len(field_names),
            field_profiles=field_profiles,
            data_quality=data_quality,
            correlations=correlations,
            temporal_patterns=temporal_patterns,
            anomalies=anomalies,
            recommendations=recommendations
        )
        
        self.logger.info(f"Profiling completed for dataset '{name}'. Quality score: {data_quality.overall_quality_score:.1f}")
        
        return profile
    
    def _profile_field(self, data: List[Dict[str, Any]], field_name: str) -> FieldProfile:
        """Profile a single field."""
        values = []
        null_count = 0
        
        # Extract values
        for record in data:
            if isinstance(record, dict):
                value = record.get(field_name)
                if value is None or value == "":
                    null_count += 1
                else:
                    values.append(value)
        
        total_count = len(data)
        null_percentage = (null_count / total_count) * 100 if total_count > 0 else 0
        unique_count = len(set(str(v) for v in values)) if values else 0
        
        # Determine data type
        data_type = self._determine_data_type(values)
        
        # Sample values (first 10 unique values)
        sample_values = list(set(values))[:10] if values else []
        
        # Detect patterns
        patterns = self._detect_patterns(values) if values else []
        
        # Identify quality issues
        quality_issues = self._identify_quality_issues(values, field_name, null_percentage)
        
        # Generate statistical summary for numerical data
        statistical_summary = None
        if data_type in ['integer', 'float'] and values:
            try:
                numerical_values = [float(v) for v in values if self._is_numerical(v)]
                if numerical_values:
                    statistical_summary = self._calculate_statistical_summary(numerical_values)
            except (ValueError, TypeError):
                pass
        
        # Generate categorical summary for non-numerical data
        categorical_summary = None
        if data_type in ['string', 'boolean'] and values:
            categorical_summary = self._calculate_categorical_summary(values)
        
        return FieldProfile(
            name=field_name,
            data_type=data_type,
            statistical_summary=statistical_summary,
            categorical_summary=categorical_summary,
            null_count=null_count,
            null_percentage=null_percentage,
            unique_count=unique_count,
            sample_values=sample_values,
            patterns=patterns,
            quality_issues=quality_issues
        )
    
    def _determine_data_type(self, values: List[Any]) -> str:
        """Determine the most appropriate data type for values."""
        if not values:
            return "unknown"
        
        # Count type occurrences
        type_counts = defaultdict(int)
        
        for value in values:
            if isinstance(value, bool):
                type_counts['boolean'] += 1
            elif isinstance(value, int):
                type_counts['integer'] += 1
            elif isinstance(value, float):
                type_counts['float'] += 1
            elif isinstance(value, str):
                # Check if string represents a number
                if self._is_numerical(value):
                    if '.' in value:
                        type_counts['float'] += 1
                    else:
                        type_counts['integer'] += 1
                elif self._is_datetime(value):
                    type_counts['datetime'] += 1
                elif self._is_email(value):
                    type_counts['email'] += 1
                elif self._is_url(value):
                    type_counts['url'] += 1
                else:
                    type_counts['string'] += 1
            elif isinstance(value, (list, tuple)):
                type_counts['array'] += 1
            elif isinstance(value, dict):
                type_counts['object'] += 1
            else:
                type_counts['unknown'] += 1
        
        # Return most common type
        return max(type_counts, key=type_counts.get) if type_counts else "unknown"
    
    def _is_numerical(self, value: Any) -> bool:
        """Check if value can be converted to a number."""
        try:
            float(value)
            return True
        except (ValueError, TypeError):
            return False
    
    def _is_datetime(self, value: str) -> bool:
        """Check if string looks like a datetime."""
        if not isinstance(value, str):
            return False
        
        # Common datetime patterns
        datetime_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'\d{2}/\d{2}/\d{4}',  # MM/DD/YYYY
            r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}',  # ISO format
        ]
        
        return any(re.match(pattern, value) for pattern in datetime_patterns)
    
    def _is_email(self, value: str) -> bool:
        """Check if string looks like an email."""
        if not isinstance(value, str):
            return False
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, value) is not None
    
    def _is_url(self, value: str) -> bool:
        """Check if string looks like a URL."""
        if not isinstance(value, str):
            return False
        url_pattern = r'^https?:\/\/[^\s\/$.?#].[^\s]*$'
        return re.match(url_pattern, value) is not None
    
    def _calculate_statistical_summary(self, values: List[float]) -> StatisticalSummary:
        """Calculate statistical summary for numerical values."""
        if not values:
            raise ValueError("Cannot calculate statistics for empty list")
        
        values = sorted(values)
        count = len(values)
        mean_val = statistics.mean(values)
        median_val = statistics.median(values)
        
        # Mode (handle case where no mode exists)
        try:
            mode_val = statistics.mode(values)
        except statistics.StatisticsError:
            mode_val = None
        
        # Standard deviation and variance
        if count > 1:
            std_dev = statistics.stdev(values)
            variance = statistics.variance(values)
        else:
            std_dev = 0.0
            variance = 0.0
        
        min_val = min(values)
        max_val = max(values)
        range_val = max_val - min_val
        
        # Quartiles
        q1 = self._percentile(values, 25)
        q3 = self._percentile(values, 75)
        quartiles = {
            "q1": q1,
            "q2": median_val,  # Q2 is median
            "q3": q3,
            "iqr": q3 - q1
        }
        
        # Detect outliers using IQR method
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = [v for v in values if v < lower_bound or v > upper_bound]
        
        return StatisticalSummary(
            count=count,
            mean=mean_val,
            median=median_val,
            mode=mode_val,
            std_dev=std_dev,
            variance=variance,
            min_value=min_val,
            max_value=max_val,
            range_value=range_val,
            quartiles=quartiles,
            outliers=outliers
        )
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile of sorted values."""
        if not values:
            return 0.0
        
        k = (len(values) - 1) * (percentile / 100)
        f = math.floor(k)
        c = math.ceil(k)
        
        if f == c:
            return values[int(k)]
        
        d0 = values[int(f)] * (c - k)
        d1 = values[int(c)] * (k - f)
        return d0 + d1
    
    def _calculate_categorical_summary(self, values: List[Any]) -> CategoricalSummary:
        """Calculate summary for categorical values."""
        if not values:
            raise ValueError("Cannot calculate categorical summary for empty list")
        
        # Convert all values to strings for consistency
        str_values = [str(v) for v in values]
        
        count = len(str_values)
        counter = Counter(str_values)
        unique_count = len(counter)
        
        most_common = counter.most_common(1)[0]
        least_common = counter.most_common()[-1]
        
        most_frequent = most_common[0]
        most_frequent_count = most_common[1]
        least_frequent = least_common[0]
        least_frequent_count = least_common[1]
        
        # Calculate entropy (measure of diversity)
        entropy = 0.0
        for count_val in counter.values():
            probability = count_val / count
            if probability > 0:
                entropy -= probability * math.log2(probability)
        
        return CategoricalSummary(
            count=count,
            unique_count=unique_count,
            most_frequent=most_frequent,
            most_frequent_count=most_frequent_count,
            least_frequent=least_frequent,
            least_frequent_count=least_frequent_count,
            distribution=dict(counter),
            entropy=entropy
        )
    
    def _detect_patterns(self, values: List[Any]) -> List[str]:
        """Detect common patterns in string values."""
        if not values:
            return []
        
        patterns = []
        str_values = [str(v) for v in values if v is not None]
        
        if not str_values:
            return patterns
        
        # Check for common patterns
        pattern_checks = [
            (r'^\d+$', "numeric_string"),
            (r'^[A-Z]{2,3}_\d+$', "prefix_numeric"),
            (r'^\d{4}-\d{2}-\d{2}$', "date_iso"),
            (r'^\d{2}/\d{2}/\d{4}$', "date_us"),
            (r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', "email"),
            (r'^https?://', "url"),
            (r'^\+?[\d\s\-\(\)]+$', "phone"),
            (r'^[A-Z]{2,}$', "uppercase_code"),
            (r'^[a-z_]+$', "lowercase_underscore"),
        ]
        
        # Sample subset for pattern detection
        sample_size = min(100, len(str_values))
        sample_values = str_values[:sample_size]
        
        for pattern, name in pattern_checks:
            matches = sum(1 for v in sample_values if re.match(pattern, v))
            if matches / len(sample_values) > 0.8:  # 80% match threshold
                patterns.append(name)
        
        return patterns
    
    def _identify_quality_issues(self, values: List[Any], field_name: str, null_percentage: float) -> List[str]:
        """Identify data quality issues for a field."""
        issues = []
        
        # High null percentage
        if null_percentage > 50:
            issues.append(f"High null percentage ({null_percentage:.1f}%)")
        elif null_percentage > 20:
            issues.append(f"Moderate null percentage ({null_percentage:.1f}%)")
        
        if not values:
            return issues
        
        # Check for inconsistent formats
        str_values = [str(v) for v in values]
        unique_patterns = set()
        
        for value in str_values[:50]:  # Sample first 50
            # Create pattern by replacing digits and letters
            pattern = re.sub(r'\d', 'D', value)
            pattern = re.sub(r'[a-zA-Z]', 'L', pattern)
            unique_patterns.add(pattern)
        
        if len(unique_patterns) > len(str_values) * 0.5:
            issues.append("Inconsistent format patterns detected")
        
        # Check for potential duplicates (case-insensitive)
        lower_values = [str(v).lower().strip() for v in values]
        if len(set(lower_values)) < len(lower_values) * 0.95:
            issues.append("Potential duplicate values detected")
        
        # Check for extreme outliers in text length (for string fields)
        if all(isinstance(v, str) for v in values):
            lengths = [len(str(v)) for v in values]
            if lengths:
                avg_length = sum(lengths) / len(lengths)
                max_length = max(lengths)
                if max_length > avg_length * 10:
                    issues.append("Extreme length variations detected")
        
        return issues
    
    def _assess_data_quality(self, data: List[Dict[str, Any]], field_profiles: List[FieldProfile]) -> DataQualityMetrics:
        """Assess overall data quality."""
        total_records = len(data)
        
        if total_records == 0:
            return DataQualityMetrics(
                total_records=0,
                complete_records=0,
                incomplete_records=0,
                duplicate_records=0,
                null_count=0,
                null_percentage=0,
                completeness_score=0,
                consistency_score=0,
                validity_score=0,
                overall_quality_score=0
            )
        
        # Calculate completeness
        total_null_count = sum(fp.null_count for fp in field_profiles)
        total_possible_values = total_records * len(field_profiles)
        null_percentage = (total_null_count / total_possible_values) * 100 if total_possible_values > 0 else 0
        completeness_score = max(0, 100 - null_percentage)
        
        # Calculate complete records
        complete_records = 0
        for record in data:
            if isinstance(record, dict) and all(record.get(fp.name) is not None for fp in field_profiles):
                complete_records += 1
        
        incomplete_records = total_records - complete_records
        
        # Detect duplicates (simplified)
        record_hashes = []
        for record in data:
            if isinstance(record, dict):
                # Create hash of record values
                record_str = json.dumps(record, sort_keys=True, default=str)
                record_hashes.append(record_str)
        
        duplicate_records = len(record_hashes) - len(set(record_hashes))
        
        # Calculate consistency score
        consistency_issues = sum(len(fp.quality_issues) for fp in field_profiles)
        max_possible_issues = len(field_profiles) * 3  # Assume max 3 issues per field
        consistency_score = max(0, 100 - (consistency_issues / max_possible_issues) * 100) if max_possible_issues > 0 else 100
        
        # Calculate validity score (based on data type consistency)
        validity_issues = 0
        for fp in field_profiles:
            if fp.data_type == "unknown":
                validity_issues += 1
            if "Inconsistent format" in "\n".join(fp.quality_issues):
                validity_issues += 1
        
        validity_score = max(0, 100 - (validity_issues / len(field_profiles)) * 100) if field_profiles else 100
        
        # Overall quality score (weighted average)
        overall_quality_score = (
            completeness_score * 0.4 +
            consistency_score * 0.3 +
            validity_score * 0.3
        )
        
        # Collect quality issues
        issues = []
        if null_percentage > 20:
            issues.append({"type": "completeness", "message": f"High null percentage: {null_percentage:.1f}%"})
        
        if duplicate_records > 0:
            issues.append({"type": "uniqueness", "message": f"Duplicate records found: {duplicate_records}"})
        
        for fp in field_profiles:
            for issue in fp.quality_issues:
                issues.append({"type": "consistency", "field": fp.name, "message": issue})
        
        return DataQualityMetrics(
            total_records=total_records,
            complete_records=complete_records,
            incomplete_records=incomplete_records,
            duplicate_records=duplicate_records,
            null_count=total_null_count,
            null_percentage=null_percentage,
            completeness_score=completeness_score,
            consistency_score=consistency_score,
            validity_score=validity_score,
            overall_quality_score=overall_quality_score,
            issues=issues
        )
    
    def _calculate_correlations(self, data: List[Dict[str, Any]], field_profiles: List[FieldProfile]) -> Dict[str, Dict[str, float]]:
        """Calculate correlations between numerical fields."""
        correlations = {}
        
        # Get numerical fields
        numerical_fields = [fp for fp in field_profiles if fp.statistical_summary is not None]
        
        if len(numerical_fields) < 2:
            return correlations
        
        # Extract numerical data
        field_data = {}
        for field in numerical_fields:
            values = []
            for record in data:
                if isinstance(record, dict):
                    value = record.get(field.name)
                    if value is not None and self._is_numerical(value):
                        values.append(float(value))
                    else:
                        values.append(None)
            field_data[field.name] = values
        
        # Calculate pairwise correlations
        for i, field1 in enumerate(numerical_fields):
            correlations[field1.name] = {}
            for j, field2 in enumerate(numerical_fields):
                if i != j:
                    correlation = self._pearson_correlation(
                        field_data[field1.name],
                        field_data[field2.name]
                    )
                    correlations[field1.name][field2.name] = correlation
        
        return correlations
    
    def _pearson_correlation(self, x: List[Optional[float]], y: List[Optional[float]]) -> float:
        """Calculate Pearson correlation coefficient."""
        if len(x) != len(y):
            return 0.0
        
        # Filter out None values
        pairs = [(xi, yi) for xi, yi in zip(x, y) if xi is not None and yi is not None]
        
        if len(pairs) < 2:
            return 0.0
        
        x_clean, y_clean = zip(*pairs)
        
        try:
            if NUMPY_AVAILABLE:
                correlation_matrix = np.corrcoef(x_clean, y_clean)
                return float(correlation_matrix[0, 1])
            else:
                # Manual calculation
                n = len(x_clean)
                mean_x = sum(x_clean) / n
                mean_y = sum(y_clean) / n
                
                numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x_clean, y_clean))
                sum_sq_x = sum((xi - mean_x) ** 2 for xi in x_clean)
                sum_sq_y = sum((yi - mean_y) ** 2 for yi in y_clean)
                
                denominator = math.sqrt(sum_sq_x * sum_sq_y)
                
                return numerator / denominator if denominator != 0 else 0.0
        except (ValueError, ZeroDivisionError):
            return 0.0
    
    def _detect_temporal_patterns(self, data: List[Dict[str, Any]], field_profiles: List[FieldProfile]) -> Dict[str, Any]:
        """Detect temporal patterns in datetime fields."""
        temporal_patterns = {}
        
        # Find datetime fields
        datetime_fields = [fp for fp in field_profiles if fp.data_type == "datetime"]
        
        for field in datetime_fields:
            patterns = self._analyze_temporal_field(data, field.name)
            if patterns:
                temporal_patterns[field.name] = patterns
        
        return temporal_patterns
    
    def _analyze_temporal_field(self, data: List[Dict[str, Any]], field_name: str) -> Dict[str, Any]:
        """Analyze temporal patterns in a datetime field."""
        # This is a simplified implementation
        # In a real implementation, you would parse dates and analyze trends
        
        dates = []
        for record in data:
            if isinstance(record, dict):
                value = record.get(field_name)
                if value and self._is_datetime(str(value)):
                    dates.append(str(value))
        
        if not dates:
            return {}
        
        return {
            "date_range": {
                "earliest": min(dates),
                "latest": max(dates),
                "span_days": "unknown"  # Would calculate actual span
            },
            "frequency_analysis": "not_implemented",
            "seasonality": "not_detected"
        }
    
    def _detect_anomalies(self, data: List[Dict[str, Any]], field_profiles: List[FieldProfile]) -> List[Dict[str, Any]]:
        """Detect anomalies in the dataset."""
        anomalies = []
        
        # Check for statistical outliers in numerical fields
        for field_profile in field_profiles:
            if field_profile.statistical_summary and field_profile.statistical_summary.outliers:
                anomalies.append({
                    "type": "statistical_outlier",
                    "field": field_profile.name,
                    "count": len(field_profile.statistical_summary.outliers),
                    "values": field_profile.statistical_summary.outliers[:5]  # Show first 5
                })
        
        # Check for unusual patterns
        for field_profile in field_profiles:
            if "Extreme length variations" in field_profile.quality_issues:
                anomalies.append({
                    "type": "length_anomaly",
                    "field": field_profile.name,
                    "description": "Extreme variations in text length detected"
                })
        
        return anomalies
    
    def _generate_recommendations(self, field_profiles: List[FieldProfile], data_quality: DataQualityMetrics) -> List[str]:
        """Generate recommendations for data improvement."""
        recommendations = []
        
        # Quality-based recommendations
        if data_quality.overall_quality_score < 70:
            recommendations.append("Overall data quality is below acceptable threshold. Consider data cleaning.")
        
        if data_quality.null_percentage > 30:
            recommendations.append("High percentage of missing values. Consider imputation strategies or data collection improvements.")
        
        if data_quality.duplicate_records > 0:
            recommendations.append("Duplicate records detected. Consider deduplication process.")
        
        # Field-specific recommendations
        for field_profile in field_profiles:
            if field_profile.null_percentage > 50:
                recommendations.append(f"Field '{field_profile.name}' has high missing values. Consider making it optional or improving data collection.")
            
            if "Inconsistent format" in "\n".join(field_profile.quality_issues):
                recommendations.append(f"Field '{field_profile.name}' has inconsistent formats. Consider data standardization.")
            
            if field_profile.data_type == "unknown":
                recommendations.append(f"Field '{field_profile.name}' has unclear data type. Consider data type validation.")
        
        # Performance recommendations
        numerical_fields = [fp for fp in field_profiles if fp.statistical_summary]
        if len(numerical_fields) > 1:
            recommendations.append("Multiple numerical fields detected. Consider correlation analysis for feature engineering.")
        
        return recommendations


def create_dashboard_data(profile: DatasetProfile) -> Dict[str, Any]:
    """
    Create dashboard-ready data structure from dataset profile.
    
    Args:
        profile: DatasetProfile to convert
        
    Returns:
        Dictionary optimized for dashboard visualization
    """
    dashboard_data = {
        "overview": {
            "dataset_name": profile.name,
            "total_records": profile.total_records,
            "total_fields": profile.total_fields,
            "quality_score": profile.data_quality.overall_quality_score,
            "quality_grade": profile.data_quality._get_quality_grade(),
            "created_at": profile.created_at
        },
        
        "quality_metrics": {
            "completeness": profile.data_quality.completeness_score,
            "consistency": profile.data_quality.consistency_score,
            "validity": profile.data_quality.validity_score,
            "overall": profile.data_quality.overall_quality_score,
            "issues_count": len(profile.data_quality.issues),
            "duplicate_records": profile.data_quality.duplicate_records
        },
        
        "field_summary": {
            "numerical_fields": len([fp for fp in profile.field_profiles if fp.statistical_summary]),
            "categorical_fields": len([fp for fp in profile.field_profiles if fp.categorical_summary]),
            "datetime_fields": len([fp for fp in profile.field_profiles if fp.data_type == "datetime"]),
            "high_quality_fields": len([fp for fp in profile.field_profiles if len(fp.quality_issues) == 0])
        },
        
        "data_distribution": [
            {
                "field": fp.name,
                "type": fp.data_type,
                "null_percentage": fp.null_percentage,
                "unique_count": fp.unique_count,
                "quality_issues": len(fp.quality_issues)
            }
            for fp in profile.field_profiles
        ],
        
        "recommendations": profile.recommendations,
        "anomalies": profile.anomalies,
        
        "charts": {
            "quality_breakdown": {
                "type": "donut",
                "data": [
                    {"label": "Complete", "value": profile.data_quality.complete_records},
                    {"label": "Incomplete", "value": profile.data_quality.incomplete_records}
                ]
            },
            
            "field_types": {
                "type": "bar",
                "data": [
                    {"label": "Numerical", "value": len([fp for fp in profile.field_profiles if fp.statistical_summary])},
                    {"label": "Categorical", "value": len([fp for fp in profile.field_profiles if fp.categorical_summary])},
                    {"label": "DateTime", "value": len([fp for fp in profile.field_profiles if fp.data_type == "datetime"])},
                    {"label": "Other", "value": len([fp for fp in profile.field_profiles if fp.data_type not in ["datetime"] and not fp.statistical_summary and not fp.categorical_summary])}
                ]
            }
        }
    }
    
    return dashboard_data