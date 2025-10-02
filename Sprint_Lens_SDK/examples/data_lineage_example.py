#!/usr/bin/env python3
"""
Data Lineage Tracking Example for Sprint Lens SDK

This example demonstrates the comprehensive data lineage tracking capabilities
of the Sprint Lens SDK, including:

1. Creating and registering data assets
2. Tracking data transformations
3. Building lineage graphs
4. Impact analysis
5. Data flow path finding
6. Lineage report generation
7. Graph export/import

Run this example to see how data lineage tracking works in practice.
"""

import json
from datetime import datetime
from typing import Dict, List, Any

# Import Sprint Lens data lineage utilities
from sprintlens.utils.data_lineage import (
    DataLineageTracker,
    LineageNodeType,
    OperationType,
    create_lineage_tracker,
    track_dataset_creation,
    track_data_transformation
)


def create_sample_data_pipeline() -> DataLineageTracker:
    """
    Create a sample data pipeline with lineage tracking.
    
    This simulates a real-world data processing pipeline:
    Raw Data -> Cleaned Data -> Analytics -> Reports
    """
    print("🏗️  Building sample data pipeline...")
    
    # Create lineage tracker
    tracker = create_lineage_tracker("data_pipeline_demo")
    
    # Step 1: Register raw data sources
    print("\n📁 Registering raw data sources...")
    
    raw_sales = tracker.register_asset(
        name="Raw Sales Data",
        asset_type=LineageNodeType.FILE,
        location="/data/raw/sales_2024.csv",
        schema_info={
            "columns": ["date", "product", "amount", "customer_id"],
            "format": "CSV",
            "size_mb": 45.2
        },
        metadata={
            "source": "CRM System",
            "update_frequency": "daily",
            "quality": "raw"
        }
    )
    
    raw_customers = tracker.register_asset(
        name="Raw Customer Data", 
        asset_type=LineageNodeType.DATABASE,
        location="postgres://db1/customers",
        schema_info={
            "tables": ["customers", "customer_segments"],
            "rows": 50000
        },
        metadata={
            "source": "Customer Database",
            "update_frequency": "real-time"
        }
    )
    
    raw_products = tracker.register_asset(
        name="Product Catalog",
        asset_type=LineageNodeType.API_CALL,
        location="https://api.products.com/v1/catalog",
        metadata={
            "source": "Product API",
            "refresh_rate": "hourly"
        }
    )
    
    print(f"   ✅ Registered {len(tracker.graph.assets)} raw data assets")
    
    # Step 2: Track data cleaning operations
    print("\n🧹 Tracking data cleaning operations...")
    
    # Clean sales data
    cleaned_sales = tracker.register_asset(
        name="Cleaned Sales Data",
        asset_type=LineageNodeType.DATASET,
        location="dataset://cleaned_sales_2024",
        metadata={
            "quality": "cleaned",
            "validation_rules": ["no_nulls", "valid_dates", "positive_amounts"]
        }
    )
    
    cleaning_event = tracker.track_simple_operation(
        operation_type=OperationType.CLEAN,
        inputs=[raw_sales.asset_id],
        outputs=[cleaned_sales.asset_id],
        transformation_details={
            "operations": [
                "Remove duplicate records",
                "Fix invalid dates",
                "Normalize currency amounts",
                "Validate customer IDs"
            ],
            "records_processed": 125000,
            "records_removed": 2500,
            "data_quality_score": 0.95
        },
        user_id="data_engineer_1"
    )
    
    # Clean customer data
    cleaned_customers = tracker.register_asset(
        name="Cleaned Customer Data",
        asset_type=LineageNodeType.DATASET,
        location="dataset://cleaned_customers",
        metadata={"quality": "cleaned"}
    )
    
    tracker.track_simple_operation(
        operation_type=OperationType.CLEAN,
        inputs=[raw_customers.asset_id],
        outputs=[cleaned_customers.asset_id],
        transformation_details={
            "operations": ["Standardize addresses", "Merge duplicate profiles"],
            "records_processed": 50000
        },
        user_id="data_engineer_1"
    )
    
    print(f"   ✅ Tracked {len([e for e in tracker.graph.events if e.operation_metadata.operation_type == OperationType.CLEAN])} cleaning operations")
    
    # Step 3: Track data integration and enrichment
    print("\n🔗 Tracking data integration operations...")
    
    # Join sales with customer data
    enriched_sales = tracker.register_asset(
        name="Enriched Sales Data",
        asset_type=LineageNodeType.DATASET,
        location="dataset://enriched_sales_2024",
        metadata={
            "quality": "enriched",
            "joins": ["customers", "products"]
        }
    )
    
    tracker.track_simple_operation(
        operation_type=OperationType.JOIN,
        inputs=[cleaned_sales.asset_id, cleaned_customers.asset_id, raw_products.asset_id],
        outputs=[enriched_sales.asset_id],
        transformation_details={
            "join_type": "left_join",
            "join_keys": {"sales_customers": "customer_id", "sales_products": "product_id"},
            "enrichment_fields": ["customer_segment", "product_category", "customer_ltv"],
            "final_record_count": 122500
        },
        user_id="data_engineer_2"
    )
    
    print("   ✅ Tracked data integration operation")
    
    # Step 4: Track analytics transformations
    print("\n📊 Tracking analytics transformations...")
    
    # Create monthly analytics
    monthly_analytics = tracker.register_asset(
        name="Monthly Sales Analytics",
        asset_type=LineageNodeType.DATASET,
        location="dataset://monthly_analytics_2024",
        metadata={
            "aggregation_level": "monthly",
            "metrics": ["total_sales", "avg_order_value", "customer_count"]
        }
    )
    
    tracker.track_simple_operation(
        operation_type=OperationType.AGGREGATE,
        inputs=[enriched_sales.asset_id],
        outputs=[monthly_analytics.asset_id],
        transformation_details={
            "aggregation_type": "monthly_rollup",
            "group_by": ["year", "month", "product_category", "customer_segment"],
            "metrics": {
                "total_sales": "SUM(amount)",
                "avg_order_value": "AVG(amount)",
                "customer_count": "COUNT(DISTINCT customer_id)",
                "order_count": "COUNT(*)"
            },
            "time_period": "2024-01-01 to 2024-12-31"
        },
        user_id="data_analyst_1"
    )
    
    # Create customer analytics
    customer_analytics = tracker.register_asset(
        name="Customer Behavior Analytics",
        asset_type=LineageNodeType.DATASET,
        location="dataset://customer_analytics_2024",
        metadata={
            "aggregation_level": "customer",
            "metrics": ["lifetime_value", "purchase_frequency", "churn_risk"]
        }
    )
    
    tracker.track_simple_operation(
        operation_type=OperationType.AGGREGATE,
        inputs=[enriched_sales.asset_id],
        outputs=[customer_analytics.asset_id],
        transformation_details={
            "aggregation_type": "customer_behavior",
            "group_by": ["customer_id", "customer_segment"],
            "metrics": {
                "lifetime_value": "SUM(amount)",
                "purchase_frequency": "COUNT(*) / MONTHS_ACTIVE",
                "avg_order_value": "AVG(amount)",
                "last_purchase_date": "MAX(date)"
            },
            "features": ["recency", "frequency", "monetary", "churn_score"]
        },
        user_id="data_scientist_1"
    )
    
    print(f"   ✅ Tracked {len([e for e in tracker.graph.events if e.operation_metadata.operation_type == OperationType.AGGREGATE])} analytics operations")
    
    # Step 5: Track report generation
    print("\n📋 Tracking report generation...")
    
    # Executive dashboard
    exec_dashboard = tracker.register_asset(
        name="Executive Sales Dashboard",
        asset_type=LineageNodeType.DATASET,
        location="dataset://exec_dashboard_2024",
        metadata={
            "report_type": "dashboard",
            "audience": "executives",
            "refresh_frequency": "daily"
        }
    )
    
    tracker.track_simple_operation(
        operation_type=OperationType.TRANSFORM,
        inputs=[monthly_analytics.asset_id, customer_analytics.asset_id],
        outputs=[exec_dashboard.asset_id],
        transformation_details={
            "report_type": "executive_dashboard",
            "charts": ["monthly_revenue_trend", "customer_acquisition", "product_performance"],
            "kpis": ["total_revenue", "growth_rate", "customer_retention"],
            "filters": ["date_range", "product_category", "region"]
        },
        user_id="business_analyst_1"
    )
    
    # Customer insights report
    customer_report = tracker.register_asset(
        name="Customer Insights Report",
        asset_type=LineageNodeType.DATASET,
        location="dataset://customer_insights_2024",
        metadata={
            "report_type": "analytical_report",
            "audience": "marketing_team"
        }
    )
    
    tracker.track_simple_operation(
        operation_type=OperationType.TRANSFORM,
        inputs=[customer_analytics.asset_id],
        outputs=[customer_report.asset_id],
        transformation_details={
            "report_type": "customer_insights",
            "sections": ["segmentation_analysis", "churn_prediction", "ltv_analysis"],
            "recommendations": ["retention_strategies", "upsell_opportunities"]
        },
        user_id="marketing_analyst_1"
    )
    
    print(f"   ✅ Tracked {len([e for e in tracker.graph.events if e.operation_metadata.operation_type == OperationType.TRANSFORM])} report generation operations")
    
    print(f"\n🎯 Pipeline complete! Generated lineage graph with:")
    print(f"   📊 Assets: {len(tracker.graph.assets)}")
    print(f"   🔗 Relationships: {len(tracker.graph.relationships)}")
    print(f"   📝 Events: {len(tracker.graph.events)}")
    
    return tracker


