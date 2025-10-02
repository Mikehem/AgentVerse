#!/usr/bin/env python3
"""
Sprint Agent Lens SDK Example

This script demonstrates how to use the Master-compatible SDK
with Sprint Agent Lens for dataset management and tracing.
"""

import json
import pandas as pd
from Master_client import configure, get_or_create_dataset, DatasetItem


def main():
    """Main example function demonstrating SDK usage."""
    print("🚀 Sprint Agent Lens SDK Example")
    print("=" * 50)
    
    # Configure the SDK client
    print("\n1. Configuring SDK...")
    client = configure(
        endpoint="http://localhost:3000",
        project_name="sdk_demo_project"
    )
    print("✅ SDK configured successfully")
    
    # Create or get a dataset
    print("\n2. Creating/getting dataset...")
    dataset = get_or_create_dataset(
        name="example_dataset",
        description="Example dataset for SDK demonstration"
    )
    print(f"✅ Dataset ready: {dataset.name} (ID: {dataset.id})")
    print(f"   Current size: {len(dataset)} items")
    
    # Insert some example data
    print("\n3. Inserting example data...")
    example_items = [
        DatasetItem(
            input_data={"question": "What is the capital of France?"},
            expected_output={"answer": "Paris"},
            metadata={"category": "geography", "difficulty": "easy"}
        ),
        DatasetItem(
            input_data={"question": "Explain quantum computing"},
            expected_output={"answer": "Quantum computing uses quantum bits..."},
            metadata={"category": "technology", "difficulty": "hard"}
        ),
        DatasetItem(
            input_data={"question": "What is 2 + 2?"},
            expected_output={"answer": "4"},
            metadata={"category": "math", "difficulty": "easy"}
        )
    ]
    
    dataset.insert(example_items)
    print(f"✅ Inserted {len(example_items)} items")
    print(f"   New dataset size: {len(dataset)} items")
    
    # Insert from dictionary format (Master-compatible)
    print("\n4. Inserting dictionary data...")
    dict_items = [
        {
            "input_data": {"question": "What is machine learning?"},
            "expected_output": {"answer": "ML is a subset of AI..."},
            "metadata": {"category": "ai", "difficulty": "medium"}
        },
        {
            "input_data": {"question": "Define recursion"},
            "expected_output": {"answer": "Recursion is when a function calls itself..."},
            "metadata": {"category": "programming", "difficulty": "medium"}
        }
    ]
    
    dataset.insert(dict_items)
    print(f"✅ Inserted {len(dict_items)} dictionary items")
    print(f"   New dataset size: {len(dataset)} items")
    
    # Insert from pandas DataFrame
    print("\n5. Inserting from pandas DataFrame...")
    df_data = {
        'input_data': [
            {"question": "What is Python?"},
            {"question": "Explain REST APIs"}
        ],
        'expected_output': [
            {"answer": "Python is a programming language..."},
            {"answer": "REST APIs are architectural style..."}
        ],
        'metadata': [
            {"category": "programming", "difficulty": "easy"},
            {"category": "web", "difficulty": "medium"}
        ]
    }
    
    df = pd.DataFrame(df_data)
    dataset.insert_from_pandas(df)
    print(f"✅ Inserted {len(df)} items from DataFrame")
    print(f"   Final dataset size: {len(dataset)} items")
    
    # Download dataset as DataFrame
    print("\n6. Downloading dataset as DataFrame...")
    downloaded_df = dataset.to_pandas()
    print(f"✅ Downloaded dataset: {len(downloaded_df)} rows")
    print("   Sample data:")
    print(downloaded_df.head(3).to_string(index=False))
    
    # Download as JSON
    print("\n7. Downloading dataset as JSON...")
    json_data = dataset.to_json()
    print(f"✅ Downloaded dataset: {len(json_data)} items")
    print("   First item:")
    print(json.dumps(json_data[0], indent=2))
    
    # Demonstrate JSONL file operations
    print("\n8. Working with JSONL files...")
    jsonl_file = "/tmp/test_dataset.jsonl"
    
    # Create a sample JSONL file
    sample_jsonl_data = [
        {
            "input_data": {"question": "What is Docker?"},
            "expected_output": {"answer": "Docker is a containerization platform..."},
            "metadata": {"category": "devops", "difficulty": "medium"}
        },
        {
            "input_data": {"question": "Explain microservices"},
            "expected_output": {"answer": "Microservices are an architectural approach..."},
            "metadata": {"category": "architecture", "difficulty": "hard"}
        }
    ]
    
    with open(jsonl_file, 'w') as f:
        for item in sample_jsonl_data:
            f.write(json.dumps(item) + '\n')
    
    # Insert from JSONL file
    dataset.read_jsonl_from_file(jsonl_file)
    print(f"✅ Inserted data from JSONL file")
    print(f"   Final dataset size: {len(dataset)} items")
    
    # List all datasets
    print("\n9. Listing all datasets...")
    all_datasets = client.list_datasets()
    print(f"✅ Found {len(all_datasets)} datasets:")
    for ds in all_datasets:
        print(f"   - {ds.name} (ID: {ds.id}, Size: {ds.item_count})")
    
    print("\n🎉 SDK Example completed successfully!")
    print("\nNext steps:")
    print("- Use this SDK in your AI applications")
    print("- Create datasets for evaluation")
    print("- Integrate with your ML workflows")
    print("- Monitor conversations and traces")


def cleanup_example():
    """Clean up example data (optional)."""
    print("\n🧹 Cleanup (optional)...")
    try:
        client = configure(endpoint="http://localhost:3000")
        dataset = client.get_or_create_dataset("example_dataset")
        
        print(f"Current dataset size: {len(dataset)} items")
        
        # Uncomment to clear the dataset
        # dataset.clear()
        # print("✅ Dataset cleared")
        
        # Uncomment to delete the dataset entirely
        # dataset.delete()
        # print("✅ Dataset deleted")
        
    except Exception as e:
        print(f"⚠️  Cleanup failed: {e}")


if __name__ == "__main__":
    try:
        main()
        
        # Uncomment to run cleanup
        # cleanup_example()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure Sprint Agent Lens is running on http://localhost:3000")
        print("2. Check that the database is properly initialized")
        print("3. Verify API endpoints are accessible")
        print("4. Install required dependencies: pip install requests pandas")