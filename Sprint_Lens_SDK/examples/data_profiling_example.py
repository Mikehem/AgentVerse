#!/usr/bin/env python3
"""
Sprint Lens SDK Data Profiling Example

This example demonstrates the comprehensive data profiling capabilities
including statistical analysis, data quality assessment, and dashboard
data generation for visualization.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import random
import math

# Import Sprint Lens SDK components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.client.datasets import DatasetClient
from sprintlens.utils.data_profiling import DataProfiler, create_dashboard_data
from sprintlens.core.config import SprintLensConfig


def generate_sample_ecommerce_data(num_records: int = 1000) -> List[Dict[str, Any]]:
    """
    Generate sample e-commerce data for profiling demonstration.
    
    Returns:
        List of dictionaries representing customer purchase data
    """
    categories = ["Electronics", "Clothing", "Books", "Home & Garden", "Sports", "Toys"]
    statuses = ["completed", "pending", "cancelled", "refunded"]
    countries = ["USA", "Canada", "UK", "Germany", "France", "Japan", "Australia"]
    
    data = []
    base_date = datetime.now() - timedelta(days=365)
    
    for i in range(num_records):
        # Introduce some data quality issues for demonstration
        customer_id = f"CUST_{i:06d}"
        
        # Some null values (5% chance)
        email = f"customer{i}@example.com" if random.random() > 0.05 else None
        phone = f"+1-555-{random.randint(1000000, 9999999)}" if random.random() > 0.08 else None
        
        # Some inconsistent data formats
        if random.random() < 0.1:
            # Inconsistent email format
            email = f"customer{i}_gmail.com" if email else None
        
        purchase_date = base_date + timedelta(days=random.randint(0, 365))
        
        record = {
            "customer_id": customer_id,
            "email": email,
            "phone": phone,
            "age": random.randint(18, 80) if random.random() > 0.03 else None,
            "country": random.choice(countries),
            "purchase_amount": round(random.uniform(10, 1000) * random.uniform(0.1, 2.0), 2),  # Variable distribution
            "category": random.choice(categories),
            "order_status": random.choice(statuses),
            "purchase_date": purchase_date.isoformat(),
            "items_purchased": random.randint(1, 10),
            "shipping_cost": round(random.uniform(0, 50), 2),
            "discount_applied": round(random.uniform(0, 100), 2) if random.random() > 0.7 else 0.0,
            "is_repeat_customer": random.choice([True, False]),
            "customer_satisfaction": random.randint(1, 5) if random.random() > 0.1 else None,
            "payment_method": random.choice(["credit_card", "debit_card", "paypal", "apple_pay"]),
            "marketing_channel": random.choice(["social_media", "email", "search", "direct", "referral"])
        }
        
        # Add some duplicate records (2% chance)
        if random.random() < 0.02 and i > 0:
            # Duplicate previous record with slight modifications
            prev_record = data[-1].copy()
            prev_record["customer_id"] = customer_id
            prev_record["purchase_date"] = purchase_date.isoformat()
            record = prev_record
        
        data.append(record)
    
    return data


async def demonstrate_basic_profiling():
    """Demonstrate basic data profiling functionality."""
    print("=== Basic Data Profiling Demo ===\n")
    
    # Generate sample data
    print("📊 Generating sample e-commerce data...")
    sample_data = generate_sample_ecommerce_data(500)
    print(f"✅ Generated {len(sample_data)} records\n")
    
    # Profile the data directly (without needing a client)
    print("🔍 Profiling data...")
    profiler = DataProfiler()
    profile = profiler.profile_dataset(
        data=sample_data,
        name="ecommerce_sample"
    )
    
    # Convert to dictionary for easier access
    profile_result = profile.to_dict()
    
    # Display key insights
    print(f"📈 Dataset Profile Results:")
    print(f"   Total Records: {profile_result.get('total_records', 0)}")
    print(f"   Total Fields: {profile_result.get('total_fields', 0)}")
    print(f"   Created: {profile_result.get('created_at', 'N/A')}")
    print()
    
    # Data Quality Summary
    quality = profile_result.get("data_quality", {})
    print(f"🎯 Data Quality Scores:")
    print(f"   Overall Score: {quality.get('overall_score', 0):.1%}")
    print(f"   Completeness: {quality.get('completeness_score', 0):.1%}")
    print(f"   Consistency: {quality.get('consistency_score', 0):.1%}")
    print(f"   Validity: {quality.get('validity_score', 0):.1%}")
    print()
    
    # Field-level insights
    field_profiles = profile_result.get("field_profiles", [])
    print(f"📋 Field Analysis (Top 5 fields):")
    for field in field_profiles[:5]:
        print(f"   {field.get('name', 'Unknown')}:")
        print(f"     Type: {field.get('data_type', 'unknown')}")
        print(f"     Null %: {field.get('null_percentage', 0):.1f}%")
        print(f"     Unique %: {field.get('unique_percentage', 0):.1f}%")
    print()
    
    return profile_result


async def demonstrate_statistical_analysis(profile_result: Dict[str, Any]):
    """Demonstrate statistical analysis features."""
    print("=== Statistical Analysis Demo ===\n")
    
    field_profiles = profile_result.get("field_profiles", [])
    
    # Find numerical fields for statistical analysis
    numerical_fields = [
        field for field in field_profiles 
        if field.get("data_type") == "numerical" and field.get("statistical_summary")
    ]
    
    print(f"📊 Statistical Analysis for Numerical Fields:")
    for field in numerical_fields[:3]:  # Show top 3 numerical fields
        name = field.get("name", "Unknown")
        stats = field.get("statistical_summary", {})
        
        print(f"\n   {name}:")
        print(f"     Mean: {stats.get('mean', 0):.2f}")
        print(f"     Median: {stats.get('median', 0):.2f}")
        print(f"     Std Dev: {stats.get('std_dev', 0):.2f}")
        print(f"     Min: {stats.get('min_value', 0):.2f}")
        print(f"     Max: {stats.get('max_value', 0):.2f}")
        print(f"     Outliers: {len(stats.get('outliers', []))}")
    
    # Correlations
    correlations = profile_result.get("correlations", {})
    if correlations:
        print(f"\n🔗 Field Correlations (Top 3):")
        correlation_items = list(correlations.items())[:3]
        for field_pair, correlation in correlation_items:
            print(f"   {field_pair}: {correlation:.3f}")
    
    print()


async def demonstrate_data_quality_report():
    """Demonstrate data quality reporting."""
    print("=== Data Quality Report Demo ===\n")
    
    # Generate data with more quality issues
    print("📊 Generating data with quality issues...")
    sample_data = generate_sample_ecommerce_data(300)
    
    # Introduce more quality issues for demonstration
    for i, record in enumerate(sample_data):
        # More missing values
        if i % 10 == 0:
            record["email"] = None
            record["phone"] = None
        
        # Invalid email formats
        if i % 15 == 0 and record.get("email"):
            record["email"] = "invalid_email_format"
        
        # Inconsistent age values
        if i % 20 == 0:
            record["age"] = random.choice([999, -1, 0])  # Invalid ages
    
    # Profile the data directly
    profiler = DataProfiler()
    profile = profiler.profile_dataset(
        data=sample_data,
        name="quality_test_data"
    )
    
    # Convert to dictionary for easier access
    profile_result = profile.to_dict()
    
    # Generate quality report (simulated since we don't have a real dataset ID)
    print("🎯 Data Quality Assessment:")
    
    # Extract quality metrics
    quality = profile_result.get("data_quality", {})
    field_profiles = profile_result.get("field_profiles", [])
    
    # Analyze issues
    issues = []
    recommendations = []
    
    for field in field_profiles:
        field_name = field.get("name", "unknown")
        null_percentage = field.get("null_percentage", 0.0)
        
        if null_percentage > 15:
            issues.append(f"Field '{field_name}' has {null_percentage:.1f}% missing values")
            recommendations.append(f"Improve data collection for '{field_name}'")
    
    print(f"   Overall Quality Score: {quality.get('overall_score', 0):.1%}")
    print(f"   Total Issues Found: {len(issues)}")
    print()
    
    if issues:
        print("⚠️  Key Issues:")
        for issue in issues[:5]:  # Show top 5 issues
            print(f"   • {issue}")
        print()
    
    if recommendations:
        print("💡 Recommendations:")
        for rec in recommendations[:3]:  # Show top 3 recommendations
            print(f"   • {rec}")
        print()


async def demonstrate_dashboard_data_generation(profile_result: Dict[str, Any]):
    """Demonstrate dashboard data generation for visualization."""
    print("=== Dashboard Data Generation Demo ===\n")
    
    print("📊 Generating dashboard-ready data...")
    
    # Generate dashboard data for different chart types
    chart_types = ["histogram", "scatter", "correlation", "quality_metrics", "trends"]
    dashboard_data = create_dashboard_data(profile_result, chart_types)
    
    print(f"📈 Dashboard Data Generated:")
    print(f"   Available Charts: {len(dashboard_data.get('charts', []))}")
    print()
    
    # Show available chart configurations
    charts = dashboard_data.get("charts", [])
    for chart in charts:
        chart_type = chart.get("type", "unknown")
        title = chart.get("title", "Untitled")
        data_points = len(chart.get("data", []))
        
        print(f"   📊 {title} ({chart_type})")
        print(f"       Data Points: {data_points}")
        print(f"       Description: {chart.get('description', 'N/A')}")
        print()
    
    # Save dashboard data to file for reference
    with open("dashboard_data_sample.json", "w") as f:
        json.dump(dashboard_data, f, indent=2, default=str)
    
    print("💾 Dashboard data saved to 'dashboard_data_sample.json'")
    print()


async def demonstrate_temporal_analysis(profile_result: Dict[str, Any]):
    """Demonstrate temporal pattern analysis."""
    print("=== Temporal Pattern Analysis Demo ===\n")
    
    temporal_patterns = profile_result.get("temporal_patterns", {})
    
    if temporal_patterns:
        print("📅 Temporal Patterns Detected:")
        
        # Seasonal patterns
        seasonal = temporal_patterns.get("seasonal_patterns", {})
        if seasonal:
            print("   🌟 Seasonal Patterns:")
            for pattern_type, pattern_data in seasonal.items():
                print(f"     {pattern_type}: {pattern_data}")
        
        # Trend analysis
        trends = temporal_patterns.get("trends", {})
        if trends:
            print("   📈 Trend Analysis:")
            for field, trend_data in trends.items():
                trend_type = trend_data.get("trend_type", "unknown")
                confidence = trend_data.get("confidence", 0)
                print(f"     {field}: {trend_type} (confidence: {confidence:.1%})")
        
        print()
    else:
        print("📅 No significant temporal patterns detected in this dataset")
        print()


async def demonstrate_anomaly_detection(profile_result: Dict[str, Any]):
    """Demonstrate anomaly detection capabilities."""
    print("=== Anomaly Detection Demo ===\n")
    
    anomalies = profile_result.get("anomalies", {})
    
    if anomalies:
        print("🚨 Anomalies Detected:")
        
        # Statistical anomalies
        statistical = anomalies.get("statistical_anomalies", [])
        if statistical:
            print(f"   📊 Statistical Anomalies: {len(statistical)} found")
            for anomaly in statistical[:3]:  # Show first 3
                field = anomaly.get("field", "unknown")
                value = anomaly.get("value", "N/A")
                reason = anomaly.get("reason", "unknown")
                print(f"     {field}: {value} ({reason})")
        
        # Pattern anomalies
        pattern = anomalies.get("pattern_anomalies", [])
        if pattern:
            print(f"   🔍 Pattern Anomalies: {len(pattern)} found")
            for anomaly in pattern[:2]:  # Show first 2
                pattern_type = anomaly.get("pattern_type", "unknown")
                description = anomaly.get("description", "N/A")
                print(f"     {pattern_type}: {description}")
        
        print()
    else:
        print("🚨 No significant anomalies detected in this dataset")
        print()


async def main():
    """Main demonstration function."""
    print("🚀 Sprint Lens SDK - Data Profiling Comprehensive Demo")
    print("=" * 60)
    print()
    
    try:
        # Basic profiling demonstration
        profile_result = await demonstrate_basic_profiling()
        
        # Statistical analysis
        await demonstrate_statistical_analysis(profile_result)
        
        # Temporal pattern analysis
        await demonstrate_temporal_analysis(profile_result)
        
        # Anomaly detection
        await demonstrate_anomaly_detection(profile_result)
        
        # Dashboard data generation
        await demonstrate_dashboard_data_generation(profile_result)
        
        # Data quality reporting
        await demonstrate_data_quality_report()
        
        print("✅ Data profiling demonstration completed successfully!")
        print("\n📝 Key Features Demonstrated:")
        print("   • Comprehensive statistical analysis")
        print("   • Data quality assessment and scoring")
        print("   • Temporal pattern detection")
        print("   • Anomaly detection and reporting")
        print("   • Dashboard data generation for visualization")
        print("   • Field-level profiling and insights")
        print("   • Correlation analysis between fields")
        print("   • Quality issue identification and recommendations")
        
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(main())