def demonstrate_lineage_analysis(tracker: DataLineageTracker):
    """Demonstrate various lineage analysis capabilities."""
    
    print("\n" + "="*60)
    print("📊 LINEAGE ANALYSIS DEMONSTRATION")
    print("="*60)
    
    # Get all dataset assets
    datasets = [asset for asset in tracker.graph.assets.values() 
               if asset.asset_type == LineageNodeType.DATASET]
    
    if not datasets:
        print("❌ No datasets found for analysis")
        return
    
    # Choose the executive dashboard for analysis
    target_dataset = None
    for asset in datasets:
        if "Executive" in asset.name:
            target_dataset = asset
            break
    
    if not target_dataset:
        target_dataset = datasets[0]  # Use first dataset if executive dashboard not found
    
    print(f"🎯 Analyzing lineage for: {target_dataset.name}")
    
    # 1. Get complete lineage
    print(f"\n📈 Complete Lineage Analysis:")
    upstream = tracker.graph.get_upstream_assets(target_dataset.asset_id)
    downstream = tracker.graph.get_downstream_assets(target_dataset.asset_id)
    
    print(f"   📤 Upstream dependencies: {len(upstream)}")
    for asset in upstream[:3]:  # Show first 3
        print(f"      • {asset.name} ({asset.asset_type.value})")
    if len(upstream) > 3:
        print(f"      ... and {len(upstream) - 3} more")
    
    print(f"   📥 Downstream dependents: {len(downstream)}")
    for asset in downstream[:3]:  # Show first 3
        print(f"      • {asset.name} ({asset.asset_type.value})")
    if len(downstream) > 3:
        print(f"      ... and {len(downstream) - 3} more")
    
    # 2. Impact analysis
    print(f"\n💥 Impact Analysis:")
    impacted = tracker.graph.find_impact(target_dataset.asset_id)
    print(f"   🎯 Assets impacted by changes: {len(impacted)}")
    for asset in impacted[:5]:  # Show first 5
        print(f"      • {asset.name}")
    
    # 3. Asset history
    print(f"\n📚 Asset History:")
    history = tracker.get_asset_history(target_dataset.asset_id)
    print(f"   📝 Total operations involving this asset: {len(history)}")
    for event in history[-3:]:  # Show last 3 events
        op_type = event.operation_metadata.operation_type.value
        timestamp = event.timestamp[:19]  # Remove microseconds
        print(f"      • {timestamp}: {op_type.upper()}")
    
    # 4. Data flow paths
    print(f"\n🔄 Data Flow Analysis:")
    # Find paths from raw data to our target
    raw_assets = [asset for asset in tracker.graph.assets.values() 
                 if "Raw" in asset.name or asset.asset_type == LineageNodeType.FILE]
    
    if raw_assets:
        raw_asset = raw_assets[0]
        paths = tracker.get_data_flow(raw_asset.asset_id, target_dataset.asset_id)
        print(f"   🛤️  Paths from '{raw_asset.name}' to '{target_dataset.name}': {len(paths)}")
        
        if paths:
            print(f"   📍 Example path:")
            path_assets = []
            for asset_id in paths[0]:
                asset = tracker.graph.assets.get(asset_id)
                if asset:
                    path_assets.append(asset.name)
            
            for i, name in enumerate(path_assets):
                prefix = "      └─" if i == len(path_assets) - 1 else "      ├─"
                print(f"{prefix} {name}")


