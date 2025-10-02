#!/usr/bin/env python3
"""
Advanced Search and Filtering Example for Sprint Lens SDK

This example demonstrates the powerful search and filtering capabilities
for datasets and dataset items using SQL-like query builders and
comprehensive search functionality.

Example usage:
    python advanced_search_example.py

Features demonstrated:
- Advanced query building with multiple conditions
- Dataset and dataset item searching
- Complex filtering with AND/OR logic
- Statistical analysis and data profiling
- Metadata-based filtering
- Prediction accuracy filtering
- Text-based search capabilities
"""

import sys
import os
import json
from pprint import pprint
from datetime import datetime, timedelta

# Add the SDK to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src'))

import sprintlens
from sprintlens import (
    QueryBuilder, QueryResult, QueryOperator, LogicalOperator
)

# Mock client setup for demonstration
class MockDatasetClient:
    """Mock client to demonstrate search functionality without real backend."""
    
    def __init__(self):
        # Sample datasets for demonstration
        self.sample_datasets = [
            {
                "id": "dataset_001",
                "name": "sentiment_analysis_reviews",
                "description": "Customer review sentiment classification dataset",
                "created_at": "2024-01-15T10:00:00Z",
                "items_count": 150,
                "metadata": {"domain": "ecommerce", "version": "1.0"}
            },
            {
                "id": "dataset_002", 
                "name": "qa_bot_conversations",
                "description": "Question answering bot conversation dataset",
                "created_at": "2024-01-16T09:30:00Z",
                "items_count": 89,
                "metadata": {"domain": "support", "version": "2.1"}
            },
            {
                "id": "dataset_003",
                "name": "document_classification",
                "description": "Legal document classification dataset",
                "created_at": "2024-01-17T14:20:00Z",
                "items_count": 245,
                "metadata": {"domain": "legal", "version": "1.5"}
            }
        ]
        
        # Sample dataset items for demonstration
        self.sample_items = {
            "dataset_001": [
                {
                    "id": "item_001",
                    "prediction": "positive",
                    "ground_truth": "positive",
                    "context": "This product is amazing! Great quality and fast delivery.",
                    "metadata": {"confidence": 0.95, "model": "bert-sentiment", "source": "amazon"}
                },
                {
                    "id": "item_002",
                    "prediction": "negative", 
                    "ground_truth": "negative",
                    "context": "Terrible quality, broke after one day. Very disappointed.",
                    "metadata": {"confidence": 0.88, "model": "bert-sentiment", "source": "ebay"}
                },
                {
                    "id": "item_003",
                    "prediction": "neutral",
                    "ground_truth": "positive",
                    "context": "The product is okay, nothing special but works fine.",
                    "metadata": {"confidence": 0.72, "model": "bert-sentiment", "source": "amazon"}
                },
                {
                    "id": "item_004",
                    "prediction": "positive",
                    "ground_truth": "positive", 
                    "context": "Excellent service and product quality exceeded expectations!",
                    "metadata": {"confidence": 0.98, "model": "roberta-sentiment", "source": "amazon"}
                }
            ],
            "dataset_002": [
                {
                    "id": "item_005",
                    "prediction": "The capital of France is Paris.",
                    "ground_truth": "Paris is the capital of France.",
                    "context": "What is the capital of France?",
                    "metadata": {"confidence": 0.92, "model": "gpt-3.5", "category": "geography"}
                },
                {
                    "id": "item_006",
                    "prediction": "William Shakespeare wrote Romeo and Juliet.",
                    "ground_truth": "Romeo and Juliet was written by William Shakespeare.",
                    "context": "Who wrote Romeo and Juliet?",
                    "metadata": {"confidence": 0.96, "model": "gpt-4", "category": "literature"}
                }
            ]
        }
    
    def list_datasets_async(self):
        """Mock dataset listing."""
        return {"datasets": self.sample_datasets}
    
    def list_dataset_items_async(self, dataset_id, limit=1000, offset=0):
        """Mock dataset items listing."""
        items = self.sample_items.get(dataset_id, [])
        return {"items": items[offset:offset+limit]}
    
    def create_query_builder(self):
        """Create a new QueryBuilder instance."""
        return QueryBuilder()


