#!/usr/bin/env python3
"""
Schema Validation Example for Sprint Lens SDK

This example demonstrates the comprehensive schema definition and validation
capabilities for ensuring data quality and consistency in dataset management.

Example usage:
    python schema_validation_example.py

Features demonstrated:
- Schema definition with multiple field types and constraints
- Data validation with detailed error reporting
- Schema suggestions from data analysis
- Custom validation rules and transformations
- Integration with dataset creation workflows
- Pre-built schema templates for common use cases
"""

import sys
import os
import json
from pprint import pprint
from datetime import datetime

# Add the SDK to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../src'))

import sprintlens
from sprintlens import (
    DatasetSchema, SchemaField, SchemaValidator, SchemaBuilder, ValidationResult,
    FieldType, FieldConstraint, ValidationSeverity,
    create_prediction_schema, create_classification_schema, create_qa_schema
)


def demonstrate_basic_schema_creation():
    """Demonstrate basic schema creation and structure."""
    print("🏗️ Basic Schema Creation")
    print("=" * 50)
    
    # Create a simple schema using the builder
    builder = SchemaBuilder("user_feedback_schema", "1.0", "Schema for user feedback data")
    
    schema = (builder
              .add_string_field("id", required=True, max_length=50)
              .add_string_field("feedback_text", required=True, min_length=10, max_length=1000)
              .add_enum_field("rating", ["1", "2", "3", "4", "5"], required=True)
              .add_email_field("user_email", required=False)
              .add_datetime_field("submitted_at", required=False)
              .add_boolean_field("is_verified", required=False)
              .build())
    
    print("📊 Created schema:")
    print(f"  Name: {schema.name}")
    print(f"  Version: {schema.version}")
    print(f"  Description: {schema.description}")
    print(f"  Fields: {len(schema.fields)}")
    
    print(f"\n📋 Schema fields:")
    for field in schema.fields:
        constraints_info = []
        for constraint in field.constraints:
            constraints_info.append(f"{constraint.constraint_type}={constraint.value}")
        constraints_str = f" ({', '.join(constraints_info)})" if constraints_info else ""
        print(f"  • {field.name}: {field.field_type.value}{constraints_str}")
    
    return schema


def demonstrate_data_validation():
    """Demonstrate data validation against schema."""
    print("\n✅ Data Validation")
    print("=" * 50)
    
    # Create schema
    schema = create_classification_schema(["positive", "negative", "neutral"])
    
    print("📊 Using classification schema:")
    print(f"  Fields: {[f.name for f in schema.fields]}")
    
    # Valid data
    valid_data = [
        {
            "id": "item_001",
            "text": "This is a great product!",
            "label": "positive",
            "confidence": 0.95
        },
        {
            "id": "item_002", 
            "text": "Not very good quality.",
            "label": "negative",
            "confidence": 0.88
        }
    ]
    
    # Invalid data
    invalid_data = [
        {
            "id": "",  # Empty required field
            "text": "Short",  # Too short (min_length=1)
            "label": "invalid_label",  # Not in enum
            "confidence": 1.5  # Out of range
        },
        {
            # Missing required 'id' field
            "text": "This is some text.",
            "label": "positive",
            "confidence": 0.7
        }
    ]
    
    validator = SchemaValidator()
    
    print(f"\n🔍 Validating valid data:")
    result = validator.validate_data(valid_data, schema)
    print(f"  Valid: {result.is_valid}")
    print(f"  Errors: {len(result.errors)}")
    print(f"  Warnings: {len(result.warnings)}")
    
    if result.errors:
        for error in result.errors:
            print(f"    ❌ {error['field']}: {error['message']}")
    
    print(f"\n🔍 Validating invalid data:")
    result = validator.validate_data(invalid_data, schema)
    print(f"  Valid: {result.is_valid}")
    print(f"  Errors: {len(result.errors)}")
    print(f"  Warnings: {len(result.warnings)}")
    
    if result.errors:
        print(f"\n  Error details:")
        for error in result.errors:
            print(f"    ❌ {error['field']}: {error['message']}")
            if error['value'] is not None:
                print(f"       Value: {error['value']}")