def demonstrate_lineage_reporting(tracker: DataLineageTracker):
    """Demonstrate lineage reporting capabilities."""
    
    print("\n" + "="*60)
    print("📋 LINEAGE REPORTING DEMONSTRATION")  
    print("="*60)
    
    # Find a dataset to report on
    datasets = [asset for asset in tracker.graph.assets.values() 
               if asset.asset_type == LineageNodeType.DATASET]
    
    if not datasets:
        print("❌ No datasets available for reporting")
        return
    
    target_dataset = datasets[-1]  # Use last dataset (likely a final output)
    
    print(f"📊 Generating comprehensive lineage report for: {target_dataset.name}")
    
    try:
        report = tracker.generate_lineage_report(target_dataset.asset_id)
        
        print(f"\n📈 Report Summary:")
        if 'summary' in report:
            summary = report['summary']
            print(f"   📝 Total operations: {summary.get('total_operations', 0)}")
            print(f"   📤 Upstream dependencies: {summary.get('upstream_dependencies', 0)}")
            print(f"   📥 Downstream dependencies: {summary.get('downstream_dependencies', 0)}")
            print(f"   💥 Potential impact: {summary.get('potential_impact', 0)}")
        
        # Show asset information
        if 'asset' in report:
            asset_info = report['asset']
            print(f"\n📋 Asset Details:")
            print(f"   🏷️  Name: {asset_info.get('name', 'N/A')}")
            print(f"   📂 Type: {asset_info.get('asset_type', 'N/A')}")
            print(f"   📍 Location: {asset_info.get('location', 'N/A')}")
            print(f"   📅 Created: {asset_info.get('created_at', 'N/A')[:19]}")
        
        # Show recent operations
        if 'history' in report and report['history']:
            print(f"\n📚 Recent Operations:")
            for event in report['history'][-3:]:  # Last 3 operations
                op_type = event['operation_metadata']['operation_type']
                timestamp = event['timestamp'][:19]
                print(f"   • {timestamp}: {op_type.upper()}")
        
        # Show data flows
        if 'data_flows' in report:
            flows = report['data_flows']
            incoming = flows.get('incoming', [])
            outgoing = flows.get('outgoing', [])
            
            print(f"\n🔄 Data Flows:")
            print(f"   📤 Incoming relationships: {len(incoming)}")
            print(f"   📥 Outgoing relationships: {len(outgoing)}")
        
    except Exception as e:
        print(f"❌ Error generating report: {e}")


