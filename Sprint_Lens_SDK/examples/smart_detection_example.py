#!/usr/bin/env python3
"""
Smart Column Detection Example for Sprint Lens SDK

This example demonstrates the intelligent column detection capabilities,
showing how the SDK can automatically analyze data structure and suggest
appropriate column mappings for dataset creation.

Example usage:
    python smart_detection_example.py

Features demonstrated:
- Automatic column type detection from data patterns
- Column name pattern matching
- Content analysis for classification
- Confidence scoring and alternatives
- Integration with dataset creation
"""

import sys
import os
import json
from pprint import pprint

# Add the SDK to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src'))

import sprintlens
from sprintlens import (
    SmartColumnDetector, detect_column_types,
    ColumnSuggestion, DetectionResult
)

# Optional pandas import
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
    print("✅ pandas is available")
except ImportError:
    PANDAS_AVAILABLE = False
    print("❌ pandas not available. Some examples will be skipped.")


def demonstrate_basic_detection():
    """Demonstrate basic column detection with simple data."""
    print("\n🔍 Basic Column Detection")
    print("=" * 50)
    
    # Sample classification data
    data = [
        {
            "id": "item_001",
            "text": "This is a great product! I love it.",
            "prediction": "positive",
            "ground_truth": "positive",
            "confidence": 0.95,
            "model_version": "v1.2"
        },
        {
            "id": "item_002", 
            "text": "Terrible quality, very disappointed.",
            "prediction": "negative",
            "ground_truth": "negative",
            "confidence": 0.88,
            "model_version": "v1.2"
        },
        {
            "id": "item_003",
            "text": "It's okay, nothing special.",
            "prediction": "neutral",
            "ground_truth": "neutral", 
            "confidence": 0.72,
            "model_version": "v1.3"
        }
    ]
    
    print("📊 Sample data structure:")
    print(json.dumps(data[0], indent=2))
    
    # Analyze structure
    result = detect_column_types(data)
    
    print(f"\n🎯 Detection Results:")
    print(f"Overall confidence: {result.confidence_score:.1%}")
    print(f"Suggested mappings:")
    print(f"  - Prediction column: {result.prediction_col}")
    print(f"  - Ground truth column: {result.ground_truth_col}")
    print(f"  - Context column: {result.context_col}")
    print(f"  - ID column: {result.id_col}")
    print(f"  - Metadata columns: {result.metadata_cols}")
    
    print(f"\n📋 Detailed suggestions:")
    for suggestion in result.suggestions:
        print(f"  • {suggestion.column_name}: {suggestion.suggested_type} ({suggestion.confidence:.0%})")
        print(f"    Reasoning: {suggestion.reasoning}")
        if suggestion.alternative_types:
            alts = [f"{t} ({c:.0%})" for t, c in suggestion.alternative_types[:2]]
            print(f"    Alternatives: {', '.join(alts)}")
        print()


def demonstrate_tricky_names():
    """Demonstrate detection with tricky column names."""
    print("\n🧩 Tricky Column Names Detection")
    print("=" * 50)
    
    # Data with non-standard column names
    data = [
        {
            "user_query": "What is the weather like?",
            "ai_response": "sunny",
            "expected_answer": "sunny", 
            "model_score": 0.92,
            "timestamp": "2024-01-15T10:30:00",
            "session_id": "sess_12345"
        },
        {
            "user_query": "How do I cook pasta?",
            "ai_response": "boil water",
            "expected_answer": "bring water to boil",
            "model_score": 0.78,
            "timestamp": "2024-01-15T10:31:00", 
            "session_id": "sess_12346"
        }
    ]
    
    print("📊 Data with non-standard names:")
    pprint(data[0])
    
    result = detect_column_types(data)
    
    print(f"\n🎯 Detection Results:")
    print(f"Overall confidence: {result.confidence_score:.1%}")
    
    print(f"\n📋 Column analysis:")
    for suggestion in result.suggestions:
        confidence_bar = "█" * int(suggestion.confidence * 10) + "░" * (10 - int(suggestion.confidence * 10))
        print(f"  {suggestion.column_name:15} → {suggestion.suggested_type:12} [{confidence_bar}] {suggestion.confidence:.0%}")