def demonstrate_type_validation():
    """Demonstrate various field type validations."""
    print("\n🔧 Type Validation Examples")
    print("=" * 50)
    
    # Create schema with various types
    builder = SchemaBuilder("mixed_types_schema", "1.0")
    schema = (builder
              .add_string_field("name", required=True, pattern=r"^[A-Za-z\s]+$")
              .add_integer_field("age", required=True, min_value=0, max_value=150)
              .add_float_field("score", required=True, min_value=0.0, max_value=1.0)
              .add_email_field("email", required=True)
              .add_boolean_field("active", required=False)
              .build())
    
    # Test data with type conversions and errors
    test_data = [
        {
            "name": "John Doe",
            "age": "25",  # String that can be converted to int
            "score": "0.85",  # String that can be converted to float
            "email": "john@example.com",
            "active": "true"  # String that can be converted to bool
        },
        {
            "name": "Jane123",  # Invalid pattern (contains numbers)
            "age": "invalid",  # Cannot convert to int
            "score": 1.5,  # Out of range
            "email": "not-an-email",  # Invalid email format
            "active": "maybe"  # Cannot convert to bool
        }
    ]
    
    validator = SchemaValidator()
    
    for i, item in enumerate(test_data):
        print(f"\n🔍 Testing item {i+1}:")
        result = validator.validate_data([item], schema)
        
        print(f"  Valid: {result.is_valid}")
        
        if result.errors:
            print(f"  Errors:")
            for error in result.errors:
                print(f"    ❌ {error['field']}: {error['message']}")
        
        if result.warnings:
            print(f"  Warnings:")
            for warning in result.warnings:
                print(f"    ⚠️ {warning['field']}: {warning['message']}")
        
        # Show transformations
        if result.transformed_data and result.transformed_data != [item]:
            print(f"  Transformed data:")
            transformed_item = result.transformed_data[0]
            for field, value in transformed_item.items():
                if value != item.get(field):
                    print(f"    • {field}: {item.get(field)} → {value} ({type(value).__name__})")


def demonstrate_custom_constraints():
    """Demonstrate custom validation constraints."""
    print("\n🎯 Custom Constraints")
    print("=" * 50)
    
    # Custom validation function
    def validate_phone_number(phone):
        """Custom validator for phone numbers."""
        import re
        pattern = r'^\+?1?\d{9,15}$'
        return re.match(pattern, str(phone)) is not None
    
    # Create schema with custom constraints
    schema = DatasetSchema("contact_schema", "1.0", "Contact information schema")
    
    # Name field with pattern constraint
    name_field = SchemaField("name", FieldType.STRING, required=True)
    name_field.constraints.append(
        FieldConstraint("min_length", "min_length", 2, "Name must be at least 2 characters")
    )
    name_field.constraints.append(
        FieldConstraint("pattern", "pattern", r"^[A-Za-z\s'-]+$", "Name can only contain letters, spaces, apostrophes, and hyphens")
    )
    
    # Phone field with custom validation
    phone_field = SchemaField("phone", FieldType.STRING, required=False)
    phone_field.constraints.append(
        FieldConstraint("custom", "custom", validate_phone_number, "Invalid phone number format")
    )
    
    # Age field with range constraint
    age_field = SchemaField("age", FieldType.INTEGER, required=False)
    age_field.constraints.append(
        FieldConstraint("range", "range", (13, 120), "Age must be between 13 and 120")
    )
    
    schema.add_field(name_field)
    schema.add_field(phone_field)
    schema.add_field(age_field)
    
    # Test data
    test_data = [
        {
            "name": "John O'Connor",
            "phone": "+1234567890",
            "age": 25
        },
        {
            "name": "J",  # Too short
            "phone": "invalid-phone",  # Custom validation failure
            "age": 200  # Out of range
        },
        {
            "name": "John123",  # Invalid pattern
            "phone": "555-123-4567",  # Different format but should fail custom validation
            "age": 12  # Below minimum
        }
    ]
    
    validator = SchemaValidator()
    result = validator.validate_data(test_data, schema)
    
    print(f"📊 Validation results:")
    print(f"  Valid: {result.is_valid}")
    print(f"  Total errors: {len(result.errors)}")
    
    # Group errors by item
    item_errors = {}
    for error in result.errors:
        parts = error['field'].split('.')
        if len(parts) >= 2:
            item_key = parts[1]  # item[0], item[1], etc.
            field_name = parts[2] if len(parts) > 2 else "unknown"
            
            if item_key not in item_errors:
                item_errors[item_key] = []
            item_errors[item_key].append(f"{field_name}: {error['message']}")
    
    for item_key, errors in item_errors.items():
        print(f"\n  {item_key} errors:")
        for error in errors:
            print(f"    ❌ {error}")


