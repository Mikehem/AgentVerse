#!/usr/bin/env python3
"""
Comprehensive Cloud Storage Integration Example

This example demonstrates the complete cloud storage functionality in Sprint Lens SDK,
including multi-provider support, dataset synchronization, backup strategies, and
enterprise-grade cloud storage management.
"""

import sys
import json
import asyncio
import tempfile
import pandas as pd
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


async def demonstrate_cloud_storage():
    """Demonstrate comprehensive cloud storage functionality."""
    print("\n" + "="*80)
    print("☁️  SPRINT LENS CLOUD STORAGE COMPREHENSIVE EXAMPLE")
    print("="*80)
    
    # === 1. Initialize Cloud Storage Manager ===
    print("\n🚀 Step 1: Initialize Cloud Storage Manager")
    print("-" * 50)
    
    cloud_manager = CloudStorageManager()
    print("✅ Cloud Storage Manager initialized")
    
    # === 2. Register Multiple Cloud Providers ===
    print("\n🔧 Step 2: Register Cloud Providers")
    print("-" * 50)
    
    # Register local file system provider for development
    local_provider = LocalFileSystemProvider()
    cloud_manager.register_provider("local_dev", local_provider)
    print("✅ Registered Local File System provider")
    
    # Register mock S3 provider for testing
    mock_s3_provider = MockS3Provider()
    cloud_manager.register_provider("mock_s3", mock_s3_provider)
    print("✅ Registered Mock S3 provider")
    
    # === 3. Create Sample Dataset ===
    print("\n📊 Step 3: Create Sample Dataset")
    print("-" * 50)
    
    # Create a sample dataset with different data types
    sample_data = {
        'id': range(1, 1001),
        'name': [f'User_{i}' for i in range(1, 1001)],
        'email': [f'user{i}@example.com' for i in range(1, 1001)],
        'age': [20 + (i % 50) for i in range(1, 1001)],
        'score': [round(50 + (i % 50) * 0.8, 2) for i in range(1, 1001)],
        'category': [['A', 'B', 'C'][i % 3] for i in range(1000)],
        'is_active': [True if i % 3 == 0 else False for i in range(1000)],
        'created_date': [f'2024-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}' for i in range(1000)]
    }
    
    df = pd.DataFrame(sample_data)
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        df.to_csv(f.name, index=False)
        sample_dataset_path = f.name
    
    print(f"✅ Created sample dataset with {len(df)} records")
    print(f"   Dataset path: {sample_dataset_path}")
    print(f"   Dataset size: {Path(sample_dataset_path).stat().st_size} bytes")
    
    # === 4. Upload Dataset to Multiple Providers ===
    print("\n☁️  Step 4: Upload Dataset to Cloud Providers")
    print("-" * 50)
    
    dataset_id = "comprehensive_test_dataset_2024"
    
    # Upload to local provider
    print("📤 Uploading to Local File System...")
    local_result = await cloud_manager.upload_dataset(
        dataset_id=dataset_id,
        local_path=sample_dataset_path,
        provider_name="local_dev",
        shard_size_mb=1  # Small shard size for demonstration
    )
    print(f"✅ Local upload: {local_result.status.name}")
    print(f"   Shards created: {len(local_result.shards)}")
    
    # Upload to mock S3 provider
    print("📤 Uploading to Mock S3...")
    s3_result = await cloud_manager.upload_dataset(
        dataset_id=dataset_id,
        local_path=sample_dataset_path,
        provider_name="mock_s3",
        shard_size_mb=1  # Small shard size for demonstration
    )
    print(f"✅ S3 upload: {s3_result.status.name}")
    print(f"   Shards created: {len(s3_result.shards)}")
    
    # === 5. Create Cloud Datasets with Different Storage Classes ===
    print("\n🗂️  Step 5: Create Cloud Datasets with Storage Classes")
    print("-" * 50)
    
    # Create different storage configurations
    storage_configs = [
        {
            "name": "production_dataset",
            "description": "Production dataset for real-time access",
            "storage_class": StorageClass.STANDARD,
            "provider": "mock_s3"
        },
        {
            "name": "archive_dataset", 
            "description": "Historical data for long-term storage",
            "storage_class": StorageClass.ARCHIVE,
            "provider": "mock_s3"
        },
        {
            "name": "backup_dataset",
            "description": "Backup copy with infrequent access",
            "storage_class": StorageClass.INFREQUENT_ACCESS,
            "provider": "local_dev"
        }
    ]
    
    created_datasets = []
    for config in storage_configs:
        location = create_storage_location(
            provider=CloudProvider.AWS_S3 if config["provider"] == "mock_s3" else CloudProvider.LOCAL,
            bucket="sprintlens-datasets",
            region="us-east-1",
            path=f"datasets/{config['name']}"
        )
        
        cloud_dataset = CloudDataset(
            dataset_id=f"{config['name']}_001",
            name=config["name"],
            description=config["description"],
            location=location,
            storage_class=config["storage_class"],
            created_at=datetime.now(),
            metadata={
                "environment": "development",
                "version": "1.0",
                "owner": "data-team"
            }
        )
        
        cloud_manager.datasets[cloud_dataset.dataset_id] = cloud_dataset
        created_datasets.append(cloud_dataset)
        
        print(f"✅ Created {cloud_dataset.name} ({cloud_dataset.storage_class.name})")
    
    # === 6. Demonstrate Dataset Synchronization ===
    print("\n🔄 Step 6: Dataset Synchronization")
    print("-" * 50)
    
    # Create modified version of dataset
    modified_data = sample_data.copy()
    modified_data['score'] = [round(score * 1.1, 2) for score in modified_data['score']]  # Increase scores by 10%
    modified_df = pd.DataFrame(modified_data)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='_modified.csv', delete=False) as f:
        modified_df.to_csv(f.name, index=False)
        modified_dataset_path = f.name
    
    print(f"✅ Created modified dataset: {modified_dataset_path}")
    
    # Sync modified dataset
    sync_result = await cloud_manager.sync_dataset(
        dataset_id=dataset_id,
        local_path=modified_dataset_path,
        provider_name="local_dev"
    )
    print(f"✅ Sync result: {sync_result.status.name}")
    if sync_result.bytes_transferred > 0:
        print(f"   Bytes transferred: {sync_result.bytes_transferred}")
    
    # === 7. Backup Strategy Implementation ===
    print("\n💾 Step 7: Backup Strategy Implementation")
    print("-" * 50)
    
    # Create backup across multiple providers
    backup_datasets = []
    for dataset in created_datasets:
        if dataset.dataset_id.startswith("production_"):
            # Backup production datasets to both local and mock S3
            for backup_provider in ["local_dev", "mock_s3"]:
                if backup_provider != dataset.location.provider.name.lower():
                    backup_result = await cloud_manager.backup_dataset(
                        source_dataset_id=dataset.dataset_id,
                        backup_provider_name=backup_provider,
                        backup_storage_class=StorageClass.INFREQUENT_ACCESS
                    )
                    backup_datasets.append(backup_result)
                    print(f"✅ Backed up {dataset.name} to {backup_provider}")
    
    # === 8. Dataset Discovery and Management ===
    print("\n🔍 Step 8: Dataset Discovery and Management")
    print("-" * 50)
    
    # List all datasets across providers
    all_datasets = await cloud_manager.list_datasets()
    print(f"📋 Total datasets across all providers: {len(all_datasets)}")
    
    for provider_name, datasets in all_datasets.items():
        print(f"   {provider_name}: {len(datasets)} datasets")
        for dataset in datasets[:3]:  # Show first 3
            print(f"     • {dataset.name} ({dataset.storage_class.name})")
    
    # === 9. Cost Analysis and Optimization ===
    print("\n💰 Step 9: Cost Analysis and Storage Optimization")
    print("-" * 50)
    
    storage_stats = await cloud_manager.get_storage_statistics()
    
    print("📊 Storage Statistics:")
    print(f"   Total datasets: {storage_stats['total_datasets']}")
    print(f"   Total size: {storage_stats['total_size_bytes'] / (1024*1024):.2f} MB")
    print(f"   Average dataset size: {storage_stats['average_size_bytes'] / 1024:.2f} KB")
    
    print("\n💡 Storage Class Distribution:")
    for storage_class, count in storage_stats['storage_class_distribution'].items():
        print(f"   {storage_class}: {count} datasets")
    
    print("\n🏢 Provider Distribution:")
    for provider, stats in storage_stats['provider_distribution'].items():
        print(f"   {provider}: {stats['count']} datasets, {stats['total_size_mb']:.2f} MB")
    
    # === 10. Advanced Dataset Operations ===
    print("\n🔧 Step 10: Advanced Dataset Operations")
    print("-" * 50)
    
    # Dataset versioning with cloud storage
    versioned_dataset_id = f"{dataset_id}_v2"
    version_result = await cloud_manager.create_dataset_version(
        original_dataset_id=dataset_id,
        new_version_id=versioned_dataset_id,
        provider_name="mock_s3",
        version_metadata={
            "version": "2.0",
            "changes": "Updated scoring algorithm",
            "created_by": "data-scientist"
        }
    )
    print(f"✅ Created dataset version: {version_result['version_id']}")
    
    # Dataset sharing and permissions
    sharing_config = await cloud_manager.configure_dataset_sharing(
        dataset_id=dataset_id,
        provider_name="mock_s3",
        share_config={
            "public_read": False,
            "shared_with": ["team-ml@company.com", "team-analytics@company.com"],
            "permissions": ["read", "download"],
            "expiry_date": "2024-12-31"
        }
    )
    print(f"✅ Configured dataset sharing with {len(sharing_config['shared_with'])} entities")
    
    # === 11. Data Pipeline Integration ===
    print("\n🔄 Step 11: Data Pipeline Integration")
    print("-" * 50)
    
    # Simulate data pipeline workflow
    pipeline_config = {
        "source_dataset": dataset_id,
        "transformations": ["normalize_scores", "add_segments", "calculate_metrics"],
        "output_format": "parquet",
        "target_storage_class": StorageClass.STANDARD
    }
    
    pipeline_result = await cloud_manager.run_data_pipeline(
        config=pipeline_config,
        provider_name="mock_s3"
    )
    print(f"✅ Data pipeline completed: {pipeline_result['status']}")
    print(f"   Processing time: {pipeline_result['processing_time_seconds']}s")
    print(f"   Output dataset: {pipeline_result['output_dataset_id']}")
    
    # === 12. Monitoring and Alerting ===
    print("\n📈 Step 12: Monitoring and Alerting Setup")
    print("-" * 50)
    
    # Configure monitoring for datasets
    monitoring_config = {
        "metrics": ["storage_usage", "access_frequency", "cost_tracking"],
        "thresholds": {
            "storage_usage_gb": 100,
            "cost_monthly_usd": 50,
            "access_frequency_daily": 10
        },
        "alerts": {
            "email": ["admin@company.com"],
            "slack_webhook": "https://hooks.slack.com/services/...",
            "escalation_hours": 24
        }
    }
    
    monitoring_result = await cloud_manager.setup_monitoring(
        dataset_ids=[dataset_id, versioned_dataset_id],
        config=monitoring_config
    )
    print(f"✅ Monitoring configured for {len(monitoring_result['monitored_datasets'])} datasets")
    
    # === 13. Disaster Recovery Testing ===
    print("\n🚨 Step 13: Disaster Recovery Testing")
    print("-" * 50)
    
    # Test disaster recovery scenario
    dr_test_result = await cloud_manager.test_disaster_recovery(
        dataset_id=dataset_id,
        scenario="provider_outage",
        recovery_provider="local_dev"
    )
    print(f"✅ Disaster recovery test: {dr_test_result['status']}")
    print(f"   Recovery time: {dr_test_result['recovery_time_seconds']}s")
    print(f"   Data integrity: {dr_test_result['data_integrity_check']}")
    
    # === 14. Export Configuration and Metadata ===
    print("\n📋 Step 14: Export Configuration and Metadata")
    print("-" * 50)
    
    # Export complete cloud storage configuration
    export_data = {
        "cloud_storage_config": await cloud_manager.export_configuration(),
        "dataset_metadata": await cloud_manager.export_dataset_metadata(),
        "backup_strategy": await cloud_manager.export_backup_configuration(),
        "monitoring_config": monitoring_config,
        "disaster_recovery_plan": await cloud_manager.export_dr_configuration()
    }
    
    # Save configuration to file
    config_file = Path(__file__).parent / "cloud_storage_configuration.json"
    with open(config_file, 'w') as f:
        json.dump(export_data, f, indent=2, default=str)
    
    print(f"✅ Exported complete configuration to: {config_file.name}")
    print(f"   Providers configured: {len(export_data['cloud_storage_config']['providers'])}")
    print(f"   Datasets managed: {len(export_data['dataset_metadata'])}")
    print(f"   Backup strategies: {len(export_data['backup_strategy']['strategies'])}")
    
    # === 15. Performance Benchmarking ===
    print("\n⚡ Step 15: Performance Benchmarking")
    print("-" * 50)
    
    # Run performance benchmarks
    benchmark_results = await cloud_manager.run_performance_benchmark(
        dataset_id=dataset_id,
        operations=["upload", "download", "sync"],
        iterations=3
    )
    
    print("📊 Performance Benchmark Results:")
    for operation, results in benchmark_results.items():
        avg_time = sum(results) / len(results)
        print(f"   {operation.capitalize()}: {avg_time:.2f}s average")
    
    # Clean up temporary files
    Path(sample_dataset_path).unlink()
    Path(modified_dataset_path).unlink()
    
    print("\n" + "="*80)
    print("🎉 COMPREHENSIVE CLOUD STORAGE DEMONSTRATION COMPLETED!")
    print("="*80)
    
    return {
        "providers_registered": len(cloud_manager.providers),
        "datasets_created": len(cloud_manager.datasets),
        "total_uploads": len([local_result, s3_result]),
        "backup_copies": len(backup_datasets),
        "configuration_exported": True,
        "performance_tested": True
    }


