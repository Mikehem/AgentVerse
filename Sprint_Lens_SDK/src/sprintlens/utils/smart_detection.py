"""
Smart Column Detection for Sprint Lens SDK

This module provides intelligent column type detection and mapping suggestions
for dataset imports. It analyzes column names, data patterns, and content
to automatically suggest appropriate mappings for prediction, ground_truth,
context, and metadata fields.

Features:
- Column name pattern matching
- Data type and content analysis
- Statistical pattern recognition
- Confidence scoring for suggestions
- Support for multiple languages and naming conventions
"""

import re
import statistics
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from collections import Counter

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Optional pandas dependency
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False


@dataclass
class ColumnSuggestion:
    """Represents a suggestion for column mapping."""
    
    column_name: str
    suggested_type: str  # 'prediction', 'ground_truth', 'context', 'id', 'metadata'
    confidence: float  # 0.0 to 1.0
    reasoning: str
    alternative_types: List[Tuple[str, float]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "column_name": self.column_name,
            "suggested_type": self.suggested_type,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "alternative_types": self.alternative_types
        }


@dataclass 
class DetectionResult:
    """Results from smart column detection."""
    
    suggestions: List[ColumnSuggestion]
    prediction_col: Optional[str] = None
    ground_truth_col: Optional[str] = None
    context_col: Optional[str] = None
    id_col: Optional[str] = None
    metadata_cols: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "suggestions": [s.to_dict() for s in self.suggestions],
            "prediction_col": self.prediction_col,
            "ground_truth_col": self.ground_truth_col,
            "context_col": self.context_col,
            "id_col": self.id_col,
            "metadata_cols": self.metadata_cols,
            "confidence_score": self.confidence_score
        }