async def demonstrate_schema_suggestions():
    """Demonstrate automatic schema generation from data."""
    print("\n🤖 Automatic Schema Suggestions")
    print("=" * 50)
    
    # Mock dataset client for schema suggestions
    class MockDatasetClient:
        async def get_schema_suggestions_async(self, data):
            """Mock implementation of schema suggestions."""
            
            # Analyze data structure (simplified version)
            if not isinstance(data, list) or not data:
                return {"error": "Data must be a non-empty list of objects"}
            
            field_info = {}
            for item in data[:50]:  # Sample first 50 items
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
                    "total_items": len(data),
                    "fields_analyzed": len(field_info),
                    "field_details": {}
                }
            }
            
            for field_name, info in field_info.items():
                if info["types"]:
                    type_counts = {}
                    for value in info["values"]:
                        type_name = type(value).__name__
                        type_counts[type_name] = type_counts.get(type_name, 0) + 1
                    
                    most_common_type = max(type_counts, key=type_counts.get)
                    
                    type_mapping = {
                        "str": "string",
                        "int": "integer", 
                        "float": "float",
                        "bool": "boolean",
                        "dict": "object",
                        "list": "array"
                    }
                    
                    suggested_type = type_mapping.get(most_common_type, "string")
                    required_probability = info["required_score"] / len(data)
                    is_required = required_probability > 0.8
                    
                    field_suggestion = {
                        "name": field_name,
                        "type": suggested_type,
                        "required": is_required,
                        "allow_null": info["null_count"] > 0,
                        "constraints": []
                    }
                    
                    if suggested_type == "string" and info["values"]:
                        lengths = [len(str(v)) for v in info["values"]]
                        field_suggestion["constraints"].append({
                            "type": "max_length",
                            "value": max(lengths),
                            "suggested": True
                        })
                    
                    suggestions["suggested_schema"]["fields"].append(field_suggestion)
                    
                    suggestions["analysis"]["field_details"][field_name] = {
                        "types_found": list(info["types"]),
                        "null_percentage": (info["null_count"] / len(data)) * 100,
                        "required_probability": required_probability,
                        "value_count": len(info["values"])
                    }
            
            return suggestions
    
    # Sample data for analysis
    sample_data = [
        {
            "id": "user_001",
            "name": "Alice Johnson",
            "email": "alice@example.com",
            "age": 28,
            "score": 0.92,
            "active": True,
            "tags": ["premium", "verified"]
        },
        {
            "id": "user_002",
            "name": "Bob Smith",
            "email": "bob@example.com", 
            "age": 35,
            "score": 0.88,
            "active": True,
            "tags": ["basic"]
        },
        {
            "id": "user_003",
            "name": "Carol Davis",
            "email": "carol@example.com",
            "age": 22,
            "score": 0.95,
            "active": False,
            "tags": None  # This field is sometimes null
        }
    ]
    
    print(f"📊 Analyzing sample data ({len(sample_data)} items):")
    for i, item in enumerate(sample_data):
        print(f"  Item {i+1}: {list(item.keys())}")
    
    # Get suggestions
    client = MockDatasetClient()
    suggestions = await client.get_schema_suggestions_async(sample_data)
    
    print(f"\n🎯 Schema suggestions:")
    print(f"  Suggested schema name: {suggestions['suggested_schema']['name']}")
    print(f"  Fields analyzed: {suggestions['analysis']['fields_analyzed']}")
    
    print(f"\n📋 Suggested fields:")
    for field in suggestions['suggested_schema']['fields']:
        required_text = " (required)" if field['required'] else " (optional)"
        null_text = ", nullable" if field['allow_null'] else ""
        constraints_text = ""
        
        if field['constraints']:
            constraint_strs = []
            for constraint in field['constraints']:
                if constraint['type'] == 'max_length':
                    constraint_strs.append(f"max_length={constraint['value']}")
            if constraint_strs:
                constraints_text = f" [{', '.join(constraint_strs)}]"
        
        print(f"  • {field['name']}: {field['type']}{required_text}{null_text}{constraints_text}")
    
    print(f"\n📈 Field analysis details:")
    for field_name, details in suggestions['analysis']['field_details'].items():
        print(f"  • {field_name}:")
        print(f"    Types found: {details['types_found']}")
        print(f"    Null percentage: {details['null_percentage']:.1f}%")
        print(f"    Required probability: {details['required_probability']:.1%}")


