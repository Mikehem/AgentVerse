#!/usr/bin/env python3
"""
Simple SDK Integration Test

Test the Opik-compatible SDK without external dependencies.
"""

import json
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from opik_client import configure, DatasetItem
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure opik_client.py is in the same directory")
    sys.exit(1)


def test_sdk_basic_functionality():
    """Test basic SDK functionality."""
    print("🧪 Testing SDK Basic Functionality")
    print("=" * 40)
    
    try:
        # Configure client
        print("1. Configuring client...")
        client = configure(
            endpoint="http://localhost:3000",
            project_name="project-1758269313646"  # Use existing project ID
        )
        print("✅ Client configured")
        
        # Create dataset
        print("2. Creating dataset...")
        dataset = client.get_or_create_dataset(
            "test_dataset",
            "Test dataset for SDK validation"
        )
        print(f"✅ Dataset created: {dataset.name}")
        
        # Test data insertion
        print("3. Testing data insertion...")
        test_items = [
            DatasetItem(
                input_data={"question": "Test question 1"},
                expected_output={"answer": "Test answer 1"},
                metadata={"category": "test"}
            ),
            DatasetItem(
                input_data={"question": "Test question 2"},
                expected_output={"answer": "Test answer 2"},
                metadata={"category": "test"}
            )
        ]
        
        dataset.insert(test_items)
        print(f"✅ Inserted {len(test_items)} items")
        
        # Test data retrieval
        print("4. Testing data retrieval...")
        retrieved_data = dataset.to_json()
        print(f"✅ Retrieved {len(retrieved_data)} items")
        
        if retrieved_data:
            print("   Sample item:")
            print(f"   {json.dumps(retrieved_data[0], indent=2)}")
        
        # Test listing datasets
        print("5. Testing dataset listing...")
        all_datasets = client.list_datasets()
        print(f"✅ Found {len(all_datasets)} datasets")
        
        print("\n🎉 All tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False


def test_dataset_operations():
    """Test dataset operations."""
    print("\n🔧 Testing Dataset Operations")
    print("=" * 35)
    
    try:
        client = configure(
            endpoint="http://localhost:3000",
            project_name="project-1758269313646"  # Use existing project ID
        )
        
        # Create temporary dataset
        temp_dataset = client.get_or_create_dataset(
            "temp_test_dataset",
            "Temporary dataset for operations test"
        )
        
        # Add data
        items = [
            DatasetItem(
                input_data={"test": "data"},
                expected_output={"result": "output"}
            )
        ]
        temp_dataset.insert(items)
        print(f"✅ Created temp dataset with {temp_dataset.size} items")
        
        # Clear dataset
        temp_dataset.clear()
        print("✅ Dataset cleared")
        
        # Delete dataset
        temp_dataset.delete()
        print("✅ Dataset deleted")
        
        return True
        
    except Exception as e:
        print(f"❌ Dataset operations test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Sprint Agent Lens SDK Integration Test")
    print("=" * 50)
    
    # Check if server is running
    try:
        import urllib.request
        urllib.request.urlopen("http://localhost:3000", timeout=2)
        print("✅ Server is running on localhost:3000")
    except Exception:
        print("❌ Server not accessible on localhost:3000")
        print("Please start Sprint Agent Lens before running tests")
        return False
    
    # Run tests
    basic_test = test_sdk_basic_functionality()
    operations_test = test_dataset_operations()
    
    if basic_test and operations_test:
        print("\n🎉 All SDK integration tests passed!")
        print("\nThe Opik-compatible SDK is working correctly with Sprint Agent Lens")
        return True
    else:
        print("\n❌ Some tests failed")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)