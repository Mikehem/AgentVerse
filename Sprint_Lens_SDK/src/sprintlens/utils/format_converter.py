"""
Data format conversion utilities for Sprint Lens SDK.

This module provides utilities to convert between different data formats:
- pandas DataFrame ↔ EvaluationDataset
- JSON ↔ EvaluationDataset
- CSV ↔ EvaluationDataset
- pandas DataFrame ↔ JSON
- pandas DataFrame ↔ CSV

Supports both structured and flexible data conversion with automatic type detection.
"""

import json
import io
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

from ..evaluation.dataset import EvaluationDataset, DatasetItem
from ..utils.logging import get_logger

logger = get_logger(__name__)

# Optional pandas dependency
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False
    logger.warning("pandas not available. DataFrame conversion features will be disabled.")


class DataFormatConverter:
    """
    Utility class for converting between different data formats.
    
    Provides comprehensive conversion capabilities between pandas DataFrames,
    EvaluationDatasets, JSON, and CSV formats with automatic data validation
    and type detection.
    """
    
    @staticmethod
    def dataframe_to_evaluation_dataset(
        df,
        name: str,
        prediction_col: str = "prediction",
        ground_truth_col: str = "ground_truth", 
        context_col: Optional[str] = "context",
        id_col: Optional[str] = "id",
        description: Optional[str] = None,
        metadata_cols: Optional[List[str]] = None
    ) -> EvaluationDataset:
        """
        Convert pandas DataFrame to EvaluationDataset.
        
        Args:
            df: pandas DataFrame to convert
            name: Dataset name
            prediction_col: Column name for predictions
            ground_truth_col: Column name for ground truth values
            context_col: Column name for context (optional)
            id_col: Column name for item IDs (optional)
            description: Dataset description
            metadata_cols: List of columns to include as metadata
            
        Returns:
            EvaluationDataset object
            
        Raises:
            ImportError: If pandas is not available
            ValueError: If required columns are missing
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame conversion. Install with: pip install pandas")
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        # Validate required columns
        if prediction_col not in df.columns:
            raise ValueError(f"Prediction column '{prediction_col}' not found in DataFrame")
        
        if ground_truth_col not in df.columns:
            raise ValueError(f"Ground truth column '{ground_truth_col}' not found in DataFrame")
        
        # Determine metadata columns
        if metadata_cols is None:
            # Use all columns except the main ones as metadata
            excluded_cols = {prediction_col, ground_truth_col, context_col, id_col, "created_at"}
            metadata_cols = [col for col in df.columns if col not in excluded_cols]
        
        items = []
        for idx, row in df.iterrows():
            # Extract main fields
            prediction = row[prediction_col]
            ground_truth = row[ground_truth_col]
            context = row.get(context_col) if context_col and context_col in df.columns else None
            item_id = row.get(id_col) if id_col and id_col in df.columns else None
            
            # Extract metadata
            metadata = {}
            for col in metadata_cols:
                if col in df.columns and pd.notna(row[col]):
                    metadata[col] = row[col]
            
            # Create dataset item
            item = DatasetItem(
                id=str(item_id) if item_id is not None else None,
                prediction=prediction,
                ground_truth=ground_truth,
                context=str(context) if context is not None else None,
                metadata=metadata
            )
            items.append(item)
        
        dataset = EvaluationDataset(
            name=name,
            items=items,
            description=description or f"Dataset converted from DataFrame with {len(items)} items"
        )
        
        logger.info(f"Converted DataFrame with {len(df)} rows to EvaluationDataset '{name}'")
        return dataset
    
    @staticmethod
    def evaluation_dataset_to_dataframe(dataset: EvaluationDataset) -> Any:
        """
        Convert EvaluationDataset to pandas DataFrame.
        
        Args:
            dataset: EvaluationDataset to convert
            
        Returns:
            pandas DataFrame
            
        Raises:
            ImportError: If pandas is not available
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame conversion. Install with: pip install pandas")
        
        if not dataset.items:
            # Return empty DataFrame with expected columns
            return pd.DataFrame(columns=["id", "prediction", "ground_truth", "context", "created_at"])
        
        # Collect all unique metadata keys
        metadata_keys = set()
        for item in dataset.items:
            metadata_keys.update(item.metadata.keys())
        
        # Build rows
        rows = []
        for item in dataset.items:
            row = {
                "id": item.id,
                "prediction": item.prediction,
                "ground_truth": item.ground_truth,
                "context": item.context,
                "created_at": item.created_at
            }
            
            # Add metadata columns
            for key in metadata_keys:
                row[key] = item.metadata.get(key)
            
            rows.append(row)
        
        df = pd.DataFrame(rows)
        
        logger.info(f"Converted EvaluationDataset '{dataset.name}' with {len(dataset.items)} items to DataFrame")
        return df
    
    @staticmethod
    def json_to_evaluation_dataset(
        json_data: Union[str, Dict[str, Any], List[Dict[str, Any]]],
        name: str,
        prediction_key: str = "prediction",
        ground_truth_key: str = "ground_truth",
        context_key: str = "context",
        id_key: str = "id",
        description: Optional[str] = None
    ) -> EvaluationDataset:
        """
        Convert JSON data to EvaluationDataset.
        
        Args:
            json_data: JSON string, dict, or list of dicts
            name: Dataset name
            prediction_key: Key for prediction values
            ground_truth_key: Key for ground truth values
            context_key: Key for context values
            id_key: Key for item IDs
            description: Dataset description
            
        Returns:
            EvaluationDataset object
        """
        # Parse JSON if string
        if isinstance(json_data, str):
            try:
                data = json.loads(json_data)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON string: {e}")
        else:
            data = json_data
        
        # Handle different JSON structures
        if isinstance(data, dict):
            if "items" in data:
                # Structured dataset format
                items_data = data["items"]
                dataset_name = data.get("name", name)
                dataset_description = data.get("description", description)
                dataset_metadata = data.get("metadata", {})
            else:
                # Single item as dict
                items_data = [data]
                dataset_name = name
                dataset_description = description
                dataset_metadata = {}
        elif isinstance(data, list):
            # List of items
            items_data = data
            dataset_name = name
            dataset_description = description
            dataset_metadata = {}
        else:
            raise ValueError("JSON data must be a dict or list")
        
        # Convert items
        items = []
        for item_data in items_data:
            if not isinstance(item_data, dict):
                raise ValueError("Each item must be a dictionary")
            
            # Extract main fields
            prediction = item_data.get(prediction_key)
            ground_truth = item_data.get(ground_truth_key)
            context = item_data.get(context_key)
            item_id = item_data.get(id_key)
            
            # Extract metadata (all other keys)
            metadata = {}
            excluded_keys = {prediction_key, ground_truth_key, context_key, id_key, "created_at"}
            for key, value in item_data.items():
                if key not in excluded_keys:
                    metadata[key] = value
            
            item = DatasetItem(
                id=str(item_id) if item_id is not None else None,
                prediction=prediction,
                ground_truth=ground_truth,
                context=str(context) if context is not None else None,
                metadata=metadata,
                created_at=item_data.get("created_at")
            )
            items.append(item)
        
        dataset = EvaluationDataset(
            name=dataset_name,
            items=items,
            description=dataset_description,
            metadata=dataset_metadata if 'dataset_metadata' in locals() else {}
        )
        
        logger.info(f"Converted JSON data to EvaluationDataset '{dataset.name}' with {len(items)} items")
        return dataset
    
    @staticmethod
    def evaluation_dataset_to_json(
        dataset: EvaluationDataset,
        include_metadata: bool = True,
        pretty: bool = False
    ) -> str:
        """
        Convert EvaluationDataset to JSON string.
        
        Args:
            dataset: EvaluationDataset to convert
            include_metadata: Whether to include dataset metadata
            pretty: Whether to format JSON with indentation
            
        Returns:
            JSON string representation
        """
        data = dataset.to_dict()
        
        if not include_metadata:
            data.pop("metadata", None)
            # Remove metadata from items as well
            for item in data.get("items", []):
                item.pop("metadata", None)
        
        indent = 2 if pretty else None
        json_str = json.dumps(data, indent=indent, ensure_ascii=False)
        
        logger.info(f"Converted EvaluationDataset '{dataset.name}' to JSON string")
        return json_str
    
    @staticmethod
    def dataframe_to_json(df, orient: str = "records", pretty: bool = False) -> str:
        """
        Convert pandas DataFrame to JSON string.
        
        Args:
            df: pandas DataFrame to convert
            orient: pandas DataFrame.to_json() orientation
            pretty: Whether to format JSON with indentation
            
        Returns:
            JSON string representation
            
        Raises:
            ImportError: If pandas is not available
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame conversion. Install with: pip install pandas")
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        # Convert DataFrame to JSON
        json_str = df.to_json(orient=orient, date_format="iso")
        
        # Pretty format if requested
        if pretty:
            data = json.loads(json_str)
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
        
        logger.info(f"Converted DataFrame with {len(df)} rows to JSON string")
        return json_str
    
    @staticmethod
    def json_to_dataframe(json_data: Union[str, Dict[str, Any], List[Dict[str, Any]]]) -> Any:
        """
        Convert JSON data to pandas DataFrame.
        
        Args:
            json_data: JSON string, dict, or list of dicts
            
        Returns:
            pandas DataFrame
            
        Raises:
            ImportError: If pandas is not available
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame conversion. Install with: pip install pandas")
        
        # Parse JSON if string
        if isinstance(json_data, str):
            try:
                data = json.loads(json_data)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON string: {e}")
        else:
            data = json_data
        
        # Convert to DataFrame
        if isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, dict):
            # Try different orientations
            try:
                df = pd.DataFrame([data])  # Single record
            except:
                try:
                    df = pd.DataFrame(data)  # Dict of series
                except:
                    # Extract items if available
                    if "items" in data:
                        df = pd.DataFrame(data["items"])
                    else:
                        raise ValueError("Cannot convert dict to DataFrame")
        else:
            raise ValueError("JSON data must be a dict or list")
        
        logger.info(f"Converted JSON data to DataFrame with {len(df)} rows")
        return df
    
    @staticmethod
    def dataframe_to_csv_string(df, **kwargs) -> str:
        """
        Convert pandas DataFrame to CSV string.
        
        Args:
            df: pandas DataFrame to convert
            **kwargs: Additional arguments passed to DataFrame.to_csv()
            
        Returns:
            CSV string representation
            
        Raises:
            ImportError: If pandas is not available
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame conversion. Install with: pip install pandas")
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        # Default CSV parameters
        csv_params = {
            "index": False,
            "encoding": "utf-8"
        }
        csv_params.update(kwargs)
        
        csv_str = df.to_csv(**csv_params)
        
        logger.info(f"Converted DataFrame with {len(df)} rows to CSV string")
        return csv_str
    
    @staticmethod
    def csv_string_to_dataframe(csv_data: str, **kwargs) -> Any:
        """
        Convert CSV string to pandas DataFrame.
        
        Args:
            csv_data: CSV string data
            **kwargs: Additional arguments passed to pd.read_csv()
            
        Returns:
            pandas DataFrame
            
        Raises:
            ImportError: If pandas is not available
        """
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required for DataFrame conversion. Install with: pip install pandas")
        
        # Default CSV parameters
        csv_params = {
            "encoding": "utf-8"
        }
        csv_params.update(kwargs)
        
        # Use StringIO to read CSV from string
        csv_buffer = io.StringIO(csv_data)
        df = pd.read_csv(csv_buffer, **csv_params)
        
        logger.info(f"Converted CSV string to DataFrame with {len(df)} rows")
        return df


# Convenience functions for direct conversion
def dataframe_to_dataset(df, name: str, **kwargs) -> EvaluationDataset:
    """Convenience function to convert DataFrame to EvaluationDataset."""
    return DataFormatConverter.dataframe_to_evaluation_dataset(df, name, **kwargs)


def dataset_to_dataframe(dataset: EvaluationDataset):
    """Convenience function to convert EvaluationDataset to DataFrame."""
    return DataFormatConverter.evaluation_dataset_to_dataframe(dataset)


def json_to_dataset(json_data: Union[str, Dict, List], name: str, **kwargs) -> EvaluationDataset:
    """Convenience function to convert JSON to EvaluationDataset."""
    return DataFormatConverter.json_to_evaluation_dataset(json_data, name, **kwargs)


def dataset_to_json(dataset: EvaluationDataset, **kwargs) -> str:
    """Convenience function to convert EvaluationDataset to JSON."""
    return DataFormatConverter.evaluation_dataset_to_json(dataset, **kwargs)


def dataframe_to_json(df, **kwargs) -> str:
    """Convenience function to convert DataFrame to JSON."""
    return DataFormatConverter.dataframe_to_json(df, **kwargs)


def json_to_dataframe(json_data: Union[str, Dict, List]):
    """Convenience function to convert JSON to DataFrame."""
    return DataFormatConverter.json_to_dataframe(json_data)


def dataframe_to_csv(df, **kwargs) -> str:
    """Convenience function to convert DataFrame to CSV string."""
    return DataFormatConverter.dataframe_to_csv_string(df, **kwargs)


def csv_to_dataframe(csv_data: str, **kwargs):
    """Convenience function to convert CSV string to DataFrame."""
    return DataFormatConverter.csv_string_to_dataframe(csv_data, **kwargs)