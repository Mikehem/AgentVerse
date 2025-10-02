#!/usr/bin/env python3
"""
Dataset Versioning Example - Sprint Lens SDK

This example demonstrates the comprehensive dataset versioning capabilities including:
- Creating versions with commit-like messages
- Branching for experimental work
- Comparing versions and generating diffs
- Rollback functionality
- Tagging important versions
- Version history and lineage tracking

Example usage:
    python3 dataset_versioning_example.py
"""

import json
import sys
import os
from typing import List, Dict, Any
from datetime import datetime

# Import Sprint Lens SDK components
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.utils.dataset_versioning import (
    DatasetVersionManager, create_version_manager, create_snapshot
)


def demonstrate_basic_versioning():
    """Demonstrate basic versioning operations."""
    print("=== Basic Dataset Versioning Demo ===\n")
    
    # Create a version manager for a dataset
    dataset_id = "employee_dataset_v1"
    version_manager = create_version_manager(dataset_id)
    
    # Initial dataset
    initial_data = [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 75000},
        {"id": 2, "name": "Bob", "department": "Marketing", "salary": 65000},
        {"id": 3, "name": "Charlie", "department": "Sales", "salary": 70000}
    ]
    
    print(f"📊 Creating initial version for dataset: {dataset_id}")
    v1 = version_manager.create_version(
        data=initial_data,
        message="Initial dataset creation with 3 employees",
        author="data_engineer@company.com",
        tags=["initial", "v1.0"]
    )
    print(f"   ✅ Created version {v1.id[:8]}... on main branch")
    print(f"   📝 Message: {v1.message}")
    print(f"   👤 Author: {v1.author}")
    print(f"   🏷️  Tags: {v1.tags}")
    print(f"   📈 Records: {v1.record_count}")
    
    # Add more employees
    updated_data = initial_data + [
        {"id": 4, "name": "Diana", "department": "HR", "salary": 68000},
        {"id": 5, "name": "Eve", "department": "Engineering", "salary": 78000}
    ]
    
    print(f"\n📊 Creating second version with additional employees")
    v2 = version_manager.create_version(
        data=updated_data,
        message="Added 2 new employees to the dataset",
        author="hr_manager@company.com",
        tags=["expansion"]
    )
    print(f"   ✅ Created version {v2.id[:8]}... on main branch")
    print(f"   📈 Records: {v2.record_count} (+{v2.record_count - v1.record_count})")
    
    # Modify existing employee data
    salary_updated_data = [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 80000},  # Salary increase
        {"id": 2, "name": "Bob", "department": "Marketing", "salary": 67000},      # Salary increase
        {"id": 3, "name": "Charlie", "department": "Sales", "salary": 72000},      # Salary increase
        {"id": 4, "name": "Diana", "department": "HR", "salary": 68000},
        {"id": 5, "name": "Eve", "department": "Engineering", "salary": 78000}
    ]
    
    print(f"\n📊 Creating third version with salary updates")
    v3 = version_manager.create_version(
        data=salary_updated_data,
        message="Annual salary increases for existing employees",
        author="hr_manager@company.com",
        tags=["salary_update", "annual_review"]
    )
    print(f"   ✅ Created version {v3.id[:8]}... on main branch")
    print(f"   📈 Records: {v3.record_count}")
    
    return version_manager, [v1, v2, v3]


def demonstrate_branching(version_manager: DatasetVersionManager, versions: List):
    """Demonstrate branching functionality."""
    print("\n=== Branching Demo ===\n")
    
    # Create an experimental branch from v2
    v1, v2, v3 = versions
    
    print(f"🌿 Creating experimental branch from version {v2.id[:8]}...")
    experimental_branch = version_manager.create_branch(
        branch_name="experimental_features",
        base_version=v2.id,
        author="data_scientist@company.com",
        description="Experimental branch for testing new data structures"
    )
    print(f"   ✅ Created branch: {experimental_branch.name}")
    print(f"   📝 Description: {experimental_branch.description}")
    print(f"   🎯 Base version: {experimental_branch.head_version_id[:8]}...")
    
    # Add experimental data on the new branch
    experimental_data = [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 75000, "skills": ["Python", "ML"], "performance_score": 9.2},
        {"id": 2, "name": "Bob", "department": "Marketing", "salary": 65000, "skills": ["SEO", "Analytics"], "performance_score": 8.7},
        {"id": 3, "name": "Charlie", "department": "Sales", "salary": 70000, "skills": ["CRM", "Negotiation"], "performance_score": 9.1},
        {"id": 4, "name": "Diana", "department": "HR", "salary": 68000, "skills": ["Recruiting", "Training"], "performance_score": 8.9},
        {"id": 5, "name": "Eve", "department": "Engineering", "salary": 78000, "skills": ["JavaScript", "DevOps"], "performance_score": 9.5}
    ]
    
    print(f"\n📊 Creating experimental version with enhanced schema")
    exp_v1 = version_manager.create_version(
        data=experimental_data,
        message="Added skills and performance tracking fields",
        author="data_scientist@company.com",
        branch_name="experimental_features",
        tags=["experimental", "schema_enhancement"]
    )
    print(f"   ✅ Created version {exp_v1.id[:8]}... on experimental_features branch")
    print(f"   🔬 Added fields: skills, performance_score")
    
    # List all branches
    print(f"\n🌳 Current branches:")
    branches = version_manager.list_branches()
    for branch in branches:
        print(f"   • {branch.name} (head: {branch.head_version_id[:8]}...)")
    
    return experimental_branch, exp_v1


