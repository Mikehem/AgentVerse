"""
Dataset handling for Sprint Lens evaluation framework.

This module provides utilities for managing evaluation datasets.
"""

import json
import csv
from typing import List, Dict, Any, Optional, Union, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
import uuid

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class DatasetItem:
    """Individual item in an evaluation dataset."""
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    prediction: Any = None
    ground_truth: Any = None
    context: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "prediction": self.prediction,
            "ground_truth": self.ground_truth,
            "context": self.context,
            "metadata": self.metadata,
            "created_at": self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DatasetItem":
        """Create from dictionary representation."""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            prediction=data.get("prediction"),
            ground_truth=data.get("ground_truth"),
            context=data.get("context"),
            metadata=data.get("metadata", {}),
            created_at=data.get("created_at", datetime.now().isoformat())
        )


class EvaluationDataset:
    """
    Dataset for evaluation tasks.
    
    Provides functionality to load, store, and manipulate evaluation datasets
    with support for various file formats and data sources.
    """
    
    def __init__(
        self,
        name: str,
        items: Optional[List[DatasetItem]] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize evaluation dataset.
        
        Args:
            name: Dataset name
            items: List of dataset items
            description: Human-readable description
            metadata: Additional dataset metadata
        """
        self.name = name
        self.items = items or []
        self.description = description
        self.metadata = metadata or {}
        self.created_at = datetime.now().isoformat()
        
        logger.debug(f"Initialized dataset '{name}' with {len(self.items)} items")
    
    def __len__(self) -> int:
        """Get number of items in dataset."""
        return len(self.items)
    
    def __iter__(self) -> Iterator[DatasetItem]:
        """Iterate over dataset items."""
        return iter(self.items)
    
    def __getitem__(self, index: int) -> DatasetItem:
        """Get item by index."""
        return self.items[index]
    
    def add_item(
        self,
        prediction: Any,
        ground_truth: Any,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        item_id: Optional[str] = None
    ) -> DatasetItem:
        """
        Add an item to the dataset.
        
        Args:
            prediction: Predicted value
            ground_truth: Ground truth value
            context: Optional context information
            metadata: Optional item metadata
            item_id: Optional custom item ID
            
        Returns:
            Created DatasetItem
        """
        item = DatasetItem(
            id=item_id or str(uuid.uuid4()),
            prediction=prediction,
            ground_truth=ground_truth,
            context=context,
            metadata=metadata or {}
        )
        
        self.items.append(item)
        logger.debug(f"Added item {item.id} to dataset '{self.name}'")
        
        return item
    
    def remove_item(self, item_id: str) -> bool:
        """
        Remove an item from the dataset.
        
        Args:
            item_id: ID of item to remove
            
        Returns:
            True if item was found and removed
        """
        for i, item in enumerate(self.items):
            if item.id == item_id:
                removed_item = self.items.pop(i)
                logger.debug(f"Removed item {item_id} from dataset '{self.name}'")
                return True
        
        return False
    
    def get_item(self, item_id: str) -> Optional[DatasetItem]:
        """
        Get an item by ID.
        
        Args:
            item_id: Item ID to search for
            
        Returns:
            DatasetItem if found, None otherwise
        """
        for item in self.items:
            if item.id == item_id:
                return item
        return None
    
    def get_predictions(self) -> List[Any]:
        """Get list of all predictions in the dataset."""
        return [item.prediction for item in self.items]
    
    def get_ground_truths(self) -> List[Any]:
        """Get list of all ground truth values in the dataset."""
        return [item.ground_truth for item in self.items]
    
    def get_contexts(self) -> List[Optional[str]]:
        """Get list of all context values in the dataset."""
        return [item.context for item in self.items]
    
    def filter_by_metadata(self, key: str, value: Any) -> "EvaluationDataset":
        """
        Create a new dataset filtered by metadata value.
        
        Args:
            key: Metadata key to filter on
            value: Value to match
            
        Returns:
            New EvaluationDataset with filtered items
        """
        filtered_items = [
            item for item in self.items
            if item.metadata.get(key) == value
        ]
        
        return EvaluationDataset(
            name=f"{self.name}_filtered",
            items=filtered_items,
            description=f"Filtered from {self.name} where {key}={value}",
            metadata={
                **self.metadata,
                "filtered_from": self.name,
                "filter_key": key,
                "filter_value": value
            }
        )
    
    def sample(self, n: int, random_seed: Optional[int] = None) -> "EvaluationDataset":
        """
        Create a new dataset with a random sample of items.
        
        Args:
            n: Number of items to sample
            random_seed: Optional random seed for reproducibility
            
        Returns:
            New EvaluationDataset with sampled items
        """
        import random
        
        if random_seed is not None:
            random.seed(random_seed)
        
        if n >= len(self.items):
            sampled_items = self.items.copy()
        else:
            sampled_items = random.sample(self.items, n)
        
        return EvaluationDataset(
            name=f"{self.name}_sample",
            items=sampled_items,
            description=f"Random sample of {n} items from {self.name}",
            metadata={
                **self.metadata,
                "sampled_from": self.name,
                "sample_size": n,
                "random_seed": random_seed
            }
        )
    
    def split(self, train_ratio: float = 0.8, random_seed: Optional[int] = None) -> tuple["EvaluationDataset", "EvaluationDataset"]:
        """
        Split dataset into train and test sets.
        
        Args:
            train_ratio: Ratio of items for training set
            random_seed: Optional random seed for reproducibility
            
        Returns:
            Tuple of (train_dataset, test_dataset)
        """
        import random
        
        if random_seed is not None:
            random.seed(random_seed)
        
        shuffled_items = self.items.copy()
        random.shuffle(shuffled_items)
        
        split_index = int(len(shuffled_items) * train_ratio)
        
        train_items = shuffled_items[:split_index]
        test_items = shuffled_items[split_index:]
        
        train_dataset = EvaluationDataset(
            name=f"{self.name}_train",
            items=train_items,
            description=f"Training split from {self.name}",
            metadata={
                **self.metadata,
                "split_from": self.name,
                "split_type": "train",
                "train_ratio": train_ratio
            }
        )
        
        test_dataset = EvaluationDataset(
            name=f"{self.name}_test",
            items=test_items,
            description=f"Test split from {self.name}",
            metadata={
                **self.metadata,
                "split_from": self.name,
                "split_type": "test",
                "train_ratio": train_ratio
            }
        )
        
        return train_dataset, test_dataset
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert dataset to dictionary representation."""
        return {
            "name": self.name,
            "description": self.description,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "items": [item.to_dict() for item in self.items]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvaluationDataset":
        """Create dataset from dictionary representation."""
        items = [DatasetItem.from_dict(item_data) for item_data in data.get("items", [])]
        
        dataset = cls(
            name=data["name"],
            items=items,
            description=data.get("description"),
            metadata=data.get("metadata", {})
        )
        
        if "created_at" in data:
            dataset.created_at = data["created_at"]
        
        return dataset
    
    def save_json(self, file_path: Union[str, Path]) -> None:
        """
        Save dataset to JSON file.
        
        Args:
            file_path: Path to save the JSON file
        """
        file_path = Path(file_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved dataset '{self.name}' to {file_path}")
    
    @classmethod
    def load_json(cls, file_path: Union[str, Path]) -> "EvaluationDataset":
        """
        Load dataset from JSON file.
        
        Args:
            file_path: Path to the JSON file
            
        Returns:
            Loaded EvaluationDataset
        """
        file_path = Path(file_path)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        dataset = cls.from_dict(data)
        logger.info(f"Loaded dataset '{dataset.name}' from {file_path}")
        
        return dataset
    
    def save_csv(self, file_path: Union[str, Path]) -> None:
        """
        Save dataset to CSV file.
        
        Args:
            file_path: Path to save the CSV file
        """
        file_path = Path(file_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            if not self.items:
                return
            
            # Determine all unique metadata keys
            metadata_keys = set()
            for item in self.items:
                metadata_keys.update(item.metadata.keys())
            
            # Create CSV headers
            fieldnames = ['id', 'prediction', 'ground_truth', 'context', 'created_at']
            fieldnames.extend(sorted(metadata_keys))
            
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for item in self.items:
                row = {
                    'id': item.id,
                    'prediction': item.prediction,
                    'ground_truth': item.ground_truth,
                    'context': item.context,
                    'created_at': item.created_at
                }
                # Add metadata fields
                for key in metadata_keys:
                    row[key] = item.metadata.get(key, '')
                
                writer.writerow(row)
        
        logger.info(f"Saved dataset '{self.name}' to {file_path}")
    
    @classmethod
    def load_csv(
        cls,
        file_path: Union[str, Path],
        name: Optional[str] = None,
        prediction_col: str = 'prediction',
        ground_truth_col: str = 'ground_truth',
        context_col: Optional[str] = 'context',
        id_col: Optional[str] = 'id'
    ) -> "EvaluationDataset":
        """
        Load dataset from CSV file.
        
        Args:
            file_path: Path to the CSV file
            name: Dataset name (defaults to filename)
            prediction_col: Column name for predictions
            ground_truth_col: Column name for ground truth
            context_col: Column name for context (optional)
            id_col: Column name for item IDs (optional)
            
        Returns:
            Loaded EvaluationDataset
        """
        file_path = Path(file_path)
        dataset_name = name or file_path.stem
        
        items = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Extract required fields
                prediction = row.get(prediction_col)
                ground_truth = row.get(ground_truth_col)
                
                if prediction is None or ground_truth is None:
                    logger.warning(f"Skipping row with missing data: {row}")
                    continue
                
                # Extract optional fields
                context = row.get(context_col) if context_col else None
                item_id = row.get(id_col) if id_col else None
                
                # Extract metadata (all other columns)
                metadata = {}
                for key, value in row.items():
                    if key not in [prediction_col, ground_truth_col, context_col, id_col, 'created_at']:
                        if value:  # Only include non-empty values
                            metadata[key] = value
                
                item = DatasetItem(
                    id=item_id or str(uuid.uuid4()),
                    prediction=prediction,
                    ground_truth=ground_truth,
                    context=context,
                    metadata=metadata,
                    created_at=row.get('created_at', datetime.now().isoformat())
                )
                
                items.append(item)
        
        dataset = cls(
            name=dataset_name,
            items=items,
            description=f"Dataset loaded from {file_path}",
            metadata={"source_file": str(file_path)}
        )
        
        logger.info(f"Loaded dataset '{dataset.name}' with {len(items)} items from {file_path}")
        
        return dataset
    
    @classmethod
    def from_lists(
        cls,
        name: str,
        predictions: List[Any],
        ground_truths: List[Any],
        contexts: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> "EvaluationDataset":
        """
        Create dataset from separate lists.
        
        Args:
            name: Dataset name
            predictions: List of predictions
            ground_truths: List of ground truth values
            contexts: Optional list of contexts
            description: Optional description
            
        Returns:
            Created EvaluationDataset
        """
        if len(predictions) != len(ground_truths):
            raise ValueError("Predictions and ground truths must have same length")
        
        if contexts and len(contexts) != len(predictions):
            raise ValueError("Contexts must have same length as predictions")
        
        items = []
        for i, (pred, gt) in enumerate(zip(predictions, ground_truths)):
            context = contexts[i] if contexts else None
            item = DatasetItem(
                prediction=pred,
                ground_truth=gt,
                context=context,
                metadata={"index": i}
            )
            items.append(item)
        
        return cls(
            name=name,
            items=items,
            description=description
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get basic statistics about the dataset."""
        if not self.items:
            return {"size": 0}
        
        stats = {
            "size": len(self.items),
            "has_context": sum(1 for item in self.items if item.context is not None),
            "unique_predictions": len(set(str(item.prediction) for item in self.items)),
            "unique_ground_truths": len(set(str(item.ground_truth) for item in self.items)),
            "metadata_keys": list(set().union(*(item.metadata.keys() for item in self.items)))
        }
        
        # Type distribution
        prediction_types = {}
        ground_truth_types = {}
        
        for item in self.items:
            pred_type = type(item.prediction).__name__
            gt_type = type(item.ground_truth).__name__
            
            prediction_types[pred_type] = prediction_types.get(pred_type, 0) + 1
            ground_truth_types[gt_type] = ground_truth_types.get(gt_type, 0) + 1
        
        stats["prediction_types"] = prediction_types
        stats["ground_truth_types"] = ground_truth_types
        
        return stats