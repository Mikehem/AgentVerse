# Sprint Lens SDK API Reference

## Overview

The Sprint Lens SDK provides comprehensive dataset management capabilities with support for multiple data formats, programmatic operations, and seamless integration with the Sprint Lens backend platform.

## Table of Contents

- [Dataset Management](#dataset-management)
- [Format Conversion](#format-conversion)
- [Bulk Operations](#bulk-operations)
- [Evaluation Integration](#evaluation-integration)
- [Examples](#examples)

---

## Dataset Management

### DatasetClient

The main client class for dataset operations.

#### Initialization

```python
import sprintlens

# Configure the SDK
sprintlens.configure(
    url="https://your-backend.com",
    username="your-username",
    password="your-password"
)

# Get the dataset client
client = sprintlens.get_client()
dataset_client = client.datasets
```

#### Core Dataset Operations

##### create_dataset(name, description=None, metadata=None)

Create a new dataset.

**Parameters:**
- `name` (str): Dataset name
- `description` (str, optional): Dataset description
- `metadata` (dict, optional): Additional metadata

**Returns:**
- `dict`: Created dataset information with ID

**Example:**
```python
dataset = dataset_client.create_dataset(
    name="sentiment_analysis_v1",
    description="Sentiment analysis evaluation dataset",
    metadata={"version": "1.0", "model": "bert-base"}
)
print(f"Created dataset with ID: {dataset['id']}")
```

##### get_dataset(dataset_id)

Retrieve dataset by ID.

**Parameters:**
- `dataset_id` (str): Dataset ID

**Returns:**
- `dict`: Dataset information

**Example:**
```python
dataset = dataset_client.get_dataset("dataset_123")
print(f"Dataset name: {dataset['name']}")
```

##### list_datasets(limit=100, offset=0, name_filter=None)

List datasets with pagination and filtering.

**Parameters:**
- `limit` (int): Maximum number of datasets to return
- `offset` (int): Number of datasets to skip
- `name_filter` (str, optional): Filter by name

**Returns:**
- `dict`: List of datasets with pagination info

**Example:**
```python
datasets = dataset_client.list_datasets(limit=50, name_filter="sentiment")
for dataset in datasets['items']:
    print(f"Dataset: {dataset['name']}")
```

##### update_dataset(dataset_id, name=None, description=None, metadata=None)

Update dataset metadata.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `name` (str, optional): New name
- `description` (str, optional): New description  
- `metadata` (dict, optional): New metadata

**Returns:**
- `dict`: Updated dataset information

##### delete_dataset(dataset_id)

Delete a dataset.

**Parameters:**
- `dataset_id` (str): Dataset ID

**Returns:**
- `bool`: True if deletion was successful

#### Dataset Item Operations

##### add_dataset_item(dataset_id, prediction, ground_truth, context=None, metadata=None)

Add a single item to a dataset.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `prediction` (Any): Predicted value
- `ground_truth` (Any): Ground truth value
- `context` (str, optional): Context information
- `metadata` (dict, optional): Item metadata

**Returns:**
- `dict`: Created item information

**Example:**
```python
item = dataset_client.add_dataset_item(
    dataset_id="dataset_123",
    prediction="positive",
    ground_truth="positive",
    context="Great product!",
    metadata={"confidence": 0.95}
)
```

##### get_dataset_item(dataset_id, item_id)

Retrieve a specific dataset item.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `item_id` (str): Item ID

**Returns:**
- `dict`: Dataset item information

##### list_dataset_items(dataset_id, limit=100, offset=0)

List items in a dataset.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `limit` (int): Maximum number of items to return
- `offset` (int): Number of items to skip

**Returns:**
- `dict`: List of dataset items with pagination info

##### update_dataset_item(dataset_id, item_id, prediction=None, ground_truth=None, context=None, metadata=None)

Update a dataset item.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `item_id` (str): Item ID
- `prediction` (Any, optional): New prediction
- `ground_truth` (Any, optional): New ground truth
- `context` (str, optional): New context
- `metadata` (dict, optional): New metadata

**Returns:**
- `dict`: Updated item information

##### delete_dataset_item(dataset_id, item_id)

Delete a dataset item.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `item_id` (str): Item ID

**Returns:**
- `bool`: True if deletion was successful

---

## Bulk Operations

### add_dataset_items_bulk(dataset_id, items)

Add multiple items to a dataset in a single operation.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `items` (List[dict]): List of item dictionaries

**Returns:**
- `dict`: Bulk operation result

**Example:**
```python
items = [
    {
        "prediction": "positive",
        "ground_truth": "positive", 
        "context": "Good service",
        "metadata": {"confidence": 0.9}
    },
    {
        "prediction": "negative",
        "ground_truth": "negative",
        "context": "Poor quality",
        "metadata": {"confidence": 0.85}
    }
]

result = dataset_client.add_dataset_items_bulk("dataset_123", items)
print(f"Added {result['created_count']} items")
```

---

## Format Conversion

### DataFrame Integration

#### create_dataset_from_dataframe(df, name, description=None, prediction_col="prediction", ground_truth_col="ground_truth", context_col="context", id_col="id", metadata_cols=None)

Create a dataset from a pandas DataFrame.

**Parameters:**
- `df` (pandas.DataFrame): Source DataFrame
- `name` (str): Dataset name
- `description` (str, optional): Dataset description
- `prediction_col` (str): Column name for predictions
- `ground_truth_col` (str): Column name for ground truth
- `context_col` (str, optional): Column name for context
- `id_col` (str, optional): Column name for item IDs
- `metadata_cols` (List[str], optional): Columns to include as metadata

**Returns:**
- `str`: Created dataset ID

**Example:**
```python
import pandas as pd

df = pd.DataFrame({
    'prediction': ['A', 'B', 'A'],
    'ground_truth': ['A', 'A', 'A'],
    'context': ['Text 1', 'Text 2', 'Text 3'],
    'confidence': [0.9, 0.8, 0.95],
    'model': ['v1', 'v1', 'v2']
})

dataset_id = dataset_client.create_dataset_from_dataframe(
    df=df,
    name="classification_results",
    metadata_cols=['confidence', 'model']
)
```

#### get_dataset_as_dataframe(dataset_id)

Retrieve a dataset as a pandas DataFrame.

**Parameters:**
- `dataset_id` (str): Dataset ID

**Returns:**
- `pandas.DataFrame`: Dataset items as DataFrame

**Example:**
```python
df = dataset_client.get_dataset_as_dataframe("dataset_123")
print(df.head())
```

### JSON Integration

#### create_dataset_from_json(json_data, name, description=None, prediction_key="prediction", ground_truth_key="ground_truth", context_key="context", id_key="id")

Create a dataset from JSON data.

**Parameters:**
- `json_data` (str|dict|list): JSON string, dict, or list of dicts
- `name` (str): Dataset name
- `description` (str, optional): Dataset description
- `prediction_key` (str): Key for prediction values
- `ground_truth_key` (str): Key for ground truth values
- `context_key` (str): Key for context values
- `id_key` (str): Key for item IDs

**Returns:**
- `str`: Created dataset ID

**Example:**
```python
json_data = [
    {
        "id": "item1",
        "model_output": "positive",
        "label": "positive",
        "text": "Great product!",
        "score": 0.95
    },
    {
        "id": "item2", 
        "model_output": "negative",
        "label": "positive",
        "text": "Could be better",
        "score": 0.75
    }
]

dataset_id = dataset_client.create_dataset_from_json(
    json_data=json_data,
    name="review_sentiment",
    prediction_key="model_output",
    ground_truth_key="label",
    context_key="text"
)
```

#### get_dataset_as_json(dataset_id, include_metadata=True, pretty=False)

Retrieve a dataset as JSON string.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `include_metadata` (bool): Whether to include metadata
- `pretty` (bool): Whether to format with indentation

**Returns:**
- `str`: JSON string representation

### CSV Integration

#### get_dataset_as_csv(dataset_id, **kwargs)

Retrieve a dataset as CSV string.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `**kwargs`: Additional arguments for CSV formatting

**Returns:**
- `str`: CSV string representation

**Example:**
```python
csv_data = dataset_client.get_dataset_as_csv(
    "dataset_123",
    index=False,
    sep=','
)
print(csv_data)
```

---

## Format Conversion Utilities

### Standalone Conversion Functions

#### dataframe_to_dataset(df, name, **kwargs)

Convert pandas DataFrame to EvaluationDataset.

**Example:**
```python
import sprintlens

dataset = sprintlens.dataframe_to_dataset(df, "my_dataset")
```

#### dataset_to_dataframe(dataset)

Convert EvaluationDataset to pandas DataFrame.

**Example:**
```python
df = sprintlens.dataset_to_dataframe(dataset)
```

#### json_to_dataset(json_data, name, **kwargs)

Convert JSON data to EvaluationDataset.

**Example:**
```python
dataset = sprintlens.json_to_dataset(json_data, "my_dataset")
```

#### dataset_to_json(dataset, **kwargs)

Convert EvaluationDataset to JSON string.

**Example:**
```python
json_str = sprintlens.dataset_to_json(dataset, pretty=True)
```

#### dataframe_to_json(df, **kwargs)

Convert pandas DataFrame to JSON string.

**Example:**
```python
json_str = sprintlens.dataframe_to_json(df, orient="records")
```

#### json_to_dataframe(json_data)

Convert JSON data to pandas DataFrame.

**Example:**
```python
df = sprintlens.json_to_dataframe(json_data)
```

#### dataframe_to_csv(df, **kwargs)

Convert pandas DataFrame to CSV string.

**Example:**
```python
csv_str = sprintlens.dataframe_to_csv(df, index=False)
```

#### csv_to_dataframe(csv_data, **kwargs)

Convert CSV string to pandas DataFrame.

**Example:**
```python
df = sprintlens.csv_to_dataframe(csv_data)
```

---

## Evaluation Integration

### upload_evaluation_dataset(dataset, dataset_id=None)

Upload an EvaluationDataset to the backend.

**Parameters:**
- `dataset` (EvaluationDataset): Dataset to upload
- `dataset_id` (str, optional): Existing dataset ID to update

**Returns:**
- `str`: Dataset ID

**Example:**
```python
from sprintlens.evaluation import EvaluationDataset, DatasetItem

# Create evaluation dataset
items = [
    DatasetItem(
        prediction="A",
        ground_truth="A", 
        context="Sample text",
        metadata={"confidence": 0.9}
    )
]

dataset = EvaluationDataset(
    name="manual_dataset",
    items=items,
    description="Manually created dataset"
)

# Upload to backend
dataset_id = dataset_client.upload_evaluation_dataset(dataset)
```

### download_evaluation_dataset(dataset_id)

Download a dataset as an EvaluationDataset object.

**Parameters:**
- `dataset_id` (str): Dataset ID

**Returns:**
- `EvaluationDataset`: Downloaded dataset

**Example:**
```python
dataset = dataset_client.download_evaluation_dataset("dataset_123")
print(f"Downloaded {len(dataset.items)} items")

# Use with evaluation metrics
from sprintlens.evaluation import AccuracyMetric

metric = AccuracyMetric()
result = metric.evaluate(dataset)
print(f"Accuracy: {result.value}")
```

---

## Search and Export

### search_datasets(query, limit=100, offset=0)

Search datasets by name or description.

**Parameters:**
- `query` (str): Search query
- `limit` (int): Maximum results
- `offset` (int): Results to skip

**Returns:**
- `dict`: Search results with pagination

**Example:**
```python
results = dataset_client.search_datasets("sentiment analysis")
for dataset in results['items']:
    print(f"Found: {dataset['name']}")
```

### export_dataset(dataset_id, format="json", include_metadata=True)

Export a dataset in the specified format.

**Parameters:**
- `dataset_id` (str): Dataset ID
- `format` (str): Export format ("json", "csv", "parquet")
- `include_metadata` (bool): Include metadata in export

**Returns:**
- `dict`: Export result with download information

**Example:**
```python
export_result = dataset_client.export_dataset(
    "dataset_123",
    format="csv",
    include_metadata=True
)
print(f"Export URL: {export_result['download_url']}")
```

---

## Error Handling

All SDK methods may raise exceptions for various error conditions:

```python
try:
    dataset = dataset_client.get_dataset("invalid_id")
except Exception as e:
    print(f"Error: {e}")
```

Common exceptions:
- `ValueError`: Invalid parameters or data
- `ImportError`: Missing dependencies (e.g., pandas)
- `Exception`: API errors or network issues

---

## Complete Example

```python
import sprintlens
import pandas as pd

# Configure SDK
sprintlens.configure(
    url="https://your-backend.com",
    username="your-username",
    password="your-password"
)

# Get client
client = sprintlens.get_client()
dataset_client = client.datasets

# Create dataset from DataFrame
df = pd.DataFrame({
    'prediction': ['A', 'B', 'A', 'C'],
    'ground_truth': ['A', 'A', 'A', 'C'],
    'confidence': [0.9, 0.7, 0.85, 0.95],
    'text': ['Good', 'Bad', 'Okay', 'Great']
})

dataset_id = dataset_client.create_dataset_from_dataframe(
    df=df,
    name="classification_eval",
    description="Classification model evaluation",
    context_col='text',
    metadata_cols=['confidence']
)

print(f"Created dataset: {dataset_id}")

# Add more items
items = [
    {
        "prediction": "D",
        "ground_truth": "D",
        "context": "Excellent",
        "metadata": {"confidence": 0.98}
    }
]

dataset_client.add_dataset_items_bulk(dataset_id, items)

# Retrieve as DataFrame for analysis
df_result = dataset_client.get_dataset_as_dataframe(dataset_id)
print(f"Final dataset shape: {df_result.shape}")

# Export for sharing
csv_export = dataset_client.get_dataset_as_csv(dataset_id)
with open("dataset_export.csv", "w") as f:
    f.write(csv_export)

print("Dataset operations completed successfully!")
```

This API reference provides comprehensive documentation for all dataset management and format conversion capabilities in the Sprint Lens SDK.