#!/usr/bin/env python3
"""
Format Conversion Example for Sprint Lens SDK

This example demonstrates comprehensive data format conversion capabilities,
including conversion between pandas DataFrames, JSON, CSV, and EvaluationDatasets.

Example usage:
    python format_conversion_example.py

Features demonstrated:
- DataFrame ↔ EvaluationDataset conversion
- JSON ↔ EvaluationDataset conversion  
- CSV ↔ DataFrame conversion
- DataFrame ↔ JSON conversion
- Dataset creation from various formats via SDK client
"""

import sys
import os
import json

# Add the SDK to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src'))

import sprintlens
from sprintlens import (
    dataframe_to_dataset, dataset_to_dataframe,
    json_to_dataset, dataset_to_json,
    dataframe_to_json, json_to_dataframe,
    dataframe_to_csv, csv_to_dataframe,
    DataFormatConverter
)

# Optional pandas import
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
    print("✅ pandas is available")
except ImportError:
    PANDAS_AVAILABLE = False
    print("❌ pandas not available. Some examples will be skipped.")


def demonstrate_dataframe_conversions():
    """Demonstrate DataFrame ↔ EvaluationDataset conversions."""
    if not PANDAS_AVAILABLE:
        print("⏭️ Skipping DataFrame examples (pandas not available)")
        return
    
    print("\n🔄 DataFrame ↔ EvaluationDataset Conversion")
    print("=" * 50)
    
    # Create sample DataFrame
    data = {
        'id': ['item_1', 'item_2', 'item_3'],
        'prediction': ['positive', 'negative', 'neutral'],
        'ground_truth': ['positive', 'positive', 'neutral'],
        'context': ['Good product!', 'Bad service.', 'Okay quality.'],
        'confidence': [0.95, 0.82, 0.76],
        'model_version': ['v1.2', 'v1.2', 'v1.3']
    }
    df = pd.DataFrame(data)
    
    print("📊 Original DataFrame:")
    print(df)
    print(f"DataFrame shape: {df.shape}")
    
    # Convert DataFrame to EvaluationDataset
    dataset = dataframe_to_dataset(
        df,
        name="sentiment_analysis_dataset",
        description="Sample sentiment analysis evaluation data",
        prediction_col="prediction",
        ground_truth_col="ground_truth",
        context_col="context",
        id_col="id",
        metadata_cols=["confidence", "model_version"]
    )
    
    print(f"\n📋 Converted to EvaluationDataset:")
    print(f"- Name: {dataset.name}")
    print(f"- Description: {dataset.description}")
    print(f"- Items count: {len(dataset.items)}")
    print(f"- Sample item metadata: {dataset.items[0].metadata}")
    
    # Convert back to DataFrame
    df_converted = dataset_to_dataframe(dataset)
    
    print(f"\n📊 Converted back to DataFrame:")
    print(df_converted)
    print(f"DataFrame shape: {df_converted.shape}")
    
    # Verify data integrity
    print(f"\n✅ Data integrity check:")
    print(f"- Original predictions match: {list(df['prediction']) == list(df_converted['prediction'])}")
    print(f"- Original ground truth match: {list(df['ground_truth']) == list(df_converted['ground_truth'])}")


def demonstrate_json_conversions():
    """Demonstrate JSON ↔ EvaluationDataset conversions."""
    print("\n🔄 JSON ↔ EvaluationDataset Conversion")
    print("=" * 50)
    
    # Sample JSON data (list format)
    json_data = [
        {
            "id": "q1",
            "prediction": "Paris",
            "ground_truth": "Paris",
            "context": "What is the capital of France?",
            "difficulty": "easy",
            "topic": "geography"
        },
        {
            "id": "q2", 
            "prediction": "Berlin",
            "ground_truth": "Berlin",
            "context": "What is the capital of Germany?",
            "difficulty": "easy",
            "topic": "geography"
        },
        {
            "id": "q3",
            "prediction": "Madrid",
            "ground_truth": "Madrid", 
            "context": "What is the capital of Spain?",
            "difficulty": "medium",
            "topic": "geography"
        }
    ]
    
    print("📄 Original JSON data:")
    print(json.dumps(json_data, indent=2))
    
    # Convert JSON to EvaluationDataset
    dataset = json_to_dataset(
        json_data,
        name="geography_qa_dataset",
        description="Geography question-answering evaluation data"
    )
    
    print(f"\n📋 Converted to EvaluationDataset:")
    print(f"- Name: {dataset.name}")
    print(f"- Description: {dataset.description}")
    print(f"- Items count: {len(dataset.items)}")
    print(f"- Sample item: {dataset.items[0].to_dict()}")
    
    # Convert back to JSON
    json_str = dataset_to_json(dataset, pretty=True)
    
    print(f"\n📄 Converted back to JSON:")
    print(json_str[:500] + "..." if len(json_str) > 500 else json_str)
    
    # Test with different JSON structures
    print(f"\n🔄 Testing structured JSON format:")
    structured_json = {
        "name": "custom_qa_dataset",
        "description": "Custom Q&A dataset", 
        "metadata": {"version": "1.0", "source": "manual"},
        "items": json_data
    }
    
    dataset_structured = json_to_dataset(structured_json, name="fallback_name")
    print(f"- Dataset name from JSON: {dataset_structured.name}")
    print(f"- Dataset metadata: {dataset_structured.metadata}")