def demonstrate_basic_dataset_search():
    """Demonstrate basic dataset searching."""
    print("🔍 Basic Dataset Search")
    print("=" * 50)
    
    client = MockDatasetClient()
    
    # Simple text search
    print("📊 Sample datasets:")
    datasets = client.sample_datasets
    for dataset in datasets:
        print(f"  • {dataset['name']}: {dataset['description']}")
    
    print(f"\n🔎 Text search for 'sentiment':")
    search_term = "sentiment"
    filtered = [d for d in datasets if search_term.lower() in d['name'].lower() or 
                search_term.lower() in d['description'].lower()]
    for dataset in filtered:
        print(f"  ✓ Found: {dataset['name']}")
    
    print(f"\n🔎 Text search for 'classification':")
    search_term = "classification"
    filtered = [d for d in datasets if search_term.lower() in d['name'].lower() or 
                search_term.lower() in d['description'].lower()]
    for dataset in filtered:
        print(f"  ✓ Found: {dataset['name']}")


def demonstrate_query_builder():
    """Demonstrate advanced query building."""
    print("\n🏗️ Advanced Query Builder")
    print("=" * 50)
    
    client = MockDatasetClient()
    
    # Create complex queries
    print("📊 Building complex queries...")
    
    # Query 1: Find datasets with high item counts
    query1 = client.create_query_builder()
    query1.where("items_count", QueryOperator.GREATER_THAN, 100)
    query1.order_by("items_count", ascending=False)
    
    print(f"\n🔍 Query 1: Datasets with > 100 items")
    print(f"Query: {query1}")
    
    # Apply filter manually for demonstration
    datasets = [d for d in client.sample_datasets if d['items_count'] > 100]
    datasets.sort(key=lambda x: x['items_count'], reverse=True)
    for dataset in datasets:
        print(f"  ✓ {dataset['name']}: {dataset['items_count']} items")
    
    # Query 2: Complex metadata filtering
    query2 = client.create_query_builder()
    group = query2.where_group(LogicalOperator.AND)
    group.where("metadata.domain", QueryOperator.EQUALS, "ecommerce")
    group.where("items_count", QueryOperator.GREATER_EQUAL, 50)
    
    print(f"\n🔍 Query 2: E-commerce datasets with >= 50 items")
    print(f"Query conditions: domain='ecommerce' AND items_count>=50")
    
    # Apply filter manually for demonstration 
    filtered = [d for d in client.sample_datasets 
                if d.get('metadata', {}).get('domain') == 'ecommerce' and d['items_count'] >= 50]
    for dataset in filtered:
        print(f"  ✓ {dataset['name']}: {dataset['metadata']['domain']} domain, {dataset['items_count']} items")


def demonstrate_dataset_item_search():
    """Demonstrate dataset item searching and filtering."""
    print("\n🔍 Dataset Item Search & Filtering")
    print("=" * 50)
    
    client = MockDatasetClient()
    dataset_id = "dataset_001"
    items = client.sample_items[dataset_id]
    
    print(f"📊 Dataset: {dataset_id} ({len(items)} items)")
    for item in items:
        print(f"  • {item['id']}: {item['prediction']} vs {item['ground_truth']} (conf: {item['metadata']['confidence']})")
    
    # Text search in items
    print(f"\n🔎 Text search for 'amazing':")
    search_term = "amazing"
    filtered_items = []
    for item in items:
        if (search_term.lower() in str(item.get("context", "")).lower() or
            search_term.lower() in str(item.get("prediction", "")).lower()):
            filtered_items.append(item)
    
    for item in filtered_items:
        print(f"  ✓ Found in {item['id']}: '{item['context'][:50]}...'")
    
    # Filter by prediction accuracy
    print(f"\n🎯 Filter by prediction accuracy (exact matches):")
    accurate_items = [item for item in items if item['prediction'] == item['ground_truth']]
    print(f"Accurate predictions: {len(accurate_items)}/{len(items)} ({len(accurate_items)/len(items)*100:.1f}%)")
    for item in accurate_items:
        print(f"  ✓ {item['id']}: {item['prediction']} ✓")
    
    # Filter by metadata confidence
    print(f"\n📊 Filter by high confidence (>= 0.9):")
    high_conf_items = [item for item in items if item['metadata']['confidence'] >= 0.9]
    for item in high_conf_items:
        print(f"  ✓ {item['id']}: confidence {item['metadata']['confidence']}")
    
    # Filter by model type
    print(f"\n🤖 Filter by model type:")
    models = set(item['metadata']['model'] for item in items)
    print(f"Available models: {', '.join(models)}")
    
    for model in models:
        model_items = [item for item in items if item['metadata']['model'] == model]
        print(f"  • {model}: {len(model_items)} items")