def demonstrate_export_import(tracker: DataLineageTracker):
    """Demonstrate lineage graph export and import."""
    
    print("\n" + "="*60)
    print("📤 EXPORT/IMPORT DEMONSTRATION")
    print("="*60)
    
    print("📤 Exporting lineage graph...")
    
    try:
        # Export as dictionary
        graph_dict = tracker.export_lineage_graph(format="dict")
        
        print(f"   ✅ Exported graph with:")
        print(f"      📊 Assets: {len(graph_dict.get('assets', {}))}")
        print(f"      🔗 Relationships: {len(graph_dict.get('relationships', {}))}")
        print(f"      📝 Events: {len(graph_dict.get('events', []))}")
        
        # Export as JSON string
        json_export = tracker.export_lineage_graph(format="json")
        json_size = len(json_export) if isinstance(json_export, str) else 0
        print(f"      📄 JSON size: {json_size:,} characters")
        
        # Demonstrate import
        print(f"\n📥 Importing lineage graph to new tracker...")
        new_tracker = create_lineage_tracker("imported_graph")
        
        # Import the graph
        new_tracker.import_lineage_graph(graph_dict)
        
        print(f"   ✅ Import successful!")
        print(f"      📊 Imported assets: {len(new_tracker.graph.assets)}")
        print(f"      🔗 Imported relationships: {len(new_tracker.graph.relationships)}")
        print(f"      📝 Imported events: {len(new_tracker.graph.events)}")
        
        # Verify data integrity
        original_asset_names = {asset.name for asset in tracker.graph.assets.values()}
        imported_asset_names = {asset.name for asset in new_tracker.graph.assets.values()}
        
        if original_asset_names == imported_asset_names:
            print(f"   ✅ Data integrity verified - all assets preserved")
        else:
            print(f"   ⚠️  Data integrity issue detected")
        
        # Show sample export preview
        print(f"\n📋 Sample Export Preview:")
        sample_export = json.dumps(graph_dict, indent=2)[:500] + "..."
        print(f"   {sample_export}")
        
    except Exception as e:
        print(f"❌ Error during export/import: {e}")


