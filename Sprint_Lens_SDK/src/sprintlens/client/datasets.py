"""
Dataset client for Sprint Lens SDK.

This module provides client functionality for managing datasets in the backend.
"""

import asyncio
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import uuid

from .base import BaseClient
from ..evaluation.dataset import EvaluationDataset, DatasetItem
from ..utils.logging import get_logger

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