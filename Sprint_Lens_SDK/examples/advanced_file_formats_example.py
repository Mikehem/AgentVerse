#!/usr/bin/env python3
"""
Sprint Lens SDK Advanced File Format Support Example

This example demonstrates the comprehensive file format support including:
- Parquet files (with pyarrow)
- Excel files (with pandas)
- Compressed files (ZIP, GZIP, TAR)
- Advanced CSV handling with encoding detection
- JSON/JSONL files
- Multi-file dataset creation
"""

import asyncio
import json
import csv
import os
import tempfile
import zipfile
import gzip
from typing import List, Dict, Any
from pathlib import Path

# Import Sprint Lens SDK components
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.client.datasets import DatasetClient
from sprintlens.utils.file_formats import (
    parse_file, detect_file_format, FileFormat, check_dependencies,
    get_supported_formats
)
from sprintlens.core.config import SprintLensConfig


def create_sample_files():
    """
    Create sample files in various formats for demonstration.
    
    Returns:
        Dictionary mapping format names to file paths
    """
    temp_dir = Path(tempfile.mkdtemp())
    print(f"📁 Creating sample files in: {temp_dir}")
    
    # Sample data
    sample_data = [
        {"id": 1, "name": "Alice", "age": 30, "city": "New York", "salary": 75000.0},
        {"id": 2, "name": "Bob", "age": 25, "city": "Los Angeles", "salary": 65000.0},
        {"id": 3, "name": "Charlie", "age": 35, "city": "Chicago", "salary": 80000.0},
        {"id": 4, "name": "Diana", "age": 28, "city": "Houston", "salary": 70000.0},
        {"id": 5, "name": "Eve", "age": 32, "city": "Phoenix", "salary": 72000.0}
    ]
    
    file_paths = {}
    
    # 1. Create CSV file
    csv_path = temp_dir / "sample_data.csv"
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=sample_data[0].keys())
        writer.writeheader()
        writer.writerows(sample_data)
    file_paths["csv"] = str(csv_path)
    
    # 2. Create JSON file
    json_path = temp_dir / "sample_data.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, indent=2)
    file_paths["json"] = str(json_path)
    
    # 3. Create JSONL file
    jsonl_path = temp_dir / "sample_data.jsonl"
    with open(jsonl_path, 'w', encoding='utf-8') as f:
        for record in sample_data:
            f.write(json.dumps(record) + '\n')
    file_paths["jsonl"] = str(jsonl_path)
    
    # 4. Create compressed files
    # ZIP file containing CSV
    zip_path = temp_dir / "sample_data.zip"
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(csv_path, "data.csv")
    file_paths["zip"] = str(zip_path)
    
    # GZIP compressed JSON
    gzip_path = temp_dir / "sample_data.json.gz"
    with open(json_path, 'rb') as f_in:
        with gzip.open(gzip_path, 'wb') as f_out:
            f_out.write(f_in.read())
    file_paths["gzip"] = str(gzip_path)
    
    # 5. Create Excel file (if pandas is available)
    dependencies = check_dependencies()
    if dependencies.get('pandas'):
        try:
            import pandas as pd
            excel_path = temp_dir / "sample_data.xlsx"
            df = pd.DataFrame(sample_data)
            df.to_excel(excel_path, index=False, sheet_name="Employee_Data")
            file_paths["excel"] = str(excel_path)
        except Exception as e:
            print(f"⚠️  Could not create Excel file: {e}")
    
    # 6. Create Parquet file (if pyarrow is available)
    if dependencies.get('pyarrow'):
        try:
            import pyarrow as pa
            import pyarrow.parquet as pq
            
            parquet_path = temp_dir / "sample_data.parquet"
            table = pa.table(sample_data)
            pq.write_table(table, parquet_path)
            file_paths["parquet"] = str(parquet_path)
        except Exception as e:
            print(f"⚠️  Could not create Parquet file: {e}")
    
    print(f"✅ Created {len(file_paths)} sample files")
    return file_paths, temp_dir


