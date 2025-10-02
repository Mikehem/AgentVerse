"""
Dataset Versioning System - Sprint Lens SDK

This module provides Git-like versioning capabilities for datasets, enabling:
- Version creation and management
- Data lineage tracking
- Rollback functionality
- Change detection and diffing
- Branch-like functionality for experimentation

Example usage:
    >>> from sprintlens.utils.dataset_versioning import DatasetVersionManager
    >>> 
    >>> # Initialize version manager
    >>> version_manager = DatasetVersionManager(dataset_id="dataset_123")
    >>> 
    >>> # Create a new version
    >>> version = version_manager.create_version(
    ...     data=[{"id": 1, "name": "Alice"}],
    ...     message="Initial dataset creation",
    ...     author="user@example.com"
    ... )
    >>> 
    >>> # List all versions
    >>> versions = version_manager.list_versions()
    >>> 
    >>> # Create a branch for experimentation
    >>> branch = version_manager.create_branch("experimental", base_version=version.id)
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Union, Iterator
from dataclasses import dataclass, asdict
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


@dataclass
class DatasetVersion:
    """Represents a single version of a dataset."""
    id: str
    dataset_id: str
    version_number: int
    parent_version_id: Optional[str]
    branch_name: str
    author: str
    message: str
    timestamp: datetime
    data_hash: str
    metadata: Dict[str, Any]
    tags: List[str]
    size_bytes: int
    record_count: int
    schema_version: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert version to dictionary format."""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DatasetVersion':
        """Create version from dictionary format."""
        data = data.copy()
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


@dataclass
class DatasetBranch:
    """Represents a branch in the dataset version tree."""
    name: str
    dataset_id: str
    head_version_id: str
    created_at: datetime
    created_by: str
    description: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert branch to dictionary format."""
        result = asdict(self)
        result['created_at'] = self.created_at.isoformat()
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DatasetBranch':
        """Create branch from dictionary format."""
        data = data.copy()
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)


@dataclass
class VersionDiff:
    """Represents differences between two dataset versions."""
    from_version_id: str
    to_version_id: str
    added_records: List[Dict[str, Any]]
    removed_records: List[Dict[str, Any]]
    modified_records: List[Dict[str, Any]]
    schema_changes: Dict[str, Any]
    summary: Dict[str, int]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert diff to dictionary format."""
        return asdict(self)