def demonstrate_sdk_integration():
    """Demonstrate Sprint Lens SDK integration with cloud storage."""
    print("\n🔌 SDK Integration Example")
    print("-" * 50)
    
    # Configure Sprint Lens SDK
    sprintlens.configure(
        url="http://localhost:3001",
        username="cloud_user",
        password="cloud_pass"
    )
    
    # Get dataset client
    client = sprintlens.get_client()
    
    # Example: Register cloud provider through SDK
    result = client.dataset_client.register_cloud_provider(
        provider_name="aws_production",
        credentials={
            "provider_type": "aws_s3",
            "access_key_id": "DEMO_ACCESS_KEY",
            "secret_access_key": "DEMO_SECRET_KEY",
            "region": "us-west-2"
        }
    )
    print(f"✅ SDK Provider registration: {result['status']}")
    
    # Example: Create cloud dataset through SDK
    cloud_dataset = client.dataset_client.create_cloud_dataset(
        name="SDK_Cloud_Dataset",
        description="Dataset created through SDK cloud integration",
        provider_name="aws_production",
        bucket="company-ml-datasets",
        storage_class="STANDARD"
    )
    print(f"✅ SDK Cloud dataset created: {cloud_dataset['dataset_id']}")
    
    # Example: Upload dataset through SDK
    upload_result = client.dataset_client.upload_dataset_to_cloud(
        dataset_id=cloud_dataset['dataset_id'],
        local_path="/tmp/sample_data.csv",
        provider_name="aws_production",
        shard_size_mb=50
    )
    print(f"✅ SDK Upload result: {upload_result['status']}")
    
    return {
        "sdk_configured": True,
        "provider_registered": True,
        "dataset_created": True,
        "upload_initiated": True
    }


async def main():
    """Main function to run the comprehensive cloud storage example."""
    try:
        print("🚀 Starting Sprint Lens Cloud Storage Comprehensive Example...")
        
        # Run the comprehensive cloud storage demonstration
        cloud_result = await demonstrate_cloud_storage()
        print(f"\n✅ Cloud storage demo results: {cloud_result}")
        
        # Run SDK integration demonstration
        sdk_result = demonstrate_sdk_integration()
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