def demonstrate_advanced_operations(tracker: DataLineageTracker):
    """Demonstrate advanced lineage operations."""
    
    print("\n" + "="*60)
    print("⚡ ADVANCED OPERATIONS DEMONSTRATION")
    print("="*60)
    
    # 1. Complex transformation tracking
    print("🔄 Demonstrating complex transformation tracking...")
    
    # Create a machine learning model dataset
    ml_model = tracker.register_asset(
        name="Customer Churn Prediction Model",
        asset_type=LineageNodeType.MODEL,
        location="models://churn_prediction_v2.pkl",
        metadata={
            "model_type": "random_forest",
            "accuracy": 0.89,
            "features": ["recency", "frequency", "monetary", "tenure"]
        }
    )
    
    # Find customer analytics dataset
    customer_analytics = None
    for asset in tracker.graph.assets.values():
        if "Customer" in asset.name and "Analytics" in asset.name:
            customer_analytics = asset
            break
    
    if customer_analytics:
        # Track model training
        tracker.track_simple_operation(
            operation_type=OperationType.TRANSFORM,
            inputs=[customer_analytics.asset_id],
            outputs=[ml_model.asset_id],
            transformation_details={
                "operation": "model_training",
                "algorithm": "RandomForestClassifier",
                "hyperparameters": {
                    "n_estimators": 100,
                    "max_depth": 10,
                    "min_samples_split": 5
                },
                "training_metrics": {
                    "accuracy": 0.89,
                    "precision": 0.87,
                    "recall": 0.91,
                    "f1_score": 0.89
                },
                "feature_importance": {
                    "recency": 0.35,
                    "frequency": 0.28,
                    "monetary": 0.25,
                    "tenure": 0.12
                }
            },
            user_id="data_scientist_2"
        )
        
        print("   ✅ Tracked ML model training operation")
    
    # 2. Pipeline dependency analysis
    print(f"\n🔍 Analyzing pipeline dependencies...")
    
    # Find all leaf nodes (final outputs with no downstream dependencies)
    leaf_nodes = []
    for asset in tracker.graph.assets.values():
        downstream = tracker.graph.get_downstream_assets(asset.asset_id)
        if not downstream:
            leaf_nodes.append(asset)
    
    print(f"   🍃 Found {len(leaf_nodes)} leaf nodes (final outputs):")
    for node in leaf_nodes[:5]:  # Show first 5
        print(f"      • {node.name}")
    
    # Find all root nodes (sources with no upstream dependencies)
    root_nodes = []
    for asset in tracker.graph.assets.values():
        upstream = tracker.graph.get_upstream_assets(asset.asset_id)
        if not upstream:
            root_nodes.append(asset)
    
    print(f"   🌱 Found {len(root_nodes)} root nodes (data sources):")
    for node in root_nodes[:5]:  # Show first 5
        print(f"      • {node.name}")
    
    # 3. Operation type analysis
    print(f"\n📊 Operation type breakdown:")
    operation_counts = {}
    for event in tracker.graph.events:
        op_type = event.operation_metadata.operation_type.value
        operation_counts[op_type] = operation_counts.get(op_type, 0) + 1
    
    for op_type, count in sorted(operation_counts.items()):
        print(f"   • {op_type.upper()}: {count} operations")
    
    # 4. Asset type distribution
    print(f"\n📋 Asset type distribution:")
    asset_type_counts = {}
    for asset in tracker.graph.assets.values():
        asset_type = asset.asset_type.value
        asset_type_counts[asset_type] = asset_type_counts.get(asset_type, 0) + 1
    
    for asset_type, count in sorted(asset_type_counts.items()):
        print(f"   • {asset_type.upper()}: {count} assets")


