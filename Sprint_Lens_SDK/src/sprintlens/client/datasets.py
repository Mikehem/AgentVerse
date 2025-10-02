"""
Dataset client for Sprint Lens SDK.

This module provides client functionality for managing datasets in the backend.
"""

import asyncio
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime
import uuid

from .base import BaseClient
from ..evaluation.dataset import EvaluationDataset, DatasetItem
from ..utils.logging import get_logger
from ..utils.format_converter import DataFormatConverter
from ..utils.smart_detection import SmartColumnDetector, DetectionResult
from ..utils.query_builder import QueryBuilder, QueryResult
from ..utils.schema_validation import (
    DatasetSchema, SchemaValidator, ValidationResult as SchemaValidationResult
)
from ..utils.data_profiling import (
    DataProfiler, DatasetProfile, create_dashboard_data
)
from ..utils.file_formats import (
    parse_file, detect_file_format, FileFormat, ParseResult, check_dependencies
)
from ..utils.dataset_versioning import (
    DatasetVersionManager, DatasetVersion, DatasetBranch, VersionDiff,
    create_version_manager, InMemoryVersionStorage
)
from ..utils.data_visualization import (
    DataVisualizer, ChartData, DashboardLayout,
    create_quick_histogram, create_quick_pie_chart, create_dashboard_from_profile
)
from ..utils.collaboration import (
    CollaborationManager, User, Team, Permission, Comment, Annotation, Activity, Notification,
    PermissionLevel, CommentType, AnnotationType, ActivityType, NotificationType
)
from ..utils.cloud_storage import (
    CloudStorageManager, CloudDataset, StorageLocation, CloudCredentials, SyncResult,
    CloudProvider, StorageClass, SyncStatus, create_local_credentials, create_s3_credentials,
    create_storage_location, quick_upload_dataset
)

logger = get_logger(__name__)