def demonstrate_version_comparison(version_manager: DatasetVersionManager, versions: List, exp_version):
    """Demonstrate version comparison and diffing."""
    print("\n=== Version Comparison Demo ===\n")
    
    v1, v2, v3 = versions
    
    # Compare v1 and v2 (added employees)
    print(f"🔍 Comparing v1 ({v1.id[:8]}...) and v2 ({v2.id[:8]}...)")
    diff_v1_v2 = version_manager.generate_diff(v1.id, v2.id)
    print(f"   📊 Changes summary:")
    print(f"      Added records: {diff_v1_v2.summary['added']}")
    print(f"      Removed records: {diff_v1_v2.summary['removed']}")
    print(f"      Modified records: {diff_v1_v2.summary['modified']}")
    print(f"      Total changes: {diff_v1_v2.summary['total_changes']}")
    
    if diff_v1_v2.added_records:
        print(f"   ➕ Added records:")
        for record in diff_v1_v2.added_records:
            print(f"      • {record['name']} (ID: {record['id']}, Dept: {record['department']})")
    
    # Compare v2 and v3 (salary updates)
    print(f"\n🔍 Comparing v2 ({v2.id[:8]}...) and v3 ({v3.id[:8]}...)")
    diff_v2_v3 = version_manager.generate_diff(v2.id, v3.id)
    print(f"   📊 Changes summary:")
    print(f"      Modified records: {diff_v2_v3.summary['modified']}")
    
    if diff_v2_v3.modified_records:
        print(f"   ✏️  Modified records:")
        for change in diff_v2_v3.modified_records[:2]:  # Show first 2
            old_salary = change['old']['salary']
            new_salary = change['new']['salary']
            name = change['new']['name']
            print(f"      • {name}: ${old_salary:,} → ${new_salary:,} (+${new_salary-old_salary:,})")
    
    # Compare main branch v2 with experimental version
    print(f"\n🔍 Comparing main v2 ({v2.id[:8]}...) with experimental ({exp_version.id[:8]}...)")
    diff_main_exp = version_manager.generate_diff(v2.id, exp_version.id)
    print(f"   📊 Schema changes:")
    print(f"      Added fields: {diff_main_exp.schema_changes['added_fields']}")
    print(f"      Common fields: {len(diff_main_exp.schema_changes['common_fields'])}")


def demonstrate_tagging_and_search(version_manager: DatasetVersionManager, versions: List):
    """Demonstrate version tagging and search functionality."""
    print("\n=== Tagging and Search Demo ===\n")
    
    v1, v2, v3 = versions
    
    # Add additional tags to versions
    print(f"🏷️  Adding tags to versions...")
    version_manager.tag_version(v1.id, "baseline")
    version_manager.tag_version(v2.id, "team_expansion")
    version_manager.tag_version(v3.id, "production")
    print(f"   ✅ Tagged v1 with 'baseline'")
    print(f"   ✅ Tagged v2 with 'team_expansion'")
    print(f"   ✅ Tagged v3 with 'production'")
    
    # Search for versions by tag
    print(f"\n🔍 Finding versions by tags:")
    
    production_versions = version_manager.find_versions_by_tag("production")
    print(f"   'production' tag: {len(production_versions)} version(s)")
    for v in production_versions:
        print(f"      • {v.id[:8]}... - {v.message}")
    
    initial_versions = version_manager.find_versions_by_tag("initial")
    print(f"   'initial' tag: {len(initial_versions)} version(s)")
    for v in initial_versions:
        print(f"      • {v.id[:8]}... - {v.message}")
    
    # List all versions with their tags
    print(f"\n📋 All versions with tags:")
    all_versions = version_manager.list_versions()
    for v in all_versions:
        tags_str = ", ".join(v.tags) if v.tags else "no tags"
        print(f"   • {v.id[:8]}... ({v.branch_name}) - {tags_str}")