async def demonstrate_format_detection(file_paths: Dict[str, str]):
    """Demonstrate file format detection capabilities."""
    print("=== File Format Detection Demo ===\n")
    
    # Create a minimal config for demo
    config = SprintLensConfig(
        url="http://localhost:3000",
        username="demo",
        password="demo"
    )
    dataset_client = DatasetClient(config)
    
    for format_name, file_path in file_paths.items():
        print(f"🔍 Analyzing {format_name.upper()} file: {Path(file_path).name}")
        
        try:
            # Detect format using the client method
            format_info = dataset_client.detect_file_format_info(file_path)
            
            print(f"   Detected Format: {format_info['detected_format']}")
            print(f"   File Size: {format_info['file_size_bytes']:,} bytes")
            print(f"   Supported: {'✅' if format_info['supported'] else '❌'}")
            
            # Also demonstrate direct detection
            detected_format = detect_file_format(file_path)
            print(f"   Direct Detection: {detected_format.value}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()


async def demonstrate_file_parsing(file_paths: Dict[str, str]):
    """Demonstrate file parsing capabilities."""
    print("=== File Parsing Demo ===\n")
    
    for format_name, file_path in file_paths.items():
        print(f"📊 Parsing {format_name.upper()} file: {Path(file_path).name}")
        
        try:
            # Parse the file
            parse_result = parse_file(file_path)
            
            print(f"   Format: {parse_result.file_info.format.value}")
            print(f"   Records: {len(parse_result.data)}")
            print(f"   Columns: {parse_result.file_info.estimated_columns}")
            
            if parse_result.warnings:
                print(f"   Warnings: {len(parse_result.warnings)}")
                for warning in parse_result.warnings[:2]:
                    print(f"     • {warning}")
            
            if parse_result.errors:
                print(f"   Errors: {len(parse_result.errors)}")
            
            # Show first record as sample
            if parse_result.data:
                print(f"   Sample Record: {parse_result.data[0]}")
            
        except Exception as e:
            print(f"   ❌ Parsing Error: {e}")
        
        print()


async def demonstrate_file_preview(file_paths: Dict[str, str]):
    """Demonstrate file preview functionality."""
    print("=== File Preview Demo ===\n")
    
    config = SprintLensConfig(
        url="http://localhost:3000",
        username="demo",
        password="demo"
    )
    dataset_client = DatasetClient(config)
    
    # Preview a few different formats
    preview_formats = ['csv', 'json', 'zip']
    
    for format_name in preview_formats:
        if format_name in file_paths:
            file_path = file_paths[format_name]
            print(f"👁️  Previewing {format_name.upper()} file: {Path(file_path).name}")
            
            try:
                preview = dataset_client.parse_file_preview(file_path, max_rows=3)
                
                print(f"   Total Rows: {preview['total_rows']}")
                print(f"   Columns: {preview['columns']}")
                print(f"   Preview Data ({len(preview['preview_data'])} rows):")
                
                for i, record in enumerate(preview['preview_data'], 1):
                    print(f"     Row {i}: {record}")
                
                if preview['truncated']:
                    print(f"     ... (showing first 3 of {preview['total_rows']} rows)")
                
            except Exception as e:
                print(f"   ❌ Preview Error: {e}")
            
            print()


async def demonstrate_dataset_creation(file_paths: Dict[str, str]):
    """Demonstrate dataset creation from various file formats."""
    print("=== Dataset Creation Demo ===\n")
    
    config = SprintLensConfig(
        url="http://localhost:3000",
        username="demo",
        password="demo"
    )
    dataset_client = DatasetClient(config)
    
    # Try creating datasets from different formats
    test_formats = ['csv', 'json', 'parquet', 'excel']
    
    for format_name in test_formats:
        if format_name in file_paths:
            file_path = file_paths[format_name]
            print(f"🏗️  Creating dataset from {format_name.upper()} file")
            
            try:
                # Note: This would normally create a real dataset
                # For demo purposes, we'll just show what would happen
                preview = dataset_client.parse_file_preview(file_path)
                
                print(f"   ✅ Would create dataset with:")
                print(f"      Records: {preview['total_rows']}")
                print(f"      Columns: {len(preview['columns'])}")
                print(f"      Sample columns: {preview['columns'][:3]}")
                
                # Simulate the creation call (commented out for demo)
                # result = await dataset_client.create_dataset_from_file_async(
                #     file_path=file_path,
                #     name=f"demo_dataset_{format_name}",
                #     description=f"Demo dataset created from {format_name} file",
                #     auto_profile=True
                # )
                
            except Exception as e:
                print(f"   ❌ Creation Error: {e}")
            
            print()


async def demonstrate_multi_file_processing(file_paths: Dict[str, str]):
    """Demonstrate processing multiple files together."""
    print("=== Multi-File Processing Demo ===\n")
    
    config = SprintLensConfig(
        url="http://localhost:3000",
        username="demo",
        password="demo"
    )
    dataset_client = DatasetClient(config)
    
    # Select multiple compatible files
    compatible_files = []
    for format_name in ['csv', 'json', 'jsonl']:
        if format_name in file_paths:
            compatible_files.append(file_paths[format_name])
    
    if len(compatible_files) >= 2:
        print(f"🔄 Processing {len(compatible_files)} files together:")
        for file_path in compatible_files:
            print(f"   • {Path(file_path).name}")
        
        try:
            # Simulate multi-file processing
            total_records = 0
            all_columns = set()
            
            for file_path in compatible_files:
                preview = dataset_client.parse_file_preview(file_path)
                total_records += preview['total_rows']
                all_columns.update(preview['columns'])
            
            print(f"\n   📊 Combined Statistics:")
            print(f"      Total Records: {total_records}")
            print(f"      Unique Columns: {len(all_columns)}")
            print(f"      Column Names: {sorted(all_columns)}")
            
            # Simulate the multi-file creation call (commented out for demo)
            # result = await dataset_client.create_dataset_from_multiple_files_async(
            #     file_paths=compatible_files,
            #     name="demo_multi_file_dataset",
            #     description="Demo dataset from multiple files",
            #     merge_strategy="append"
            # )
            
        except Exception as e:
            print(f"   ❌ Multi-file Error: {e}")
    else:
        print("   ⚠️  Need at least 2 compatible files for multi-file demo")
    
    print()


async def demonstrate_dependency_checking():
    """Demonstrate dependency checking and supported formats."""
    print("=== Dependency & Format Support Demo ===\n")
    
    # Check dependencies
    dependencies = check_dependencies()
    print("📦 Optional Dependencies:")
    for dep, available in dependencies.items():
        status = "✅ Available" if available else "❌ Missing"
        print(f"   {dep}: {status}")
    
    print()
    
    # Show supported formats
    supported_formats = get_supported_formats()
    print("📋 Supported File Formats:")
    for fmt in supported_formats:
        print(f"   • {fmt}")
    
    print()
    
    # Get detailed format information using client
    config = SprintLensConfig(
        url="http://localhost:3000",
        username="demo",
        password="demo"
    )
    dataset_client = DatasetClient(config)
    
    format_info = dataset_client.get_supported_file_formats()
    print("📖 Format Descriptions:")
    for fmt, description in format_info['format_descriptions'].items():
        print(f"   {fmt}: {description}")
    
    print()


def cleanup_temp_files(temp_dir: Path):
    """Clean up temporary files."""
    try:
        import shutil
        shutil.rmtree(temp_dir)
        print(f"🧹 Cleaned up temporary files from {temp_dir}")
    except Exception as e:
        print(f"⚠️  Could not clean up {temp_dir}: {e}")


async def main():
    """Main demonstration function."""
    print("🚀 Sprint Lens SDK - Advanced File Format Support Demo")
    print("=" * 65)
    print()
    
    try:
        # Create sample files
        file_paths, temp_dir = create_sample_files()
        
        # Run demonstrations
        await demonstrate_dependency_checking()
        await demonstrate_format_detection(file_paths)
        await demonstrate_file_parsing(file_paths)
        await demonstrate_file_preview(file_paths)
        await demonstrate_dataset_creation(file_paths)
        await demonstrate_multi_file_processing(file_paths)
        
        print("✅ Advanced file format demonstration completed successfully!")
        print("\n📝 Key Features Demonstrated:")
        print("   • Automatic file format detection")
        print("   • Support for Parquet, Excel, and compressed files")
        print("   • Advanced CSV parsing with encoding detection")
        print("   • File preview without full parsing")
        print("   • Dataset creation from various formats")
        print("   • Multi-file dataset processing")
        print("   • Comprehensive error handling and warnings")
        print("   • Dependency checking and graceful fallbacks")
        
        # Clean up
        cleanup_temp_files(temp_dir)
        
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(main())