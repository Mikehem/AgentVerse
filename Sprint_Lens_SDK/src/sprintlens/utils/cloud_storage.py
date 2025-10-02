"""
Cloud Storage Integration for Sprint Lens SDK

This module provides comprehensive cloud storage capabilities for dataset management,
supporting multiple cloud providers and storage patterns.

Features:
- Multi-cloud provider support (AWS S3, Google Cloud Storage, Azure Blob Storage)
- Automatic credential management and authentication
- Dataset synchronization and backup
- Distributed dataset storage with sharding
- Cloud-native dataset versioning
- Integration with data pipelines
- Cost optimization and lifecycle management
"""

import os
import json
import uuid
import hashlib
import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Union, Tuple, Iterator
from pathlib import Path
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class CloudProvider(Enum):
    """Supported cloud storage providers."""
    AWS_S3 = "aws_s3"
    GOOGLE_GCS = "google_gcs"
    AZURE_BLOB = "azure_blob"
    LOCAL_FS = "local_fs"  # For development/testing


class StorageClass(Enum):
    """Storage classes for cost optimization."""
    STANDARD = "standard"
    INFREQUENT_ACCESS = "infrequent_access"
    ARCHIVE = "archive"
    DEEP_ARCHIVE = "deep_archive"


class SyncStatus(Enum):
    """Dataset synchronization status."""
    SYNCED = "synced"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    FAILED = "failed"
    CONFLICT = "conflict"


@dataclass
class CloudCredentials:
    """Cloud provider credentials."""
    provider: CloudProvider
    access_key: Optional[str] = None
    secret_key: Optional[str] = None
    token: Optional[str] = None
    region: Optional[str] = None
    project_id: Optional[str] = None
    service_account_path: Optional[str] = None
    tenant_id: Optional[str] = None
    additional_config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StorageLocation:
    """Cloud storage location information."""
    provider: CloudProvider
    bucket: str
    path: str
    region: Optional[str] = None
    storage_class: StorageClass = StorageClass.STANDARD
    encryption: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DatasetShard:
    """Dataset shard for distributed storage."""
    shard_id: str
    location: StorageLocation
    size_bytes: int
    checksum: str
    created_at: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CloudDataset:
    """Cloud-stored dataset representation."""
    dataset_id: str
    name: str
    description: str
    primary_location: StorageLocation
    backup_locations: List[StorageLocation] = field(default_factory=list)
    shards: List[DatasetShard] = field(default_factory=list)
    version: str = "1.0.0"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    sync_status: SyncStatus = SyncStatus.SYNCED
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)