class SmartColumnDetector:
    """
    Intelligent column detection for dataset imports.
    
    Analyzes column names, data types, and content patterns to suggest
    appropriate column mappings for dataset creation.
    """
    
    def __init__(self):
        """Initialize the smart column detector."""
        self._init_patterns()
    
    def _init_patterns(self):
        """Initialize regex patterns for column name matching."""
        
        # Prediction column patterns
        self.prediction_patterns = [
            r'pred(?:iction)?s?$',
            r'output(?:s)?$',
            r'result(?:s)?$',
            r'answer(?:s)?$',
            r'response(?:s)?$',
            r'model_(?:output|prediction|result)$',
            r'predicted?_(?:value|label|class)$',
            r'ai_(?:output|response)$',
            r'generated?_(?:text|response)$',
            r'classification$',
            r'sentiment$',
            r'category$',
            r'class(?:_?label)?$',
            r'y_pred$',
            r'inference$'
        ]
        
        # Ground truth column patterns
        self.ground_truth_patterns = [
            r'ground[_\s]?truth$',
            r'true[_\s]?(?:value|label|class)$',
            r'actual[_\s]?(?:value|label|class)?$',
            r'correct[_\s]?(?:answer|label|class)?$',
            r'target(?:s)?$',
            r'label(?:s)?$',
            r'truth$',
            r'expected[_\s]?(?:value|output|result)?$',
            r'reference[_\s]?(?:value|answer)?$',
            r'gold[_\s]?(?:standard|label)?$',
            r'annotation(?:s)?$',
            r'y[_\s]?true$',
            r'gt$',
            r'baseline$'
        ]
        
        # Context column patterns  
        self.context_patterns = [
            r'context$',
            r'text$',
            r'content$',
            r'message$',
            r'input[_\s]?(?:text|data)?$',
            r'prompt$',
            r'query$',
            r'question$',
            r'document$',
            r'passage$',
            r'sentence$',
            r'utterance$',
            r'review$',
            r'comment$',
            r'description$',
            r'summary$',
            r'body$',
            r'raw[_\s]?(?:text|data)$'
        ]
        
        # ID column patterns
        self.id_patterns = [
            r'^id$',
            r'.*[_\s]?id$',
            r'index$',
            r'idx$',
            r'key$',
            r'identifier$',
            r'uid$',
            r'uuid$',
            r'row[_\s]?(?:id|num|number)$',
            r'item[_\s]?(?:id|num|number)$',
            r'sample[_\s]?(?:id|num|number)$',
            r'record[_\s]?(?:id|num|number)$'
        ]
        
        # Metadata indicators (these suggest the column contains metadata)
        self.metadata_indicators = [
            r'confidence$',
            r'score$',
            r'probability$',
            r'weight$',
            r'version$',
            r'model[_\s]?(?:name|version|type)$',
            r'timestamp$',
            r'created[_\s]?(?:at|date|time)$',
            r'updated[_\s]?(?:at|date|time)$',
            r'source$',
            r'origin$',
            r'batch[_\s]?(?:id|num|number)$',
            r'experiment[_\s]?(?:id|name)$',
            r'run[_\s]?(?:id|name|number)$',
            r'tags?$',
            r'metadata$',
            r'properties$',
            r'attributes$',
            r'features?$'
        ]
    
    def detect_columns(self, data: Union[List[Dict], Any]) -> DetectionResult:
        """
        Detect column types for the given data.
        
        Args:
            data: Either a list of dictionaries or a pandas DataFrame
            
        Returns:
            DetectionResult with suggestions and mappings
        """
        if PANDAS_AVAILABLE and isinstance(data, pd.DataFrame):
            return self._detect_from_dataframe(data)
        elif isinstance(data, list) and data and isinstance(data[0], dict):
            return self._detect_from_dict_list(data)
        else:
            raise ValueError("Data must be a pandas DataFrame or list of dictionaries")
    
    def _detect_from_dataframe(self, df) -> DetectionResult:
        """Detect columns from a pandas DataFrame."""
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame analysis")
        
        columns = list(df.columns)
        sample_data = {}
        
        # Get sample data for each column
        for col in columns:
            sample_values = df[col].dropna().head(10).tolist()
            sample_data[col] = sample_values
        
        return self._analyze_columns(columns, sample_data)
    
    def _detect_from_dict_list(self, data: List[Dict]) -> DetectionResult:
        """Detect columns from a list of dictionaries."""
        if not data:
            return DetectionResult(suggestions=[])
        
        # Get all unique keys
        columns = set()
        for item in data:
            columns.update(item.keys())
        columns = list(columns)
        
        # Get sample data for each column
        sample_data = {}
        for col in columns:
            sample_values = []
            for item in data[:10]:  # Sample first 10 items
                if col in item and item[col] is not None:
                    sample_values.append(item[col])
            sample_data[col] = sample_values
        
        return self._analyze_columns(columns, sample_data)
    
    def _analyze_columns(self, columns: List[str], sample_data: Dict[str, List]) -> DetectionResult:
        """Analyze columns and generate suggestions."""
        suggestions = []
        
        for col in columns:
            suggestion = self._analyze_single_column(col, sample_data.get(col, []))
            suggestions.append(suggestion)
        
        # Sort by confidence
        suggestions.sort(key=lambda x: x.confidence, reverse=True)
        
        # Determine best mappings
        result = self._determine_mappings(suggestions)
        result.suggestions = suggestions
        
        return result
    
    def _analyze_single_column(self, column_name: str, sample_values: List[Any]) -> ColumnSuggestion:
        """Analyze a single column and generate suggestions."""
        
        # Normalize column name for pattern matching
        normalized_name = column_name.lower().strip()
        
        # Score each type
        type_scores = {
            'prediction': 0.0,
            'ground_truth': 0.0,
            'context': 0.0,
            'id': 0.0,
            'metadata': 0.0
        }
        
        # Pattern matching scores
        type_scores['prediction'] += self._score_patterns(normalized_name, self.prediction_patterns) * 0.6
        type_scores['ground_truth'] += self._score_patterns(normalized_name, self.ground_truth_patterns) * 0.6
        type_scores['context'] += self._score_patterns(normalized_name, self.context_patterns) * 0.6
        type_scores['id'] += self._score_patterns(normalized_name, self.id_patterns) * 0.6
        type_scores['metadata'] += self._score_patterns(normalized_name, self.metadata_indicators) * 0.6
        
        # Content analysis scores
        if sample_values:
            content_scores = self._analyze_content(sample_values)
            for type_name, score in content_scores.items():
                type_scores[type_name] += score * 0.4
        
        # Find best type
        best_type = max(type_scores, key=type_scores.get)
        best_score = type_scores[best_type]
        
        # Create alternatives list
        alternatives = [(t, s) for t, s in type_scores.items() if t != best_type and s > 0.1]
        alternatives.sort(key=lambda x: x[1], reverse=True)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(column_name, best_type, best_score, sample_values)
        
        return ColumnSuggestion(
            column_name=column_name,
            suggested_type=best_type,
            confidence=min(best_score, 1.0),
            reasoning=reasoning,
            alternative_types=alternatives[:3]  # Top 3 alternatives
        )
    
    def _score_patterns(self, text: str, patterns: List[str]) -> float:
        """Score text against a list of regex patterns."""
        max_score = 0.0
        
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                # Exact match gets highest score
                if re.fullmatch(pattern, text, re.IGNORECASE):
                    max_score = max(max_score, 1.0)
                else:
                    max_score = max(max_score, 0.8)
        
        return max_score
    
    def _analyze_content(self, values: List[Any]) -> Dict[str, float]:
        """Analyze content patterns to suggest column types."""
        scores = {
            'prediction': 0.0,
            'ground_truth': 0.0,
            'context': 0.0,
            'id': 0.0,
            'metadata': 0.0
        }
        
        if not values:
            return scores
        
        # Sample analysis
        str_values = [str(v) for v in values if v is not None]
        if not str_values:
            return scores
        
        # ID detection
        if self._looks_like_ids(str_values):
            scores['id'] += 0.8
        
        # Context detection (long text)
        if self._looks_like_text(str_values):
            scores['context'] += 0.6
        
        # Prediction/Ground truth detection (classification labels)
        if self._looks_like_labels(str_values):
            scores['prediction'] += 0.4
            scores['ground_truth'] += 0.4
        
        # Metadata detection (numerical scores, timestamps, etc.)
        if self._looks_like_metadata(str_values):
            scores['metadata'] += 0.5
        
        return scores
    
    def _looks_like_ids(self, values: List[str]) -> bool:
        """Check if values look like IDs."""
        if len(values) < 2:
            return False
        
        # Check for uniqueness
        unique_ratio = len(set(values)) / len(values)
        if unique_ratio < 0.9:
            return False
        
        # Check for ID patterns
        id_patterns = 0
        for value in values[:5]:
            if re.match(r'^[a-zA-Z0-9_-]+$', value):
                id_patterns += 1
            if re.match(r'^\d+$', value):  # Sequential numbers
                id_patterns += 1
            if re.match(r'^[a-f0-9-]{8,}$', value, re.IGNORECASE):  # UUID-like
                id_patterns += 1
        
        return id_patterns >= len(values[:5]) * 0.6
    
    def _looks_like_text(self, values: List[str]) -> bool:
        """Check if values look like text content."""
        if not values:
            return False
        
        # Check average length
        lengths = [len(v) for v in values]
        avg_length = statistics.mean(lengths)
        
        if avg_length < 10:  # Very short text unlikely to be context
            return False
        
        # Check for sentence-like patterns
        sentence_patterns = 0
        for value in values[:5]:
            if len(value.split()) >= 3:  # At least 3 words
                sentence_patterns += 1
            if re.search(r'[.!?]', value):  # Contains punctuation
                sentence_patterns += 1
        
        return sentence_patterns >= len(values[:5]) * 0.4
    
    def _looks_like_labels(self, values: List[str]) -> bool:
        """Check if values look like classification labels."""
        if not values:
            return False
        
        # Check for limited vocabulary (typical of labels)
        unique_values = set(values)
        if len(unique_values) > len(values) * 0.5:  # Too many unique values
            return False
        
        if len(unique_values) < 2:  # Too few unique values
            return False
        
        # Check for common label patterns
        common_labels = {
            'positive', 'negative', 'neutral',
            'yes', 'no', 'true', 'false',
            'good', 'bad', 'ok', 'okay',
            'correct', 'incorrect', 'wrong',
            'spam', 'ham', 'not spam',
            'relevant', 'irrelevant',
            'toxic', 'non-toxic', 'safe'
        }
        
        normalized_values = {v.lower().strip() for v in unique_values}
        label_matches = len(normalized_values.intersection(common_labels))
        
        return label_matches >= len(unique_values) * 0.3
    
    def _looks_like_metadata(self, values: List[str]) -> bool:
        """Check if values look like metadata."""
        if not values:
            return False
        
        # Check for numerical patterns (scores, confidences)
        numerical_count = 0
        for value in values:
            try:
                float_val = float(value)
                if 0 <= float_val <= 1:  # Confidence-like
                    numerical_count += 2
                elif float_val > 0:  # Other numerical
                    numerical_count += 1
            except ValueError:
                pass
        
        if numerical_count >= len(values) * 0.5:
            return True
        
        # Check for timestamp patterns
        timestamp_patterns = 0
        for value in values[:5]:
            if re.search(r'\d{4}-\d{2}-\d{2}', value):  # Date pattern
                timestamp_patterns += 1
            if re.search(r'\d{2}:\d{2}:\d{2}', value):  # Time pattern
                timestamp_patterns += 1
        
        return timestamp_patterns >= len(values[:5]) * 0.3
    
    def _generate_reasoning(self, column_name: str, suggested_type: str, confidence: float, sample_values: List[Any]) -> str:
        """Generate human-readable reasoning for the suggestion."""
        
        if confidence < 0.3:
            return f"Low confidence suggestion based on limited patterns in column name '{column_name}'"
        
        reasons = []
        
        # Add column name reasoning
        normalized_name = column_name.lower().strip()
        
        if suggested_type == 'prediction':
            if any(re.search(p, normalized_name, re.IGNORECASE) for p in self.prediction_patterns):
                reasons.append("column name matches prediction patterns")
        elif suggested_type == 'ground_truth':
            if any(re.search(p, normalized_name, re.IGNORECASE) for p in self.ground_truth_patterns):
                reasons.append("column name matches ground truth patterns")
        elif suggested_type == 'context':
            if any(re.search(p, normalized_name, re.IGNORECASE) for p in self.context_patterns):
                reasons.append("column name matches context patterns")
        elif suggested_type == 'id':
            if any(re.search(p, normalized_name, re.IGNORECASE) for p in self.id_patterns):
                reasons.append("column name matches ID patterns")
        elif suggested_type == 'metadata':
            if any(re.search(p, normalized_name, re.IGNORECASE) for p in self.metadata_indicators):
                reasons.append("column name matches metadata patterns")
        
        # Add content reasoning
        if sample_values:
            if suggested_type == 'id' and self._looks_like_ids([str(v) for v in sample_values]):
                reasons.append("values appear to be unique identifiers")
            elif suggested_type == 'context' and self._looks_like_text([str(v) for v in sample_values]):
                reasons.append("values contain longer text content")
            elif suggested_type in ['prediction', 'ground_truth'] and self._looks_like_labels([str(v) for v in sample_values]):
                reasons.append("values appear to be classification labels")
            elif suggested_type == 'metadata' and self._looks_like_metadata([str(v) for v in sample_values]):
                reasons.append("values appear to be numerical scores or timestamps")
        
        if not reasons:
            reasons.append("based on column name analysis")
        
        return f"Suggested as {suggested_type} because " + " and ".join(reasons)
    
    def _determine_mappings(self, suggestions: List[ColumnSuggestion]) -> DetectionResult:
        """Determine the best column mappings from suggestions."""
        
        result = DetectionResult(suggestions=[])
        
        # Group suggestions by type
        by_type = {}
        for suggestion in suggestions:
            type_name = suggestion.suggested_type
            if type_name not in by_type:
                by_type[type_name] = []
            by_type[type_name].append(suggestion)
        
        # Sort each type by confidence
        for type_name in by_type:
            by_type[type_name].sort(key=lambda x: x.confidence, reverse=True)
        
        # Assign best candidates for each type
        if 'prediction' in by_type and by_type['prediction']:
            result.prediction_col = by_type['prediction'][0].column_name
        
        if 'ground_truth' in by_type and by_type['ground_truth']:
            result.ground_truth_col = by_type['ground_truth'][0].column_name
        
        if 'context' in by_type and by_type['context']:
            result.context_col = by_type['context'][0].column_name
        
        if 'id' in by_type and by_type['id']:
            result.id_col = by_type['id'][0].column_name
        
        if 'metadata' in by_type:
            result.metadata_cols = [s.column_name for s in by_type['metadata']]
        
        # Calculate overall confidence
        if suggestions:
            result.confidence_score = statistics.mean([s.confidence for s in suggestions])
        
        return result


# Convenience function
def detect_column_types(data: Union[List[Dict], Any]) -> DetectionResult:
    """
    Convenience function to detect column types in data.
    
    Args:
        data: Either a pandas DataFrame or list of dictionaries
        
    Returns:
        DetectionResult with suggestions and mappings
    """
    detector = SmartColumnDetector()
    return detector.detect_columns(data)