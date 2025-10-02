"""
Schema Definition and Validation System for Sprint Lens SDK

This module provides comprehensive schema definition and validation capabilities
for dataset management, ensuring data consistency and quality through flexible
schema enforcement and validation rules.

Features:
- Flexible schema definition with type checking
- Field validation with custom rules and constraints
- Data transformation and normalization
- Schema versioning and migration support
- Integration with dataset creation and management
- Comprehensive validation reporting
"""

import re
import json
from typing import Dict, List, Any, Optional, Union, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid

from ..utils.logging import get_logger

logger = get_logger(__name__)


class FieldType(Enum):
    """Supported field types for schema validation."""
    
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATETIME = "datetime"
    UUID = "uuid"
    EMAIL = "email"
    URL = "url"
    JSON = "json"
    ARRAY = "array"
    OBJECT = "object"
    ENUM = "enum"


class ValidationSeverity(Enum):
    """Validation error severity levels."""
    
    ERROR = "error"      # Critical errors that prevent data acceptance
    WARNING = "warning"  # Issues that should be addressed but don't block processing
    INFO = "info"        # Informational notices about data characteristics


@dataclass
class FieldConstraint:
    """Individual field constraint definition."""
    
    name: str
    constraint_type: str  # 'required', 'min_length', 'max_length', 'pattern', 'range', 'custom'
    value: Any
    message: Optional[str] = None
    severity: ValidationSeverity = ValidationSeverity.ERROR


@dataclass
class SchemaField:
    """Schema field definition with validation rules."""
    
    name: str
    field_type: FieldType
    description: Optional[str] = None
    required: bool = False
    default_value: Any = None
    constraints: List[FieldConstraint] = field(default_factory=list)
    allow_null: bool = True
    transform_fn: Optional[Callable[[Any], Any]] = None
    
    def __post_init__(self):
        """Add required constraint if field is required."""
        if self.required and not any(c.constraint_type == 'required' for c in self.constraints):
            self.constraints.append(
                FieldConstraint(
                    name="required",
                    constraint_type="required",
                    value=True,
                    message=f"Field '{self.name}' is required"
                )
            )


@dataclass
class ValidationResult:
    """Result of schema validation."""
    
    is_valid: bool
    errors: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    info: List[Dict[str, Any]] = field(default_factory=list)
    transformed_data: Optional[Any] = None
    
    def add_issue(self, severity: ValidationSeverity, field: str, message: str, value: Any = None):
        """Add a validation issue."""
        issue = {
            "field": field,
            "message": message,
            "value": value,
            "severity": severity.value
        }
        
        if severity == ValidationSeverity.ERROR:
            self.errors.append(issue)
            self.is_valid = False
        elif severity == ValidationSeverity.WARNING:
            self.warnings.append(issue)
        else:
            self.info.append(issue)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get validation summary."""
        return {
            "is_valid": self.is_valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "info_count": len(self.info),
            "total_issues": len(self.errors) + len(self.warnings) + len(self.info)
        }


@dataclass
class DatasetSchema:
    """Complete dataset schema definition."""
    
    name: str
    version: str
    description: Optional[str] = None
    fields: List[SchemaField] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[str] = None
    
    def __post_init__(self):
        """Set creation timestamp if not provided."""
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
    
    def add_field(self, field: SchemaField) -> 'DatasetSchema':
        """Add a field to the schema."""
        self.fields.append(field)
        return self
    
    def get_field(self, name: str) -> Optional[SchemaField]:
        """Get field by name."""
        return next((f for f in self.fields if f.name == name), None)
    
    def remove_field(self, name: str) -> bool:
        """Remove field by name."""
        original_length = len(self.fields)
        self.fields = [f for f in self.fields if f.name != name]
        return len(self.fields) < original_length
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert schema to dictionary."""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "fields": [
                {
                    "name": f.name,
                    "type": f.field_type.value,
                    "description": f.description,
                    "required": f.required,
                    "default_value": f.default_value,
                    "allow_null": f.allow_null,
                    "constraints": [
                        {
                            "name": c.name,
                            "type": c.constraint_type,
                            "value": c.value,
                            "message": c.message,
                            "severity": c.severity.value
                        }
                        for c in f.constraints
                    ]
                }
                for f in self.fields
            ],
            "metadata": self.metadata,
            "created_at": self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DatasetSchema':
        """Create schema from dictionary."""
        schema = cls(
            name=data["name"],
            version=data["version"],
            description=data.get("description"),
            metadata=data.get("metadata", {}),
            created_at=data.get("created_at")
        )
        
        for field_data in data.get("fields", []):
            constraints = []
            for constraint_data in field_data.get("constraints", []):
                constraints.append(
                    FieldConstraint(
                        name=constraint_data["name"],
                        constraint_type=constraint_data["type"],
                        value=constraint_data["value"],
                        message=constraint_data.get("message"),
                        severity=ValidationSeverity(constraint_data.get("severity", "error"))
                    )
                )
            
            field = SchemaField(
                name=field_data["name"],
                field_type=FieldType(field_data["type"]),
                description=field_data.get("description"),
                required=field_data.get("required", False),
                default_value=field_data.get("default_value"),
                allow_null=field_data.get("allow_null", True),
                constraints=constraints
            )
            schema.add_field(field)
        
        return schema