def demonstrate_rollback(version_manager: DatasetVersionManager, versions: List):
    """Demonstrate rollback functionality."""
    print("\n=== Rollback Demo ===\n")
    
    v1, v2, v3 = versions
    
    # Simulate a problem requiring rollback
    print(f"⚠️  Simulating a data issue requiring rollback...")
    print(f"   Current head version: {v3.id[:8]}... (salary updates)")
    print(f"   Rolling back to: {v2.id[:8]}... (before salary updates)")
    
    # Perform rollback
    rollback_version = version_manager.rollback_to_version(
        version_id=v2.id,
        author="system_admin@company.com",
        message="Rollback due to incorrect salary calculations"
    )
    
    print(f"   ✅ Rollback completed!")
    print(f"   🆕 New version: {rollback_version.id[:8]}...")
    print(f"   📝 Message: {rollback_version.message}")
    print(f"   🏷️  Tags: {rollback_version.tags}")
    
    # Show the current version history
    print(f"\n📜 Version history after rollback:")
    history = version_manager.get_version_history(rollback_version.id, max_depth=5)
    for i, v in enumerate(history):
        prefix = "→" if i == 0 else " " * (i + 1) + "↳"
        print(f"   {prefix} {v.id[:8]}... - {v.message}")


def demonstrate_version_history(version_manager: DatasetVersionManager, versions: List):
    """Demonstrate version history and lineage tracking."""
    print("\n=== Version History and Lineage Demo ===\n")
    
    v1, v2, v3 = versions
    
    # Get history for latest version
    print(f"📜 Version lineage for {v3.id[:8]}...:")
    history = version_manager.get_version_history(v3.id)
    
    for i, version in enumerate(history):
        indent = "  " * i
        arrow = "→" if i == 0 else "↳"
        timestamp = version.timestamp.strftime("%Y-%m-%d %H:%M")
        print(f"   {indent}{arrow} {version.id[:8]}... ({timestamp})")
        print(f"   {indent}  📝 {version.message}")
        print(f"   {indent}  👤 {version.author}")
        if version.tags:
            print(f"   {indent}  🏷️  {', '.join(version.tags)}")
        print()


def demonstrate_statistics_and_export(version_manager: DatasetVersionManager):
    """Demonstrate dataset statistics and metadata export."""
    print("\n=== Statistics and Export Demo ===\n")
    
    # Get comprehensive dataset statistics
    print(f"📊 Dataset Statistics:")
    stats = version_manager.get_dataset_stats()
    
    print(f"   Total versions: {stats['total_versions']}")
    print(f"   Total branches: {stats['total_branches']}")
    print(f"   Total size: {stats['total_size_bytes']:,} bytes")
    print(f"   Created: {stats['creation_date']}")
    print(f"   Last modified: {stats['last_modified']}")
    
    if stats['latest_version']:
        latest = stats['latest_version']
        print(f"   Latest version: {latest['id'][:8]}...")
        print(f"   Latest records: {latest['record_count']}")
    
    # Export metadata for backup/migration
    print(f"\n💾 Exporting dataset metadata...")
    metadata = version_manager.export_version_metadata()
    
    print(f"   ✅ Exported metadata for dataset: {metadata['dataset_id']}")
    print(f"   📊 Versions included: {len(metadata['versions'])}")
    print(f"   🌳 Branches included: {len(metadata['branches'])}")
    print(f"   📅 Export timestamp: {metadata['export_timestamp']}")
    
    # Show sample metadata structure
    print(f"\n📋 Sample metadata structure:")
    sample_version_id = list(metadata['versions'].keys())[0]
    sample_version = metadata['versions'][sample_version_id]
    print(f"   Version {sample_version_id[:8]}...:")
    print(f"      Message: {sample_version['message']}")
    print(f"      Author: {sample_version['author']}")
    print(f"      Timestamp: {sample_version['timestamp']}")
    print(f"      Records: {sample_version['record_count']}")


def main():
    """Main demonstration function."""
    print("🚀 Sprint Lens SDK - Dataset Versioning Demo")
    print("=" * 55)
    print()
    
    try:
        # Run all demonstrations
        version_manager, versions = demonstrate_basic_versioning()
        experimental_branch, exp_version = demonstrate_branching(version_manager, versions)
        demonstrate_version_comparison(version_manager, versions, exp_version)
        demonstrate_tagging_and_search(version_manager, versions)
        demonstrate_rollback(version_manager, versions)
        demonstrate_version_history(version_manager, versions)
        demonstrate_statistics_and_export(version_manager)
        
        print("✅ Dataset versioning demonstration completed successfully!")
        print("\n📝 Key Features Demonstrated:")
        print("   • Git-like version control for datasets")
        print("   • Branching for experimental work")
        print("   • Comprehensive diff generation")
        print("   • Rollback and recovery capabilities")
        print("   • Tag-based version organization")
        print("   • Complete version history tracking")
        print("   • Metadata export for backup/migration")
        print("   • Statistical analysis of dataset evolution")
        
        print("\n🎯 Use Cases:")
        print("   • Data lineage and compliance tracking")
        print("   • Experimental data science workflows")
        print("   • Quality assurance and rollback procedures")
        print("   • Collaborative dataset development")
        print("   • Audit trails for data changes")
        
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()