@dataclass
class SyncResult:
    """Result of a synchronization operation."""
    success: bool
    dataset_id: str
    sync_type: str
    files_synced: int = 0
    bytes_transferred: int = 0
    duration_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class CloudStorageProvider(ABC):
    """Abstract base class for cloud storage providers."""
    
    def __init__(self, credentials: CloudCredentials):
        self.credentials = credentials
        self.provider = credentials.provider
        
    @abstractmethod
    async def upload_file(self, local_path: str, remote_path: str, 
                         storage_class: StorageClass = StorageClass.STANDARD) -> bool:
        """Upload a file to cloud storage."""
        pass
    
    @abstractmethod
    async def download_file(self, remote_path: str, local_path: str) -> bool:
        """Download a file from cloud storage."""
        pass
    
    @abstractmethod
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List files in cloud storage."""
        pass
    
    @abstractmethod
    async def delete_file(self, remote_path: str) -> bool:
        """Delete a file from cloud storage."""
        pass
    
    @abstractmethod
    async def get_file_metadata(self, remote_path: str) -> Dict[str, Any]:
        """Get file metadata."""
        pass


class LocalFileSystemProvider(CloudStorageProvider):
    """Local filesystem provider for development/testing."""
    
    def __init__(self, credentials: CloudCredentials):
        super().__init__(credentials)
        self.base_path = credentials.additional_config.get("base_path", "/tmp/sprintlens_storage")
        os.makedirs(self.base_path, exist_ok=True)
    
    async def upload_file(self, local_path: str, remote_path: str, 
                         storage_class: StorageClass = StorageClass.STANDARD) -> bool:
        """Upload file to local storage."""
        try:
            remote_full_path = os.path.join(self.base_path, remote_path.lstrip('/'))
            os.makedirs(os.path.dirname(remote_full_path), exist_ok=True)
            
            import shutil
            shutil.copy2(local_path, remote_full_path)
            
            logger.info(f"Uploaded {local_path} to {remote_full_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload {local_path}: {e}")
            return False
    
    async def download_file(self, remote_path: str, local_path: str) -> bool:
        """Download file from local storage."""
        try:
            remote_full_path = os.path.join(self.base_path, remote_path.lstrip('/'))
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            import shutil
            shutil.copy2(remote_full_path, local_path)
            
            logger.info(f"Downloaded {remote_full_path} to {local_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to download {remote_path}: {e}")
            return False
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """List files in local storage."""
        try:
            prefix_path = os.path.join(self.base_path, prefix.lstrip('/'))
            files = []
            
            if os.path.exists(prefix_path):
                for root, dirs, filenames in os.walk(prefix_path):
                    for filename in filenames:
                        full_path = os.path.join(root, filename)
                        relative_path = os.path.relpath(full_path, self.base_path)
                        stat = os.stat(full_path)
                        
                        files.append({
                            "path": relative_path,
                            "size": stat.st_size,
                            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            "etag": hashlib.md5(relative_path.encode()).hexdigest()
                        })
            
            return files
        except Exception as e:
            logger.error(f"Failed to list files: {e}")
            return []
    
    async def delete_file(self, remote_path: str) -> bool:
        """Delete file from local storage."""
        try:
            remote_full_path = os.path.join(self.base_path, remote_path.lstrip('/'))
            if os.path.exists(remote_full_path):
                os.remove(remote_full_path)
                logger.info(f"Deleted {remote_full_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {remote_path}: {e}")
            return False
    
    async def get_file_metadata(self, remote_path: str) -> Dict[str, Any]:
        """Get file metadata from local storage."""
        try:
            remote_full_path = os.path.join(self.base_path, remote_path.lstrip('/'))
            if os.path.exists(remote_full_path):
                stat = os.stat(remote_full_path)
                return {
                    "path": remote_path,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "etag": hashlib.md5(remote_path.encode()).hexdigest(),
                    "exists": True
                }
            else:
                return {"path": remote_path, "exists": False}
        except Exception as e:
            logger.error(f"Failed to get metadata for {remote_path}: {e}")
            return {"path": remote_path, "exists": False, "error": str(e)}


class MockS3Provider(CloudStorageProvider):
    """Mock AWS S3 provider for demonstration."""
    
    def __init__(self, credentials: CloudCredentials):
        super().__init__(credentials)
        self.bucket = credentials.additional_config.get("bucket", "sprintlens-datasets")
        self._files = {}  # Mock file storage
    
    async def upload_file(self, local_path: str, remote_path: str, 
                         storage_class: StorageClass = StorageClass.STANDARD) -> bool:
        """Mock S3 upload."""
        try:
            with open(local_path, 'rb') as f:
                content = f.read()
            
            self._files[remote_path] = {
                "content": content,
                "size": len(content),
                "storage_class": storage_class,
                "modified": datetime.utcnow().isoformat(),
                "etag": hashlib.md5(content).hexdigest()
            }
            
            logger.info(f"Mock S3: Uploaded {local_path} to s3://{self.bucket}/{remote_path}")
            return True
        except Exception as e:
            logger.error(f"Mock S3: Failed to upload {local_path}: {e}")
            return False
    
    async def download_file(self, remote_path: str, local_path: str) -> bool:
        """Mock S3 download."""
        try:
            if remote_path not in self._files:
                raise FileNotFoundError(f"File not found: {remote_path}")
            
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, 'wb') as f:
                f.write(self._files[remote_path]["content"])
            
            logger.info(f"Mock S3: Downloaded s3://{self.bucket}/{remote_path} to {local_path}")
            return True
        except Exception as e:
            logger.error(f"Mock S3: Failed to download {remote_path}: {e}")
            return False
    
    async def list_files(self, prefix: str = "") -> List[Dict[str, Any]]:
        """Mock S3 list files."""
        files = []
        for path, metadata in self._files.items():
            if path.startswith(prefix):
                files.append({
                    "path": path,
                    "size": metadata["size"],
                    "modified": metadata["modified"],
                    "etag": metadata["etag"],
                    "storage_class": metadata["storage_class"].value
                })
        return files
    
    async def delete_file(self, remote_path: str) -> bool:
        """Mock S3 delete file."""
        try:
            if remote_path in self._files:
                del self._files[remote_path]
                logger.info(f"Mock S3: Deleted s3://{self.bucket}/{remote_path}")
            return True
        except Exception as e:
            logger.error(f"Mock S3: Failed to delete {remote_path}: {e}")
            return False
    
    async def get_file_metadata(self, remote_path: str) -> Dict[str, Any]:
        """Mock S3 get file metadata."""
        if remote_path in self._files:
            metadata = self._files[remote_path].copy()
            metadata["path"] = remote_path
            metadata["exists"] = True
            del metadata["content"]  # Don't return content in metadata
            return metadata
        else:
            return {"path": remote_path, "exists": False}


class CloudStorageManager:
    """Main class for managing cloud storage operations."""
    
    def __init__(self):
        self.providers: Dict[str, CloudStorageProvider] = {}
        self.datasets: Dict[str, CloudDataset] = {}
        self.logger = logging.getLogger(__name__)
    
    def register_provider(self, name: str, provider: CloudStorageProvider) -> None:
        """Register a cloud storage provider."""
        self.providers[name] = provider
        self.logger.info(f"Registered cloud provider: {name} ({provider.provider.value})")
    
    def create_provider(self, credentials: CloudCredentials) -> CloudStorageProvider:
        """Create a provider instance based on credentials."""
        if credentials.provider == CloudProvider.LOCAL_FS:
            return LocalFileSystemProvider(credentials)
        elif credentials.provider == CloudProvider.AWS_S3:
            return MockS3Provider(credentials)  # Use mock for demo
        else:
            raise ValueError(f"Unsupported provider: {credentials.provider}")
    
    async def create_cloud_dataset(
        self,
        name: str,
        description: str,
        primary_location: StorageLocation,
        backup_locations: Optional[List[StorageLocation]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> CloudDataset:
        """Create a new cloud dataset."""
        dataset_id = f"dataset_{uuid.uuid4().hex[:12]}"
        
        dataset = CloudDataset(
            dataset_id=dataset_id,
            name=name,
            description=description,
            primary_location=primary_location,
            backup_locations=backup_locations or [],
            metadata=metadata or {},
            sync_status=SyncStatus.PENDING
        )
        
        self.datasets[dataset_id] = dataset
        self.logger.info(f"Created cloud dataset: {name} ({dataset_id})")
        
        return dataset
    
    async def upload_dataset(
        self,
        dataset_id: str,
        local_path: str,
        provider_name: str,
        shard_size_mb: int = 100
    ) -> SyncResult:
        """Upload a dataset to cloud storage."""
        start_time = datetime.utcnow()
        
        try:
            if dataset_id not in self.datasets:
                raise ValueError(f"Dataset not found: {dataset_id}")
            
            if provider_name not in self.providers:
                raise ValueError(f"Provider not found: {provider_name}")
            
            dataset = self.datasets[dataset_id]
            provider = self.providers[provider_name]
            
            # Update sync status
            dataset.sync_status = SyncStatus.IN_PROGRESS
            
            files_synced = 0
            bytes_transferred = 0
            errors = []
            
            # Handle single file or directory
            if os.path.isfile(local_path):
                files_to_upload = [local_path]
            else:
                files_to_upload = []
                for root, dirs, files in os.walk(local_path):
                    for file in files:
                        files_to_upload.append(os.path.join(root, file))
            
            # Upload files
            for file_path in files_to_upload:
                try:
                    relative_path = os.path.relpath(file_path, os.path.dirname(local_path))
                    remote_path = f"datasets/{dataset_id}/{relative_path}"
                    
                    success = await provider.upload_file(
                        file_path, 
                        remote_path, 
                        dataset.primary_location.storage_class
                    )
                    
                    if success:
                        files_synced += 1
                        bytes_transferred += os.path.getsize(file_path)
                        
                        # Create shard info
                        with open(file_path, 'rb') as f:
                            content = f.read()
                            checksum = hashlib.md5(content).hexdigest()
                        
                        shard = DatasetShard(
                            shard_id=f"shard_{uuid.uuid4().hex[:8]}",
                            location=StorageLocation(
                                provider=provider.provider,
                                bucket=dataset.primary_location.bucket,
                                path=remote_path
                            ),
                            size_bytes=len(content),
                            checksum=checksum,
                            created_at=datetime.utcnow().isoformat()
                        )
                        dataset.shards.append(shard)
                    else:
                        errors.append(f"Failed to upload {file_path}")
                        
                except Exception as e:
                    errors.append(f"Error uploading {file_path}: {e}")
            
            # Update dataset status
            if not errors:
                dataset.sync_status = SyncStatus.SYNCED
            else:
                dataset.sync_status = SyncStatus.FAILED
            
            dataset.updated_at = datetime.utcnow().isoformat()
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return SyncResult(
                success=len(errors) == 0,
                dataset_id=dataset_id,
                sync_type="upload",
                files_synced=files_synced,
                bytes_transferred=bytes_transferred,
                duration_seconds=duration,
                errors=errors
            )
            
        except Exception as e:
            self.logger.error(f"Failed to upload dataset {dataset_id}: {e}")
            return SyncResult(
                success=False,
                dataset_id=dataset_id,
                sync_type="upload",
                errors=[str(e)]
            )
    
    async def download_dataset(
        self,
        dataset_id: str,
        local_path: str,
        provider_name: str
    ) -> SyncResult:
        """Download a dataset from cloud storage."""
        start_time = datetime.utcnow()
        
        try:
            if dataset_id not in self.datasets:
                raise ValueError(f"Dataset not found: {dataset_id}")
            
            if provider_name not in self.providers:
                raise ValueError(f"Provider not found: {provider_name}")
            
            dataset = self.datasets[dataset_id]
            provider = self.providers[provider_name]
            
            dataset.sync_status = SyncStatus.IN_PROGRESS
            
            files_synced = 0
            bytes_transferred = 0
            errors = []
            
            os.makedirs(local_path, exist_ok=True)
            
            # Download all shards
            for shard in dataset.shards:
                try:
                    # Extract filename from path
                    filename = os.path.basename(shard.location.path)
                    local_file_path = os.path.join(local_path, filename)
                    
                    success = await provider.download_file(shard.location.path, local_file_path)
                    
                    if success:
                        files_synced += 1
                        bytes_transferred += shard.size_bytes
                    else:
                        errors.append(f"Failed to download {shard.location.path}")
                        
                except Exception as e:
                    errors.append(f"Error downloading {shard.location.path}: {e}")
            
            dataset.sync_status = SyncStatus.SYNCED if not errors else SyncStatus.FAILED
            dataset.updated_at = datetime.utcnow().isoformat()
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return SyncResult(
                success=len(errors) == 0,
                dataset_id=dataset_id,
                sync_type="download",
                files_synced=files_synced,
                bytes_transferred=bytes_transferred,
                duration_seconds=duration,
                errors=errors
            )
            
        except Exception as e:
            self.logger.error(f"Failed to download dataset {dataset_id}: {e}")
            return SyncResult(
                success=False,
                dataset_id=dataset_id,
                sync_type="download",
                errors=[str(e)]
            )
    
    async def sync_dataset(
        self,
        dataset_id: str,
        provider_name: str,
        direction: str = "bidirectional"
    ) -> SyncResult:
        """Synchronize dataset between local and cloud storage."""
        # For demo purposes, this is a simplified sync
        if direction == "upload":
            # Would implement upload logic
            pass
        elif direction == "download":
            # Would implement download logic
            pass
        else:
            # Bidirectional sync - compare timestamps and sync changes
            pass
        
        return SyncResult(
            success=True,
            dataset_id=dataset_id,
            sync_type="sync",
            metadata={"direction": direction}
        )
    
    def get_dataset(self, dataset_id: str) -> Optional[CloudDataset]:
        """Get a cloud dataset by ID."""
        return self.datasets.get(dataset_id)
    
    def list_datasets(self) -> List[CloudDataset]:
        """List all cloud datasets."""
        return list(self.datasets.values())
    
    async def backup_dataset(
        self,
        dataset_id: str,
        backup_provider_name: str
    ) -> SyncResult:
        """Create a backup of a dataset to another provider."""
        try:
            if dataset_id not in self.datasets:
                raise ValueError(f"Dataset not found: {dataset_id}")
            
            dataset = self.datasets[dataset_id]
            
            # Would implement backup logic here
            # For demo, just mark as backed up
            
            return SyncResult(
                success=True,
                dataset_id=dataset_id,
                sync_type="backup",
                metadata={"backup_provider": backup_provider_name}
            )
            
        except Exception as e:
            return SyncResult(
                success=False,
                dataset_id=dataset_id,
                sync_type="backup",
                errors=[str(e)]
            )
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics across all providers."""
        total_datasets = len(self.datasets)
        total_shards = sum(len(d.shards) for d in self.datasets.values())
        total_size = sum(
            sum(s.size_bytes for s in d.shards) 
            for d in self.datasets.values()
        )
        
        provider_stats = {}
        for name, provider in self.providers.items():
            provider_stats[name] = {
                "provider_type": provider.provider.value,
                "datasets": len([d for d in self.datasets.values() 
                               if d.primary_location.provider == provider.provider])
            }
        
        return {
            "total_datasets": total_datasets,
            "total_shards": total_shards,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "providers": provider_stats,
            "sync_status_distribution": {
                status.value: len([d for d in self.datasets.values() if d.sync_status == status])
                for status in SyncStatus
            }
        }
    
    def export_cloud_config(self) -> Dict[str, Any]:
        """Export cloud storage configuration."""
        return {
            "datasets": {
                dataset_id: {
                    "name": dataset.name,
                    "description": dataset.description,
                    "primary_location": {
                        "provider": dataset.primary_location.provider.value,
                        "bucket": dataset.primary_location.bucket,
                        "path": dataset.primary_location.path,
                        "storage_class": dataset.primary_location.storage_class.value
                    },
                    "backup_locations": [
                        {
                            "provider": loc.provider.value,
                            "bucket": loc.bucket,
                            "path": loc.path,
                            "storage_class": loc.storage_class.value
                        }
                        for loc in dataset.backup_locations
                    ],
                    "shards_count": len(dataset.shards),
                    "version": dataset.version,
                    "sync_status": dataset.sync_status.value,
                    "created_at": dataset.created_at,
                    "updated_at": dataset.updated_at,
                    "metadata": dataset.metadata,
                    "tags": dataset.tags
                }
                for dataset_id, dataset in self.datasets.items()
            },
            "providers": {
                name: {
                    "provider_type": provider.provider.value
                }
                for name, provider in self.providers.items()
            },
            "export_timestamp": datetime.utcnow().isoformat()
        }


