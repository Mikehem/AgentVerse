#!/usr/bin/env python3
"""
Simple Cloud Storage Integration Example

This example demonstrates cloud storage functionality without external dependencies,
focusing on core cloud storage operations with the Sprint Lens SDK.
"""

import sys
import json
import csv
import asyncio
import tempfile
from datetime import datetime
from pathlib import Path

# Add the SDK to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    import sprintlens
    from sprintlens import (
        CloudStorageManager, CloudDataset, StorageLocation, CloudCredentials,
        SyncResult, CloudProvider, StorageClass, DatasetShard,
        LocalFileSystemProvider, MockS3Provider,
        create_local_credentials, create_s3_credentials, create_storage_location,
        quick_upload_dataset
    )
    print("✅ Sprint Lens SDK and cloud storage modules imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Sprint Lens SDK: {e}")
    sys.exit(1)


async def simple_cloud_storage_demo():
    """Demonstrate core cloud storage functionality."""
    print("\n" + "="*70)
    print("☁️  SPRINT LENS CLOUD STORAGE SIMPLE EXAMPLE")
    print("="*70)
    
    # === 1. Initialize Cloud Storage Manager ===
    print("\n🚀 Step 1: Initialize Cloud Storage Manager")
    print("-" * 50)
    
    cloud_manager = CloudStorageManager()
    print("✅ Cloud Storage Manager initialized")
    
    # === 2. Register Cloud Providers ===
    print("\n🔧 Step 2: Register Cloud Providers")
    print("-" * 50)
    
    # Create credentials for local file system provider
    local_credentials = create_local_credentials(base_path="/tmp/sprintlens_demo")
    local_provider = LocalFileSystemProvider(local_credentials)
    cloud_manager.register_provider("local_dev", local_provider)
    print("✅ Registered Local File System provider")
    
    # Create credentials for mock S3 provider
    s3_credentials = create_s3_credentials(
        access_key="demo_access_key",
        secret_key="demo_secret_key",
        region="us-east-1"
    )
    mock_s3_provider = MockS3Provider(s3_credentials)
    cloud_manager.register_provider("mock_s3", mock_s3_provider)
    print("✅ Registered Mock S3 provider")
    
    # === 3. Create Sample Dataset ===
    print("\n📊 Step 3: Create Sample Dataset")
    print("-" * 50)
    
    # Create sample CSV data
    sample_data = [
        ['id', 'name', 'email', 'age', 'score'],
        ['1', 'Alice Johnson', 'alice@example.com', '28', '95.5'],
        ['2', 'Bob Smith', 'bob@example.com', '34', '87.2'],
        ['3', 'Carol Davis', 'carol@example.com', '22', '92.8'],
        ['4', 'David Wilson', 'david@example.com', '41', '78.9'],
        ['5', 'Eva Brown', 'eva@example.com', '29', '91.1']
    ]
    
    # Save to temporary CSV file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as f:
        writer = csv.writer(f)
        writer.writerows(sample_data)
        sample_dataset_path = f.name
    
    print(f"✅ Created sample dataset with {len(sample_data)-1} records")
    print(f"   Dataset path: {sample_dataset_path}")
    print(f"   Dataset size: {Path(sample_dataset_path).stat().st_size} bytes")
    
    # === 4. Upload Dataset to Cloud Providers ===
    print("\n☁️  Step 4: Upload Dataset to Cloud Providers")
    print("-" * 50)
    
    dataset_id = "simple_test_dataset_2024"
    
    # Upload to local provider
    print("📤 Uploading to Local File System...")
    local_result = await cloud_manager.upload_dataset(
        dataset_id=dataset_id,
        local_path=sample_dataset_path,
        provider_name="local_dev",
        shard_size_mb=1
    )
    print(f"✅ Local upload: {local_result.status.name}")
    print(f"   Shards created: {len(local_result.shards)}")
    
    # Upload to mock S3 provider
    print("📤 Uploading to Mock S3...")
    s3_result = await cloud_manager.upload_dataset(
        dataset_id=dataset_id,
        local_path=sample_dataset_path,
        provider_name="mock_s3",
        shard_size_mb=1
    )
    print(f"✅ S3 upload: {s3_result.status.name}")
    print(f"   Shards created: {len(s3_result.shards)}")
    
    # === 5. Create Cloud Dataset with Metadata ===
    print("\n🗂️  Step 5: Create Cloud Dataset with Metadata")
    print("-" * 50)
    
    location = create_storage_location(
        provider=CloudProvider.AWS_S3,
        bucket="sprintlens-demo",
        region="us-east-1",
        path=f"datasets/{dataset_id}"
    )
    
    cloud_dataset = CloudDataset(
        dataset_id=f"{dataset_id}_managed",
        name="Demo User Dataset",
        description="Sample user data for cloud storage demonstration",
        location=location,
        storage_class=StorageClass.STANDARD,
        created_at=datetime.now(),
        metadata={
            "environment": "development",
            "version": "1.0",
            "owner": "demo-team",
            "record_count": len(sample_data) - 1
        }
    )
    
    cloud_manager.datasets[cloud_dataset.dataset_id] = cloud_dataset
    print(f"✅ Created cloud dataset: {cloud_dataset.name}")
    print(f"   Storage class: {cloud_dataset.storage_class.name}")
    
    # === 6. List Datasets ===
    print("\n🔍 Step 6: List Datasets")
    print("-" * 50)
    
    all_datasets = await cloud_manager.list_datasets()
    print(f"📋 Total datasets across all providers: {sum(len(datasets) for datasets in all_datasets.values())}")
    
    for provider_name, datasets in all_datasets.items():
        print(f"   {provider_name}: {len(datasets)} datasets")
        for dataset in datasets:
            print(f"     • {dataset.name} ({dataset.storage_class.name})")
    
    # === 7. Download Dataset ===
    print("\n📥 Step 7: Download Dataset")
    print("-" * 50)
    
    # Create temporary download location
    with tempfile.TemporaryDirectory() as temp_dir:
        download_path = Path(temp_dir) / "downloaded_dataset.csv"
        
        download_result = await cloud_manager.download_dataset(
            dataset_id=dataset_id,
            local_path=str(download_path),
            provider_name="local_dev"
        )
        
        print(f"✅ Download result: {download_result.status.name}")
        if download_result.status.name == "COMPLETED":
            print(f"   Downloaded to: {download_path}")
            print(f"   File size: {download_path.stat().st_size} bytes")
            
            # Verify content
            with open(download_path, 'r') as f:
                lines = f.readlines()
                print(f"   Verified {len(lines)} lines in downloaded file")
    
    # === 8. Storage Statistics ===
    print("\n📊 Step 8: Storage Statistics")
    print("-" * 50)
    
    storage_stats = await cloud_manager.get_storage_statistics()
    
    print("📋 Storage Statistics:")
    print(f"   Total datasets: {storage_stats['total_datasets']}")
    print(f"   Total size: {storage_stats['total_size_bytes']} bytes")
    print(f"   Average dataset size: {storage_stats['average_size_bytes']} bytes")
    
    print("\n💡 Storage Class Distribution:")
    for storage_class, count in storage_stats['storage_class_distribution'].items():
        print(f"   {storage_class}: {count} datasets")
    
    print("\n🏢 Provider Distribution:")
    for provider, stats in storage_stats['provider_distribution'].items():
        print(f"   {provider}: {stats['count']} datasets, {stats['total_size_mb']:.2f} MB")
    
    # === 9. Backup Dataset ===
    print("\n💾 Step 9: Backup Dataset")
    print("-" * 50)
    
    backup_result = await cloud_manager.backup_dataset(
        source_dataset_id=dataset_id,
        backup_provider_name="mock_s3",
        backup_storage_class=StorageClass.INFREQUENT_ACCESS
    )
    print(f"✅ Backup completed: {backup_result['backup_dataset_id']}")
    print(f"   Backup status: {backup_result['status']}")
    
    # === 10. Export Configuration ===
    print("\n📋 Step 10: Export Configuration")
    print("-" * 50)
    
    config_data = {
        "providers": await cloud_manager.export_provider_config(),
        "datasets": await cloud_manager.export_dataset_metadata(),
        "statistics": storage_stats
    }
    
    # Save configuration to file
    config_file = Path(__file__).parent / "simple_cloud_config.json"
    with open(config_file, 'w') as f:
        json.dump(config_data, f, indent=2, default=str)
    
    print(f"✅ Exported configuration to: {config_file.name}")
    print(f"   Providers: {len(config_data['providers'])}")
    print(f"   Datasets: {len(config_data['datasets'])}")
    
    # Clean up
    Path(sample_dataset_path).unlink()
    
    print("\n" + "="*70)
    print("🎉 SIMPLE CLOUD STORAGE DEMONSTRATION COMPLETED!")
    print("="*70)
    
    return {
        "providers_registered": len(cloud_manager.providers),
        "datasets_managed": len(cloud_manager.datasets),
        "uploads_completed": 2,
        "downloads_completed": 1,
        "backups_created": 1,
        "configuration_exported": True
    }


