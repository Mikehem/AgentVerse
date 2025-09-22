"""
Opik-Compatible Python SDK for Sprint Agent Lens

This module provides a full Opik-compatible interface that integrates
with the Sprint Agent Lens backend while maintaining API compatibility
with existing Opik workflows.
"""

import json
import os
import requests
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, asdict

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    pd = None

try:
    from sprint_trace import SprintAgentLens, Trace
    HAS_SPRINT_TRACE = True
except ImportError:
    HAS_SPRINT_TRACE = False
    SprintAgentLens = None
    Trace = None


@dataclass
class DatasetItem:
    """Dataset item compatible with Opik format."""
    input_data: Dict[str, Any]
    expected_output: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class DatasetInfo:
    """Dataset information."""
    id: str
    name: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    item_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class OpikSDKError(Exception):
    """Custom exception for Opik SDK errors."""
    pass


class Dataset:
    """
    Opik-compatible Dataset class that manages datasets in Sprint Agent Lens.
    
    This class provides the same interface as Opik's Dataset class but integrates
    with Sprint Agent Lens backend infrastructure.
    """
    
    def __init__(self, dataset_info: DatasetInfo, client: 'OpikClient'):
        self._info = dataset_info
        self._client = client
        self._base_url = client._base_url
        self._headers = client._get_headers()
    
    @property
    def info(self) -> DatasetInfo:
        """Get dataset information."""
        return self._info
    
    @property
    def id(self) -> str:
        """Get dataset ID."""
        return self._info.id
    
    @property
    def name(self) -> str:
        """Get dataset name."""
        return self._info.name
    
    def insert(self, items: List[Union[Dict[str, Any], DatasetItem]]) -> None:
        """
        Insert items into the dataset.
        
        Args:
            items: List of items to insert. Can be dictionaries or DatasetItem objects.
        
        Raises:
            OpikSDKError: If insertion fails.
        """
        try:
            # Convert items to proper format
            formatted_items = []
            for item in items:
                if isinstance(item, dict):
                    formatted_item = {
                        'input_data': item.get('input_data', item),
                        'expected_output': item.get('expected_output'),
                        'metadata': item.get('metadata', {})
                    }
                elif isinstance(item, DatasetItem):
                    formatted_item = asdict(item)
                else:
                    raise OpikSDKError(f"Invalid item type: {type(item)}")
                
                formatted_items.append(formatted_item)
            
            response = requests.post(
                f"{self._base_url}/api/v1/datasets/{self.id}/items",
                headers=self._headers,
                json=formatted_items
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to insert items: {response.text}")
            
            # Update item count
            self._info.item_count += len(items)
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error inserting items: {str(e)}")
    
    def insert_from_pandas(self, dataframe) -> None:
        """
        Insert items from a pandas DataFrame.
        
        Args:
            dataframe: DataFrame containing the data to insert.
            
        Raises:
            OpikSDKError: If insertion fails or pandas not available.
        """
        if not HAS_PANDAS:
            raise OpikSDKError("pandas is required for insert_from_pandas. Install with: pip install pandas")
        
        try:
            items = []
            for _, row in dataframe.iterrows():
                item = DatasetItem(
                    input_data=row.get('input_data', row.to_dict()),
                    expected_output=row.get('expected_output'),
                    metadata=row.get('metadata', {})
                )
                items.append(item)
            
            self.insert(items)
            
        except Exception as e:
            raise OpikSDKError(f"Failed to insert from pandas: {str(e)}")
    
    def read_jsonl_from_file(self, file_path: str) -> None:
        """
        Read and insert items from a JSONL file.
        
        Args:
            file_path: Path to the JSONL file.
            
        Raises:
            OpikSDKError: If reading or insertion fails.
        """
        try:
            items = []
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        data = json.loads(line)
                        item = DatasetItem(
                            input_data=data.get('input_data', data),
                            expected_output=data.get('expected_output'),
                            metadata=data.get('metadata', {})
                        )
                        items.append(item)
            
            if items:
                self.insert(items)
                
        except FileNotFoundError:
            raise OpikSDKError(f"File not found: {file_path}")
        except json.JSONDecodeError as e:
            raise OpikSDKError(f"Invalid JSON in file: {str(e)}")
        except Exception as e:
            raise OpikSDKError(f"Failed to read JSONL file: {str(e)}")
    
    def to_pandas(self):
        """
        Download dataset as pandas DataFrame.
        
        Returns:
            DataFrame containing all dataset items.
            
        Raises:
            OpikSDKError: If download fails or pandas not available.
        """
        if not HAS_PANDAS:
            raise OpikSDKError("pandas is required for to_pandas. Install with: pip install pandas")
            
        try:
            response = requests.get(
                f"{self._base_url}/api/v1/datasets/{self.id}/items",
                headers=self._headers
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to download dataset: {response.text}")
            
            result = response.json()
            items = result.get('data', [])
            
            if not items:
                return pd.DataFrame()
            
            # Convert to flat structure for DataFrame
            rows = []
            for item in items:
                row = {
                    'input_data': item.get('input_data'),
                    'expected_output': item.get('expected_output'),
                    'metadata': item.get('metadata', {})
                }
                rows.append(row)
            
            return pd.DataFrame(rows)
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error downloading dataset: {str(e)}")
    
    def to_json(self) -> List[Dict[str, Any]]:
        """
        Download dataset as JSON.
        
        Returns:
            List of dataset items as dictionaries.
            
        Raises:
            OpikSDKError: If download fails.
        """
        try:
            response = requests.get(
                f"{self._base_url}/api/v1/datasets/{self.id}/items",
                headers=self._headers
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to download dataset: {response.text}")
            
            result = response.json()
            return result.get('data', [])
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error downloading dataset: {str(e)}")
    
    def clear(self) -> None:
        """
        Clear all items from the dataset.
        
        Raises:
            OpikSDKError: If clearing fails.
        """
        try:
            response = requests.delete(
                f"{self._base_url}/api/v1/datasets/{self.id}/items",
                headers=self._headers
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to clear dataset: {response.text}")
            
            self._info.item_count = 0
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error clearing dataset: {str(e)}")
    
    def delete(self) -> None:
        """
        Delete the dataset.
        
        Raises:
            OpikSDKError: If deletion fails.
        """
        try:
            response = requests.delete(
                f"{self._base_url}/api/v1/datasets/{self.id}",
                headers=self._headers
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to delete dataset: {response.text}")
                
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error deleting dataset: {str(e)}")
    
    @property
    def size(self) -> int:
        """Get dataset size (Opik compatibility)."""
        return self._info.item_count
    
    def __len__(self) -> int:
        """Get dataset size."""
        return self._info.item_count
    
    def __repr__(self) -> str:
        return f"Dataset(name='{self.name}', id='{self.id}', size={len(self)})"


class OpikClient:
    """
    Opik-compatible client for Sprint Agent Lens.
    
    This client provides the same interface as Opik but integrates with
    Sprint Agent Lens backend infrastructure.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        endpoint: Optional[str] = None,
        workspace: Optional[str] = None,
        project_name: Optional[str] = None
    ):
        """
        Initialize the Opik client.
        
        Args:
            api_key: API key for authentication (optional for local development).
            endpoint: Sprint Agent Lens endpoint URL.
            workspace: Workspace name (for compatibility, not used).
            project_name: Default project name for datasets.
        """
        self._api_key = api_key or os.getenv('SPRINT_AGENT_LENS_API_KEY')
        self._base_url = endpoint or os.getenv('SPRINT_AGENT_LENS_ENDPOINT', 'http://localhost:3000')
        self._workspace = workspace
        self._project_name = project_name or os.getenv('SPRINT_AGENT_LENS_PROJECT', 'default')
        
        # Initialize underlying Sprint Agent Lens client (optional)
        self._sprint_client = None
        if HAS_SPRINT_TRACE:
            try:
                self._sprint_client = SprintAgentLens(
                    service_name="opik-integration",
                    environment="production",
                    endpoint=self._base_url
                )
            except Exception:
                # Continue without sprint trace if initialization fails
                pass
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        headers = {
            'Content-Type': 'application/json'
        }
        
        if self._api_key:
            headers['Authorization'] = f'Bearer {self._api_key}'
        
        return headers
    
    def get_or_create_dataset(self, name: str, description: Optional[str] = None) -> Dataset:
        """
        Get or create a dataset (Opik-compatible method).
        
        Args:
            name: Dataset name.
            description: Dataset description.
            
        Returns:
            Dataset object.
            
        Raises:
            OpikSDKError: If operation fails.
        """
        try:
            # Try to find existing dataset
            datasets = self.list_datasets()
            for dataset_info in datasets:
                if dataset_info.name == name:
                    return Dataset(dataset_info, self)
            
            # Create new dataset if not found
            response = requests.post(
                f"{self._base_url}/api/v1/datasets",
                headers=self._get_headers(),
                json={
                    'name': name,
                    'description': description or f'Dataset created via Opik integration',
                    'project_id': self._project_name,
                    'metadata': {
                        'source': 'opik_integration',
                        'created_by': 'opik_client'
                    }
                }
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to create dataset: {response.text}")
            
            result = response.json()
            dataset_data = result.get('data', {})
            
            dataset_info = DatasetInfo(
                id=dataset_data['id'],
                name=dataset_data['name'],
                description=dataset_data.get('description'),
                project_id=dataset_data.get('project_id'),
                project_name=dataset_data.get('project_name'),
                item_count=dataset_data.get('item_count', 0),
                created_at=dataset_data.get('created_at'),
                updated_at=dataset_data.get('updated_at')
            )
            
            return Dataset(dataset_info, self)
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error: {str(e)}")
    
    def list_datasets(self) -> List[DatasetInfo]:
        """
        List all datasets.
        
        Returns:
            List of DatasetInfo objects.
            
        Raises:
            OpikSDKError: If listing fails.
        """
        try:
            response = requests.get(
                f"{self._base_url}/api/v1/datasets",
                headers=self._get_headers()
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to list datasets: {response.text}")
            
            result = response.json()
            datasets_data = result.get('data', [])
            
            datasets = []
            for data in datasets_data:
                dataset_info = DatasetInfo(
                    id=data['id'],
                    name=data['name'],
                    description=data.get('description'),
                    project_id=data.get('project_id'),
                    project_name=data.get('project_name'),
                    item_count=data.get('item_count', 0),
                    created_at=data.get('created_at'),
                    updated_at=data.get('updated_at')
                )
                datasets.append(dataset_info)
            
            return datasets
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error: {str(e)}")
    
    def get_dataset(self, dataset_id: str) -> Dataset:
        """
        Get dataset by ID.
        
        Args:
            dataset_id: Dataset ID.
            
        Returns:
            Dataset object.
            
        Raises:
            OpikSDKError: If dataset not found or operation fails.
        """
        try:
            response = requests.get(
                f"{self._base_url}/api/v1/datasets/{dataset_id}",
                headers=self._get_headers()
            )
            
            if not response.ok:
                raise OpikSDKError(f"Failed to get dataset: {response.text}")
            
            result = response.json()
            data = result.get('data', {})
            
            dataset_info = DatasetInfo(
                id=data['id'],
                name=data['name'],
                description=data.get('description'),
                project_id=data.get('project_id'),
                project_name=data.get('project_name'),
                item_count=data.get('item_count', 0),
                created_at=data.get('created_at'),
                updated_at=data.get('updated_at')
            )
            
            return Dataset(dataset_info, self)
            
        except requests.RequestException as e:
            raise OpikSDKError(f"Network error: {str(e)}")


# Global client instance for convenience
_global_client: Optional[OpikClient] = None


def configure(
    api_key: Optional[str] = None,
    endpoint: Optional[str] = None,
    workspace: Optional[str] = None,
    project_name: Optional[str] = None
) -> OpikClient:
    """
    Configure global Opik client.
    
    Args:
        api_key: API key for authentication.
        endpoint: Sprint Agent Lens endpoint URL.
        workspace: Workspace name (for compatibility).
        project_name: Default project name.
        
    Returns:
        Configured OpikClient instance.
    """
    global _global_client
    _global_client = OpikClient(
        api_key=api_key,
        endpoint=endpoint,
        workspace=workspace,
        project_name=project_name
    )
    return _global_client


def get_or_create_dataset(name: str, description: Optional[str] = None) -> Dataset:
    """
    Get or create dataset using global client.
    
    Args:
        name: Dataset name.
        description: Dataset description.
        
    Returns:
        Dataset object.
        
    Raises:
        OpikSDKError: If no global client configured or operation fails.
    """
    global _global_client
    if _global_client is None:
        _global_client = OpikClient()
    
    return _global_client.get_or_create_dataset(name, description)


# Export main classes and functions
__all__ = [
    'OpikClient',
    'Dataset',
    'DatasetItem',
    'DatasetInfo',
    'OpikSDKError',
    'configure',
    'get_or_create_dataset'
]