"""
Data Lineage Tracking System for Sprint Lens SDK

This module provides comprehensive data lineage tracking capabilities to monitor
data transformations, track data flow, and maintain audit trails.

Features:
- Data transformation tracking
- Lineage graph construction
- Impact analysis
- Audit trail management
- Data provenance tracking
- Transformation versioning
- Dependency mapping
"""

import json
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from enum import Enum
import hashlib

from .._logging import get_logger


class OperationType(Enum):
    """Types of data operations that can be tracked."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    TRANSFORM = "transform"
    AGGREGATE = "aggregate"
    FILTER = "filter"
    JOIN = "join"
    MERGE = "merge"
    SPLIT = "split"
    VALIDATE = "validate"
    CLEAN = "clean"
    EXPORT = "export"
    IMPORT = "import"


class LineageNodeType(Enum):
    """Types of nodes in the lineage graph."""
    DATASET = "dataset"
    TRANSFORMATION = "transformation"
    QUERY = "query"
    MODEL = "model"
    PIPELINE = "pipeline"
    API_CALL = "api_call"
    FILE = "file"
    DATABASE = "database"


@dataclass
class LineageMetadata:
    """Metadata associated with a lineage event."""
    
    operation_id: str
    operation_type: OperationType
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    application: Optional[str] = None
    version: Optional[str] = None
    environment: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    custom_attributes: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "operation_id": self.operation_id,
            "operation_type": self.operation_type.value,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "application": self.application,
            "version": self.version,
            "environment": self.environment,
            "tags": self.tags,
            "custom_attributes": self.custom_attributes
        }


@dataclass
class DataAsset:
    """Represents a data asset in the lineage graph."""
    
    asset_id: str
    name: str
    asset_type: LineageNodeType
    location: Optional[str] = None
    schema_info: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "asset_id": self.asset_id,
            "name": self.name,
            "asset_type": self.asset_type.value,
            "location": self.location,
            "schema_info": self.schema_info,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class LineageEvent:
    """Represents a single lineage tracking event."""
    
    event_id: str
    timestamp: str
    operation_metadata: LineageMetadata
    inputs: List[DataAsset]
    outputs: List[DataAsset]
    transformation_details: Optional[Dict[str, Any]] = None
    execution_context: Optional[Dict[str, Any]] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    error_info: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "operation_metadata": self.operation_metadata.to_dict(),
            "inputs": [asset.to_dict() for asset in self.inputs],
            "outputs": [asset.to_dict() for asset in self.outputs],
            "transformation_details": self.transformation_details,
            "execution_context": self.execution_context,
            "performance_metrics": self.performance_metrics,
            "error_info": self.error_info
        }


@dataclass
class LineageRelationship:
    """Represents a relationship between data assets."""
    
    relationship_id: str
    source_asset_id: str
    target_asset_id: str
    relationship_type: str
    operation_type: OperationType
    transformation_logic: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "relationship_id": self.relationship_id,
            "source_asset_id": self.source_asset_id,
            "target_asset_id": self.target_asset_id,
            "relationship_type": self.relationship_type,
            "operation_type": self.operation_type.value,
            "transformation_logic": self.transformation_logic,
            "metadata": self.metadata,
            "created_at": self.created_at
        }


@dataclass
class LineageGraph:
    """Represents the complete data lineage graph."""
    
    graph_id: str
    assets: Dict[str, DataAsset] = field(default_factory=dict)
    relationships: Dict[str, LineageRelationship] = field(default_factory=dict)
    events: List[LineageEvent] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def add_asset(self, asset: DataAsset) -> None:
        """Add a data asset to the graph."""
        self.assets[asset.asset_id] = asset
        self.updated_at = datetime.now().isoformat()
    
    def add_relationship(self, relationship: LineageRelationship) -> None:
        """Add a relationship to the graph."""
        self.relationships[relationship.relationship_id] = relationship
        self.updated_at = datetime.now().isoformat()
    
    def add_event(self, event: LineageEvent) -> None:
        """Add a lineage event to the graph."""
        self.events.append(event)
        self.updated_at = datetime.now().isoformat()
    
    def get_upstream_assets(self, asset_id: str) -> List[DataAsset]:
        """Get all upstream assets for a given asset."""
        upstream_ids = {
            rel.source_asset_id for rel in self.relationships.values()
            if rel.target_asset_id == asset_id
        }
        return [self.assets[aid] for aid in upstream_ids if aid in self.assets]
    
    def get_downstream_assets(self, asset_id: str) -> List[DataAsset]:
        """Get all downstream assets for a given asset."""
        downstream_ids = {
            rel.target_asset_id for rel in self.relationships.values()
            if rel.source_asset_id == asset_id
        }
        return [self.assets[aid] for aid in downstream_ids if aid in self.assets]
    
    def get_asset_lineage(self, asset_id: str, depth: int = -1) -> Dict[str, Any]:
        """Get complete lineage for an asset."""
        visited = set()
        
        def _get_lineage_recursive(current_id: str, current_depth: int, direction: str) -> Dict[str, Any]:
            if current_id in visited or (depth != -1 and current_depth >= depth):
                return {}
            
            visited.add(current_id)
            lineage = {"asset": self.assets.get(current_id)}
            
            if direction == "upstream":
                related_assets = self.get_upstream_assets(current_id)
                lineage["upstream"] = [
                    _get_lineage_recursive(asset.asset_id, current_depth + 1, "upstream")
                    for asset in related_assets
                ]
            else:
                related_assets = self.get_downstream_assets(current_id)
                lineage["downstream"] = [
                    _get_lineage_recursive(asset.asset_id, current_depth + 1, "downstream")
                    for asset in related_assets
                ]
            
            return lineage
        
        return {
            "upstream": _get_lineage_recursive(asset_id, 0, "upstream"),
            "downstream": _get_lineage_recursive(asset_id, 0, "downstream")
        }
    
    def find_impact(self, asset_id: str) -> List[DataAsset]:
        """Find all assets that would be impacted by changes to the given asset."""
        impacted = set()
        to_visit = [asset_id]
        
        while to_visit:
            current_id = to_visit.pop(0)
            if current_id in impacted:
                continue
            
            impacted.add(current_id)
            downstream = self.get_downstream_assets(current_id)
            to_visit.extend(asset.asset_id for asset in downstream)
        
        impacted.discard(asset_id)  # Remove the original asset
        return [self.assets[aid] for aid in impacted if aid in self.assets]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "graph_id": self.graph_id,
            "assets": {aid: asset.to_dict() for aid, asset in self.assets.items()},
            "relationships": {rid: rel.to_dict() for rid, rel in self.relationships.items()},
            "events": [event.to_dict() for event in self.events],
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class DataLineageTracker:
    """Main data lineage tracking system."""
    
    def __init__(self, graph_id: Optional[str] = None):
        """
        Initialize the lineage tracker.
        
        Args:
            graph_id: Optional graph ID, generates one if not provided
        """
        self.logger = get_logger(__name__)
        self.graph = LineageGraph(graph_id or str(uuid.uuid4()))
        self._active_operations: Dict[str, Dict[str, Any]] = {}
    
    def register_asset(
        self,
        name: str,
        asset_type: LineageNodeType,
        location: Optional[str] = None,
        schema_info: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        asset_id: Optional[str] = None
    ) -> DataAsset:
        """
        Register a new data asset.
        
        Args:
            name: Asset name
            asset_type: Type of the asset
            location: Asset location (file path, database table, etc.)
            schema_info: Schema information
            metadata: Additional metadata
            asset_id: Optional asset ID, generates one if not provided
        
        Returns:
            Created DataAsset
        """
        if not asset_id:
            asset_id = self._generate_asset_id(name, location)
        
        asset = DataAsset(
            asset_id=asset_id,
            name=name,
            asset_type=asset_type,
            location=location,
            schema_info=schema_info,
            metadata=metadata
        )
        
        self.graph.add_asset(asset)
        self.logger.info(f"Registered asset: {name} ({asset_id})")
        
        return asset
    
    def start_operation(
        self,
        operation_type: OperationType,
        inputs: List[str],
        operation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Start tracking a data operation.
        
        Args:
            operation_type: Type of operation
            inputs: List of input asset IDs
            operation_id: Optional operation ID
            user_id: User performing the operation
            session_id: Session ID
            metadata: Additional metadata
        
        Returns:
            Operation ID
        """
        if not operation_id:
            operation_id = str(uuid.uuid4())
        
        self._active_operations[operation_id] = {
            "operation_type": operation_type,
            "inputs": inputs,
            "start_time": datetime.now(),
            "metadata": metadata or {},
            "user_id": user_id,
            "session_id": session_id
        }
        
        self.logger.info(f"Started operation: {operation_type.value} ({operation_id})")
        return operation_id
    
    def complete_operation(
        self,
        operation_id: str,
        outputs: List[str],
        transformation_details: Optional[Dict[str, Any]] = None,
        performance_metrics: Optional[Dict[str, Any]] = None,
        error_info: Optional[Dict[str, Any]] = None
    ) -> LineageEvent:
        """
        Complete a data operation and create lineage event.
        
        Args:
            operation_id: Operation ID from start_operation
            outputs: List of output asset IDs
            transformation_details: Details about the transformation
            performance_metrics: Performance metrics
            error_info: Error information if operation failed
        
        Returns:
            Created LineageEvent
        """
        if operation_id not in self._active_operations:
            raise ValueError(f"Operation {operation_id} not found or already completed")
        
        operation_info = self._active_operations.pop(operation_id)
        
        # Create operation metadata
        metadata = LineageMetadata(
            operation_id=operation_id,
            operation_type=operation_info["operation_type"],
            user_id=operation_info.get("user_id"),
            session_id=operation_info.get("session_id")
        )
        
        # Get input and output assets
        input_assets = [self.graph.assets[aid] for aid in operation_info["inputs"] if aid in self.graph.assets]
        output_assets = [self.graph.assets[aid] for aid in outputs if aid in self.graph.assets]
        
        # Create lineage event
        event = LineageEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now().isoformat(),
            operation_metadata=metadata,
            inputs=input_assets,
            outputs=output_assets,
            transformation_details=transformation_details,
            performance_metrics=performance_metrics,
            error_info=error_info
        )
        
        self.graph.add_event(event)
        
        # Create relationships
        for input_asset in input_assets:
            for output_asset in output_assets:
                relationship = LineageRelationship(
                    relationship_id=str(uuid.uuid4()),
                    source_asset_id=input_asset.asset_id,
                    target_asset_id=output_asset.asset_id,
                    relationship_type="derived_from",
                    operation_type=operation_info["operation_type"],
                    transformation_logic=json.dumps(transformation_details) if transformation_details else None
                )
                self.graph.add_relationship(relationship)
        
        self.logger.info(f"Completed operation: {operation_info['operation_type'].value} ({operation_id})")
        return event
    
    def track_simple_operation(
        self,
        operation_type: OperationType,
        inputs: List[str],
        outputs: List[str],
        transformation_details: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> LineageEvent:
        """
        Track a simple operation in one call.
        
        Args:
            operation_type: Type of operation
            inputs: List of input asset IDs
            outputs: List of output asset IDs
            transformation_details: Details about the transformation
            user_id: User performing the operation
            session_id: Session ID
        
        Returns:
            Created LineageEvent
        """
        operation_id = self.start_operation(
            operation_type=operation_type,
            inputs=inputs,
            user_id=user_id,
            session_id=session_id
        )
        
        return self.complete_operation(
            operation_id=operation_id,
            outputs=outputs,
            transformation_details=transformation_details
        )
    
    def get_asset_history(self, asset_id: str) -> List[LineageEvent]:
        """Get all events that involve a specific asset."""
        return [
            event for event in self.graph.events
            if any(asset.asset_id == asset_id for asset in event.inputs + event.outputs)
        ]
    
    def get_data_flow(self, from_asset_id: str, to_asset_id: str) -> List[List[str]]:
        """Find all possible data flow paths between two assets."""
        paths = []
        
        def _find_paths(current_id: str, target_id: str, current_path: List[str], visited: Set[str]):
            if current_id == target_id:
                paths.append(current_path + [current_id])
                return
            
            if current_id in visited:
                return
            
            visited.add(current_id)
            downstream = self.graph.get_downstream_assets(current_id)
            
            for asset in downstream:
                _find_paths(asset.asset_id, target_id, current_path + [current_id], visited.copy())
        
        _find_paths(from_asset_id, to_asset_id, [], set())
        return paths
    
    def generate_lineage_report(self, asset_id: str) -> Dict[str, Any]:
        """Generate a comprehensive lineage report for an asset."""
        if asset_id not in self.graph.assets:
            raise ValueError(f"Asset {asset_id} not found")
        
        asset = self.graph.assets[asset_id]
        history = self.get_asset_history(asset_id)
        upstream = self.graph.get_upstream_assets(asset_id)
        downstream = self.graph.get_downstream_assets(asset_id)
        impact_analysis = self.graph.find_impact(asset_id)
        
        return {
            "asset": asset.to_dict(),
            "summary": {
                "total_operations": len(history),
                "upstream_dependencies": len(upstream),
                "downstream_dependencies": len(downstream),
                "potential_impact": len(impact_analysis)
            },
            "history": [event.to_dict() for event in history],
            "upstream_assets": [asset.to_dict() for asset in upstream],
            "downstream_assets": [asset.to_dict() for asset in downstream],
            "impact_analysis": [asset.to_dict() for asset in impact_analysis],
            "data_flows": {
                "incoming": [
                    rel.to_dict() for rel in self.graph.relationships.values()
                    if rel.target_asset_id == asset_id
                ],
                "outgoing": [
                    rel.to_dict() for rel in self.graph.relationships.values()
                    if rel.source_asset_id == asset_id
                ]
            }
        }
    
    def export_lineage_graph(self, format: str = "json") -> Union[str, Dict[str, Any]]:
        """Export the complete lineage graph."""
        if format.lower() == "json":
            return json.dumps(self.graph.to_dict(), indent=2)
        elif format.lower() == "dict":
            return self.graph.to_dict()
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def import_lineage_graph(self, graph_data: Union[str, Dict[str, Any]]) -> None:
        """Import a lineage graph from exported data."""
        if isinstance(graph_data, str):
            graph_data = json.loads(graph_data)
        
        # Reconstruct graph
        self.graph = LineageGraph(graph_data["graph_id"])
        
        # Rebuild assets
        for asset_data in graph_data["assets"].values():
            asset = DataAsset(
                asset_id=asset_data["asset_id"],
                name=asset_data["name"],
                asset_type=LineageNodeType(asset_data["asset_type"]),
                location=asset_data["location"],
                schema_info=asset_data["schema_info"],
                metadata=asset_data["metadata"],
                created_at=asset_data["created_at"],
                updated_at=asset_data["updated_at"]
            )
            self.graph.add_asset(asset)
        
        # Rebuild relationships
        for rel_data in graph_data["relationships"].values():
            relationship = LineageRelationship(
                relationship_id=rel_data["relationship_id"],
                source_asset_id=rel_data["source_asset_id"],
                target_asset_id=rel_data["target_asset_id"],
                relationship_type=rel_data["relationship_type"],
                operation_type=OperationType(rel_data["operation_type"]),
                transformation_logic=rel_data["transformation_logic"],
                metadata=rel_data["metadata"],
                created_at=rel_data["created_at"]
            )
            self.graph.add_relationship(relationship)
        
        self.logger.info(f"Imported lineage graph with {len(self.graph.assets)} assets and {len(self.graph.relationships)} relationships")
    
    def _generate_asset_id(self, name: str, location: Optional[str] = None) -> str:
        """Generate a deterministic asset ID based on name and location."""
        content = f"{name}:{location or ''}"
        return hashlib.md5(content.encode()).hexdigest()


# Convenience functions for common lineage operations

def create_lineage_tracker(graph_id: Optional[str] = None) -> DataLineageTracker:
    """Create a new data lineage tracker."""
    return DataLineageTracker(graph_id)


def track_dataset_creation(
    tracker: DataLineageTracker,
    dataset_name: str,
    dataset_location: str,
    source_files: Optional[List[str]] = None,
    transformation_details: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> DataAsset:
    """
    Track the creation of a new dataset.
    
    Args:
        tracker: Lineage tracker instance
        dataset_name: Name of the dataset
        dataset_location: Location of the dataset
        source_files: Optional list of source file locations
        transformation_details: Details about how the dataset was created
        user_id: User who created the dataset
    
    Returns:
        Created dataset asset
    """
    # Register the new dataset
    dataset_asset = tracker.register_asset(
        name=dataset_name,
        asset_type=LineageNodeType.DATASET,
        location=dataset_location
    )
    
    # If source files are provided, track the lineage
    if source_files:
        input_assets = []
        for source_file in source_files:
            source_asset = tracker.register_asset(
                name=source_file,
                asset_type=LineageNodeType.FILE,
                location=source_file
            )
            input_assets.append(source_asset.asset_id)
        
        # Track the creation operation
        tracker.track_simple_operation(
            operation_type=OperationType.CREATE,
            inputs=input_assets,
            outputs=[dataset_asset.asset_id],
            transformation_details=transformation_details,
            user_id=user_id
        )
    
    return dataset_asset


def track_data_transformation(
    tracker: DataLineageTracker,
    input_datasets: List[str],
    output_dataset: str,
    transformation_type: OperationType,
    transformation_details: Dict[str, Any],
    user_id: Optional[str] = None
) -> LineageEvent:
    """
    Track a data transformation operation.
    
    Args:
        tracker: Lineage tracker instance
        input_datasets: List of input dataset IDs
        output_dataset: Output dataset ID
        transformation_type: Type of transformation
        transformation_details: Details about the transformation
        user_id: User performing the transformation
    
    Returns:
        Created lineage event
    """
    return tracker.track_simple_operation(
        operation_type=transformation_type,
        inputs=input_datasets,
        outputs=[output_dataset],
        transformation_details=transformation_details,
        user_id=user_id
    )