def main():
    """Main demonstration function."""
    print("🚀 Sprint Lens SDK - Data Lineage Tracking Demo")
    print("=" * 60)
    
    try:
        # Step 1: Create sample data pipeline
        tracker = create_sample_data_pipeline()
        
        # Step 2: Demonstrate lineage analysis
        demonstrate_lineage_analysis(tracker)
        
        # Step 3: Demonstrate reporting
        demonstrate_lineage_reporting(tracker)
        
        # Step 4: Demonstrate export/import
        demonstrate_export_import(tracker)
        
        # Step 5: Demonstrate advanced operations
        demonstrate_advanced_operations(tracker)
        
        # Final summary
        print("\n" + "="*60)
        print("✅ DATA LINEAGE DEMONSTRATION COMPLETED")
        print("="*60)
        
        print(f"🎯 Final Pipeline Statistics:")
        print(f"   📊 Total Assets: {len(tracker.graph.assets)}")
        print(f"   🔗 Total Relationships: {len(tracker.graph.relationships)}")
        print(f"   📝 Total Events: {len(tracker.graph.events)}")
        print(f"   🕐 Graph Created: {tracker.graph.created_at[:19]}")
        print(f"   🕐 Last Updated: {tracker.graph.updated_at[:19]}")
        
        print(f"\n📋 Key Features Demonstrated:")
        print(f"   • Asset registration and management")
        print(f"   • Operation and transformation tracking")
        print(f"   • Lineage graph construction and traversal")
        print(f"   • Impact analysis and dependency mapping")
        print(f"   • Data flow path discovery")
        print(f"   • Comprehensive lineage reporting")
        print(f"   • Graph export and import capabilities")
        print(f"   • Advanced analytics and insights")
        
        print(f"\n🎯 Use Cases:")
        print(f"   • Data governance and compliance")
        print(f"   • Impact analysis for system changes")
        print(f"   • Data quality root cause analysis")
        print(f"   • Pipeline optimization and monitoring")
        print(f"   • Regulatory audit trails")
        print(f"   • Data discovery and documentation")
        
        print(f"\n🔧 Technical Capabilities:")
        print(f"   • Graph-based lineage representation")
        print(f"   • Multiple asset and operation types")
        print(f"   • Bidirectional relationship tracking")
        print(f"   • Metadata and context preservation")
        print(f"   • Scalable graph algorithms")
        print(f"   • JSON serialization support")
        
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()