def sdk_integration_demo():
    """Demonstrate Sprint Lens SDK integration with cloud storage."""
    print("\n🔌 SDK Integration Demo")
    print("-" * 50)
    
    try:
        # Configure Sprint Lens SDK
        sprintlens.configure(
            url="http://localhost:3001",
            username="demo_user",
            password="demo_pass"
        )
        print("✅ Sprint Lens SDK configured")
        
        # Get dataset client
        client = sprintlens.get_client()
        print("✅ Dataset client obtained")
        
        # Example: Register cloud provider through SDK
        provider_result = client.dataset_client.register_cloud_provider(
            provider_name="demo_aws",
            credentials={
                "provider_type": "aws_s3",
                "access_key_id": "DEMO_ACCESS_KEY",
                "secret_access_key": "DEMO_SECRET_KEY",
                "region": "us-west-2"
            }
        )
        print(f"✅ Provider registration: {provider_result['status']}")
        
        # Example: Create cloud dataset through SDK
        cloud_dataset_result = client.dataset_client.create_cloud_dataset(
            name="SDK_Demo_Dataset",
            description="Dataset created through SDK integration",
            provider_name="demo_aws",
            bucket="company-datasets",
            storage_class="STANDARD"
        )
        print(f"✅ Cloud dataset created: {cloud_dataset_result['dataset_id']}")
        
        return {
            "sdk_configured": True,
            "client_obtained": True,
            "provider_registered": True,
            "dataset_created": True
        }
        
    except Exception as e:
        print(f"⚠️  SDK integration demo (expected in standalone mode): {e}")
        return {
            "sdk_configured": False,
            "note": "SDK integration requires running backend"
        }


async def main():
    """Main function to run the simple cloud storage example."""
    try:
        print("🚀 Starting Sprint Lens Cloud Storage Simple Example...")
        
        # Run cloud storage demonstration
        cloud_result = await simple_cloud_storage_demo()
        print(f"\n✅ Cloud storage demo results: {cloud_result}")
        
        # Run SDK integration demonstration
        sdk_result = sdk_integration_demo()
        print(f"✅ SDK integration results: {sdk_result}")
        
        print("\n🎊 ALL CLOUD STORAGE EXAMPLES COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n❌ Error in cloud storage example: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    # Run the async main function
    success = asyncio.run(main())
    sys.exit(0 if success else 1)