class SchemaValidator:
    """Schema validation engine."""
    
    def __init__(self):
        self.type_validators = {
            FieldType.STRING: self._validate_string,
            FieldType.INTEGER: self._validate_integer,
            FieldType.FLOAT: self._validate_float,
            FieldType.BOOLEAN: self._validate_boolean,
            FieldType.DATETIME: self._validate_datetime,
            FieldType.UUID: self._validate_uuid,
            FieldType.EMAIL: self._validate_email,
            FieldType.URL: self._validate_url,
            FieldType.JSON: self._validate_json,
            FieldType.ARRAY: self._validate_array,
            FieldType.OBJECT: self._validate_object,
            FieldType.ENUM: self._validate_enum
        }
    
    def validate_data(self, data: Any, schema: DatasetSchema) -> ValidationResult:
        """Validate data against schema."""
        result = ValidationResult(is_valid=True)
        
        if isinstance(data, list):
            # Validate array of items
            transformed_items = []
            for i, item in enumerate(data):
                item_result = self._validate_item(item, schema, f"item[{i}]")
                result.errors.extend(item_result.errors)
                result.warnings.extend(item_result.warnings)
                result.info.extend(item_result.info)
                
                if item_result.transformed_data is not None:
                    transformed_items.append(item_result.transformed_data)
                else:
                    transformed_items.append(item)
            
            result.transformed_data = transformed_items
        else:
            # Validate single item
            item_result = self._validate_item(data, schema, "root")
            result.errors = item_result.errors
            result.warnings = item_result.warnings
            result.info = item_result.info
            result.transformed_data = item_result.transformed_data
        
        result.is_valid = len(result.errors) == 0
        return result
    
    def _validate_item(self, item: Dict[str, Any], schema: DatasetSchema, context: str) -> ValidationResult:
        """Validate a single data item against schema."""
        result = ValidationResult(is_valid=True)
        transformed_item = item.copy() if isinstance(item, dict) else item
        
        if not isinstance(item, dict):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected object, got {type(item).__name__}",
                item
            )
            return result
        
        # Check all schema fields
        for field in schema.fields:
            field_context = f"{context}.{field.name}"
            value = item.get(field.name)
            
            # Apply field validation
            field_result = self._validate_field(value, field, field_context)
            result.errors.extend(field_result.errors)
            result.warnings.extend(field_result.warnings)
            result.info.extend(field_result.info)
            
            # Apply transformation if valid
            if field_result.transformed_data is not None:
                transformed_item[field.name] = field_result.transformed_data
            elif field.default_value is not None and value is None:
                transformed_item[field.name] = field.default_value
        
        # Check for unexpected fields
        schema_field_names = {f.name for f in schema.fields}
        for field_name in item.keys():
            if field_name not in schema_field_names:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    f"{context}.{field_name}",
                    f"Unexpected field '{field_name}' not defined in schema",
                    item[field_name]
                )
        
        result.transformed_data = transformed_item
        return result
    
    def _validate_field(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate a single field value."""
        result = ValidationResult(is_valid=True)
        
        # Check if value is None
        if value is None:
            if not field.allow_null and field.required:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Field '{field.name}' cannot be null",
                    value
                )
            return result
        
        # Type validation
        type_validator = self.type_validators.get(field.field_type)
        if type_validator:
            type_result = type_validator(value, field, context)
            result.errors.extend(type_result.errors)
            result.warnings.extend(type_result.warnings)
            result.info.extend(type_result.info)
            value = type_result.transformed_data if type_result.transformed_data is not None else value
        
        # Constraint validation
        for constraint in field.constraints:
            constraint_result = self._validate_constraint(value, constraint, field, context)
            result.errors.extend(constraint_result.errors)
            result.warnings.extend(constraint_result.warnings)
            result.info.extend(constraint_result.info)
        
        # Apply transformation if provided
        if field.transform_fn and result.is_valid:
            try:
                value = field.transform_fn(value)
            except Exception as e:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Transformation failed: {str(e)}",
                    value
                )
        
        result.transformed_data = value
        return result
    
    def _validate_constraint(self, value: Any, constraint: FieldConstraint, field: SchemaField, context: str) -> ValidationResult:
        """Validate a single constraint."""
        result = ValidationResult(is_valid=True)
        
        if constraint.constraint_type == "required":
            if value is None or (isinstance(value, str) and value.strip() == ""):
                result.add_issue(
                    constraint.severity,
                    context,
                    constraint.message or f"Field '{field.name}' is required",
                    value
                )
        
        elif constraint.constraint_type == "min_length" and isinstance(value, str):
            if len(value) < constraint.value:
                result.add_issue(
                    constraint.severity,
                    context,
                    constraint.message or f"Field '{field.name}' must be at least {constraint.value} characters",
                    value
                )
        
        elif constraint.constraint_type == "max_length" and isinstance(value, str):
            if len(value) > constraint.value:
                result.add_issue(
                    constraint.severity,
                    context,
                    constraint.message or f"Field '{field.name}' must be at most {constraint.value} characters",
                    value
                )
        
        elif constraint.constraint_type == "pattern" and isinstance(value, str):
            if not re.match(constraint.value, value):
                result.add_issue(
                    constraint.severity,
                    context,
                    constraint.message or f"Field '{field.name}' does not match required pattern",
                    value
                )
        
        elif constraint.constraint_type == "range":
            min_val, max_val = constraint.value
            if isinstance(value, (int, float)):
                if value < min_val or value > max_val:
                    result.add_issue(
                        constraint.severity,
                        context,
                        constraint.message or f"Field '{field.name}' must be between {min_val} and {max_val}",
                        value
                    )
        
        elif constraint.constraint_type == "custom" and callable(constraint.value):
            try:
                is_valid = constraint.value(value)
                if not is_valid:
                    result.add_issue(
                        constraint.severity,
                        context,
                        constraint.message or f"Field '{field.name}' failed custom validation",
                        value
                    )
            except Exception as e:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Custom validation error: {str(e)}",
                    value
                )
        
        return result
    
    # Type validation methods
    def _validate_string(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate string type."""
        result = ValidationResult(is_valid=True)
        if not isinstance(value, str):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected string, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_integer(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate integer type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str) and value.isdigit():
            result.transformed_data = int(value)
        elif not isinstance(value, int):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected integer, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_float(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate float type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            try:
                result.transformed_data = float(value)
            except ValueError:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Cannot convert '{value}' to float",
                    value
                )
        elif not isinstance(value, (int, float)):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected float, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_boolean(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate boolean type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            if value.lower() in ('true', '1', 'yes', 'on'):
                result.transformed_data = True
            elif value.lower() in ('false', '0', 'no', 'off'):
                result.transformed_data = False
            else:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Cannot convert '{value}' to boolean",
                    value
                )
        elif not isinstance(value, bool):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected boolean, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_datetime(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate datetime type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            try:
                # Try to parse ISO format
                datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Invalid datetime format: '{value}'",
                    value
                )
        elif not isinstance(value, datetime):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected datetime, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_uuid(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate UUID type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            try:
                uuid.UUID(value)
            except ValueError:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Invalid UUID format: '{value}'",
                    value
                )
        else:
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected UUID string, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_email(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate email type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, value):
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Invalid email format: '{value}'",
                    value
                )
        else:
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected email string, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_url(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate URL type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            url_pattern = r'^https?:\/\/[^\s\/$.?#].[^\s]*$'
            if not re.match(url_pattern, value):
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Invalid URL format: '{value}'",
                    value
                )
        else:
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected URL string, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_json(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate JSON type."""
        result = ValidationResult(is_valid=True)
        if isinstance(value, str):
            try:
                result.transformed_data = json.loads(value)
            except json.JSONDecodeError as e:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    context,
                    f"Invalid JSON: {str(e)}",
                    value
                )
        elif not isinstance(value, (dict, list)):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected JSON (dict/list), got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_array(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate array type."""
        result = ValidationResult(is_valid=True)
        if not isinstance(value, list):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected array, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_object(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate object type."""
        result = ValidationResult(is_valid=True)
        if not isinstance(value, dict):
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Expected object, got {type(value).__name__}",
                value
            )
        return result
    
    def _validate_enum(self, value: Any, field: SchemaField, context: str) -> ValidationResult:
        """Validate enum type."""
        result = ValidationResult(is_valid=True)
        # Enum values should be defined in field metadata or constraints
        enum_constraint = next((c for c in field.constraints if c.constraint_type == "enum"), None)
        if enum_constraint and value not in enum_constraint.value:
            result.add_issue(
                ValidationSeverity.ERROR,
                context,
                f"Value '{value}' not in allowed enum values: {enum_constraint.value}",
                value
            )
        return result


class SchemaBuilder:
    """Helper class for building schemas programmatically."""
    
    def __init__(self, name: str, version: str = "1.0", description: Optional[str] = None):
        self.schema = DatasetSchema(name=name, version=version, description=description)
    
    def add_string_field(self, name: str, required: bool = False, min_length: Optional[int] = None, 
                        max_length: Optional[int] = None, pattern: Optional[str] = None) -> 'SchemaBuilder':
        """Add a string field with common constraints."""
        field = SchemaField(name=name, field_type=FieldType.STRING, required=required)
        
        if min_length is not None:
            field.constraints.append(FieldConstraint("min_length", "min_length", min_length))
        if max_length is not None:
            field.constraints.append(FieldConstraint("max_length", "max_length", max_length))
        if pattern is not None:
            field.constraints.append(FieldConstraint("pattern", "pattern", pattern))
        
        self.schema.add_field(field)
        return self
    
    def add_integer_field(self, name: str, required: bool = False, min_value: Optional[int] = None,
                         max_value: Optional[int] = None) -> 'SchemaBuilder':
        """Add an integer field with range constraints."""
        field = SchemaField(name=name, field_type=FieldType.INTEGER, required=required)
        
        if min_value is not None or max_value is not None:
            range_val = (min_value or float('-inf'), max_value or float('inf'))
            field.constraints.append(FieldConstraint("range", "range", range_val))
        
        self.schema.add_field(field)
        return self
    
    def add_float_field(self, name: str, required: bool = False, min_value: Optional[float] = None,
                       max_value: Optional[float] = None) -> 'SchemaBuilder':
        """Add a float field with range constraints."""
        field = SchemaField(name=name, field_type=FieldType.FLOAT, required=required)
        
        if min_value is not None or max_value is not None:
            range_val = (min_value or float('-inf'), max_value or float('inf'))
            field.constraints.append(FieldConstraint("range", "range", range_val))
        
        self.schema.add_field(field)
        return self
    
    def add_boolean_field(self, name: str, required: bool = False) -> 'SchemaBuilder':
        """Add a boolean field."""
        field = SchemaField(name=name, field_type=FieldType.BOOLEAN, required=required)
        self.schema.add_field(field)
        return self
    
    def add_enum_field(self, name: str, values: List[str], required: bool = False) -> 'SchemaBuilder':
        """Add an enum field with allowed values."""
        field = SchemaField(name=name, field_type=FieldType.ENUM, required=required)
        field.constraints.append(FieldConstraint("enum", "enum", values))
        self.schema.add_field(field)
        return self
    
    def add_email_field(self, name: str, required: bool = False) -> 'SchemaBuilder':
        """Add an email field."""
        field = SchemaField(name=name, field_type=FieldType.EMAIL, required=required)
        self.schema.add_field(field)
        return self
    
    def add_datetime_field(self, name: str, required: bool = False) -> 'SchemaBuilder':
        """Add a datetime field."""
        field = SchemaField(name=name, field_type=FieldType.DATETIME, required=required)
        self.schema.add_field(field)
        return self
    
    def build(self) -> DatasetSchema:
        """Build and return the schema."""
        return self.schema


def create_prediction_schema(prediction_values: Optional[List[str]] = None) -> DatasetSchema:
    """Create a standard schema for prediction datasets."""
    builder = SchemaBuilder(
        name="prediction_dataset_schema",
        version="1.0",
        description="Standard schema for AI prediction datasets"
    )
    
    builder.add_string_field("id", required=True, max_length=255)
    builder.add_string_field("context", required=True, min_length=1)
    
    if prediction_values:
        builder.add_enum_field("prediction", prediction_values, required=True)
        builder.add_enum_field("ground_truth", prediction_values, required=True)
    else:
        builder.add_string_field("prediction", required=True)
        builder.add_string_field("ground_truth", required=True)
    
    builder.add_float_field("confidence", required=False, min_value=0.0, max_value=1.0)
    builder.add_datetime_field("timestamp", required=False)
    
    return builder.build()


def create_classification_schema(labels: List[str]) -> DatasetSchema:
    """Create a schema for classification datasets."""
    builder = SchemaBuilder(
        name="classification_schema",
        version="1.0",
        description="Schema for classification datasets"
    )
    
    builder.add_string_field("id", required=True)
    builder.add_string_field("text", required=True, min_length=1)
    builder.add_enum_field("label", labels, required=True)
    builder.add_float_field("confidence", required=False, min_value=0.0, max_value=1.0)
    
    return builder.build()


def create_qa_schema() -> DatasetSchema:
    """Create a schema for question-answering datasets."""
    builder = SchemaBuilder(
        name="qa_schema",
        version="1.0",
        description="Schema for question-answering datasets"
    )
    
    builder.add_string_field("id", required=True)
    builder.add_string_field("question", required=True, min_length=1)
    builder.add_string_field("answer", required=True, min_length=1)
    builder.add_string_field("context", required=False)
    builder.add_float_field("relevance_score", required=False, min_value=0.0, max_value=1.0)
    
    return builder.build()