def demonstrate_statistical_analysis():
    """Demonstrate dataset statistical analysis."""
    print("\n📈 Statistical Analysis")
    print("=" * 50)
    
    client = MockDatasetClient()
    dataset_id = "dataset_001"
    items = client.sample_items[dataset_id]
    
    print(f"📊 Analyzing dataset: {dataset_id}")
    
    # Calculate basic statistics
    total_items = len(items)
    accurate_items = sum(1 for item in items if item['prediction'] == item['ground_truth'])
    accuracy = accurate_items / total_items if total_items > 0 else 0
    
    print(f"\n📋 Basic Statistics:")
    print(f"  • Total items: {total_items}")
    print(f"  • Accurate predictions: {accurate_items}")
    print(f"  • Overall accuracy: {accuracy:.1%}")
    
    # Prediction distribution
    from collections import Counter
    predictions = [item['prediction'] for item in items]
    ground_truths = [item['ground_truth'] for item in items]
    
    pred_dist = Counter(predictions)
    truth_dist = Counter(ground_truths)
    
    print(f"\n📊 Prediction Distribution:")
    for label, count in pred_dist.items():
        print(f"  • {label}: {count} ({count/total_items:.1%})")
    
    print(f"\n📊 Ground Truth Distribution:")
    for label, count in truth_dist.items():
        print(f"  • {label}: {count} ({count/total_items:.1%})")
    
    # Confidence analysis
    confidences = [item['metadata']['confidence'] for item in items]
    avg_confidence = sum(confidences) / len(confidences)
    min_confidence = min(confidences)
    max_confidence = max(confidences)
    
    print(f"\n🎯 Confidence Analysis:")
    print(f"  • Average confidence: {avg_confidence:.3f}")
    print(f"  • Min confidence: {min_confidence:.3f}")
    print(f"  • Max confidence: {max_confidence:.3f}")
    
    # Metadata field analysis
    metadata_fields = set()
    for item in items:
        metadata_fields.update(item['metadata'].keys())
    
    print(f"\n🏷️ Available Metadata Fields:")
    for field in sorted(metadata_fields):
        print(f"  • {field}")
        # Show unique values for categorical fields
        if field in ['model', 'source']:
            values = set(item['metadata'].get(field) for item in items)
            print(f"    Values: {', '.join(values)}")