class DatasetClient(BaseClient):
    """
    Client for managing datasets in Sprint Lens backend.
    
    Provides functionality to create, retrieve, update, and delete datasets,
    as well as manage dataset items and export data.
    """
    
    def create_dataset(
        self,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new dataset.
        
        Args:
            name: Dataset name
            description: Optional description
            metadata: Optional metadata
            
        Returns:
            Created dataset information
        """
        return asyncio.run(self.create_dataset_async(name, description, metadata))
    
    async def create_dataset_async(
        self,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously create a new dataset.
        
        Args:
            name: Dataset name
            description: Optional description
            metadata: Optional metadata
            
        Returns:
            Created dataset information
        """
        payload = {
            "name": name,
            "description": description,
            "metadata": metadata or {}
        }
        
        response = await self.http_client.post_async(
            self.endpoints.datasets(),
            data=payload
        )
        
        if response.success:
            logger.info(f"Created dataset: {name}")
            return response.data
        else:
            raise Exception(f"Failed to create dataset: {response.error}")
    
    def get_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """
        Retrieve a dataset by ID.
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            Dataset information
        """
        return asyncio.run(self.get_dataset_async(dataset_id))
    
    async def get_dataset_async(self, dataset_id: str) -> Dict[str, Any]:
        """
        Asynchronously retrieve a dataset by ID.
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            Dataset information
        """
        response = await self.http_client.get_async(
            self.endpoints.datasets(dataset_id)
        )
        
        if response.success:
            return response.data
        else:
            raise Exception(f"Failed to retrieve dataset {dataset_id}: {response.error}")
    
    def list_datasets(
        self,
        limit: int = 100,
        offset: int = 0,
        name_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List datasets with optional filtering.
        
        Args:
            limit: Maximum number of datasets to return
            offset: Number of datasets to skip
            name_filter: Optional name filter
            
        Returns:
            List of datasets with pagination info
        """
        return asyncio.run(self.list_datasets_async(limit, offset, name_filter))
    
    async def list_datasets_async(
        self,
        limit: int = 100,
        offset: int = 0,
        name_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously list datasets with optional filtering.
        
        Args:
            limit: Maximum number of datasets to return
            offset: Number of datasets to skip
            name_filter: Optional name filter
            
        Returns:
            List of datasets with pagination info
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if name_filter:
            params["name"] = name_filter
        
        response = await self.http_client.get_async(
            self.endpoints.datasets(**params)
        )
        
        if response.success:
            return response.data
        else:
            raise Exception(f"Failed to list datasets: {response.error}")
    
    def update_dataset(
        self,
        dataset_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update an existing dataset.
        
        Args:
            dataset_id: Dataset ID
            name: Optional new name
            description: Optional new description
            metadata: Optional new metadata
            
        Returns:
            Updated dataset information
        """
        return asyncio.run(self.update_dataset_async(dataset_id, name, description, metadata))
    
    async def update_dataset_async(
        self,
        dataset_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously update an existing dataset.
        
        Args:
            dataset_id: Dataset ID
            name: Optional new name
            description: Optional new description
            metadata: Optional new metadata
            
        Returns:
            Updated dataset information
        """
        payload = {}
        if name is not None:
            payload["name"] = name
        if description is not None:
            payload["description"] = description
        if metadata is not None:
            payload["metadata"] = metadata
        
        response = await self.http_client.put_async(
            self.endpoints.datasets(dataset_id),
            data=payload
        )
        
        if response.success:
            logger.info(f"Updated dataset: {dataset_id}")
            return response.data
        else:
            raise Exception(f"Failed to update dataset {dataset_id}: {response.error}")
    
    def delete_dataset(self, dataset_id: str) -> bool:
        """
        Delete a dataset.
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            True if deletion was successful
        """
        return asyncio.run(self.delete_dataset_async(dataset_id))
    
    async def delete_dataset_async(self, dataset_id: str) -> bool:
        """
        Asynchronously delete a dataset.
        
        Args:
            dataset_id: Dataset ID
            
        Returns:
            True if deletion was successful
        """
        response = await self.http_client.delete_async(
            self.endpoints.datasets(dataset_id)
        )
        
        if response.success:
            logger.info(f"Deleted dataset: {dataset_id}")
            return True
        else:
            raise Exception(f"Failed to delete dataset {dataset_id}: {response.error}")
    
    # Dataset Items Management
    
    def add_dataset_item(
        self,
        dataset_id: str,
        prediction: Any,
        ground_truth: Any,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Add an item to a dataset.
        
        Args:
            dataset_id: Dataset ID
            prediction: Predicted value
            ground_truth: Ground truth value
            context: Optional context
            metadata: Optional metadata
            
        Returns:
            Created dataset item information
        """
        return asyncio.run(self.add_dataset_item_async(
            dataset_id, prediction, ground_truth, context, metadata
        ))
    
    async def add_dataset_item_async(
        self,
        dataset_id: str,
        prediction: Any,
        ground_truth: Any,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously add an item to a dataset.
        
        Args:
            dataset_id: Dataset ID
            prediction: Predicted value
            ground_truth: Ground truth value
            context: Optional context
            metadata: Optional metadata
            
        Returns:
            Created dataset item information
        """
        payload = {
            "prediction": prediction,
            "ground_truth": ground_truth,
            "context": context,
            "metadata": metadata or {}
        }
        
        response = await self.http_client.post_async(
            self.endpoints.dataset_items(dataset_id),
            data=payload
        )
        
        if response.success:
            logger.debug(f"Added item to dataset {dataset_id}")
            return response.data
        else:
            raise Exception(f"Failed to add item to dataset {dataset_id}: {response.error}")
    
    def get_dataset_item(self, dataset_id: str, item_id: str) -> Dict[str, Any]:
        """
        Retrieve a specific dataset item.
        
        Args:
            dataset_id: Dataset ID
            item_id: Item ID
            
        Returns:
            Dataset item information
        """
        return asyncio.run(self.get_dataset_item_async(dataset_id, item_id))
    
    async def get_dataset_item_async(self, dataset_id: str, item_id: str) -> Dict[str, Any]:
        """
        Asynchronously retrieve a specific dataset item.
        
        Args:
            dataset_id: Dataset ID
            item_id: Item ID
            
        Returns:
            Dataset item information
        """
        response = await self.http_client.get_async(
            self.endpoints.dataset_items(dataset_id, item_id)
        )
        
        if response.success:
            return response.data
        else:
            raise Exception(f"Failed to retrieve item {item_id} from dataset {dataset_id}: {response.error}")
    
    def list_dataset_items(
        self,
        dataset_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        List items in a dataset.
        
        Args:
            dataset_id: Dataset ID
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of dataset items with pagination info
        """
        return asyncio.run(self.list_dataset_items_async(dataset_id, limit, offset))
    
    async def list_dataset_items_async(
        self,
        dataset_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Asynchronously list items in a dataset.
        
        Args:
            dataset_id: Dataset ID
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of dataset items with pagination info
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        response = await self.http_client.get_async(
            self.endpoints.dataset_items(dataset_id, **params)
        )
        
        if response.success:
            return response.data
        else:
            raise Exception(f"Failed to list items for dataset {dataset_id}: {response.error}")
    
    def update_dataset_item(
        self,
        dataset_id: str,
        item_id: str,
        prediction: Optional[Any] = None,
        ground_truth: Optional[Any] = None,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update a dataset item.
        
        Args:
            dataset_id: Dataset ID
            item_id: Item ID
            prediction: Optional new prediction
            ground_truth: Optional new ground truth
            context: Optional new context
            metadata: Optional new metadata
            
        Returns:
            Updated dataset item information
        """
        return asyncio.run(self.update_dataset_item_async(
            dataset_id, item_id, prediction, ground_truth, context, metadata
        ))
    
    async def update_dataset_item_async(
        self,
        dataset_id: str,
        item_id: str,
        prediction: Optional[Any] = None,
        ground_truth: Optional[Any] = None,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously update a dataset item.
        
        Args:
            dataset_id: Dataset ID
            item_id: Item ID
            prediction: Optional new prediction
            ground_truth: Optional new ground truth
            context: Optional new context
            metadata: Optional new metadata
            
        Returns:
            Updated dataset item information
        """
        payload = {}
        if prediction is not None:
            payload["prediction"] = prediction
        if ground_truth is not None:
            payload["ground_truth"] = ground_truth
        if context is not None:
            payload["context"] = context
        if metadata is not None:
            payload["metadata"] = metadata
        
        response = await self.http_client.put_async(
            self.endpoints.dataset_items(dataset_id, item_id),
            data=payload
        )
        
        if response.success:
            logger.debug(f"Updated item {item_id} in dataset {dataset_id}")
            return response.data
        else:
            raise Exception(f"Failed to update item {item_id} in dataset {dataset_id}: {response.error}")
    
    def delete_dataset_item(self, dataset_id: str, item_id: str) -> bool:
        """
        Delete a dataset item.
        
        Args:
            dataset_id: Dataset ID
            item_id: Item ID
            
        Returns:
            True if deletion was successful
        """
        return asyncio.run(self.delete_dataset_item_async(dataset_id, item_id))
    
    async def delete_dataset_item_async(self, dataset_id: str, item_id: str) -> bool:
        """
        Asynchronously delete a dataset item.
        
        Args:
            dataset_id: Dataset ID
            item_id: Item ID
            
        Returns:
            True if deletion was successful
        """
        response = await self.http_client.delete_async(
            self.endpoints.dataset_items(dataset_id, item_id)
        )
        
        if response.success:
            logger.debug(f"Deleted item {item_id} from dataset {dataset_id}")
            return True
        else:
            raise Exception(f"Failed to delete item {item_id} from dataset {dataset_id}: {response.error}")
    
    # Bulk Operations
    
    def add_dataset_items_bulk(
        self,
        dataset_id: str,
        items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Add multiple items to a dataset in bulk.
        
        Args:
            dataset_id: Dataset ID
            items: List of item dictionaries with prediction, ground_truth, etc.
            
        Returns:
            Bulk operation result
        """
        return asyncio.run(self.add_dataset_items_bulk_async(dataset_id, items))
    
    async def add_dataset_items_bulk_async(
        self,
        dataset_id: str,
        items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Asynchronously add multiple items to a dataset in bulk.
        
        Args:
            dataset_id: Dataset ID
            items: List of item dictionaries with prediction, ground_truth, etc.
            
        Returns:
            Bulk operation result
        """
        payload = {"items": items}
        
        response = await self.http_client.post_async(
            self.endpoints.dataset_items(dataset_id) + "/bulk",
            data=payload
        )
        
        if response.success:
            logger.info(f"Added {len(items)} items to dataset {dataset_id}")
            return response.data
        else:
            raise Exception(f"Failed to add bulk items to dataset {dataset_id}: {response.error}")
    
    # Integration with EvaluationDataset
    
    def upload_evaluation_dataset(
        self,
        dataset: EvaluationDataset,
        dataset_id: Optional[str] = None
    ) -> str:
        """
        Upload an EvaluationDataset to the backend.
        
        Args:
            dataset: EvaluationDataset to upload
            dataset_id: Optional existing dataset ID to update
            
        Returns:
            Dataset ID of the uploaded/created dataset
        """
        return asyncio.run(self.upload_evaluation_dataset_async(dataset, dataset_id))
    
    async def upload_evaluation_dataset_async(
        self,
        dataset: EvaluationDataset,
        dataset_id: Optional[str] = None
    ) -> str:
        """
        Asynchronously upload an EvaluationDataset to the backend.
        
        Args:
            dataset: EvaluationDataset to upload
            dataset_id: Optional existing dataset ID to update
            
        Returns:
            Dataset ID of the uploaded/created dataset
        """
        # Create or update dataset
        if dataset_id:
            # Update existing dataset
            await self.update_dataset_async(
                dataset_id,
                name=dataset.name,
                description=dataset.description,
                metadata=dataset.metadata
            )
        else:
            # Create new dataset
            result = await self.create_dataset_async(
                name=dataset.name,
                description=dataset.description,
                metadata=dataset.metadata
            )
            dataset_id = result["id"]
        
        # Prepare items for bulk upload
        items = []
        for item in dataset.items:
            items.append({
                "prediction": item.prediction,
                "ground_truth": item.ground_truth,
                "context": item.context,
                "metadata": item.metadata
            })
        
        # Upload items in batches
        batch_size = 100  # Backend-dependent batch size limit
        for i in range(0, len(items), batch_size):
            batch_items = items[i:i + batch_size]
            await self.add_dataset_items_bulk_async(dataset_id, batch_items)
        
        logger.info(f"Uploaded evaluation dataset '{dataset.name}' with {len(items)} items")
        return dataset_id
    
    def download_evaluation_dataset(self, dataset_id: str) -> EvaluationDataset:
        """
        Download a dataset from the backend as an EvaluationDataset.
        
        Args:
            dataset_id: Dataset ID to download
            
        Returns:
            EvaluationDataset object
        """
        return asyncio.run(self.download_evaluation_dataset_async(dataset_id))
    
    async def download_evaluation_dataset_async(self, dataset_id: str) -> EvaluationDataset:
        """
        Asynchronously download a dataset from the backend as an EvaluationDataset.
        
        Args:
            dataset_id: Dataset ID to download
            
        Returns:
            EvaluationDataset object
        """
        # Get dataset metadata
        dataset_info = await self.get_dataset_async(dataset_id)
        
        # Get all dataset items
        all_items = []
        offset = 0
        limit = 1000
        
        while True:
            items_response = await self.list_dataset_items_async(dataset_id, limit, offset)
            items = items_response.get("items", [])
            
            if not items:
                break
                
            all_items.extend(items)
            
            # Check if there are more items
            if len(items) < limit:
                break
                
            offset += limit
        
        # Convert to DatasetItem objects
        dataset_items = []
        for item_data in all_items:
            item = DatasetItem(
                id=item_data.get("id", str(uuid.uuid4())),
                prediction=item_data.get("prediction"),
                ground_truth=item_data.get("ground_truth"),
                context=item_data.get("context"),
                metadata=item_data.get("metadata", {}),
                created_at=item_data.get("created_at", datetime.now().isoformat())
            )
            dataset_items.append(item)
        
        # Create EvaluationDataset
        evaluation_dataset = EvaluationDataset(
            name=dataset_info["name"],
            items=dataset_items,
            description=dataset_info.get("description"),
            metadata=dataset_info.get("metadata", {})
        )
        
        # Set creation time if available
        if "created_at" in dataset_info:
            evaluation_dataset.created_at = dataset_info["created_at"]
        
        logger.info(f"Downloaded dataset '{evaluation_dataset.name}' with {len(dataset_items)} items")
        return evaluation_dataset
    
    # Export functionality
    
    def export_dataset(
        self,
        dataset_id: str,
        format: str = "json",
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Export a dataset in the specified format.
        
        Args:
            dataset_id: Dataset ID to export
            format: Export format ("json", "csv", "parquet")
            include_metadata: Whether to include metadata in export
            
        Returns:
            Export result with download information
        """
        return asyncio.run(self.export_dataset_async(dataset_id, format, include_metadata))
    
    async def export_dataset_async(
        self,
        dataset_id: str,
        format: str = "json",
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Asynchronously export a dataset in the specified format.
        
        Args:
            dataset_id: Dataset ID to export
            format: Export format ("json", "csv", "parquet")
            include_metadata: Whether to include metadata in export
            
        Returns:
            Export result with download information
        """
        params = {
            "format": format,
            "include_metadata": include_metadata
        }
        
        response = await self.http_client.get_async(
            self.endpoints.export_dataset(dataset_id, **params)
        )
        
        if response.success:
            logger.info(f"Exported dataset {dataset_id} as {format}")
            return response.data
        else:
            raise Exception(f"Failed to export dataset {dataset_id}: {response.error}")
    
    # Search and filtering
    
    def search_datasets(
        self,
        query: str,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search datasets by name or description.
        
        Args:
            query: Search query
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            Search results with pagination info
        """
        return asyncio.run(self.search_datasets_async(query, limit, offset))
    
    async def search_datasets_async(
        self,
        query: str,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Asynchronously search datasets by name or description.
        
        Args:
            query: Search query
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            Search results with pagination info
        """
        params = {
            "q": query,
            "limit": limit,
            "offset": offset
        }
        
        response = await self.http_client.get_async(
            self.endpoints.datasets_search(**params)
        )
        
        if response.success:
            return response.data
        else:
            raise Exception(f"Failed to search datasets: {response.error}")
    
    # Format conversion methods
    
    def create_dataset_from_dataframe(
        self,
        df,
        name: str,
        description: Optional[str] = None,
        prediction_col: str = "prediction",
        ground_truth_col: str = "ground_truth",
        context_col: Optional[str] = "context",
        id_col: Optional[str] = "id",
        metadata_cols: Optional[List[str]] = None
    ) -> str:
        """
        Create a dataset from a pandas DataFrame.
        
        Args:
            df: pandas DataFrame containing the data
            name: Dataset name
            description: Optional dataset description
            prediction_col: Column name for predictions
            ground_truth_col: Column name for ground truth values
            context_col: Column name for context (optional)
            id_col: Column name for item IDs (optional)
            metadata_cols: List of columns to include as metadata
            
        Returns:
            Created dataset ID
        """
        return asyncio.run(self.create_dataset_from_dataframe_async(
            df, name, description, prediction_col, ground_truth_col, 
            context_col, id_col, metadata_cols
        ))
    
    async def create_dataset_from_dataframe_async(
        self,
        df,
        name: str,
        description: Optional[str] = None,
        prediction_col: str = "prediction",
        ground_truth_col: str = "ground_truth",
        context_col: Optional[str] = "context",
        id_col: Optional[str] = "id",
        metadata_cols: Optional[List[str]] = None
    ) -> str:
        """
        Asynchronously create a dataset from a pandas DataFrame.
        
        Args:
            df: pandas DataFrame containing the data
            name: Dataset name
            description: Optional dataset description
            prediction_col: Column name for predictions
            ground_truth_col: Column name for ground truth values
            context_col: Column name for context (optional)
            id_col: Column name for item IDs (optional)
            metadata_cols: List of columns to include as metadata
            
        Returns:
            Created dataset ID
        """
        # Convert DataFrame to EvaluationDataset
        eval_dataset = DataFormatConverter.dataframe_to_evaluation_dataset(
            df=df,
            name=name,
            prediction_col=prediction_col,
            ground_truth_col=ground_truth_col,
            context_col=context_col,
            id_col=id_col,
            description=description,
            metadata_cols=metadata_cols
        )
        
        # Upload to backend
        dataset_id = await self.upload_evaluation_dataset_async(eval_dataset)
        
        logger.info(f"Created dataset '{name}' from DataFrame with {len(df)} rows")
        return dataset_id
    
    def create_dataset_from_json(
        self,
        json_data: Union[str, Dict[str, Any], List[Dict[str, Any]]],
        name: str,
        description: Optional[str] = None,
        prediction_key: str = "prediction",
        ground_truth_key: str = "ground_truth",
        context_key: str = "context",
        id_key: str = "id"
    ) -> str:
        """
        Create a dataset from JSON data.
        
        Args:
            json_data: JSON string, dict, or list of dicts
            name: Dataset name
            description: Optional dataset description
            prediction_key: Key for prediction values in JSON
            ground_truth_key: Key for ground truth values in JSON
            context_key: Key for context values in JSON
            id_key: Key for item IDs in JSON
            
        Returns:
            Created dataset ID
        """
        return asyncio.run(self.create_dataset_from_json_async(
            json_data, name, description, prediction_key, ground_truth_key, 
            context_key, id_key
        ))
    
    async def create_dataset_from_json_async(
        self,
        json_data: Union[str, Dict[str, Any], List[Dict[str, Any]]],
        name: str,
        description: Optional[str] = None,
        prediction_key: str = "prediction",
        ground_truth_key: str = "ground_truth",
        context_key: str = "context",
        id_key: str = "id"
    ) -> str:
        """
        Asynchronously create a dataset from JSON data.
        
        Args:
            json_data: JSON string, dict, or list of dicts
            name: Dataset name
            description: Optional dataset description
            prediction_key: Key for prediction values in JSON
            ground_truth_key: Key for ground truth values in JSON
            context_key: Key for context values in JSON
            id_key: Key for item IDs in JSON
            
        Returns:
            Created dataset ID
        """
        # Convert JSON to EvaluationDataset
        eval_dataset = DataFormatConverter.json_to_evaluation_dataset(
            json_data=json_data,
            name=name,
            prediction_key=prediction_key,
            ground_truth_key=ground_truth_key,
            context_key=context_key,
            id_key=id_key,
            description=description
        )
        
        # Upload to backend
        dataset_id = await self.upload_evaluation_dataset_async(eval_dataset)
        
        logger.info(f"Created dataset '{name}' from JSON data with {len(eval_dataset.items)} items")
        return dataset_id
    
    def get_dataset_as_dataframe(self, dataset_id: str):
        """
        Retrieve a dataset as a pandas DataFrame.
        
        Args:
            dataset_id: Dataset ID to retrieve
            
        Returns:
            pandas DataFrame containing dataset items
        """
        return asyncio.run(self.get_dataset_as_dataframe_async(dataset_id))
    
    async def get_dataset_as_dataframe_async(self, dataset_id: str):
        """
        Asynchronously retrieve a dataset as a pandas DataFrame.
        
        Args:
            dataset_id: Dataset ID to retrieve
            
        Returns:
            pandas DataFrame containing dataset items
        """
        # Download dataset as EvaluationDataset
        eval_dataset = await self.download_evaluation_dataset_async(dataset_id)
        
        # Convert to DataFrame
        df = DataFormatConverter.evaluation_dataset_to_dataframe(eval_dataset)
        
        logger.info(f"Retrieved dataset '{eval_dataset.name}' as DataFrame with {len(df)} rows")
        return df
    
    def get_dataset_as_json(
        self,
        dataset_id: str,
        include_metadata: bool = True,
        pretty: bool = False
    ) -> str:
        """
        Retrieve a dataset as JSON string.
        
        Args:
            dataset_id: Dataset ID to retrieve
            include_metadata: Whether to include dataset metadata
            pretty: Whether to format JSON with indentation
            
        Returns:
            JSON string representation of dataset
        """
        return asyncio.run(self.get_dataset_as_json_async(dataset_id, include_metadata, pretty))
    
    async def get_dataset_as_json_async(
        self,
        dataset_id: str,
        include_metadata: bool = True,
        pretty: bool = False
    ) -> str:
        """
        Asynchronously retrieve a dataset as JSON string.
        
        Args:
            dataset_id: Dataset ID to retrieve
            include_metadata: Whether to include dataset metadata
            pretty: Whether to format JSON with indentation
            
        Returns:
            JSON string representation of dataset
        """
        # Download dataset as EvaluationDataset
        eval_dataset = await self.download_evaluation_dataset_async(dataset_id)
        
        # Convert to JSON
        json_str = DataFormatConverter.evaluation_dataset_to_json(
            eval_dataset, include_metadata=include_metadata, pretty=pretty
        )
        
        logger.info(f"Retrieved dataset '{eval_dataset.name}' as JSON string")
        return json_str
    
    def get_dataset_as_csv(self, dataset_id: str, **kwargs) -> str:
        """
        Retrieve a dataset as CSV string.
        
        Args:
            dataset_id: Dataset ID to retrieve
            **kwargs: Additional arguments passed to DataFrame.to_csv()
            
        Returns:
            CSV string representation of dataset
        """
        return asyncio.run(self.get_dataset_as_csv_async(dataset_id, **kwargs))
    
    async def get_dataset_as_csv_async(self, dataset_id: str, **kwargs) -> str:
        """
        Asynchronously retrieve a dataset as CSV string.
        
        Args:
            dataset_id: Dataset ID to retrieve
            **kwargs: Additional arguments passed to DataFrame.to_csv()
            
        Returns:
            CSV string representation of dataset
        """
        # Get dataset as DataFrame first
        df = await self.get_dataset_as_dataframe_async(dataset_id)
        
        # Convert to CSV
        csv_str = DataFormatConverter.dataframe_to_csv_string(df, **kwargs)
        
        # Get dataset info for logging
        dataset_info = await self.get_dataset_async(dataset_id)
        logger.info(f"Retrieved dataset '{dataset_info['name']}' as CSV string")
        
        return csv_str
    
    # Smart detection methods
    
    def analyze_data_structure(self, data: Union[List[Dict[str, Any]], Any]) -> DetectionResult:
        """
        Analyze data structure and suggest column mappings.
        
        Args:
            data: pandas DataFrame or list of dictionaries to analyze
            
        Returns:
            DetectionResult with column suggestions and mappings
        """
        detector = SmartColumnDetector()
        result = detector.detect_columns(data)
        
        logger.info(f"Analyzed data structure with {len(result.suggestions)} column suggestions")
        logger.info(f"Detection confidence: {result.confidence_score:.2f}")
        
        return result
    
    def create_dataset_from_data_with_detection(
        self,
        data: Union[List[Dict[str, Any]], Any],
        name: str,
        description: Optional[str] = None,
        auto_apply: bool = False,
        confidence_threshold: float = 0.7
    ) -> Tuple[str, DetectionResult]:
        """
        Create a dataset from data using smart column detection.
        
        Args:
            data: pandas DataFrame or list of dictionaries
            name: Dataset name
            description: Optional dataset description
            auto_apply: Whether to automatically apply high-confidence suggestions
            confidence_threshold: Minimum confidence to auto-apply suggestions
            
        Returns:
            Tuple of (dataset_id, detection_result)
        """
        return asyncio.run(self.create_dataset_from_data_with_detection_async(
            data, name, description, auto_apply, confidence_threshold
        ))
    
    async def create_dataset_from_data_with_detection_async(
        self,
        data: Union[List[Dict[str, Any]], Any],
        name: str,
        description: Optional[str] = None,
        auto_apply: bool = False,
        confidence_threshold: float = 0.7
    ) -> Tuple[str, DetectionResult]:
        """
        Asynchronously create a dataset from data using smart column detection.
        
        Args:
            data: pandas DataFrame or list of dictionaries
            name: Dataset name
            description: Optional dataset description
            auto_apply: Whether to automatically apply high-confidence suggestions
            confidence_threshold: Minimum confidence to auto-apply suggestions
            
        Returns:
            Tuple of (dataset_id, detection_result)
        """
        # Analyze data structure
        detection_result = self.analyze_data_structure(data)
        
        if auto_apply and detection_result.confidence_score >= confidence_threshold:
            # Auto-apply suggestions
            dataset_id = await self._create_with_detected_columns(
                data, name, description, detection_result
            )
            logger.info(f"Auto-applied column detection with confidence {detection_result.confidence_score:.2f}")
        else:
            # Create with basic detection but require manual confirmation
            logger.info(f"Column detection suggestions available (confidence: {detection_result.confidence_score:.2f})")
            logger.info("Manual review recommended before applying suggestions")
            
            # For now, create with best guesses
            dataset_id = await self._create_with_detected_columns(
                data, name, description, detection_result
            )
        
        return dataset_id, detection_result
    
    async def _create_with_detected_columns(
        self,
        data: Union[List[Dict[str, Any]], Any],
        name: str,
        description: Optional[str],
        detection_result: DetectionResult
    ) -> str:
        """Helper method to create dataset with detected column mappings."""
        
        # Check if we have pandas DataFrame
        try:
            import pandas as pd
            if isinstance(data, pd.DataFrame):
                return await self.create_dataset_from_dataframe_async(
                    df=data,
                    name=name,
                    description=description,
                    prediction_col=detection_result.prediction_col or "prediction",
                    ground_truth_col=detection_result.ground_truth_col or "ground_truth",
                    context_col=detection_result.context_col,
                    id_col=detection_result.id_col,
                    metadata_cols=detection_result.metadata_cols or None
                )
        except ImportError:
            pass
        
        # Handle list of dictionaries
        if isinstance(data, list):
            return await self.create_dataset_from_json_async(
                json_data=data,
                name=name,
                description=description,
                prediction_key=detection_result.prediction_col or "prediction",
                ground_truth_key=detection_result.ground_truth_col or "ground_truth",
                context_key=detection_result.context_col or "context",
                id_key=detection_result.id_col or "id"
            )
        
        raise ValueError("Data must be a pandas DataFrame or list of dictionaries")
    
    # Advanced Search and Filtering Methods
    
    def search_datasets(
        self,
        query_builder: Optional[QueryBuilder] = None,
        search_text: Optional[str] = None
    ) -> QueryResult:
        """
        Search datasets using advanced filtering.
        
        Args:
            query_builder: QueryBuilder instance for complex filtering
            search_text: Simple text search across dataset names and descriptions
            
        Returns:
            QueryResult with filtered datasets
        """
        return asyncio.run(self.search_datasets_async(query_builder, search_text))
    
    async def search_datasets_async(
        self,
        query_builder: Optional[QueryBuilder] = None,
        search_text: Optional[str] = None
    ) -> QueryResult:
        """
        Asynchronously search datasets using advanced filtering.
        
        Args:
            query_builder: QueryBuilder instance for complex filtering
            search_text: Simple text search across dataset names and descriptions
            
        Returns:
            QueryResult with filtered datasets
        """
        # Get all datasets first
        all_datasets = await self.list_datasets_async()
        
        # Apply filters
        filtered_datasets = all_datasets.get("datasets", [])
        
        # Apply text search if provided
        if search_text:
            search_lower = search_text.lower()
            filtered_datasets = [
                dataset for dataset in filtered_datasets
                if (search_lower in dataset.get("name", "").lower() or
                    search_lower in dataset.get("description", "").lower())
            ]
        
        # Apply query builder filters if provided
        if query_builder:
            filtered_datasets = query_builder.execute(filtered_datasets)
        
        # Build result
        total_count = len(filtered_datasets)
        pagination_info = {
            "total": total_count,
            "page": 1,
            "per_page": total_count,
            "pages": 1
        }
        
        return QueryResult(
            data=filtered_datasets,
            total_count=total_count,
            pagination=pagination_info,
            query_info=query_builder.to_dict() if query_builder else {}
        )
    
    def search_dataset_items(
        self,
        dataset_id: str,
        query_builder: Optional[QueryBuilder] = None,
        search_text: Optional[str] = None
    ) -> QueryResult:
        """
        Search dataset items using advanced filtering.
        
        Args:
            dataset_id: Dataset ID to search within
            query_builder: QueryBuilder instance for complex filtering
            search_text: Simple text search across item content
            
        Returns:
            QueryResult with filtered dataset items
        """
        return asyncio.run(self.search_dataset_items_async(dataset_id, query_builder, search_text))
    
    async def search_dataset_items_async(
        self,
        dataset_id: str,
        query_builder: Optional[QueryBuilder] = None,
        search_text: Optional[str] = None
    ) -> QueryResult:
        """
        Asynchronously search dataset items using advanced filtering.
        
        Args:
            dataset_id: Dataset ID to search within
            query_builder: QueryBuilder instance for complex filtering
            search_text: Simple text search across item content
            
        Returns:
            QueryResult with filtered dataset items
        """
        # Get all dataset items
        all_items = []
        offset = 0
        limit = 1000
        
        while True:
            items_response = await self.list_dataset_items_async(dataset_id, limit, offset)
            items = items_response.get("items", [])
            
            if not items:
                break
                
            all_items.extend(items)
            
            if len(items) < limit:
                break
                
            offset += limit
        
        # Apply text search if provided
        filtered_items = all_items
        if search_text:
            search_lower = search_text.lower()
            filtered_items = []
            for item in all_items:
                # Search in prediction, ground_truth, context, and metadata
                if (search_lower in str(item.get("prediction", "")).lower() or
                    search_lower in str(item.get("ground_truth", "")).lower() or
                    search_lower in str(item.get("context", "")).lower() or
                    search_lower in str(item.get("metadata", {})).lower()):
                    filtered_items.append(item)
        
        # Apply query builder filters if provided
        if query_builder:
            filtered_items = query_builder.execute(filtered_items)
        
        # Build result
        total_count = len(filtered_items)
        pagination_info = {
            "total": total_count,
            "page": 1,
            "per_page": total_count,
            "pages": 1
        }
        
        return QueryResult(
            data=filtered_items,
            total_count=total_count,
            pagination=pagination_info,
            query_info=query_builder.to_dict() if query_builder else {}
        )
    
    def create_query_builder(self) -> QueryBuilder:
        """
        Create a new QueryBuilder instance for advanced filtering.
        
        Returns:
            QueryBuilder instance for building complex queries
        """
        return QueryBuilder()
    
    def filter_by_prediction_accuracy(
        self,
        dataset_id: str,
        threshold: float = 0.8
    ) -> QueryResult:
        """
        Filter dataset items by prediction accuracy (exact match rate).
        
        Args:
            dataset_id: Dataset ID to filter
            threshold: Minimum accuracy threshold (0.0 to 1.0)
            
        Returns:
            QueryResult with filtered items
        """
        return asyncio.run(self.filter_by_prediction_accuracy_async(dataset_id, threshold))
    
    async def filter_by_prediction_accuracy_async(
        self,
        dataset_id: str,
        threshold: float = 0.8
    ) -> QueryResult:
        """
        Asynchronously filter dataset items by prediction accuracy.
        
        Args:
            dataset_id: Dataset ID to filter
            threshold: Minimum accuracy threshold (0.0 to 1.0)
            
        Returns:
            QueryResult with filtered items
        """
        # Create query to find matching predictions
        query = self.create_query_builder()
        query.where_group("and").where("prediction", "eq", lambda item: item.get("ground_truth"))
        
        return await self.search_dataset_items_async(dataset_id, query)
    
    def filter_by_metadata(
        self,
        dataset_id: str,
        metadata_filters: Dict[str, Any]
    ) -> QueryResult:
        """
        Filter dataset items by metadata fields.
        
        Args:
            dataset_id: Dataset ID to filter
            metadata_filters: Dictionary of metadata field filters
            
        Returns:
            QueryResult with filtered items
        """
        return asyncio.run(self.filter_by_metadata_async(dataset_id, metadata_filters))
    
    async def filter_by_metadata_async(
        self,
        dataset_id: str,
        metadata_filters: Dict[str, Any]
    ) -> QueryResult:
        """
        Asynchronously filter dataset items by metadata fields.
        
        Args:
            dataset_id: Dataset ID to filter
            metadata_filters: Dictionary of metadata field filters
            
        Returns:
            QueryResult with filtered items
        """
        # Build query from metadata filters
        query = self.create_query_builder()
        group = query.where_group("and")
        
        for field, value in metadata_filters.items():
            metadata_field = f"metadata.{field}"
            if isinstance(value, dict) and "operator" in value:
                group.where(metadata_field, value["operator"], value["value"])
            else:
                group.where(metadata_field, "eq", value)
        
        return await self.search_dataset_items_async(dataset_id, query)
    
    def get_dataset_statistics(self, dataset_id: str) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a dataset.
        
        Args:
            dataset_id: Dataset ID to analyze
            
        Returns:
            Dictionary with dataset statistics
        """
        return asyncio.run(self.get_dataset_statistics_async(dataset_id))
    
    async def get_dataset_statistics_async(self, dataset_id: str) -> Dict[str, Any]:
        """
        Asynchronously get comprehensive statistics for a dataset.
        
        Args:
            dataset_id: Dataset ID to analyze
            
        Returns:
            Dictionary with dataset statistics
        """
        # Get all dataset items
        all_items = []
        offset = 0
        limit = 1000
        
        while True:
            items_response = await self.list_dataset_items_async(dataset_id, limit, offset)
            items = items_response.get("items", [])
            
            if not items:
                break
                
            all_items.extend(items)
            
            if len(items) < limit:
                break
                
            offset += limit
        
        # Calculate statistics
        total_items = len(all_items)
        if total_items == 0:
            return {
                "total_items": 0,
                "prediction_distribution": {},
                "ground_truth_distribution": {},
                "accuracy": 0.0,
                "metadata_fields": [],
                "data_quality": {
                    "missing_predictions": 0,
                    "missing_ground_truth": 0,
                    "missing_context": 0,
                    "complete_items": 0
                }
            }
        
        # Analyze predictions and ground truth
        predictions = [item.get("prediction") for item in all_items if item.get("prediction")]
        ground_truths = [item.get("ground_truth") for item in all_items if item.get("ground_truth")]
        
        # Calculate accuracy
        matches = sum(1 for item in all_items 
                     if item.get("prediction") == item.get("ground_truth"))
        accuracy = matches / total_items if total_items > 0 else 0.0
        
        # Get distribution counts
        from collections import Counter
        prediction_dist = dict(Counter(predictions))
        ground_truth_dist = dict(Counter(ground_truths))
        
        # Analyze metadata fields
        metadata_fields = set()
        for item in all_items:
            if item.get("metadata"):
                metadata_fields.update(item["metadata"].keys())
        
        # Data quality analysis
        missing_predictions = sum(1 for item in all_items if not item.get("prediction"))
        missing_ground_truth = sum(1 for item in all_items if not item.get("ground_truth"))
        missing_context = sum(1 for item in all_items if not item.get("context"))
        complete_items = sum(1 for item in all_items 
                           if item.get("prediction") and item.get("ground_truth") and item.get("context"))
        
        return {
            "total_items": total_items,
            "prediction_distribution": prediction_dist,
            "ground_truth_distribution": ground_truth_dist,
            "accuracy": accuracy,
            "metadata_fields": list(metadata_fields),
            "data_quality": {
                "missing_predictions": missing_predictions,
                "missing_ground_truth": missing_ground_truth,
                "missing_context": missing_context,
                "complete_items": complete_items,
                "completeness_rate": complete_items / total_items if total_items > 0 else 0.0
            }
        }
    
    # Schema Validation Methods
    
    def validate_data_with_schema(
        self,
        data: Union[List[Dict[str, Any]], Dict[str, Any]],
        schema: DatasetSchema
    ) -> SchemaValidationResult:
        """
        Validate data against a schema definition.
        
        Args:
            data: Data to validate (single item or list of items)
            schema: Schema definition to validate against
            
        Returns:
            SchemaValidationResult with validation details
        """
        return asyncio.run(self.validate_data_with_schema_async(data, schema))
    
    async def validate_data_with_schema_async(
        self,
        data: Union[List[Dict[str, Any]], Dict[str, Any]],
        schema: DatasetSchema
    ) -> SchemaValidationResult:
        """
        Asynchronously validate data against a schema definition.
        
        Args:
            data: Data to validate (single item or list of items)
            schema: Schema definition to validate against
            
        Returns:
            SchemaValidationResult with validation details
        """
        validator = SchemaValidator()
        result = validator.validate_data(data, schema)
        
        logger.info(f"Schema validation completed. Valid: {result.is_valid}, "
                   f"Errors: {len(result.errors)}, Warnings: {len(result.warnings)}")
        
        return result
    
    def create_dataset_with_schema_validation(
        self,
        data: Union[List[Dict[str, Any]], Any],
        schema: DatasetSchema,
        name: str,
        description: Optional[str] = None,
        enforce_schema: bool = True
    ) -> Tuple[str, SchemaValidationResult]:
        """
        Create a dataset with schema validation.
        
        Args:
            data: Dataset data to validate and create
            schema: Schema definition for validation
            name: Dataset name
            description: Optional description
            enforce_schema: Whether to reject invalid data
            
        Returns:
            Tuple of (dataset_id, validation_result)
        """
        return asyncio.run(self.create_dataset_with_schema_validation_async(
            data, schema, name, description, enforce_schema
        ))
    
    async def create_dataset_with_schema_validation_async(
        self,
        data: Union[List[Dict[str, Any]], Any],
        schema: DatasetSchema,
        name: str,
        description: Optional[str] = None,
        enforce_schema: bool = True
    ) -> Tuple[str, SchemaValidationResult]:
        """
        Asynchronously create a dataset with schema validation.
        
        Args:
            data: Dataset data to validate and create
            schema: Schema definition for validation
            name: Dataset name
            description: Optional description
            enforce_schema: Whether to reject invalid data
            
        Returns:
            Tuple of (dataset_id, validation_result)
        """
        # Validate data against schema
        validation_result = await self.validate_data_with_schema_async(data, schema)
        
        # Check if we should proceed with invalid data
        if not validation_result.is_valid and enforce_schema:
            logger.error(f"Schema validation failed for dataset '{name}'. "
                        f"Errors: {len(validation_result.errors)}")
            raise ValueError(f"Data validation failed: {validation_result.errors}")
        
        # Use transformed data if available, otherwise original data
        dataset_data = validation_result.transformed_data if validation_result.transformed_data else data
        
        # Create dataset based on data type
        if isinstance(dataset_data, list):
            # Assume list of items for JSON creation
            dataset_id = await self.create_dataset_from_json_async(
                json_data=dataset_data,
                name=name,
                description=description
            )
        else:
            # Handle other data types as needed
            raise ValueError("Unsupported data type for schema validation")
        
        logger.info(f"Dataset '{name}' created with ID: {dataset_id}. "
                   f"Validation warnings: {len(validation_result.warnings)}")
        
        return dataset_id, validation_result
    
    def get_schema_suggestions(
        self,
        data: Union[List[Dict[str, Any]], Any]
    ) -> Dict[str, Any]:
        """
        Analyze data and suggest a schema definition.
        
        Args:
            data: Data to analyze for schema suggestions
            
        Returns:
            Dictionary with suggested schema information
        """
        return asyncio.run(self.get_schema_suggestions_async(data))
    
    async def get_schema_suggestions_async(
        self,
        data: Union[List[Dict[str, Any]], Any]
    ) -> Dict[str, Any]:
        """
        Asynchronously analyze data and suggest a schema definition.
        
        Args:
            data: Data to analyze for schema suggestions
            
        Returns:
            Dictionary with suggested schema information
        """
        if not isinstance(data, list) or not data:
            return {"error": "Data must be a non-empty list of objects"}
        
        # Analyze data structure
        sample_size = min(100, len(data))  # Analyze first 100 items
        sample_data = data[:sample_size]
        
        # Collect field information
        field_info = {}
        for item in sample_data:
            if not isinstance(item, dict):
                continue
                
            for field_name, value in item.items():
                if field_name not in field_info:
                    field_info[field_name] = {
                        "types": set(),
                        "null_count": 0,
                        "values": [],
                        "required_score": 0
                    }
                
                info = field_info[field_name]
                
                if value is None:
                    info["null_count"] += 1
                else:
                    info["types"].add(type(value).__name__)
                    info["values"].append(value)
                    info["required_score"] += 1
        
        # Generate suggestions
        suggestions = {
            "suggested_schema": {
                "name": "auto_generated_schema",
                "version": "1.0",
                "fields": []
            },
            "analysis": {
                "total_items": len(sample_data),
                "fields_analyzed": len(field_info),
                "field_details": {}
            }
        }
        
        for field_name, info in field_info.items():
            # Determine most common type
            if info["types"]:
                type_counts = {}
                for value in info["values"]:
                    type_name = type(value).__name__
                    type_counts[type_name] = type_counts.get(type_name, 0) + 1
                
                most_common_type = max(type_counts, key=type_counts.get)
                
                # Map Python types to FieldTypes
                type_mapping = {
                    "str": "string",
                    "int": "integer", 
                    "float": "float",
                    "bool": "boolean",
                    "dict": "object",
                    "list": "array"
                }
                
                suggested_type = type_mapping.get(most_common_type, "string")
                
                # Calculate required probability
                required_probability = info["required_score"] / len(sample_data)
                is_required = required_probability > 0.8
                
                field_suggestion = {
                    "name": field_name,
                    "type": suggested_type,
                    "required": is_required,
                    "allow_null": info["null_count"] > 0,
                    "constraints": []
                }
                
                # Add type-specific constraints
                if suggested_type == "string" and info["values"]:
                    lengths = [len(str(v)) for v in info["values"]]
                    field_suggestion["constraints"].append({
                        "type": "max_length",
                        "value": max(lengths),
                        "suggested": True
                    })
                
                suggestions["suggested_schema"]["fields"].append(field_suggestion)
                
                # Detailed analysis
                suggestions["analysis"]["field_details"][field_name] = {
                    "types_found": list(info["types"]),
                    "null_percentage": (info["null_count"] / len(sample_data)) * 100,
                    "required_probability": required_probability,
                    "value_count": len(info["values"])
                }
        
        return suggestions
    
    def create_schema_from_suggestions(
        self,
        suggestions: Dict[str, Any],
        schema_name: str,
        schema_version: str = "1.0"
    ) -> DatasetSchema:
        """
        Create a DatasetSchema from schema suggestions.
        
        Args:
            suggestions: Schema suggestions from get_schema_suggestions
            schema_name: Name for the schema
            schema_version: Version for the schema
            
        Returns:
            DatasetSchema object
        """
        from ..utils.schema_validation import SchemaBuilder, FieldType
        
        builder = SchemaBuilder(schema_name, schema_version)
        
        for field_data in suggestions.get("suggested_schema", {}).get("fields", []):
            field_type = FieldType(field_data["type"])
            
            if field_type == FieldType.STRING:
                max_length = None
                for constraint in field_data.get("constraints", []):
                    if constraint["type"] == "max_length":
                        max_length = constraint["value"]
                
                builder.add_string_field(
                    field_data["name"],
                    required=field_data.get("required", False),
                    max_length=max_length
                )
            elif field_type == FieldType.INTEGER:
                builder.add_integer_field(
                    field_data["name"],
                    required=field_data.get("required", False)
                )
            elif field_type == FieldType.FLOAT:
                builder.add_float_field(
                    field_data["name"],
                    required=field_data.get("required", False)
                )
            elif field_type == FieldType.BOOLEAN:
                builder.add_boolean_field(
                    field_data["name"],
                    required=field_data.get("required", False)
                )
            # Add more type handlers as needed
        
        return builder.build()
    
    def suggest_column_mappings(self, data: Union[List[Dict[str, Any]], Any]) -> Dict[str, Any]:
        """
        Get column mapping suggestions without creating a dataset.
        
        Args:
            data: pandas DataFrame or list of dictionaries to analyze
            
        Returns:
            Dictionary with suggestions and confidence scores
        """
        detection_result = self.analyze_data_structure(data)
        
        suggestions_dict = detection_result.to_dict()
        
        # Add formatted suggestions for easy display
        suggestions_dict["formatted_suggestions"] = []
        for suggestion in detection_result.suggestions:
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
        
        return suggestions_dict
    
    # Data Profiling Methods
    
    def profile_dataset(
        self,
        dataset_id: str,
        include_correlations: bool = True,
        include_temporal_patterns: bool = True,
        include_anomalies: bool = True
    ) -> Dict[str, Any]:
        """
        Profile a dataset to generate comprehensive statistics and insights.
        
        Args:
            dataset_id: Dataset ID to profile
            include_correlations: Whether to calculate field correlations
            include_temporal_patterns: Whether to analyze temporal patterns
            include_anomalies: Whether to detect anomalies
            
        Returns:
            Dataset profile with statistics, quality metrics, and insights
        """
        return asyncio.run(self.profile_dataset_async(
            dataset_id, include_correlations, include_temporal_patterns, include_anomalies
        ))
    
    async def profile_dataset_async(
        self,
        dataset_id: str,
        include_correlations: bool = True,
        include_temporal_patterns: bool = True,
        include_anomalies: bool = True
    ) -> Dict[str, Any]:
        """
        Asynchronously profile a dataset to generate comprehensive statistics and insights.
        
        Args:
            dataset_id: Dataset ID to profile
            include_correlations: Whether to calculate field correlations
            include_temporal_patterns: Whether to analyze temporal patterns
            include_anomalies: Whether to detect anomalies
            
        Returns:
            Dataset profile with statistics, quality metrics, and insights
        """
        # Get dataset items
        items_response = await self.get_dataset_items_async(dataset_id)
        if not items_response.get("success"):
            raise Exception(f"Failed to retrieve dataset items: {items_response.get('error')}")
        
        items = items_response.get("data", [])
        if not items:
            logger.warning(f"Dataset {dataset_id} has no items to profile")
            return {"error": "No data available for profiling"}
        
        # Create profiler instance
        profiler = DataProfiler()
        
        # Profile the dataset
        profile = profiler.profile_dataset(
            data=items,
            name=f"dataset_{dataset_id}",
            include_correlations=include_correlations,
            include_temporal_patterns=include_temporal_patterns,
            include_anomalies=include_anomalies
        )
        
        # Convert profile to dictionary for serialization
        profile_dict = profile.to_dict()
        
        # Add dataset metadata
        dataset_info = await self.get_dataset_async(dataset_id)
        if dataset_info.get("success"):
            profile_dict["dataset_metadata"] = dataset_info.get("data", {})
        
        logger.info(f"Profiled dataset {dataset_id} with {len(items)} items")
        return profile_dict
    
    def profile_data(
        self,
        data: List[Dict[str, Any]],
        name: str = "dataset",
        include_correlations: bool = True,
        include_temporal_patterns: bool = True,
        include_anomalies: bool = True
    ) -> Dict[str, Any]:
        """
        Profile raw data without needing a dataset ID.
        
        Args:
            data: List of dictionaries representing the data to profile
            name: Name for the dataset profile
            include_correlations: Whether to calculate field correlations
            include_temporal_patterns: Whether to analyze temporal patterns
            include_anomalies: Whether to detect anomalies
            
        Returns:
            Dataset profile with statistics, quality metrics, and insights
        """
        if not data:
            logger.warning("No data provided for profiling")
            return {"error": "No data available for profiling"}
        
        # Create profiler instance
        profiler = DataProfiler()
        
        # Profile the data
        profile = profiler.profile_dataset(
            data=data,
            name=name,
            include_correlations=include_correlations,
            include_temporal_patterns=include_temporal_patterns,
            include_anomalies=include_anomalies
        )
        
        # Convert profile to dictionary for serialization
        profile_dict = profile.to_dict()
        
        logger.info(f"Profiled data '{name}' with {len(data)} items")
        return profile_dict
    
    def create_dashboard_data(
        self,
        dataset_id: str,
        chart_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create dashboard-ready data for visualizing dataset insights.
        
        Args:
            dataset_id: Dataset ID to create dashboard data for
            chart_types: List of chart types to generate data for
                        (histogram, scatter, correlation, quality_metrics, trends)
            
        Returns:
            Dashboard data with chart configurations and data points
        """
        return asyncio.run(self.create_dashboard_data_async(dataset_id, chart_types))
    
    async def create_dashboard_data_async(
        self,
        dataset_id: str,
        chart_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously create dashboard-ready data for visualizing dataset insights.
        
        Args:
            dataset_id: Dataset ID to create dashboard data for
            chart_types: List of chart types to generate data for
                        (histogram, scatter, correlation, quality_metrics, trends)
            
        Returns:
            Dashboard data with chart configurations and data points
        """
        # First profile the dataset
        profile_dict = await self.profile_dataset_async(dataset_id)
        
        if "error" in profile_dict:
            return profile_dict
        
        # Create dashboard data
        dashboard_data = create_dashboard_data(profile_dict, chart_types)
        
        logger.info(f"Created dashboard data for dataset {dataset_id}")
        return dashboard_data
    
    def get_data_quality_report(
        self,
        dataset_id: str
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive data quality report for a dataset.
        
        Args:
            dataset_id: Dataset ID to generate report for
            
        Returns:
            Data quality report with scores, issues, and recommendations
        """
        return asyncio.run(self.get_data_quality_report_async(dataset_id))
    
    async def get_data_quality_report_async(
        self,
        dataset_id: str
    ) -> Dict[str, Any]:
        """
        Asynchronously generate a comprehensive data quality report for a dataset.
        
        Args:
            dataset_id: Dataset ID to generate report for
            
        Returns:
            Data quality report with scores, issues, and recommendations
        """
        # Profile the dataset
        profile_dict = await self.profile_dataset_async(dataset_id)
        
        if "error" in profile_dict:
            return profile_dict
        
        # Extract quality metrics
        quality_metrics = profile_dict.get("data_quality", {})
        field_profiles = profile_dict.get("field_profiles", [])
        
        # Generate comprehensive report
        report = {
            "dataset_id": dataset_id,
            "overall_quality_score": quality_metrics.get("overall_score", 0.0),
            "quality_breakdown": {
                "completeness": quality_metrics.get("completeness_score", 0.0),
                "consistency": quality_metrics.get("consistency_score", 0.0),
                "validity": quality_metrics.get("validity_score", 0.0)
            },
            "total_records": profile_dict.get("total_records", 0),
            "total_fields": profile_dict.get("total_fields", 0),
            "issues": [],
            "recommendations": [],
            "field_summary": []
        }
        
        # Analyze field-level issues
        for field_profile in field_profiles:
            field_name = field_profile.get("name", "unknown")
            null_percentage = field_profile.get("null_percentage", 0.0)
            unique_percentage = field_profile.get("unique_percentage", 0.0)
            
            field_summary = {
                "field": field_name,
                "type": field_profile.get("data_type", "unknown"),
                "null_percentage": null_percentage,
                "unique_percentage": unique_percentage,
                "quality_issues": []
            }
            
            # Identify issues
            if null_percentage > 20:
                field_summary["quality_issues"].append("High null percentage")
                report["issues"].append(f"Field '{field_name}' has {null_percentage:.1f}% null values")
                report["recommendations"].append(f"Consider data imputation or collection improvements for '{field_name}'")
            
            if unique_percentage < 10 and field_profile.get("data_type") != "categorical":
                field_summary["quality_issues"].append("Low uniqueness")
                report["issues"].append(f"Field '{field_name}' has low uniqueness ({unique_percentage:.1f}%)")
                report["recommendations"].append(f"Review data collection for '{field_name}' - possible duplicate or default values")
            
            report["field_summary"].append(field_summary)
        
        # Overall recommendations
        if report["quality_breakdown"]["completeness"] < 0.8:
            report["recommendations"].append("Overall data completeness is low - review data collection processes")
        
        if report["quality_breakdown"]["consistency"] < 0.8:
            report["recommendations"].append("Data consistency issues detected - implement validation rules")
        
        if report["quality_breakdown"]["validity"] < 0.8:
            report["recommendations"].append("Data validity concerns - review data types and constraints")
        
        logger.info(f"Generated quality report for dataset {dataset_id}")
        return report
    
    # Advanced File Format Methods
    
    def create_dataset_from_file(
        self,
        file_path: str,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        format_hint: Optional[str] = None,
        auto_profile: bool = True,
        **parsing_options
    ) -> Dict[str, Any]:
        """
        Create a dataset from various file formats including Parquet, Excel, and compressed files.
        
        Args:
            file_path: Path to the file to import
            name: Dataset name
            description: Optional description
            metadata: Optional metadata
            format_hint: Optional format hint (e.g., 'parquet', 'excel', 'csv')
            auto_profile: Whether to automatically profile the data
            **parsing_options: Additional options for file parsing
            
        Returns:
            Dictionary with dataset creation result and file processing info
        """
        return asyncio.run(self.create_dataset_from_file_async(
            file_path, name, description, metadata, format_hint, auto_profile, **parsing_options
        ))
    
    async def create_dataset_from_file_async(
        self,
        file_path: str,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        format_hint: Optional[str] = None,
        auto_profile: bool = True,
        **parsing_options
    ) -> Dict[str, Any]:
        """
        Asynchronously create a dataset from various file formats.
        
        Args:
            file_path: Path to the file to import
            name: Dataset name
            description: Optional description
            metadata: Optional metadata
            format_hint: Optional format hint (e.g., 'parquet', 'excel', 'csv')
            auto_profile: Whether to automatically profile the data
            **parsing_options: Additional options for file parsing
            
        Returns:
            Dictionary with dataset creation result and file processing info
        """
        try:
            # Convert format hint to enum if provided
            format_enum = None
            if format_hint:
                try:
                    format_enum = FileFormat(format_hint.lower())
                except ValueError:
                    logger.warning(f"Unknown format hint '{format_hint}', will auto-detect")
            
            # Parse the file
            logger.info(f"Parsing file {file_path} for dataset creation")
            parse_result = parse_file(file_path, format_hint=format_enum, **parsing_options)
            
            # Create dataset
            dataset_info = await self.create_dataset_async(name, description, metadata)
            dataset_id = dataset_info.get("id")
            
            if not dataset_id:
                raise Exception("Failed to create dataset")
            
            # Add parsed data to dataset
            if parse_result.data:
                logger.info(f"Adding {len(parse_result.data)} items to dataset {dataset_id}")
                await self.add_dataset_items_bulk_async(dataset_id, parse_result.data)
            
            # Auto-profile if requested
            profile_result = None
            if auto_profile and parse_result.data:
                logger.info(f"Auto-profiling dataset {dataset_id}")
                profile_result = await self.profile_dataset_async(dataset_id)
            
            # Prepare result
            result = {
                "dataset": dataset_info,
                "file_info": parse_result.file_info.__dict__,
                "parsing_warnings": parse_result.warnings,
                "parsing_errors": parse_result.errors,
                "parsing_metadata": parse_result.metadata,
                "items_added": len(parse_result.data),
                "profile": profile_result if auto_profile else None
            }
            
            logger.info(f"Successfully created dataset {dataset_id} from file {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create dataset from file {file_path}: {e}")
            raise Exception(f"Dataset creation from file failed: {e}")
    
    def parse_file_preview(
        self,
        file_path: str,
        max_rows: int = 100,
        format_hint: Optional[str] = None,
        **parsing_options
    ) -> Dict[str, Any]:
        """
        Preview a file's content without creating a dataset.
        
        Args:
            file_path: Path to the file to preview
            max_rows: Maximum number of rows to return in preview
            format_hint: Optional format hint
            **parsing_options: Additional parsing options
            
        Returns:
            Dictionary with file preview information
        """
        try:
            # Convert format hint to enum if provided
            format_enum = None
            if format_hint:
                try:
                    format_enum = FileFormat(format_hint.lower())
                except ValueError:
                    logger.warning(f"Unknown format hint '{format_hint}', will auto-detect")
            
            # Parse the file
            parse_result = parse_file(file_path, format_hint=format_enum, **parsing_options)
            
            # Limit data for preview
            preview_data = parse_result.data[:max_rows] if parse_result.data else []
            
            # Get basic statistics
            total_rows = len(parse_result.data) if parse_result.data else 0
            columns = list(preview_data[0].keys()) if preview_data else []
            
            return {
                "file_info": parse_result.file_info.__dict__,
                "preview_data": preview_data,
                "total_rows": total_rows,
                "columns": columns,
                "warnings": parse_result.warnings,
                "errors": parse_result.errors,
                "metadata": parse_result.metadata,
                "truncated": total_rows > max_rows
            }
            
        except Exception as e:
            logger.error(f"Failed to preview file {file_path}: {e}")
            raise Exception(f"File preview failed: {e}")
    
    def detect_file_format_info(self, file_path: str) -> Dict[str, Any]:
        """
        Detect file format and get basic information without parsing.
        
        Args:
            file_path: Path to the file to analyze
            
        Returns:
            Dictionary with file format information
        """
        try:
            # Read a small sample for detection
            with open(file_path, 'rb') as f:
                sample = f.read(10240)  # Read first 10KB
            
            detected_format = detect_file_format(file_path, sample)
            file_size = len(sample)
            
            # Try to get full file size
            try:
                from pathlib import Path
                file_size = Path(file_path).stat().st_size
            except:
                pass
            
            return {
                "file_path": file_path,
                "detected_format": detected_format.value,
                "file_size_bytes": file_size,
                "supported": detected_format != FileFormat.UNKNOWN,
                "dependencies": check_dependencies()
            }
            
        except Exception as e:
            logger.error(f"Failed to detect file format for {file_path}: {e}")
            raise Exception(f"File format detection failed: {e}")
    
    def get_supported_file_formats(self) -> Dict[str, Any]:
        """
        Get information about supported file formats and dependencies.
        
        Returns:
            Dictionary with supported formats and dependency status
        """
        from ..utils.file_formats import get_supported_formats
        
        return {
            "supported_formats": get_supported_formats(),
            "dependencies": check_dependencies(),
            "format_descriptions": {
                "csv": "Comma-separated values with encoding detection",
                "json": "JSON files (single object or array)",
                "jsonl": "JSON Lines (one JSON object per line)",
                "parquet": "Apache Parquet columnar format (requires pyarrow)",
                "xlsx": "Excel 2007+ format (requires pandas)",
                "xls": "Excel 97-2003 format (requires pandas)",
                "zip": "ZIP archives containing supported files",
                "gzip": "GZIP compressed files",
                "tar": "TAR archives",
                "tar.gz": "GZIP compressed TAR archives"
            },
            "optional_dependencies": {
                "pandas": "Required for Excel support and enhanced data handling",
                "pyarrow": "Required for Parquet format support",
                "chardet": "Improves encoding detection for text files"
            }
        }
    
    def create_dataset_from_multiple_files(
        self,
        file_paths: List[str],
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        merge_strategy: str = "append",
        auto_profile: bool = True
    ) -> Dict[str, Any]:
        """
        Create a dataset from multiple files.
        
        Args:
            file_paths: List of file paths to import
            name: Dataset name
            description: Optional description
            metadata: Optional metadata
            merge_strategy: How to merge files ("append", "union")
            auto_profile: Whether to automatically profile the data
            
        Returns:
            Dictionary with dataset creation result
        """
        return asyncio.run(self.create_dataset_from_multiple_files_async(
            file_paths, name, description, metadata, merge_strategy, auto_profile
        ))
    
    async def create_dataset_from_multiple_files_async(
        self,
        file_paths: List[str],
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        merge_strategy: str = "append",
        auto_profile: bool = True
    ) -> Dict[str, Any]:
        """
        Asynchronously create a dataset from multiple files.
        
        Args:
            file_paths: List of file paths to import
            name: Dataset name
            description: Optional description
            metadata: Optional metadata
            merge_strategy: How to merge files ("append", "union")
            auto_profile: Whether to automatically profile the data
            
        Returns:
            Dictionary with dataset creation result
        """
        try:
            all_data = []
            file_results = []
            
            # Parse all files
            for file_path in file_paths:
                try:
                    logger.info(f"Parsing file {file_path}")
                    parse_result = parse_file(file_path)
                    all_data.extend(parse_result.data)
                    
                    file_results.append({
                        "file_path": file_path,
                        "file_info": parse_result.file_info.__dict__,
                        "items_count": len(parse_result.data),
                        "warnings": parse_result.warnings,
                        "errors": parse_result.errors
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to parse file {file_path}: {e}")
                    file_results.append({
                        "file_path": file_path,
                        "error": str(e),
                        "items_count": 0
                    })
            
            if not all_data:
                raise Exception("No data could be extracted from any of the provided files")
            
            # Create dataset
            dataset_info = await self.create_dataset_async(name, description, metadata)
            dataset_id = dataset_info.get("id")
            
            if not dataset_id:
                raise Exception("Failed to create dataset")
            
            # Add all data to dataset
            logger.info(f"Adding {len(all_data)} items to dataset {dataset_id}")
            await self.add_dataset_items_bulk_async(dataset_id, all_data)
            
            # Auto-profile if requested
            profile_result = None
            if auto_profile:
                logger.info(f"Auto-profiling dataset {dataset_id}")
                profile_result = await self.profile_dataset_async(dataset_id)
            
            result = {
                "dataset": dataset_info,
                "files_processed": len(file_paths),
                "file_results": file_results,
                "total_items_added": len(all_data),
                "merge_strategy": merge_strategy,
                "profile": profile_result if auto_profile else None
            }
            
            logger.info(f"Successfully created dataset {dataset_id} from {len(file_paths)} files")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create dataset from multiple files: {e}")
            raise Exception(f"Multi-file dataset creation failed: {e}")
    
    # Dataset Versioning Methods
    
    def get_version_manager(self, dataset_id: str) -> DatasetVersionManager:
        """
        Get a version manager for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            
        Returns:
            DatasetVersionManager: Version manager instance
        """
        return create_version_manager(dataset_id, with_storage=True)
    
    def create_dataset_version(
        self,
        dataset_id: str,
        data: List[Dict[str, Any]],
        message: str,
        author: str = "user",
        branch_name: str = "main",
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a new version of a dataset.
        
        Args:
            dataset_id: Dataset identifier
            data: Dataset records
            message: Version message
            author: Version author
            branch_name: Branch name
            tags: Optional tags
            
        Returns:
            Version information
        """
        version_manager = self.get_version_manager(dataset_id)
        version = version_manager.create_version(
            data=data,
            message=message,
            author=author,
            branch_name=branch_name,
            tags=tags or []
        )
        
        logger.info(f"Created version {version.id} for dataset {dataset_id}")
        return version.to_dict()
    
    def list_dataset_versions(
        self,
        dataset_id: str,
        branch_name: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        List versions for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            branch_name: Optional branch filter
            limit: Maximum versions to return
            
        Returns:
            List of version information
        """
        version_manager = self.get_version_manager(dataset_id)
        versions = version_manager.list_versions(branch_name=branch_name, limit=limit)
        return [v.to_dict() for v in versions]
    
    def get_dataset_version(
        self,
        dataset_id: str,
        version_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific dataset version.
        
        Args:
            dataset_id: Dataset identifier
            version_id: Version identifier
            
        Returns:
            Version information or None if not found
        """
        version_manager = self.get_version_manager(dataset_id)
        version = version_manager.get_version(version_id)
        return version.to_dict() if version else None
    
    def get_dataset_version_data(
        self,
        dataset_id: str,
        version_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get data for a specific dataset version.
        
        Args:
            dataset_id: Dataset identifier
            version_id: Version identifier
            
        Returns:
            Version data or None if not found
        """
        version_manager = self.get_version_manager(dataset_id)
        return version_manager.get_version_data(version_id)
    
    def create_dataset_branch(
        self,
        dataset_id: str,
        branch_name: str,
        base_version: Optional[str] = None,
        author: str = "user",
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new branch for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            branch_name: New branch name
            base_version: Version to branch from
            author: Branch author
            description: Branch description
            
        Returns:
            Branch information
        """
        version_manager = self.get_version_manager(dataset_id)
        branch = version_manager.create_branch(
            branch_name=branch_name,
            base_version=base_version,
            author=author,
            description=description
        )
        
        logger.info(f"Created branch '{branch_name}' for dataset {dataset_id}")
        return branch.to_dict()
    
    def list_dataset_branches(self, dataset_id: str) -> List[Dict[str, Any]]:
        """
        List all branches for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            
        Returns:
            List of branch information
        """
        version_manager = self.get_version_manager(dataset_id)
        branches = version_manager.list_branches()
        return [b.to_dict() for b in branches]
    
    def delete_dataset_branch(
        self,
        dataset_id: str,
        branch_name: str
    ) -> bool:
        """
        Delete a dataset branch.
        
        Args:
            dataset_id: Dataset identifier
            branch_name: Branch name to delete
            
        Returns:
            True if deleted successfully
        """
        if branch_name == "main":
            raise ValueError("Cannot delete main branch")
        
        version_manager = self.get_version_manager(dataset_id)
        success = version_manager.delete_branch(branch_name)
        
        if success:
            logger.info(f"Deleted branch '{branch_name}' from dataset {dataset_id}")
        
        return success
    
    def compare_dataset_versions(
        self,
        dataset_id: str,
        from_version_id: str,
        to_version_id: str
    ) -> Dict[str, Any]:
        """
        Compare two dataset versions.
        
        Args:
            dataset_id: Dataset identifier
            from_version_id: Source version
            to_version_id: Target version
            
        Returns:
            Version comparison results
        """
        version_manager = self.get_version_manager(dataset_id)
        diff = version_manager.generate_diff(from_version_id, to_version_id)
        return diff.to_dict()
    
    def rollback_dataset_version(
        self,
        dataset_id: str,
        version_id: str,
        branch_name: str = "main",
        author: str = "user",
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rollback dataset to a previous version.
        
        Args:
            dataset_id: Dataset identifier
            version_id: Version to rollback to
            branch_name: Branch to create rollback on
            author: Rollback author
            message: Rollback message
            
        Returns:
            New version information
        """
        version_manager = self.get_version_manager(dataset_id)
        rollback_version = version_manager.rollback_to_version(
            version_id=version_id,
            branch_name=branch_name,
            author=author,
            message=message
        )
        
        logger.info(f"Rolled back dataset {dataset_id} to version {version_id}")
        return rollback_version.to_dict()
    
    def tag_dataset_version(
        self,
        dataset_id: str,
        version_id: str,
        tag: str
    ) -> bool:
        """
        Add a tag to a dataset version.
        
        Args:
            dataset_id: Dataset identifier
            version_id: Version identifier
            tag: Tag to add
            
        Returns:
            True if successful
        """
        version_manager = self.get_version_manager(dataset_id)
        success = version_manager.tag_version(version_id, tag)
        
        if success:
            logger.info(f"Tagged version {version_id} with '{tag}' for dataset {dataset_id}")
        
        return success
    
    def remove_dataset_version_tag(
        self,
        dataset_id: str,
        version_id: str,
        tag: str
    ) -> bool:
        """
        Remove a tag from a dataset version.
        
        Args:
            dataset_id: Dataset identifier
            version_id: Version identifier
            tag: Tag to remove
            
        Returns:
            True if successful
        """
        version_manager = self.get_version_manager(dataset_id)
        success = version_manager.remove_tag(version_id, tag)
        
        if success:
            logger.info(f"Removed tag '{tag}' from version {version_id} for dataset {dataset_id}")
        
        return success
    
    def find_dataset_versions_by_tag(
        self,
        dataset_id: str,
        tag: str
    ) -> List[Dict[str, Any]]:
        """
        Find dataset versions with a specific tag.
        
        Args:
            dataset_id: Dataset identifier
            tag: Tag to search for
            
        Returns:
            List of matching versions
        """
        version_manager = self.get_version_manager(dataset_id)
        versions = version_manager.find_versions_by_tag(tag)
        return [v.to_dict() for v in versions]
    
    def get_dataset_version_history(
        self,
        dataset_id: str,
        version_id: str,
        max_depth: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get version history (lineage) for a dataset version.
        
        Args:
            dataset_id: Dataset identifier
            version_id: Starting version
            max_depth: Maximum depth to traverse
            
        Returns:
            List of versions in lineage order
        """
        version_manager = self.get_version_manager(dataset_id)
        history = version_manager.get_version_history(version_id, max_depth)
        return [v.to_dict() for v in history]
    
    def get_dataset_statistics(self, dataset_id: str) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            
        Returns:
            Dataset statistics including versioning info
        """
        version_manager = self.get_version_manager(dataset_id)
        version_stats = version_manager.get_dataset_stats()
        
        # Get basic dataset info
        try:
            dataset_info = self.get_dataset(dataset_id)
        except:
            dataset_info = {"id": dataset_id, "name": "Unknown"}
        
        return {
            "dataset_info": dataset_info,
            "versioning_stats": version_stats,
            "last_updated": datetime.now().isoformat()
        }
    
    def export_dataset_metadata(self, dataset_id: str) -> Dict[str, Any]:
        """
        Export complete dataset metadata including versioning.
        
        Args:
            dataset_id: Dataset identifier
            
        Returns:
            Complete dataset metadata
        """
        version_manager = self.get_version_manager(dataset_id)
        version_metadata = version_manager.export_version_metadata()
        
        # Get basic dataset info
        try:
            dataset_info = self.get_dataset(dataset_id)
        except:
            dataset_info = {"id": dataset_id, "name": "Unknown"}
        
        return {
            "dataset_info": dataset_info,
            "version_metadata": version_metadata,
            "export_timestamp": datetime.now().isoformat()
        }
    
    def import_dataset_metadata(
        self,
        dataset_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Import dataset metadata including versioning.
        
        Args:
            dataset_id: Dataset identifier
            metadata: Metadata to import
            
        Returns:
            True if successful
        """
        try:
            version_manager = self.get_version_manager(dataset_id)
            version_metadata = metadata.get("version_metadata", {})
            
            if version_metadata:
                version_manager.import_version_metadata(version_metadata)
                logger.info(f"Imported version metadata for dataset {dataset_id}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Failed to import metadata for dataset {dataset_id}: {e}")
            return False
    
    # Data Visualization Methods
    
    def get_visualizer(self) -> DataVisualizer:
        """
        Get a data visualizer instance.
        
        Returns:
            DataVisualizer: Visualizer instance
        """
        return DataVisualizer()
    
    def create_dataset_visualization(
        self,
        dataset_id: str,
        chart_type: str,
        column: str,
        title: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a visualization for dataset data.
        
        Args:
            dataset_id: Dataset identifier
            chart_type: Type of chart to create
            column: Column to visualize
            title: Custom chart title
            **kwargs: Additional chart parameters
            
        Returns:
            Chart configuration dictionary
        """
        try:
            # Get dataset data
            dataset_data = self.get_dataset_items(dataset_id)
            
            if not dataset_data:
                raise ValueError(f"No data found for dataset {dataset_id}")
            
            visualizer = self.get_visualizer()
            
            # Create appropriate chart based on type
            if chart_type in ["histogram", "box"]:
                chart = visualizer.create_distribution_chart(
                    data=dataset_data,
                    column=column,
                    chart_type=chart_type,
                    title=title,
                    **kwargs
                )
            elif chart_type in ["bar", "pie", "donut"]:
                chart = visualizer.create_categorical_chart(
                    data=dataset_data,
                    column=column,
                    chart_type=chart_type,
                    title=title,
                    **kwargs
                )
            else:
                raise ValueError(f"Unsupported chart type: {chart_type}")
            
            logger.info(f"Created {chart_type} chart for column {column} in dataset {dataset_id}")
            return chart.to_dict()
            
        except Exception as e:
            logger.error(f"Failed to create visualization for dataset {dataset_id}: {e}")
            raise Exception(f"Visualization creation failed: {e}")
    
    def create_correlation_heatmap(
        self,
        dataset_id: str,
        numeric_columns: Optional[List[str]] = None,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a correlation heatmap for numeric columns.
        
        Args:
            dataset_id: Dataset identifier
            numeric_columns: Columns to include (auto-detect if None)
            title: Custom chart title
            
        Returns:
            Heatmap chart configuration
        """
        try:
            # Get dataset data
            dataset_data = self.get_dataset_items(dataset_id)
            
            if not dataset_data:
                raise ValueError(f"No data found for dataset {dataset_id}")
            
            visualizer = self.get_visualizer()
            chart = visualizer.create_correlation_heatmap(
                data=dataset_data,
                numeric_columns=numeric_columns,
                title=title
            )
            
            logger.info(f"Created correlation heatmap for dataset {dataset_id}")
            return chart.to_dict()
            
        except Exception as e:
            logger.error(f"Failed to create correlation heatmap for dataset {dataset_id}: {e}")
            raise Exception(f"Correlation heatmap creation failed: {e}")
    
    def create_trend_chart(
        self,
        dataset_id: str,
        x_column: str,
        y_column: str,
        chart_type: str = "line",
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a trend chart showing relationship between variables.
        
        Args:
            dataset_id: Dataset identifier
            x_column: X-axis column
            y_column: Y-axis column
            chart_type: Chart type ('line', 'scatter', 'area')
            title: Custom chart title
            
        Returns:
            Trend chart configuration
        """
        try:
            # Get dataset data
            dataset_data = self.get_dataset_items(dataset_id)
            
            if not dataset_data:
                raise ValueError(f"No data found for dataset {dataset_id}")
            
            visualizer = self.get_visualizer()
            chart = visualizer.create_trend_chart(
                data=dataset_data,
                x_column=x_column,
                y_column=y_column,
                chart_type=chart_type,
                title=title
            )
            
            logger.info(f"Created {chart_type} trend chart for {y_column} vs {x_column} in dataset {dataset_id}")
            return chart.to_dict()
            
        except Exception as e:
            logger.error(f"Failed to create trend chart for dataset {dataset_id}: {e}")
            raise Exception(f"Trend chart creation failed: {e}")
    
    def create_multi_series_chart(
        self,
        dataset_id: str,
        x_column: str,
        y_columns: List[str],
        chart_type: str = "line",
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a chart with multiple data series.
        
        Args:
            dataset_id: Dataset identifier
            x_column: X-axis column
            y_columns: List of Y-axis columns
            chart_type: Chart type ('line', 'bar', 'area')
            title: Custom chart title
            
        Returns:
            Multi-series chart configuration
        """
        try:
            # Get dataset data
            dataset_data = self.get_dataset_items(dataset_id)
            
            if not dataset_data:
                raise ValueError(f"No data found for dataset {dataset_id}")
            
            visualizer = self.get_visualizer()
            chart = visualizer.create_multi_series_chart(
                data=dataset_data,
                x_column=x_column,
                y_columns=y_columns,
                chart_type=chart_type,
                title=title
            )
            
            logger.info(f"Created multi-series {chart_type} chart for dataset {dataset_id}")
            return chart.to_dict()
            
        except Exception as e:
            logger.error(f"Failed to create multi-series chart for dataset {dataset_id}: {e}")
            raise Exception(f"Multi-series chart creation failed: {e}")
    
    def create_data_quality_dashboard(
        self,
        dataset_id: str,
        title: str = "Data Quality Dashboard"
    ) -> Dict[str, Any]:
        """
        Create a comprehensive data quality dashboard.
        
        Args:
            dataset_id: Dataset identifier
            title: Dashboard title
            
        Returns:
            Dashboard configuration dictionary
        """
        try:
            # Get data profiling results
            profile_result = self.profile_dataset(dataset_id)
            
            if not profile_result:
                raise ValueError(f"No profiling data available for dataset {dataset_id}")
            
            visualizer = self.get_visualizer()
            dashboard = visualizer.create_data_quality_dashboard(
                profile_result=profile_result,
                title=title
            )
            
            logger.info(f"Created data quality dashboard for dataset {dataset_id}")
            return dashboard.to_dict()
            
        except Exception as e:
            logger.error(f"Failed to create data quality dashboard for dataset {dataset_id}: {e}")
            raise Exception(f"Dashboard creation failed: {e}")
    
    def create_dataset_overview_dashboard(
        self,
        dataset_id: str,
        title: str = "Dataset Overview"
    ) -> Dict[str, Any]:
        """
        Create a comprehensive dataset overview dashboard.
        
        Args:
            dataset_id: Dataset identifier
            title: Dashboard title
            
        Returns:
            Dashboard configuration dictionary
        """
        try:
            # Get dataset data and profile
            dataset_data = self.get_dataset_items(dataset_id)
            profile_result = self.profile_dataset(dataset_id)
            
            if not dataset_data:
                raise ValueError(f"No data found for dataset {dataset_id}")
            
            visualizer = self.get_visualizer()
            charts = []
            
            # 1. Data quality dashboard charts
            if profile_result:
                quality_dashboard = visualizer.create_data_quality_dashboard(profile_result)
                charts.extend(quality_dashboard.charts)
            
            # 2. Add sample distribution charts for key columns
            sample_record = dataset_data[0] if dataset_data else {}
            
            # Find interesting columns to visualize
            numeric_columns = []
            categorical_columns = []
            
            for column in list(sample_record.keys())[:5]:  # Limit to first 5 columns
                # Sample values to determine type
                sample_values = [record.get(column) for record in dataset_data[:10]]
                numeric_count = 0
                
                for val in sample_values:
                    if val is not None:
                        try:
                            float(val)
                            numeric_count += 1
                        except (ValueError, TypeError):
                            pass
                
                if numeric_count > len(sample_values) * 0.8:
                    numeric_columns.append(column)
                else:
                    categorical_columns.append(column)
            
            # Add distribution charts for numeric columns
            for column in numeric_columns[:2]:  # Max 2 numeric distributions
                try:
                    chart = visualizer.create_distribution_chart(
                        data=dataset_data,
                        column=column,
                        chart_type="histogram",
                        title=f"Distribution of {column}"
                    )
                    charts.append(chart)
                except Exception as e:
                    logger.warning(f"Could not create distribution chart for {column}: {e}")
            
            # Add categorical charts
            for column in categorical_columns[:2]:  # Max 2 categorical charts
                try:
                    chart = visualizer.create_categorical_chart(
                        data=dataset_data,
                        column=column,
                        chart_type="bar",
                        max_categories=10,
                        title=f"Top Categories in {column}"
                    )
                    charts.append(chart)
                except Exception as e:
                    logger.warning(f"Could not create categorical chart for {column}: {e}")
            
            # Add correlation heatmap if we have enough numeric columns
            if len(numeric_columns) >= 2:
                try:
                    heatmap = visualizer.create_correlation_heatmap(
                        data=dataset_data,
                        numeric_columns=numeric_columns[:5],  # Max 5 columns
                        title="Column Correlations"
                    )
                    charts.append(heatmap)
                except Exception as e:
                    logger.warning(f"Could not create correlation heatmap: {e}")
            
            dashboard = DashboardLayout(
                title=title,
                description=f"Comprehensive overview of dataset {dataset_id}",
                charts=charts,
                layout_config={
                    "grid": {"rows": 4, "cols": 3},
                    "responsive": True,
                    "export_enabled": True
                },
                created_at=datetime.now()
            )
            
            logger.info(f"Created overview dashboard for dataset {dataset_id} with {len(charts)} charts")
            return dashboard.to_dict()
            
        except Exception as e:
            logger.error(f"Failed to create overview dashboard for dataset {dataset_id}: {e}")
            raise Exception(f"Overview dashboard creation failed: {e}")
    
    def export_visualization(
        self,
        visualization: Dict[str, Any],
        format_type: str = "json"
    ) -> str:
        """
        Export visualization configuration.
        
        Args:
            visualization: Visualization configuration
            format_type: Export format ('json')
            
        Returns:
            Exported visualization as string
        """
        try:
            if format_type == "json":
                return json.dumps(visualization, indent=2)
            else:
                raise ValueError(f"Unsupported export format: {format_type}")
        except Exception as e:
            logger.error(f"Failed to export visualization: {e}")
            raise Exception(f"Visualization export failed: {e}")
    
    def get_chart_suggestions(
        self,
        dataset_id: str,
        max_suggestions: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get suggested visualizations for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            max_suggestions: Maximum number of suggestions
            
        Returns:
            List of chart suggestions
        """
        try:
            # Get dataset data and analyze structure
            dataset_data = self.get_dataset_items(dataset_id)
            
            if not dataset_data:
                return []
            
            suggestions = []
            sample_record = dataset_data[0] if dataset_data else {}
            
            # Analyze each column
            for column in list(sample_record.keys())[:10]:  # Analyze first 10 columns
                # Sample values to determine type and characteristics
                sample_values = [record.get(column) for record in dataset_data[:20]]
                non_null_values = [v for v in sample_values if v is not None]
                
                if not non_null_values:
                    continue
                
                # Check if numeric
                numeric_count = 0
                for val in non_null_values:
                    try:
                        float(val)
                        numeric_count += 1
                    except (ValueError, TypeError):
                        pass
                
                is_numeric = numeric_count > len(non_null_values) * 0.8
                
                if is_numeric:
                    # Suggest histogram for numeric columns
                    suggestions.append({
                        "chart_type": "histogram",
                        "column": column,
                        "title": f"Distribution of {column}",
                        "description": f"Shows the frequency distribution of values in {column}",
                        "priority": "high" if len(set(non_null_values)) > 10 else "medium"
                    })
                    
                    # Suggest box plot for numeric with potential outliers
                    if len(non_null_values) >= 10:
                        suggestions.append({
                            "chart_type": "box",
                            "column": column,
                            "title": f"Box Plot of {column}",
                            "description": f"Shows quartiles and outliers in {column}",
                            "priority": "medium"
                        })
                else:
                    # Suggest bar chart for categorical columns
                    unique_count = len(set(str(v) for v in non_null_values))
                    if unique_count <= 20:  # Not too many categories
                        suggestions.append({
                            "chart_type": "bar",
                            "column": column,
                            "title": f"Count by {column}",
                            "description": f"Shows frequency of each category in {column}",
                            "priority": "high" if unique_count <= 10 else "medium"
                        })
                        
                        # Suggest pie chart for categories
                        if unique_count <= 8:
                            suggestions.append({
                                "chart_type": "pie",
                                "column": column,
                                "title": f"Distribution of {column}",
                                "description": f"Shows proportional breakdown of {column} categories",
                                "priority": "medium"
                            })
            
            # Sort by priority and limit
            priority_order = {"high": 3, "medium": 2, "low": 1}
            suggestions.sort(key=lambda x: priority_order.get(x["priority"], 0), reverse=True)
            
            logger.info(f"Generated {len(suggestions)} chart suggestions for dataset {dataset_id}")
            return suggestions[:max_suggestions]
            
        except Exception as e:
            logger.error(f"Failed to generate chart suggestions for dataset {dataset_id}: {e}")
            return []
    
    # ========================================================================================
    # Data Lineage Tracking Methods
    # ========================================================================================
    
    def _ensure_lineage_tracker(self):
        """Ensure lineage tracker is initialized."""
        if not hasattr(self, '_lineage_tracker'):
            from ..utils.data_lineage import DataLineageTracker
            self._lineage_tracker = DataLineageTracker()
            self._enable_lineage_tracking = True
    
    def enable_lineage_tracking(self, enabled: bool = True) -> None:
        """
        Enable or disable automatic lineage tracking.
        
        Args:
            enabled: Whether to enable lineage tracking
        """
        self._ensure_lineage_tracker()
        self._enable_lineage_tracking = enabled
        logger.info(f"Lineage tracking {'enabled' if enabled else 'disabled'}")
    
    def get_lineage_tracker(self) -> 'DataLineageTracker':
        """Get the lineage tracker instance."""
        self._ensure_lineage_tracker()
        return self._lineage_tracker
    
    def track_dataset_creation(
        self,
        dataset_id: str,
        dataset_name: str,
        source_files: Optional[List[str]] = None,
        transformation_details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track the creation of a dataset in the lineage graph.
        
        Args:
            dataset_id: ID of the created dataset
            dataset_name: Name of the dataset
            source_files: List of source file paths used to create the dataset
            transformation_details: Details about the transformation process
            user_id: User who created the dataset
        
        Returns:
            Dictionary with lineage tracking information
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            from ..utils.data_lineage import LineageNodeType, OperationType
            
            # Register the dataset asset
            dataset_asset = self._lineage_tracker.register_asset(
                name=dataset_name,
                asset_type=LineageNodeType.DATASET,
                location=f"dataset://{dataset_id}",
                metadata={
                    "dataset_id": dataset_id,
                    "created_by": user_id,
                    "creation_method": "api"
                }
            )
            
            # Track lineage if source files are provided
            if source_files:
                input_assets = []
                for source_file in source_files:
                    source_asset = self._lineage_tracker.register_asset(
                        name=source_file,
                        asset_type=LineageNodeType.FILE,
                        location=source_file
                    )
                    input_assets.append(source_asset.asset_id)
                
                # Track the creation operation
                event = self._lineage_tracker.track_simple_operation(
                    operation_type=OperationType.CREATE,
                    inputs=input_assets,
                    outputs=[dataset_asset.asset_id],
                    transformation_details=transformation_details,
                    user_id=user_id
                )
                
                logger.info(f"Tracked dataset creation: {dataset_name} ({dataset_id}) from {len(source_files)} sources")
                
                return {
                    "lineage_tracking": "enabled",
                    "dataset_asset_id": dataset_asset.asset_id,
                    "event_id": event.event_id,
                    "source_assets": len(input_assets),
                    "operation_type": "CREATE"
                }
            else:
                logger.info(f"Registered dataset asset: {dataset_name} ({dataset_id})")
                return {
                    "lineage_tracking": "enabled",
                    "dataset_asset_id": dataset_asset.asset_id,
                    "operation_type": "REGISTER"
                }
                
        except Exception as e:
            logger.error(f"Failed to track dataset creation lineage: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def track_dataset_transformation(
        self,
        input_dataset_ids: List[str],
        output_dataset_id: str,
        transformation_type: str = "TRANSFORM",
        transformation_details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a transformation operation between datasets.
        
        Args:
            input_dataset_ids: List of input dataset IDs
            output_dataset_id: Output dataset ID
            transformation_type: Type of transformation (TRANSFORM, AGGREGATE, FILTER, etc.)
            transformation_details: Details about the transformation
            user_id: User performing the transformation
        
        Returns:
            Dictionary with lineage tracking information
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            from ..utils.data_lineage import OperationType
            
            # Convert transformation type to OperationType
            op_type_map = {
                "TRANSFORM": OperationType.TRANSFORM,
                "AGGREGATE": OperationType.AGGREGATE,
                "FILTER": OperationType.FILTER,
                "JOIN": OperationType.JOIN,
                "MERGE": OperationType.MERGE,
                "SPLIT": OperationType.SPLIT,
                "CLEAN": OperationType.CLEAN
            }
            
            operation_type = op_type_map.get(transformation_type.upper(), OperationType.TRANSFORM)
            
            # Create asset IDs for lineage tracking
            input_asset_ids = [f"dataset://{did}" for did in input_dataset_ids]
            output_asset_id = f"dataset://{output_dataset_id}"
            
            # Track the transformation operation
            event = self._lineage_tracker.track_simple_operation(
                operation_type=operation_type,
                inputs=input_asset_ids,
                outputs=[output_asset_id],
                transformation_details=transformation_details,
                user_id=user_id
            )
            
            logger.info(f"Tracked dataset transformation: {len(input_dataset_ids)} inputs -> {output_dataset_id}")
            
            return {
                "lineage_tracking": "enabled",
                "event_id": event.event_id,
                "operation_type": transformation_type,
                "input_datasets": len(input_dataset_ids),
                "output_dataset": output_dataset_id
            }
            
        except Exception as e:
            logger.error(f"Failed to track dataset transformation lineage: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def get_dataset_lineage(self, dataset_id: str, depth: int = -1) -> Dict[str, Any]:
        """
        Get complete lineage information for a dataset.
        
        Args:
            dataset_id: Dataset ID to get lineage for
            depth: Maximum depth for lineage traversal (-1 for unlimited)
        
        Returns:
            Dictionary with complete lineage information
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            asset_id = f"dataset://{dataset_id}"
            
            # Check if asset exists in lineage graph
            if asset_id not in self._lineage_tracker.graph.assets:
                return {
                    "lineage_tracking": "enabled",
                    "dataset_id": dataset_id,
                    "asset_found": False,
                    "message": "Dataset not found in lineage graph"
                }
            
            # Get lineage information
            lineage = self._lineage_tracker.graph.get_asset_lineage(asset_id, depth)
            history = self._lineage_tracker.get_asset_history(asset_id)
            upstream = self._lineage_tracker.graph.get_upstream_assets(asset_id)
            downstream = self._lineage_tracker.graph.get_downstream_assets(asset_id)
            impact_analysis = self._lineage_tracker.graph.find_impact(asset_id)
            
            return {
                "lineage_tracking": "enabled",
                "dataset_id": dataset_id,
                "asset_found": True,
                "summary": {
                    "total_operations": len(history),
                    "upstream_dependencies": len(upstream),
                    "downstream_dependencies": len(downstream),
                    "potential_impact": len(impact_analysis)
                },
                "lineage": lineage,
                "history": [event.to_dict() for event in history],
                "upstream_assets": [asset.to_dict() for asset in upstream],
                "downstream_assets": [asset.to_dict() for asset in downstream],
                "impact_analysis": [asset.to_dict() for asset in impact_analysis]
            }
            
        except Exception as e:
            logger.error(f"Failed to get dataset lineage: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def generate_lineage_report(self, dataset_id: str) -> Dict[str, Any]:
        """
        Generate a comprehensive lineage report for a dataset.
        
        Args:
            dataset_id: Dataset ID to generate report for
        
        Returns:
            Comprehensive lineage report
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            asset_id = f"dataset://{dataset_id}"
            
            if asset_id not in self._lineage_tracker.graph.assets:
                return {
                    "lineage_tracking": "enabled",
                    "dataset_id": dataset_id,
                    "asset_found": False,
                    "message": "Dataset not found in lineage graph"
                }
            
            return self._lineage_tracker.generate_lineage_report(asset_id)
            
        except Exception as e:
            logger.error(f"Failed to generate lineage report: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def find_data_impact(self, dataset_id: str) -> Dict[str, Any]:
        """
        Find all datasets that would be impacted by changes to the given dataset.
        
        Args:
            dataset_id: Dataset ID to analyze impact for
        
        Returns:
            Dictionary with impact analysis results
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            asset_id = f"dataset://{dataset_id}"
            
            if asset_id not in self._lineage_tracker.graph.assets:
                return {
                    "lineage_tracking": "enabled",
                    "dataset_id": dataset_id,
                    "asset_found": False,
                    "impacted_datasets": []
                }
            
            impacted_assets = self._lineage_tracker.graph.find_impact(asset_id)
            
            # Extract dataset IDs from asset locations
            impacted_datasets = []
            for asset in impacted_assets:
                if asset.location and asset.location.startswith("dataset://"):
                    impacted_dataset_id = asset.location.replace("dataset://", "")
                    impacted_datasets.append({
                        "dataset_id": impacted_dataset_id,
                        "dataset_name": asset.name,
                        "asset_type": asset.asset_type.value,
                        "asset_id": asset.asset_id
                    })
            
            return {
                "lineage_tracking": "enabled",
                "dataset_id": dataset_id,
                "asset_found": True,
                "impact_count": len(impacted_datasets),
                "impacted_datasets": impacted_datasets
            }
            
        except Exception as e:
            logger.error(f"Failed to find data impact: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def get_data_flow_paths(self, from_dataset_id: str, to_dataset_id: str) -> Dict[str, Any]:
        """
        Find all data flow paths between two datasets.
        
        Args:
            from_dataset_id: Source dataset ID
            to_dataset_id: Target dataset ID
        
        Returns:
            Dictionary with data flow path information
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            from_asset_id = f"dataset://{from_dataset_id}"
            to_asset_id = f"dataset://{to_dataset_id}"
            
            # Check if both assets exist
            graph_assets = self._lineage_tracker.graph.assets
            if from_asset_id not in graph_assets or to_asset_id not in graph_assets:
                return {
                    "lineage_tracking": "enabled",
                    "from_dataset_id": from_dataset_id,
                    "to_dataset_id": to_dataset_id,
                    "from_asset_found": from_asset_id in graph_assets,
                    "to_asset_found": to_asset_id in graph_assets,
                    "paths": []
                }
            
            # Find data flow paths
            paths = self._lineage_tracker.get_data_flow(from_asset_id, to_asset_id)
            
            # Convert asset IDs back to dataset IDs
            dataset_paths = []
            for path in paths:
                dataset_path = []
                for asset_id in path:
                    if asset_id.startswith("dataset://"):
                        dataset_path.append(asset_id.replace("dataset://", ""))
                    else:
                        dataset_path.append(asset_id)
                dataset_paths.append(dataset_path)
            
            return {
                "lineage_tracking": "enabled",
                "from_dataset_id": from_dataset_id,
                "to_dataset_id": to_dataset_id,
                "paths_found": len(dataset_paths),
                "paths": dataset_paths
            }
            
        except Exception as e:
            logger.error(f"Failed to get data flow paths: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def export_lineage_graph(self, format: str = "json") -> Union[str, Dict[str, Any]]:
        """
        Export the complete lineage graph.
        
        Args:
            format: Export format ("json" or "dict")
        
        Returns:
            Exported lineage graph
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            return self._lineage_tracker.export_lineage_graph(format)
        except Exception as e:
            logger.error(f"Failed to export lineage graph: {e}")
            return {"lineage_tracking": "error", "error": str(e)}
    
    def import_lineage_graph(self, graph_data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Import a lineage graph from exported data.
        
        Args:
            graph_data: Graph data to import
        
        Returns:
            Import status information
        """
        self._ensure_lineage_tracker()
        
        if not getattr(self, '_enable_lineage_tracking', True):
            return {"lineage_tracking": "disabled"}
        
        try:
            self._lineage_tracker.import_lineage_graph(graph_data)
            
            assets_count = len(self._lineage_tracker.graph.assets)
            relationships_count = len(self._lineage_tracker.graph.relationships)
            
            return {
                "lineage_tracking": "enabled",
                "import_status": "success",
                "assets_imported": assets_count,
                "relationships_imported": relationships_count
            }
            
        except Exception as e:
            logger.error(f"Failed to import lineage graph: {e}")
            return {"lineage_tracking": "error", "error": str(e)}

    # ===================== Collaboration Features =====================

    def _ensure_collaboration_manager(self) -> None:
        """Ensure collaboration manager is initialized."""
        if not hasattr(self, '_collaboration_manager'):
            self._collaboration_manager = CollaborationManager()

    def create_user(
        self,
        username: str,
        email: str,
        display_name: str,
        avatar_url: Optional[str] = None,
        role: str = "user"
    ) -> Dict[str, Any]:
        """
        Create a new user for dataset collaboration.
        
        Args:
            username: Unique username
            email: User email address
            display_name: Human-readable display name
            avatar_url: Optional URL for user avatar
            role: User role (user, admin, owner)
            
        Returns:
            Dictionary containing user information
        """
        try:
            self._ensure_collaboration_manager()
            
            user = self._collaboration_manager.create_user(
                username=username,
                email=email,
                display_name=display_name,
                avatar_url=avatar_url,
                role=role
            )
            
            return {
                "collaboration": "enabled",
                "action": "user_created",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "display_name": user.display_name,
                    "role": user.role,
                    "created_at": user.created_at
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return {"collaboration": "error", "error": str(e)}

    def create_team(
        self,
        name: str,
        description: Optional[str] = None,
        members: Optional[List[str]] = None,
        owner_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new team for dataset collaboration.
        
        Args:
            name: Team name
            description: Optional team description
            members: List of user IDs to add as members
            owner_id: Optional team owner user ID
            
        Returns:
            Dictionary containing team information
        """
        try:
            self._ensure_collaboration_manager()
            
            team = self._collaboration_manager.create_team(
                name=name,
                description=description,
                members=members or [],
                owner_id=owner_id
            )
            
            return {
                "collaboration": "enabled",
                "action": "team_created",
                "team": {
                    "id": team.id,
                    "name": team.name,
                    "description": team.description,
                    "member_count": len(team.members),
                    "created_at": team.created_at
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create team: {e}")
            return {"collaboration": "error", "error": str(e)}

    def grant_dataset_permission(
        self,
        dataset_id: str,
        user_id: Optional[str] = None,
        team_id: Optional[str] = None,
        permission_level: str = "READ",
        granted_by: Optional[str] = None,
        expires_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Grant permission to access a dataset.
        
        Args:
            dataset_id: Dataset identifier
            user_id: User ID to grant permission to (mutually exclusive with team_id)
            team_id: Team ID to grant permission to (mutually exclusive with user_id)
            permission_level: Permission level (READ, WRITE, ADMIN, OWNER)
            granted_by: User ID of permission granter
            expires_at: Optional expiration timestamp
            
        Returns:
            Dictionary containing permission information
        """
        try:
            self._ensure_collaboration_manager()
            
            if user_id and team_id:
                raise ValueError("Cannot grant permission to both user and team simultaneously")
            if not user_id and not team_id:
                raise ValueError("Must specify either user_id or team_id")
            
            subject_id = user_id or team_id
            subject_type = "user" if user_id else "team"
            
            try:
                perm_level = PermissionLevel[permission_level.upper()]
            except KeyError:
                raise ValueError(f"Invalid permission level: {permission_level}")
            
            permission = self._collaboration_manager.grant_permission(
                resource_id=dataset_id,
                resource_type="dataset",
                subject_id=subject_id,
                subject_type=subject_type,
                permission_level=perm_level,
                granted_by=granted_by,
                expires_at=expires_at
            )
            
            return {
                "collaboration": "enabled",
                "action": "permission_granted",
                "permission": {
                    "id": permission.id,
                    "resource_id": permission.resource_id,
                    "subject_id": permission.subject_id,
                    "subject_type": permission.subject_type,
                    "permission_level": permission.permission_level.name,
                    "granted_at": permission.granted_at
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to grant dataset permission: {e}")
            return {"collaboration": "error", "error": str(e)}

    def add_dataset_comment(
        self,
        dataset_id: str,
        content: str,
        author_id: str,
        comment_type: str = "GENERAL",
        parent_comment_id: Optional[str] = None,
        mentioned_users: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Add a comment to a dataset.
        
        Args:
            dataset_id: Dataset identifier
            content: Comment content
            author_id: Comment author user ID
            comment_type: Type of comment (GENERAL, QUESTION, SUGGESTION, ISSUE)
            parent_comment_id: Optional parent comment for threaded discussions
            mentioned_users: List of user IDs mentioned in the comment
            
        Returns:
            Dictionary containing comment information
        """
        try:
            self._ensure_collaboration_manager()
            
            try:
                c_type = CommentType[comment_type.upper()]
            except KeyError:
                raise ValueError(f"Invalid comment type: {comment_type}")
            
            comment = self._collaboration_manager.add_comment(
                resource_id=dataset_id,
                resource_type="dataset",
                content=content,
                author_id=author_id,
                comment_type=c_type,
                parent_comment_id=parent_comment_id,
                mentioned_users=mentioned_users or []
            )
            
            return {
                "collaboration": "enabled",
                "action": "comment_added",
                "comment": {
                    "id": comment.id,
                    "content": comment.content,
                    "author_id": comment.author_id,
                    "comment_type": comment.comment_type.name,
                    "created_at": comment.created_at,
                    "replies_count": len(comment.replies)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to add dataset comment: {e}")
            return {"collaboration": "error", "error": str(e)}

    def annotate_dataset_field(
        self,
        dataset_id: str,
        field_name: str,
        content: str,
        author_id: str,
        annotation_type: str = "NOTE",
        priority: str = "MEDIUM"
    ) -> Dict[str, Any]:
        """
        Add an annotation to a dataset field.
        
        Args:
            dataset_id: Dataset identifier
            field_name: Name of the field to annotate
            content: Annotation content
            author_id: Annotation author user ID
            annotation_type: Type of annotation (NOTE, WARNING, ERROR, SUGGESTION)
            priority: Annotation priority (LOW, MEDIUM, HIGH, CRITICAL)
            
        Returns:
            Dictionary containing annotation information
        """
        try:
            self._ensure_collaboration_manager()
            
            try:
                a_type = AnnotationType[annotation_type.upper()]
            except KeyError:
                raise ValueError(f"Invalid annotation type: {annotation_type}")
            
            annotation = self._collaboration_manager.add_annotation(
                resource_id=dataset_id,
                resource_type="dataset",
                target_field=field_name,
                content=content,
                author_id=author_id,
                annotation_type=a_type,
                priority=priority.upper()
            )
            
            return {
                "collaboration": "enabled",
                "action": "annotation_added",
                "annotation": {
                    "id": annotation.id,
                    "target_field": annotation.target_field,
                    "content": annotation.content,
                    "author_id": annotation.author_id,
                    "annotation_type": annotation.annotation_type.name,
                    "priority": annotation.priority,
                    "created_at": annotation.created_at
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to add dataset field annotation: {e}")
            return {"collaboration": "error", "error": str(e)}

    def get_dataset_collaboration_summary(self, dataset_id: str) -> Dict[str, Any]:
        """
        Get collaboration summary for a dataset.
        
        Args:
            dataset_id: Dataset identifier
            
        Returns:
            Dictionary containing collaboration summary
        """
        try:
            self._ensure_collaboration_manager()
            
            # Get permissions
            permissions = self._collaboration_manager.get_resource_permissions(dataset_id, "dataset")
            
            # Get comments
            comments = self._collaboration_manager.get_comments(dataset_id, "dataset")
            
            # Get annotations
            annotations = self._collaboration_manager.get_annotations(dataset_id, "dataset")
            
            # Get recent activities
            activities = self._collaboration_manager.get_recent_activities(
                resource_id=dataset_id,
                resource_type="dataset",
                limit=10
            )
            
            return {
                "collaboration": "enabled",
                "dataset_id": dataset_id,
                "summary": {
                    "permissions_count": len(permissions),
                    "comments_count": len(comments),
                    "annotations_count": len(annotations),
                    "recent_activities_count": len(activities)
                },
                "permissions": [
                    {
                        "subject_id": p.subject_id,
                        "subject_type": p.subject_type,
                        "permission_level": p.permission_level.name,
                        "granted_at": p.granted_at
                    }
                    for p in permissions
                ],
                "recent_comments": [
                    {
                        "id": c.id,
                        "content": c.content[:100] + "..." if len(c.content) > 100 else c.content,
                        "author_id": c.author_id,
                        "comment_type": c.comment_type.name,
                        "created_at": c.created_at
                    }
                    for c in comments[:5]  # Latest 5 comments
                ],
                "recent_annotations": [
                    {
                        "id": a.id,
                        "target_field": a.target_field,
                        "content": a.content[:50] + "..." if len(a.content) > 50 else a.content,
                        "annotation_type": a.annotation_type.name,
                        "priority": a.priority,
                        "created_at": a.created_at
                    }
                    for a in annotations[:5]  # Latest 5 annotations
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get dataset collaboration summary: {e}")
            return {"collaboration": "error", "error": str(e)}

    def export_collaboration_data(self) -> Dict[str, Any]:
        """
        Export all collaboration data.
        
        Returns:
            Dictionary containing exported collaboration data
        """
        try:
            self._ensure_collaboration_manager()
            
            exported_data = self._collaboration_manager.export_collaboration_data()
            
            return {
                "collaboration": "enabled",
                "action": "data_exported",
                "export_summary": {
                    "users_count": len(exported_data.get("users", {})),
                    "teams_count": len(exported_data.get("teams", {})),
                    "permissions_count": len(exported_data.get("permissions", {})),
                    "comments_count": len(exported_data.get("comments", {})),
                    "annotations_count": len(exported_data.get("annotations", {})),
                    "activities_count": len(exported_data.get("activities", [])),
                    "notifications_count": len(exported_data.get("notifications", {}))
                },
                "data": exported_data
            }
            
        except Exception as e:
            logger.error(f"Failed to export collaboration data: {e}")
            return {"collaboration": "error", "error": str(e)}

    # ===================== Cloud Storage Features =====================

    def _ensure_cloud_storage_manager(self) -> None:
        """Ensure cloud storage manager is initialized."""
        if not hasattr(self, '_cloud_storage_manager'):
            self._cloud_storage_manager = CloudStorageManager()

    def register_cloud_provider(
        self,
        provider_name: str,
        credentials: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Register a cloud storage provider.
        
        Args:
            provider_name: Name to identify the provider
            credentials: Provider credentials and configuration
            
        Returns:
            Dictionary containing registration result
        """
        try:
            self._ensure_cloud_storage_manager()
            
            # Convert dict to CloudCredentials
            provider_type = credentials.get("provider", "local_fs")
            
            if provider_type == "local_fs":
                creds = create_local_credentials(
                    base_path=credentials.get("base_path", "/tmp/sprintlens_storage")
                )
            elif provider_type == "aws_s3":
                creds = create_s3_credentials(
                    access_key=credentials.get("access_key", ""),
                    secret_key=credentials.get("secret_key", ""),
                    region=credentials.get("region", "us-east-1"),
                    bucket=credentials.get("bucket", "sprintlens-datasets")
                )
            else:
                raise ValueError(f"Unsupported provider type: {provider_type}")
            
            provider = self._cloud_storage_manager.create_provider(creds)
            self._cloud_storage_manager.register_provider(provider_name, provider)
            
            return {
                "cloud_storage": "enabled",
                "action": "provider_registered",
                "provider": {
                    "name": provider_name,
                    "type": provider.provider.value,
                    "status": "active"
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to register cloud provider: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def create_cloud_dataset(
        self,
        name: str,
        description: str,
        provider_name: str,
        bucket: str = "sprintlens-datasets",
        storage_class: str = "STANDARD"
    ) -> Dict[str, Any]:
        """
        Create a new cloud dataset.
        
        Args:
            name: Dataset name
            description: Dataset description
            provider_name: Registered provider name
            bucket: Storage bucket name
            storage_class: Storage class (STANDARD, INFREQUENT_ACCESS, ARCHIVE)
            
        Returns:
            Dictionary containing cloud dataset information
        """
        try:
            self._ensure_cloud_storage_manager()
            
            if provider_name not in self._cloud_storage_manager.providers:
                raise ValueError(f"Provider not registered: {provider_name}")
            
            provider = self._cloud_storage_manager.providers[provider_name]
            
            # Convert storage class string to enum
            try:
                storage_class_enum = StorageClass[storage_class.upper()]
            except KeyError:
                storage_class_enum = StorageClass.STANDARD
            
            location = create_storage_location(
                provider=provider.provider,
                bucket=bucket,
                path=f"datasets/{name}",
                storage_class=storage_class_enum
            )
            
            cloud_dataset = asyncio.run(
                self._cloud_storage_manager.create_cloud_dataset(
                    name=name,
                    description=description,
                    primary_location=location
                )
            )
            
            return {
                "cloud_storage": "enabled",
                "action": "cloud_dataset_created",
                "dataset": {
                    "id": cloud_dataset.dataset_id,
                    "name": cloud_dataset.name,
                    "description": cloud_dataset.description,
                    "provider": cloud_dataset.primary_location.provider.value,
                    "bucket": cloud_dataset.primary_location.bucket,
                    "path": cloud_dataset.primary_location.path,
                    "storage_class": cloud_dataset.primary_location.storage_class.value,
                    "sync_status": cloud_dataset.sync_status.value,
                    "created_at": cloud_dataset.created_at
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create cloud dataset: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def upload_dataset_to_cloud(
        self,
        dataset_id: str,
        local_path: str,
        provider_name: str,
        shard_size_mb: int = 100
    ) -> Dict[str, Any]:
        """
        Upload a dataset to cloud storage.
        
        Args:
            dataset_id: Cloud dataset ID
            local_path: Local file or directory path
            provider_name: Registered provider name
            shard_size_mb: Size limit per shard in MB
            
        Returns:
            Dictionary containing upload result
        """
        try:
            self._ensure_cloud_storage_manager()
            
            result = asyncio.run(
                self._cloud_storage_manager.upload_dataset(
                    dataset_id=dataset_id,
                    local_path=local_path,
                    provider_name=provider_name,
                    shard_size_mb=shard_size_mb
                )
            )
            
            return {
                "cloud_storage": "enabled",
                "action": "dataset_uploaded",
                "result": {
                    "success": result.success,
                    "dataset_id": result.dataset_id,
                    "files_synced": result.files_synced,
                    "bytes_transferred": result.bytes_transferred,
                    "duration_seconds": result.duration_seconds,
                    "errors": result.errors
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to upload dataset to cloud: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def download_dataset_from_cloud(
        self,
        dataset_id: str,
        local_path: str,
        provider_name: str
    ) -> Dict[str, Any]:
        """
        Download a dataset from cloud storage.
        
        Args:
            dataset_id: Cloud dataset ID
            local_path: Local directory path for download
            provider_name: Registered provider name
            
        Returns:
            Dictionary containing download result
        """
        try:
            self._ensure_cloud_storage_manager()
            
            result = asyncio.run(
                self._cloud_storage_manager.download_dataset(
                    dataset_id=dataset_id,
                    local_path=local_path,
                    provider_name=provider_name
                )
            )
            
            return {
                "cloud_storage": "enabled",
                "action": "dataset_downloaded",
                "result": {
                    "success": result.success,
                    "dataset_id": result.dataset_id,
                    "files_synced": result.files_synced,
                    "bytes_transferred": result.bytes_transferred,
                    "duration_seconds": result.duration_seconds,
                    "errors": result.errors
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to download dataset from cloud: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def sync_dataset_with_cloud(
        self,
        dataset_id: str,
        provider_name: str,
        direction: str = "bidirectional"
    ) -> Dict[str, Any]:
        """
        Synchronize dataset with cloud storage.
        
        Args:
            dataset_id: Cloud dataset ID
            provider_name: Registered provider name
            direction: Sync direction (upload, download, bidirectional)
            
        Returns:
            Dictionary containing sync result
        """
        try:
            self._ensure_cloud_storage_manager()
            
            result = asyncio.run(
                self._cloud_storage_manager.sync_dataset(
                    dataset_id=dataset_id,
                    provider_name=provider_name,
                    direction=direction
                )
            )
            
            return {
                "cloud_storage": "enabled",
                "action": "dataset_synced",
                "result": {
                    "success": result.success,
                    "dataset_id": result.dataset_id,
                    "sync_type": result.sync_type,
                    "direction": direction,
                    "metadata": result.metadata
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to sync dataset with cloud: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def backup_dataset_to_cloud(
        self,
        dataset_id: str,
        backup_provider_name: str
    ) -> Dict[str, Any]:
        """
        Create a backup of dataset to another cloud provider.
        
        Args:
            dataset_id: Cloud dataset ID
            backup_provider_name: Registered backup provider name
            
        Returns:
            Dictionary containing backup result
        """
        try:
            self._ensure_cloud_storage_manager()
            
            result = asyncio.run(
                self._cloud_storage_manager.backup_dataset(
                    dataset_id=dataset_id,
                    backup_provider_name=backup_provider_name
                )
            )
            
            return {
                "cloud_storage": "enabled",
                "action": "dataset_backed_up",
                "result": {
                    "success": result.success,
                    "dataset_id": result.dataset_id,
                    "backup_provider": backup_provider_name,
                    "sync_type": result.sync_type,
                    "metadata": result.metadata
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to backup dataset to cloud: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def get_cloud_dataset_info(self, dataset_id: str) -> Dict[str, Any]:
        """
        Get information about a cloud dataset.
        
        Args:
            dataset_id: Cloud dataset ID
            
        Returns:
            Dictionary containing cloud dataset information
        """
        try:
            self._ensure_cloud_storage_manager()
            
            dataset = self._cloud_storage_manager.get_dataset(dataset_id)
            
            if not dataset:
                return {"cloud_storage": "error", "error": f"Dataset not found: {dataset_id}"}
            
            return {
                "cloud_storage": "enabled",
                "dataset": {
                    "id": dataset.dataset_id,
                    "name": dataset.name,
                    "description": dataset.description,
                    "version": dataset.version,
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
                    "total_size_bytes": sum(s.size_bytes for s in dataset.shards),
                    "sync_status": dataset.sync_status.value,
                    "created_at": dataset.created_at,
                    "updated_at": dataset.updated_at,
                    "metadata": dataset.metadata,
                    "tags": dataset.tags
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get cloud dataset info: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def list_cloud_datasets(self) -> Dict[str, Any]:
        """
        List all cloud datasets.
        
        Returns:
            Dictionary containing list of cloud datasets
        """
        try:
            self._ensure_cloud_storage_manager()
            
            datasets = self._cloud_storage_manager.list_datasets()
            
            return {
                "cloud_storage": "enabled",
                "datasets": [
                    {
                        "id": dataset.dataset_id,
                        "name": dataset.name,
                        "description": dataset.description,
                        "provider": dataset.primary_location.provider.value,
                        "bucket": dataset.primary_location.bucket,
                        "sync_status": dataset.sync_status.value,
                        "shards_count": len(dataset.shards),
                        "total_size_bytes": sum(s.size_bytes for s in dataset.shards),
                        "created_at": dataset.created_at,
                        "updated_at": dataset.updated_at
                    }
                    for dataset in datasets
                ],
                "total_count": len(datasets)
            }
            
        except Exception as e:
            logger.error(f"Failed to list cloud datasets: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def get_cloud_storage_stats(self) -> Dict[str, Any]:
        """
        Get cloud storage statistics.
        
        Returns:
            Dictionary containing cloud storage statistics
        """
        try:
            self._ensure_cloud_storage_manager()
            
            stats = self._cloud_storage_manager.get_storage_stats()
            
            return {
                "cloud_storage": "enabled",
                "statistics": stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get cloud storage stats: {e}")
            return {"cloud_storage": "error", "error": str(e)}

    def export_cloud_storage_config(self) -> Dict[str, Any]:
        """
        Export cloud storage configuration.
        
        Returns:
            Dictionary containing cloud storage configuration
        """
        try:
            self._ensure_cloud_storage_manager()
            
            config = self._cloud_storage_manager.export_cloud_config()
            
            return {
                "cloud_storage": "enabled",
                "action": "config_exported",
                "config": config
            }
            
        except Exception as e:
            logger.error(f"Failed to export cloud storage config: {e}")
            return {"cloud_storage": "error", "error": str(e)}