def demonstrate_csv_conversions():
    """Demonstrate CSV ↔ DataFrame conversions."""
    if not PANDAS_AVAILABLE:
        print("⏭️ Skipping CSV examples (pandas not available)")
        return
        
    print("\n🔄 CSV ↔ DataFrame Conversion")
    print("=" * 50)
    
    # Create sample DataFrame
    data = {
        'query': ['What is AI?', 'Define ML', 'Explain DL'],
        'response': ['Artificial Intelligence...', 'Machine Learning...', 'Deep Learning...'],
        'rating': [4.5, 4.2, 4.8],
        'category': ['AI', 'ML', 'DL']
    }
    df = pd.DataFrame(data)
    
    print("📊 Original DataFrame:")
    print(df)
    
    # Convert to CSV string
    csv_str = dataframe_to_csv(df)
    
    print(f"\n📄 Converted to CSV:")
    print(csv_str)
    
    # Convert back to DataFrame
    df_from_csv = csv_to_dataframe(csv_str)
    
    print(f"📊 Converted back to DataFrame:")
    print(df_from_csv)
    
    # Verify data integrity
    print(f"\n✅ Data integrity check:")
    print(f"- Shape matches: {df.shape == df_from_csv.shape}")
    print(f"- Values match: {df.equals(df_from_csv)}")


def demonstrate_cross_format_conversions():
    """Demonstrate complex cross-format conversions."""
    if not PANDAS_AVAILABLE:
        print("⏭️ Skipping cross-format examples (pandas not available)")
        return
        
    print("\n🔄 Cross-Format Conversion Chain")
    print("=" * 50)
    
    # Start with DataFrame
    data = {
        'prediction': ['A', 'B', 'A', 'C'],
        'ground_truth': ['A', 'A', 'A', 'C'],
        'score': [0.9, 0.7, 0.85, 0.95]
    }
    df_original = pd.DataFrame(data)
    
    print("1️⃣ Start with DataFrame:")
    print(df_original)
    
    # DataFrame → JSON
    json_str = dataframe_to_json(df_original, pretty=True)
    print(f"\n2️⃣ Convert to JSON:")
    print(json_str)
    
    # JSON → EvaluationDataset
    dataset = json_to_dataset(json_str, name="cross_format_test")
    print(f"\n3️⃣ Convert to EvaluationDataset:")
    print(f"- Items: {len(dataset.items)}")
    print(f"- Sample: {dataset.items[0].to_dict()}")
    
    # EvaluationDataset → DataFrame
    df_final = dataset_to_dataframe(dataset)
    print(f"\n4️⃣ Convert back to DataFrame:")
    print(df_final)
    
    # DataFrame → CSV
    csv_str = dataframe_to_csv(df_final)
    print(f"\n5️⃣ Convert to CSV:")
    print(csv_str)
    
    print(f"✅ Full conversion chain completed!")


def demonstrate_format_converter_class():
    """Demonstrate using the DataFormatConverter class directly."""
    print("\n🔧 DataFormatConverter Class Usage")
    print("=" * 50)
    
    # Test JSON to dataset conversion with custom keys
    json_data = {
        "questions": [
            {
                "qid": "001",
                "model_answer": "Yes",
                "correct_answer": "Yes", 
                "question_text": "Is Python a programming language?",
                "difficulty_level": "beginner"
            },
            {
                "qid": "002",
                "model_answer": "No",
                "correct_answer": "Yes",
                "question_text": "Is JavaScript compiled?",
                "difficulty_level": "intermediate"
            }
        ]
    }
    
    print("📄 Custom JSON structure:")
    print(json.dumps(json_data, indent=2))
    
    # Use DataFormatConverter with custom field mapping
    dataset = DataFormatConverter.json_to_evaluation_dataset(
        json_data["questions"],
        name="programming_quiz",
        prediction_key="model_answer",
        ground_truth_key="correct_answer",
        context_key="question_text",
        id_key="qid"
    )
    
    print(f"\n📋 Converted dataset:")
    print(f"- Name: {dataset.name}")
    print(f"- Items: {len(dataset.items)}")
    print(f"- Sample metadata: {dataset.items[0].metadata}")
    
    # Convert back with custom options
    json_result = DataFormatConverter.evaluation_dataset_to_json(
        dataset,
        include_metadata=True,
        pretty=True
    )
    
    print(f"\n📄 Converted back to JSON:")
    print(json_result[:300] + "..." if len(json_result) > 300 else json_result)


def main():
    """Run all format conversion examples."""
    print("🚀 Sprint Lens SDK - Format Conversion Examples")
    print("=" * 60)
    
    try:
        demonstrate_dataframe_conversions()
        demonstrate_json_conversions() 
        demonstrate_csv_conversions()
        demonstrate_cross_format_conversions()
        demonstrate_format_converter_class()
        
        print(f"\n🎉 All format conversion examples completed successfully!")
        
        if not PANDAS_AVAILABLE:
            print(f"\n💡 To run DataFrame examples, install pandas:")
            print(f"   pip install pandas")
            
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()