def demonstrate_complex_filtering():
    """Demonstrate complex multi-condition filtering."""
    print("\n🔧 Complex Multi-Condition Filtering")
    print("=" * 50)
    
    client = MockDatasetClient()
    dataset_id = "dataset_001"
    items = client.sample_items[dataset_id]
    
    print(f"📊 Dataset: {dataset_id} ({len(items)} items)")
    
    # Complex filter: High confidence AND correct predictions AND Amazon source
    print(f"\n🎯 Complex Filter Example:")
    print("Conditions: confidence >= 0.9 AND prediction == ground_truth AND source == 'amazon'")
    
    filtered_items = []
    for item in items:
        if (item['metadata']['confidence'] >= 0.9 and
            item['prediction'] == item['ground_truth'] and
            item['metadata']['source'] == 'amazon'):
            filtered_items.append(item)
    
    print(f"\nResults: {len(filtered_items)}/{len(items)} items match")
    for item in filtered_items:
        print(f"  ✓ {item['id']}: {item['prediction']} (conf: {item['metadata']['confidence']}, source: {item['metadata']['source']})")
    
    # Query builder approach
    print(f"\n🏗️ Using Query Builder:")
    query = client.create_query_builder()
    
    # Add conditions
    group = query.where_group(LogicalOperator.AND)
    group.where("metadata.confidence", QueryOperator.GREATER_EQUAL, 0.9)
    group.where("metadata.source", QueryOperator.EQUALS, "amazon")
    
    # Note: In real implementation, this would be handled by the query execution
    print(f"Query structure: {query}")
    print("(Same results as manual filtering above)")


def demonstrate_time_based_filtering():
    """Demonstrate time-based dataset filtering."""
    print("\n⏰ Time-Based Filtering")
    print("=" * 50)
    
    client = MockDatasetClient()
    datasets = client.sample_datasets
    
    print("📊 Sample datasets with creation times:")
    for dataset in datasets:
        print(f"  • {dataset['name']}: {dataset['created_at']}")
    
    # Filter by creation date
    target_date = "2024-01-16"
    print(f"\n🔍 Datasets created on or after {target_date}:")
    
    filtered = []
    for dataset in datasets:
        created_date = dataset['created_at'][:10]  # Extract date part
        if created_date >= target_date:
            filtered.append(dataset)
    
    for dataset in filtered:
        print(f"  ✓ {dataset['name']}: {dataset['created_at']}")
    
    # Recent datasets (last 7 days simulation)
    print(f"\n🕒 Recent datasets (simulation - treating all as recent):")
    for dataset in datasets:
        print(f"  ✓ {dataset['name']}: {dataset['created_at']}")


def demonstrate_performance_insights():
    """Demonstrate performance and optimization insights."""
    print("\n⚡ Performance & Optimization Insights")
    print("=" * 50)
    
    client = MockDatasetClient()
    
    print("💡 Search Optimization Tips:")
    print("  • Use specific field filters instead of text search when possible")
    print("  • Combine filters with AND conditions for better performance")
    print("  • Use pagination for large result sets")
    print("  • Index frequently searched metadata fields")
    
    print(f"\n📊 Query Performance Characteristics:")
    print("  • Simple field equality: O(n) linear scan")
    print("  • Range queries: O(n) with potential indexing benefits")  
    print("  • Text search: O(n×m) where m is text length")
    print("  • Complex AND/OR: O(n×conditions)")
    
    print(f"\n🎯 Best Practices:")
    print("  • Filter datasets before items for better performance")
    print("  • Use metadata fields for categorical filtering")
    print("  • Cache frequently used query results")
    print("  • Use pagination with limit/offset for large datasets")


def main():
    """Run all advanced search and filtering examples."""
    print("🚀 Sprint Lens SDK - Advanced Search & Filtering Examples")
    print("=" * 70)
    
    try:
        demonstrate_basic_dataset_search()
        demonstrate_query_builder()
        demonstrate_dataset_item_search()
        demonstrate_statistical_analysis()
        demonstrate_complex_filtering()
        demonstrate_time_based_filtering()
        demonstrate_performance_insights()
        
        print(f"\n🎉 All advanced search examples completed successfully!")
        
        print(f"\n💡 Key Features Demonstrated:")
        print(f"  • SQL-like query building with complex conditions")
        print(f"  • Text-based search across multiple fields")
        print(f"  • Statistical analysis and data profiling")
        print(f"  • Metadata-based filtering with nested field support")
        print(f"  • Performance optimization strategies")
        print(f"  • Time-based filtering capabilities")
        print(f"  • Multi-condition AND/OR logic support")
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()