def demonstrate_predefined_schemas():
    """Demonstrate pre-built schema templates."""
    print("\n📦 Pre-built Schema Templates")
    print("=" * 50)
    
    print("🎯 1. Prediction Schema:")
    prediction_schema = create_prediction_schema(["positive", "negative", "neutral"])
    print(f"  Name: {prediction_schema.name}")
    print(f"  Fields: {[f.name for f in prediction_schema.fields]}")
    
    for field in prediction_schema.fields:
        required_text = " (required)" if field.required else " (optional)"
        print(f"    • {field.name}: {field.field_type.value}{required_text}")
    
    print(f"\n🏷️ 2. Classification Schema:")
    classification_schema = create_classification_schema(["spam", "ham"])
    print(f"  Name: {classification_schema.name}")
    print(f"  Fields: {[f.name for f in classification_schema.fields]}")
    
    print(f"\n❓ 3. Q&A Schema:")
    qa_schema = create_qa_schema()
    print(f"  Name: {qa_schema.name}")
    print(f"  Fields: {[f.name for f in qa_schema.fields]}")
    
    # Test validation with predefined schemas
    print(f"\n🔍 Testing prediction schema validation:")
    
    test_prediction_data = [
        {
            "id": "pred_001",
            "context": "This movie was fantastic!",
            "prediction": "positive",
            "ground_truth": "positive",
            "confidence": 0.94,
            "timestamp": "2024-01-15T10:30:00"
        }
    ]
    
    validator = SchemaValidator()
    result = validator.validate_data(test_prediction_data, prediction_schema)
    
    print(f"  Valid: {result.is_valid}")
    print(f"  Errors: {len(result.errors)}")
    print(f"  Warnings: {len(result.warnings)}")


def demonstrate_schema_serialization():
    """Demonstrate schema serialization and deserialization."""
    print("\n💾 Schema Serialization")
    print("=" * 50)
    
    # Create a complex schema
    builder = SchemaBuilder("complex_schema", "2.1", "A complex schema for demonstration")
    schema = (builder
              .add_string_field("id", required=True, pattern=r"^[A-Z]{3}_\d{3}$")
              .add_string_field("description", required=True, min_length=10, max_length=500)
              .add_enum_field("status", ["draft", "published", "archived"], required=True)
              .add_float_field("confidence", required=False, min_value=0.0, max_value=1.0)
              .add_datetime_field("created_at", required=True)
              .build())
    
    print(f"📊 Original schema:")
    print(f"  Name: {schema.name}")
    print(f"  Version: {schema.version}")
    print(f"  Fields: {len(schema.fields)}")
    
    # Serialize to dictionary
    schema_dict = schema.to_dict()
    print(f"\n📄 Serialized to dictionary:")
    print(f"  Keys: {list(schema_dict.keys())}")
    print(f"  JSON size: {len(json.dumps(schema_dict))} characters")
    
    # Deserialize back to schema
    restored_schema = DatasetSchema.from_dict(schema_dict)
    print(f"\n🔄 Restored from dictionary:")
    print(f"  Name: {restored_schema.name}")
    print(f"  Version: {restored_schema.version}")
    print(f"  Fields: {len(restored_schema.fields)}")
    print(f"  Fields match: {[f.name for f in schema.fields] == [f.name for f in restored_schema.fields]}")
    
    # Show JSON representation
    print(f"\n📝 JSON representation (truncated):")
    json_str = json.dumps(schema_dict, indent=2)
    print(json_str[:300] + "..." if len(json_str) > 300 else json_str)


async def main():
    """Run all schema validation examples."""
    print("🚀 Sprint Lens SDK - Schema Validation Examples")
    print("=" * 70)
    
    try:
        schema = demonstrate_basic_schema_creation()
        demonstrate_data_validation()
        demonstrate_type_validation()
        demonstrate_custom_constraints()
        await demonstrate_schema_suggestions()
        demonstrate_predefined_schemas()
        demonstrate_schema_serialization()
        
        print(f"\n🎉 All schema validation examples completed successfully!")
        
        print(f"\n💡 Key Features Demonstrated:")
        print(f"  • Flexible schema definition with multiple field types")
        print(f"  • Comprehensive validation with detailed error reporting")
        print(f"  • Custom validation rules and constraints")
        print(f"  • Automatic schema generation from data analysis")
        print(f"  • Pre-built templates for common use cases")
        print(f"  • Schema serialization and version management")
        print(f"  • Type conversion and data transformation")
        print(f"  • Integration with dataset creation workflows")
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())