def demonstrate_dataframe_detection():
    """Demonstrate detection with pandas DataFrame."""
    if not PANDAS_AVAILABLE:
        print("\n⏭️ Skipping DataFrame detection (pandas not available)")
        return
        
    print("\n📊 DataFrame Column Detection")
    print("=" * 50)
    
    # Create diverse DataFrame
    df = pd.DataFrame({
        'question_id': ['q001', 'q002', 'q003', 'q004'],
        'question_text': [
            'What is the capital of France?',
            'Who wrote Romeo and Juliet?',
            'What is 2 + 2?',
            'Name the largest ocean.'
        ],
        'model_answer': ['Paris', 'Shakespeare', '4', 'Pacific'],
        'correct_answer': ['Paris', 'William Shakespeare', '4', 'Pacific Ocean'],
        'difficulty': ['easy', 'medium', 'easy', 'easy'],
        'subject': ['geography', 'literature', 'math', 'geography'],
        'response_time_ms': [1200, 1800, 800, 1100],
        'created_at': ['2024-01-15', '2024-01-15', '2024-01-16', '2024-01-16']
    })
    
    print("📊 DataFrame structure:")
    print(df.head())
    print(f"\nDataFrame shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    # Analyze DataFrame
    result = detect_column_types(df)
    
    print(f"\n🎯 Detection Results:")
    print(f"Overall confidence: {result.confidence_score:.1%}")
    
    # Show detailed analysis
    print(f"\n📋 Column-by-column analysis:")
    for suggestion in sorted(result.suggestions, key=lambda x: x.confidence, reverse=True):
        print(f"\n  🔍 {suggestion.column_name}")
        print(f"     Type: {suggestion.suggested_type} (confidence: {suggestion.confidence:.0%})")
        print(f"     Reasoning: {suggestion.reasoning}")
        
        if suggestion.alternative_types:
            print(f"     Alternatives:")
            for alt_type, alt_conf in suggestion.alternative_types[:2]:
                print(f"       - {alt_type}: {alt_conf:.0%}")


def demonstrate_edge_cases():
    """Demonstrate detection with edge cases."""
    print("\n🌟 Edge Cases Detection")
    print("=" * 50)
    
    # Minimal data
    minimal_data = [{"col1": "value1", "col2": "value2"}]
    print("📊 Minimal data:")
    pprint(minimal_data)
    
    result = detect_column_types(minimal_data)
    print(f"Minimal data confidence: {result.confidence_score:.1%}")
    
    # Ambiguous column names
    ambiguous_data = [
        {"data": "some text", "output": "label1", "input": "another text"},
        {"data": "more text", "output": "label2", "input": "different text"}
    ]
    
    print(f"\n📊 Ambiguous column names:")
    pprint(ambiguous_data[0])
    
    result = detect_column_types(ambiguous_data)
    print(f"Ambiguous data confidence: {result.confidence_score:.1%}")
    
    print(f"\n📋 Suggestions for ambiguous data:")
    for suggestion in result.suggestions:
        print(f"  • {suggestion.column_name}: {suggestion.suggested_type} ({suggestion.confidence:.0%})")


def demonstrate_smart_client_integration():
    """Demonstrate integration with dataset client (mock)."""
    print("\n🔗 Smart Client Integration")
    print("=" * 50)
    
    # Sample data for smart dataset creation
    data = [
        {
            "review_id": "rev_001",
            "review_text": "Amazing product, highly recommend!",
            "sentiment_prediction": "positive",
            "actual_sentiment": "positive",
            "confidence_score": 0.94,
            "review_date": "2024-01-15"
        },
        {
            "review_id": "rev_002",
            "review_text": "Poor quality, waste of money.",
            "sentiment_prediction": "negative", 
            "actual_sentiment": "negative",
            "confidence_score": 0.91,
            "review_date": "2024-01-15"
        }
    ]
    
    print("📊 E-commerce review data:")
    pprint(data[0])
    
    # Analyze with suggestions
    detector = SmartColumnDetector()
    result = detector.detect_columns(data)
    
    print(f"\n🎯 Smart suggestions for dataset creation:")
    print(f"Confidence: {result.confidence_score:.1%}")
    
    # Format suggestions for display
    suggestions_dict = result.to_dict()
    suggestions_dict["formatted_suggestions"] = []
    
    for suggestion in result.suggestions:
        formatted = {
            "column": suggestion.column_name,
            "suggested_as": suggestion.suggested_type,
            "confidence": f"{suggestion.confidence:.0%}",
            "reasoning": suggestion.reasoning
        }
        if suggestion.alternative_types:
            formatted["alternatives"] = [
                f"{alt_type} ({alt_conf:.0%})" 
                for alt_type, alt_conf in suggestion.alternative_types[:2]
            ]
        suggestions_dict["formatted_suggestions"].append(formatted)
    
    print(f"\n📋 Formatted suggestions:")
    for suggestion in suggestions_dict["formatted_suggestions"]:
        print(f"  Column: {suggestion['column']}")
        print(f"    → Suggested as: {suggestion['suggested_as']} ({suggestion['confidence']})")
        print(f"    → Reasoning: {suggestion['reasoning']}")
        if 'alternatives' in suggestion:
            print(f"    → Alternatives: {', '.join(suggestion['alternatives'])}")
        print()
    
    # Show final mapping
    print(f"🎯 Recommended dataset configuration:")
    print(f"  prediction_col = '{result.prediction_col}'")
    print(f"  ground_truth_col = '{result.ground_truth_col}'")
    print(f"  context_col = '{result.context_col}'")
    print(f"  id_col = '{result.id_col}'")
    print(f"  metadata_cols = {result.metadata_cols}")
    
    # Note: In real usage, you would use this with:
    # dataset_id, detection_result = dataset_client.create_dataset_from_data_with_detection(
    #     data=data,
    #     name="smart_review_dataset",
    #     auto_apply=True if result.confidence_score > 0.8 else False
    # )


def main():
    """Run all smart detection examples."""
    print("🚀 Sprint Lens SDK - Smart Column Detection Examples")
    print("=" * 70)
    
    try:
        demonstrate_basic_detection()
        demonstrate_tricky_names() 
        demonstrate_dataframe_detection()
        demonstrate_edge_cases()
        demonstrate_smart_client_integration()
        
        print(f"\n🎉 All smart detection examples completed successfully!")
        
        print(f"\n💡 Key Benefits:")
        print(f"  • Reduces manual column mapping effort")
        print(f"  • Intelligent pattern recognition")
        print(f"  • Confidence scoring for reliability")
        print(f"  • Support for various data formats and naming conventions")
        print(f"  • Seamless integration with dataset creation")
        
        if not PANDAS_AVAILABLE:
            print(f"\n💡 To run DataFrame examples, install pandas:")
            print(f"   pip install pandas")
            
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()