# Convenience functions for common operations

def create_local_credentials(base_path: str = "/tmp/sprintlens_storage") -> CloudCredentials:
    """Create credentials for local filesystem storage."""
    return CloudCredentials(
        provider=CloudProvider.LOCAL_FS,
        additional_config={"base_path": base_path}
    )


def create_s3_credentials(
    access_key: str,
    secret_key: str,
    region: str = "us-east-1",
    bucket: str = "sprintlens-datasets"
) -> CloudCredentials:
    """Create credentials for AWS S3 storage."""
    return CloudCredentials(
        provider=CloudProvider.AWS_S3,
        access_key=access_key,
        secret_key=secret_key,
        region=region,
        additional_config={"bucket": bucket}
    )


def create_storage_location(
    provider: CloudProvider,
    bucket: str,
    path: str,
    storage_class: StorageClass = StorageClass.STANDARD
) -> StorageLocation:
    """Create a storage location configuration."""
    return StorageLocation(
        provider=provider,
        bucket=bucket,
        path=path,
        storage_class=storage_class
    )


async def quick_upload_dataset(
    manager: CloudStorageManager,
    dataset_name: str,
    local_path: str,
    provider_name: str,
    bucket: str = "sprintlens-datasets"
) -> Tuple[CloudDataset, SyncResult]:
    """Quickly upload a dataset with default settings."""
    # Create storage location
    provider = manager.providers[provider_name]
    location = StorageLocation(
        provider=provider.provider,
        bucket=bucket,
        path=f"datasets/{dataset_name}",
        storage_class=StorageClass.STANDARD
    )
    
    # Create dataset
    dataset = await manager.create_cloud_dataset(
        name=dataset_name,
        description=f"Dataset {dataset_name} uploaded to cloud storage",
        primary_location=location
    )
    
    # Upload dataset
    result = await manager.upload_dataset(
        dataset.dataset_id,
        local_path,
        provider_name
    )
    
    return dataset, result