class DatasetVersionManager:
    """
    Manages versions for a dataset with Git-like functionality.
    
    Provides capabilities for:
    - Creating and managing versions
    - Branching and merging
    - Diff generation
    - Rollback functionality
    - Data lineage tracking
    """
    
    def __init__(self, dataset_id: str, storage_backend: Optional[Any] = None):
        """
        Initialize the version manager.
        
        Args:
            dataset_id: Unique identifier for the dataset
            storage_backend: Backend storage system (optional)
        """
        self.dataset_id = dataset_id
        self.storage_backend = storage_backend
        self._versions: Dict[str, DatasetVersion] = {}
        self._branches: Dict[str, DatasetBranch] = {}
        self._version_tree: Dict[str, List[str]] = {}  # parent_id -> [child_ids]
        
        # Initialize main branch
        if "main" not in self._branches:
            self._branches["main"] = DatasetBranch(
                name="main",
                dataset_id=dataset_id,
                head_version_id="",
                created_at=datetime.now(timezone.utc),
                created_by="system",
                description="Main branch"
            )
    
    def create_version(
        self,
        data: List[Dict[str, Any]],
        message: str,
        author: str,
        branch_name: str = "main",
        parent_version_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None
    ) -> DatasetVersion:
        """
        Create a new version of the dataset.
        
        Args:
            data: The dataset records
            message: Commit message describing the changes
            author: Author of the version
            branch_name: Branch to create version on
            parent_version_id: Parent version (auto-detected if None)
            metadata: Additional metadata
            tags: Version tags
            
        Returns:
            DatasetVersion: The created version
        """
        # Generate data hash
        data_hash = self._compute_data_hash(data)
        
        # Auto-detect parent if not specified
        if parent_version_id is None and branch_name in self._branches:
            parent_version_id = self._branches[branch_name].head_version_id or None
        
        # Get next version number
        version_number = self._get_next_version_number()
        
        # Create version
        version = DatasetVersion(
            id=str(uuid.uuid4()),
            dataset_id=self.dataset_id,
            version_number=version_number,
            parent_version_id=parent_version_id,
            branch_name=branch_name,
            author=author,
            message=message,
            timestamp=datetime.now(timezone.utc),
            data_hash=data_hash,
            metadata=metadata or {},
            tags=tags or [],
            size_bytes=len(json.dumps(data).encode('utf-8')),
            record_count=len(data)
        )
        
        # Store version
        self._versions[version.id] = version
        
        # Update version tree
        if parent_version_id:
            if parent_version_id not in self._version_tree:
                self._version_tree[parent_version_id] = []
            self._version_tree[parent_version_id].append(version.id)
        
        # Update branch head
        if branch_name not in self._branches:
            self._branches[branch_name] = DatasetBranch(
                name=branch_name,
                dataset_id=self.dataset_id,
                head_version_id=version.id,
                created_at=datetime.now(timezone.utc),
                created_by=author,
                description=f"Branch created for version {version.id}"
            )
        else:
            self._branches[branch_name].head_version_id = version.id
        
        # Store data if storage backend available
        if self.storage_backend:
            self._store_version_data(version.id, data)
        
        logger.info(f"Created version {version.id} on branch {branch_name}")
        return version
    
    def get_version(self, version_id: str) -> Optional[DatasetVersion]:
        """Get a specific version by ID."""
        return self._versions.get(version_id)
    
    def list_versions(
        self,
        branch_name: Optional[str] = None,
        limit: Optional[int] = None,
        include_data: bool = False
    ) -> List[DatasetVersion]:
        """
        List versions, optionally filtered by branch.
        
        Args:
            branch_name: Filter by branch name
            limit: Maximum number of versions to return
            include_data: Whether to include version data
            
        Returns:
            List of versions sorted by timestamp (newest first)
        """
        versions = list(self._versions.values())
        
        if branch_name:
            versions = [v for v in versions if v.branch_name == branch_name]
        
        # Sort by timestamp (newest first)
        versions.sort(key=lambda v: v.timestamp, reverse=True)
        
        if limit:
            versions = versions[:limit]
        
        return versions
    
    def create_branch(
        self,
        branch_name: str,
        base_version: Optional[str] = None,
        author: str = "system",
        description: Optional[str] = None
    ) -> DatasetBranch:
        """
        Create a new branch.
        
        Args:
            branch_name: Name of the new branch
            base_version: Version to branch from (current head if None)
            author: Author of the branch
            description: Branch description
            
        Returns:
            DatasetBranch: The created branch
        """
        if branch_name in self._branches:
            raise ValueError(f"Branch '{branch_name}' already exists")
        
        # Use main branch head if no base version specified
        if base_version is None:
            main_branch = self._branches.get("main")
            if main_branch and main_branch.head_version_id:
                base_version = main_branch.head_version_id
            else:
                raise ValueError("No base version available for branching")
        
        # Verify base version exists
        if base_version not in self._versions:
            raise ValueError(f"Base version '{base_version}' not found")
        
        # Create branch
        branch = DatasetBranch(
            name=branch_name,
            dataset_id=self.dataset_id,
            head_version_id=base_version,
            created_at=datetime.now(timezone.utc),
            created_by=author,
            description=description
        )
        
        self._branches[branch_name] = branch
        logger.info(f"Created branch '{branch_name}' from version {base_version}")
        return branch
    
    def list_branches(self) -> List[DatasetBranch]:
        """List all branches."""
        return list(self._branches.values())
    
    def get_branch(self, branch_name: str) -> Optional[DatasetBranch]:
        """Get a specific branch."""
        return self._branches.get(branch_name)
    
    def delete_branch(self, branch_name: str) -> bool:
        """
        Delete a branch.
        
        Args:
            branch_name: Name of branch to delete
            
        Returns:
            bool: True if deleted, False if not found
        """
        if branch_name == "main":
            raise ValueError("Cannot delete main branch")
        
        if branch_name in self._branches:
            del self._branches[branch_name]
            logger.info(f"Deleted branch '{branch_name}'")
            return True
        return False
    
    def get_version_data(self, version_id: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get the data for a specific version.
        
        Args:
            version_id: Version ID
            
        Returns:
            List of records or None if not found
        """
        if self.storage_backend:
            return self._load_version_data(version_id)
        else:
            # For demo purposes, return empty data
            logger.warning("No storage backend configured - returning empty data")
            return []
    
    def generate_diff(
        self,
        from_version_id: str,
        to_version_id: str
    ) -> VersionDiff:
        """
        Generate a diff between two versions.
        
        Args:
            from_version_id: Source version
            to_version_id: Target version
            
        Returns:
            VersionDiff: Differences between versions
        """
        from_data = self.get_version_data(from_version_id) or []
        to_data = self.get_version_data(to_version_id) or []
        
        # Convert to dictionaries for easier comparison
        from_records = {self._record_key(r): r for r in from_data}
        to_records = {self._record_key(r): r for r in to_data}
        
        # Find differences
        added_records = []
        removed_records = []
        modified_records = []
        
        # Find added and modified records
        for key, record in to_records.items():
            if key not in from_records:
                added_records.append(record)
            elif from_records[key] != record:
                modified_records.append({
                    'old': from_records[key],
                    'new': record
                })
        
        # Find removed records
        for key, record in from_records.items():
            if key not in to_records:
                removed_records.append(record)
        
        # Schema changes (simplified)
        schema_changes = self._detect_schema_changes(from_data, to_data)
        
        # Summary
        summary = {
            'added': len(added_records),
            'removed': len(removed_records),
            'modified': len(modified_records),
            'total_changes': len(added_records) + len(removed_records) + len(modified_records)
        }
        
        return VersionDiff(
            from_version_id=from_version_id,
            to_version_id=to_version_id,
            added_records=added_records,
            removed_records=removed_records,
            modified_records=modified_records,
            schema_changes=schema_changes,
            summary=summary
        )
    
    def rollback_to_version(
        self,
        version_id: str,
        branch_name: str = "main",
        author: str = "system",
        message: Optional[str] = None
    ) -> DatasetVersion:
        """
        Rollback to a previous version by creating a new version with old data.
        
        Args:
            version_id: Version to rollback to
            branch_name: Branch to create rollback on
            author: Author of the rollback
            message: Rollback message
            
        Returns:
            DatasetVersion: New version with rolled back data
        """
        # Get the target version
        target_version = self.get_version(version_id)
        if not target_version:
            raise ValueError(f"Version '{version_id}' not found")
        
        # Get the data from target version
        data = self.get_version_data(version_id)
        if data is None:
            raise ValueError(f"Could not load data for version '{version_id}'")
        
        # Create new version with the old data
        rollback_message = message or f"Rollback to version {version_id}"
        
        return self.create_version(
            data=data,
            message=rollback_message,
            author=author,
            branch_name=branch_name,
            tags=["rollback"]
        )
    
    def get_version_history(
        self,
        version_id: str,
        max_depth: Optional[int] = None
    ) -> List[DatasetVersion]:
        """
        Get the history (lineage) of a version.
        
        Args:
            version_id: Starting version
            max_depth: Maximum depth to traverse
            
        Returns:
            List of versions in lineage order (newest to oldest)
        """
        history = []
        current_id = version_id
        depth = 0
        
        while current_id and (max_depth is None or depth < max_depth):
            version = self.get_version(current_id)
            if not version:
                break
            
            history.append(version)
            current_id = version.parent_version_id
            depth += 1
        
        return history
    
    def get_children_versions(self, version_id: str) -> List[DatasetVersion]:
        """Get all direct children of a version."""
        child_ids = self._version_tree.get(version_id, [])
        return [self._versions[child_id] for child_id in child_ids if child_id in self._versions]
    
    def tag_version(self, version_id: str, tag: str) -> bool:
        """
        Add a tag to a version.
        
        Args:
            version_id: Version to tag
            tag: Tag to add
            
        Returns:
            bool: True if successful
        """
        version = self.get_version(version_id)
        if version and tag not in version.tags:
            version.tags.append(tag)
            logger.info(f"Added tag '{tag}' to version {version_id}")
            return True
        return False
    
    def remove_tag(self, version_id: str, tag: str) -> bool:
        """
        Remove a tag from a version.
        
        Args:
            version_id: Version to remove tag from
            tag: Tag to remove
            
        Returns:
            bool: True if successful
        """
        version = self.get_version(version_id)
        if version and tag in version.tags:
            version.tags.remove(tag)
            logger.info(f"Removed tag '{tag}' from version {version_id}")
            return True
        return False
    
    def find_versions_by_tag(self, tag: str) -> List[DatasetVersion]:
        """Find all versions with a specific tag."""
        return [v for v in self._versions.values() if tag in v.tags]
    
    def get_dataset_stats(self) -> Dict[str, Any]:
        """Get overall statistics for the dataset."""
        versions = list(self._versions.values())
        if not versions:
            return {
                'total_versions': 0,
                'total_branches': len(self._branches),
                'latest_version': None,
                'total_size_bytes': 0,
                'creation_date': None
            }
        
        # Sort by timestamp
        versions.sort(key=lambda v: v.timestamp)
        
        return {
            'total_versions': len(versions),
            'total_branches': len(self._branches),
            'latest_version': versions[-1].to_dict(),
            'earliest_version': versions[0].to_dict(),
            'total_size_bytes': sum(v.size_bytes for v in versions),
            'creation_date': versions[0].timestamp.isoformat(),
            'last_modified': versions[-1].timestamp.isoformat()
        }
    
    def export_version_metadata(self) -> Dict[str, Any]:
        """Export all version metadata for backup/migration."""
        return {
            'dataset_id': self.dataset_id,
            'versions': {v_id: v.to_dict() for v_id, v in self._versions.items()},
            'branches': {b_name: b.to_dict() for b_name, b in self._branches.items()},
            'version_tree': self._version_tree,
            'export_timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def import_version_metadata(self, metadata: Dict[str, Any]) -> None:
        """Import version metadata from backup/migration."""
        self.dataset_id = metadata['dataset_id']
        
        # Import versions
        self._versions = {
            v_id: DatasetVersion.from_dict(v_data)
            for v_id, v_data in metadata['versions'].items()
        }
        
        # Import branches
        self._branches = {
            b_name: DatasetBranch.from_dict(b_data)
            for b_name, b_data in metadata['branches'].items()
        }
        
        # Import version tree
        self._version_tree = metadata['version_tree']
        
        logger.info(f"Imported metadata for dataset {self.dataset_id}")
    
    # Private helper methods
    
    def _compute_data_hash(self, data: List[Dict[str, Any]]) -> str:
        """Compute SHA-256 hash of the data."""
        data_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(data_str.encode('utf-8')).hexdigest()
    
    def _get_next_version_number(self) -> int:
        """Get the next version number."""
        if not self._versions:
            return 1
        return max(v.version_number for v in self._versions.values()) + 1
    
    def _record_key(self, record: Dict[str, Any]) -> str:
        """Generate a key for a record for comparison purposes."""
        # Use ID field if available, otherwise hash the entire record
        if 'id' in record:
            return str(record['id'])
        return hashlib.md5(json.dumps(record, sort_keys=True).encode()).hexdigest()
    
    def _detect_schema_changes(
        self,
        old_data: List[Dict[str, Any]],
        new_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Detect schema changes between two datasets."""
        old_fields = set()
        new_fields = set()
        
        for record in old_data:
            old_fields.update(record.keys())
        
        for record in new_data:
            new_fields.update(record.keys())
        
        return {
            'added_fields': list(new_fields - old_fields),
            'removed_fields': list(old_fields - new_fields),
            'common_fields': list(old_fields & new_fields)
        }
    
    def _store_version_data(self, version_id: str, data: List[Dict[str, Any]]) -> None:
        """Store version data using the storage backend."""
        if self.storage_backend:
            self.storage_backend.store_version_data(version_id, data)
    
    def _load_version_data(self, version_id: str) -> Optional[List[Dict[str, Any]]]:
        """Load version data using the storage backend."""
        if self.storage_backend:
            return self.storage_backend.load_version_data(version_id)
        return None


class InMemoryVersionStorage:
    """Simple in-memory storage backend for testing."""
    
    def __init__(self):
        self._data_store: Dict[str, List[Dict[str, Any]]] = {}
    
    def store_version_data(self, version_id: str, data: List[Dict[str, Any]]) -> None:
        """Store version data."""
        self._data_store[version_id] = data.copy()
    
    def load_version_data(self, version_id: str) -> Optional[List[Dict[str, Any]]]:
        """Load version data."""
        return self._data_store.get(version_id)
    
    def delete_version_data(self, version_id: str) -> bool:
        """Delete version data."""
        if version_id in self._data_store:
            del self._data_store[version_id]
            return True
        return False


# Utility functions for common versioning operations

def create_version_manager(
    dataset_id: str,
    with_storage: bool = True
) -> DatasetVersionManager:
    """
    Create a dataset version manager with optional storage.
    
    Args:
        dataset_id: Dataset identifier
        with_storage: Whether to include in-memory storage
        
    Returns:
        DatasetVersionManager: Configured version manager
    """
    storage = InMemoryVersionStorage() if with_storage else None
    return DatasetVersionManager(dataset_id, storage)


def compare_versions(
    manager: DatasetVersionManager,
    version1_id: str,
    version2_id: str
) -> VersionDiff:
    """
    Utility function to compare two versions.
    
    Args:
        manager: Version manager instance
        version1_id: First version ID
        version2_id: Second version ID
        
    Returns:
        VersionDiff: Comparison results
    """
    return manager.generate_diff(version1_id, version2_id)


def create_snapshot(
    manager: DatasetVersionManager,
    data: List[Dict[str, Any]],
    message: str = "Automatic snapshot",
    author: str = "system"
) -> DatasetVersion:
    """
    Create a snapshot version with automatic tagging.
    
    Args:
        manager: Version manager instance
        data: Dataset data
        message: Snapshot message
        author: Snapshot author
        
    Returns:
        DatasetVersion: Created snapshot version
    """
    return manager.create_version(
        data=data,
        message=message,
        author=author,
        tags=["snapshot", f"auto-{datetime.now().strftime('%Y%m%d-%H%M%S')}"]
    )