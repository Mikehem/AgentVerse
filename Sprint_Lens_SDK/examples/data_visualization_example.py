#!/usr/bin/env python3
"""
Data Visualization Example - Sprint Lens SDK

This example demonstrates the comprehensive data visualization capabilities including:
- Distribution charts (histograms, box plots)
- Categorical charts (bar, pie, donut)
- Correlation heatmaps
- Trend charts and multi-series visualizations
- Data quality dashboards
- Complete dataset overview dashboards
- Chart suggestions and export functionality

Example usage:
    python3 data_visualization_example.py
"""

import json
import random
import sys
import os
from typing import List, Dict, Any
from datetime import datetime, timedelta

# Import Sprint Lens SDK components
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.utils.data_visualization import (
    DataVisualizer, create_quick_histogram, create_quick_pie_chart,
    create_dashboard_from_profile
)
from sprintlens.utils.data_profiling import DataProfiler


def create_sample_sales_data() -> List[Dict[str, Any]]:
    """Create sample sales data for visualization demonstrations."""
    print("📊 Creating sample sales dataset...")
    
    # Sample data representing sales transactions
    regions = ["North", "South", "East", "West", "Central"]
    products = ["Laptop", "Phone", "Tablet", "Monitor", "Keyboard", "Mouse"]
    sales_reps = ["Alice Johnson", "Bob Smith", "Carol Davis", "David Wilson", "Eve Brown"]
    
    data = []
    base_date = datetime.now() - timedelta(days=365)
    
    for i in range(500):  # 500 sales transactions
        date = base_date + timedelta(days=random.randint(0, 365))
        
        record = {
            "id": i + 1,
            "date": date.strftime("%Y-%m-%d"),
            "region": random.choice(regions),
            "product": random.choice(products),
            "sales_rep": random.choice(sales_reps),
            "quantity": random.randint(1, 20),
            "unit_price": round(random.uniform(50, 2000), 2),
            "total_amount": 0,  # Will calculate below
            "customer_rating": round(random.uniform(1.0, 5.0), 1),
            "month": date.strftime("%Y-%m"),
            "quarter": f"Q{(date.month - 1) // 3 + 1} {date.year}"
        }
        
        # Calculate total amount
        record["total_amount"] = round(record["quantity"] * record["unit_price"], 2)
        
        data.append(record)
    
    print(f"   ✅ Created {len(data)} sales records")
    print(f"   📅 Date range: {min(r['date'] for r in data)} to {max(r['date'] for r in data)}")
    print(f"   🌍 Regions: {len(set(r['region'] for r in data))}")
    print(f"   📱 Products: {len(set(r['product'] for r in data))}")
    
    return data


def demonstrate_distribution_charts(data: List[Dict[str, Any]]):
    """Demonstrate distribution chart creation."""
    print("\n=== Distribution Charts Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # 1. Histogram for total amounts
    print("📊 Creating histogram for total sales amounts...")
    histogram = visualizer.create_distribution_chart(
        data=data,
        column="total_amount",
        chart_type="histogram",
        bins=15,
        title="Distribution of Sales Amounts"
    )
    
    print(f"   ✅ Histogram created with {len(histogram.data)} bins")
    print(f"   📈 Statistics: min=${histogram.metadata['min']:,.2f}, max=${histogram.metadata['max']:,.2f}")
    print(f"   📊 Mean: ${histogram.metadata['mean']:,.2f}, Std: ${histogram.metadata['std']:,.2f}")
    
    # 2. Box plot for customer ratings
    print(f"\n📊 Creating box plot for customer ratings...")
    box_plot = visualizer.create_distribution_chart(
        data=data,
        column="customer_rating",
        chart_type="box",
        title="Customer Rating Distribution"
    )
    
    box_data = box_plot.data[0]
    print(f"   ✅ Box plot created")
    print(f"   📊 Quartiles: Q1={box_data['q1']}, Median={box_data['median']}, Q3={box_data['q3']}")
    print(f"   ⚠️  Outliers: {len(box_data['outliers'])} detected")
    
    # 3. Quick histogram using utility function
    print(f"\n📊 Creating quick histogram for quantities...")
    quick_hist = create_quick_histogram(data, "quantity", "Product Quantities Sold")
    print(f"   ✅ Quick histogram created: {quick_hist.title}")
    
    return histogram, box_plot, quick_hist


def demonstrate_categorical_charts(data: List[Dict[str, Any]]):
    """Demonstrate categorical chart creation."""
    print("\n=== Categorical Charts Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # 1. Bar chart for regions
    print("📊 Creating bar chart for sales by region...")
    region_bar = visualizer.create_categorical_chart(
        data=data,
        column="region",
        chart_type="bar",
        title="Sales Count by Region"
    )
    
    print(f"   ✅ Bar chart created with {len(region_bar.data)} regions")
    for item in region_bar.data[:3]:  # Show top 3
        print(f"   🌍 {item['x']}: {item['y']} sales")
    
    # 2. Pie chart for products
    print(f"\n📊 Creating pie chart for product distribution...")
    product_pie = visualizer.create_categorical_chart(
        data=data,
        column="product",
        chart_type="pie",
        max_categories=8,
        title="Sales Distribution by Product"
    )
    
    print(f"   ✅ Pie chart created with {len(product_pie.data)} product categories")
    for item in product_pie.data[:3]:  # Show top 3
        print(f"   📱 {item['name']}: {item['percentage']}% ({item['value']} sales)")
    
    # 3. Donut chart for quarters
    print(f"\n📊 Creating donut chart for quarterly sales...")
    quarter_donut = visualizer.create_categorical_chart(
        data=data,
        column="quarter",
        chart_type="donut",
        title="Sales by Quarter"
    )
    
    print(f"   ✅ Donut chart created with {len(quarter_donut.data)} quarters")
    
    # 4. Quick pie chart using utility function
    print(f"\n📊 Creating quick pie chart for sales reps...")
    quick_pie = create_quick_pie_chart(data, "sales_rep", "Sales by Representative")
    print(f"   ✅ Quick pie chart created: {quick_pie.title}")
    
    return region_bar, product_pie, quarter_donut, quick_pie


def demonstrate_correlation_analysis(data: List[Dict[str, Any]]):
    """Demonstrate correlation analysis."""
    print("\n=== Correlation Analysis Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # Create correlation heatmap for numeric columns
    print("📊 Creating correlation heatmap for numeric variables...")
    numeric_columns = ["quantity", "unit_price", "total_amount", "customer_rating"]
    
    heatmap = visualizer.create_correlation_heatmap(
        data=data,
        numeric_columns=numeric_columns,
        title="Sales Variables Correlation Matrix"
    )
    
    print(f"   ✅ Correlation heatmap created")
    print(f"   📊 Variables analyzed: {', '.join(numeric_columns)}")
    print(f"   📈 Data points: {len(heatmap.data)}")
    
    # Show some correlation insights
    print(f"   🔍 Sample correlations:")
    correlation_data = {(item['x'], item['y']): item['value'] for item in heatmap.data}
    
    interesting_pairs = [
        ("quantity", "total_amount"),
        ("unit_price", "total_amount"),
        ("customer_rating", "total_amount")
    ]
    
    for x, y in interesting_pairs:
        corr = correlation_data.get((x, y), 0)
        direction = "positive" if corr > 0.3 else "negative" if corr < -0.3 else "weak"
        print(f"      • {x} vs {y}: {corr:.3f} ({direction})")
    
    return heatmap


def demonstrate_trend_charts(data: List[Dict[str, Any]]):
    """Demonstrate trend chart creation."""
    print("\n=== Trend Charts Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # Aggregate data by month for trend analysis
    monthly_data = {}
    for record in data:
        month = record["month"]
        if month not in monthly_data:
            monthly_data[month] = {"month": month, "total_sales": 0, "avg_rating": 0, "transaction_count": 0}
        
        monthly_data[month]["total_sales"] += record["total_amount"]
        monthly_data[month]["avg_rating"] = (
            (monthly_data[month]["avg_rating"] * monthly_data[month]["transaction_count"] + record["customer_rating"]) /
            (monthly_data[month]["transaction_count"] + 1)
        )
        monthly_data[month]["transaction_count"] += 1
    
    trend_data = list(monthly_data.values())
    trend_data.sort(key=lambda x: x["month"])
    
    # 1. Line chart for sales trend
    print("📊 Creating line chart for monthly sales trend...")
    sales_trend = visualizer.create_trend_chart(
        data=trend_data,
        x_column="month",
        y_column="total_sales",
        chart_type="line",
        title="Monthly Sales Trend"
    )
    
    print(f"   ✅ Sales trend chart created with {len(sales_trend.data)} data points")
    
    # 2. Scatter plot for ratings vs sales
    print(f"\n📊 Creating scatter plot for ratings vs sales correlation...")
    scatter_chart = visualizer.create_trend_chart(
        data=data,
        x_column="customer_rating",
        y_column="total_amount",
        chart_type="scatter",
        title="Customer Rating vs Sales Amount"
    )
    
    print(f"   ✅ Scatter plot created with {len(scatter_chart.data)} points")
    
    # 3. Multi-series chart
    print(f"\n📊 Creating multi-series chart for sales and ratings...")
    multi_series = visualizer.create_multi_series_chart(
        data=trend_data,
        x_column="month",
        y_columns=["total_sales", "transaction_count"],
        chart_type="line",
        title="Monthly Sales and Transaction Volume"
    )
    
    print(f"   ✅ Multi-series chart created with {len(multi_series.data)} series")
    
    return sales_trend, scatter_chart, multi_series


def demonstrate_data_quality_dashboard(data: List[Dict[str, Any]]):
    """Demonstrate data quality dashboard creation."""
    print("\n=== Data Quality Dashboard Demo ===\n")
    
    # First, profile the data
    print("🔍 Profiling dataset for quality analysis...")
    profiler = DataProfiler()
    profile_result = profiler.profile_dataset(data)
    
    print(f"   ✅ Dataset profiled")
    print(f"   📊 Records analyzed: {profile_result.total_records}")
    print(f"   📈 Columns analyzed: {len(profile_result.field_profiles)}")
    print(f"   🏆 Overall quality score: {profile_result.data_quality.overall_quality_score:.1f}%")
    
    # Create quality dashboard using profile dict format
    print(f"\n📊 Creating data quality dashboard...")
    
    # Convert profile to dict format for dashboard creation
    profile_dict = {
        "summary": {
            "total_records": profile_result.total_records,
            "total_columns": len(profile_result.field_profiles),
            "data_types": {}
        },
        "field_profiles": {},
        "quality_metrics": {
            "completeness_score": profile_result.data_quality.completeness_score,
            "validity_score": profile_result.data_quality.validity_score,
            "consistency_score": profile_result.data_quality.consistency_score,
            "uniqueness_score": 100.0
        }
    }
    
    # Add field profiles
    for field_profile in profile_result.field_profiles:
        field_name = field_profile.name
        profile_dict["field_profiles"][field_name] = {
            "data_type": field_profile.data_type,
            "missing_count": field_profile.null_count,
            "total_count": profile_result.total_records,
            "outlier_count": 0
        }
        # Track data types
        data_type = field_profile.data_type
        profile_dict["summary"]["data_types"][data_type] = profile_dict["summary"]["data_types"].get(data_type, 0) + 1
    
    dashboard = create_dashboard_from_profile(profile_dict, "Sales Data Quality Dashboard")
    
    print(f"   ✅ Quality dashboard created")
    print(f"   📊 Charts included: {len(dashboard.charts)}")
    
    # Show dashboard components
    print(f"   📋 Dashboard components:")
    for i, chart in enumerate(dashboard.charts, 1):
        print(f"      {i}. {chart.title} ({chart.chart_type})")
    
    return dashboard, profile_result


def demonstrate_overview_dashboard(data: List[Dict[str, Any]]):
    """Demonstrate comprehensive overview dashboard."""
    print("\n=== Complete Overview Dashboard Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # Create a comprehensive dashboard with multiple chart types
    print("🏗️  Building comprehensive overview dashboard...")
    
    charts = []
    
    # 1. Sales distribution
    try:
        sales_hist = visualizer.create_distribution_chart(data, "total_amount", "histogram")
        charts.append(sales_hist)
        print("   ✅ Added sales distribution histogram")
    except Exception as e:
        print(f"   ⚠️  Could not create sales histogram: {e}")
    
    # 2. Regional breakdown
    try:
        region_chart = visualizer.create_categorical_chart(data, "region", "bar")
        charts.append(region_chart)
        print("   ✅ Added regional sales breakdown")
    except Exception as e:
        print(f"   ⚠️  Could not create region chart: {e}")
    
    # 3. Product distribution
    try:
        product_chart = visualizer.create_categorical_chart(data, "product", "pie")
        charts.append(product_chart)
        print("   ✅ Added product distribution pie chart")
    except Exception as e:
        print(f"   ⚠️  Could not create product chart: {e}")
    
    # 4. Correlation heatmap
    try:
        correlation = visualizer.create_correlation_heatmap(data)
        charts.append(correlation)
        print("   ✅ Added correlation heatmap")
    except Exception as e:
        print(f"   ⚠️  Could not create correlation heatmap: {e}")
    
    # Create dashboard layout
    from sprintlens.utils.data_visualization import DashboardLayout
    
    dashboard = DashboardLayout(
        title="Sales Analytics Dashboard",
        description="Comprehensive overview of sales performance and trends",
        charts=charts,
        layout_config={
            "grid": {"rows": 2, "cols": 2},
            "responsive": True,
            "export_enabled": True,
            "theme": "professional"
        },
        created_at=datetime.now()
    )
    
    print(f"\n   🎯 Dashboard created successfully!")
    print(f"   📊 Total charts: {len(dashboard.charts)}")
    print(f"   📅 Created: {dashboard.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    
    return dashboard


def demonstrate_chart_suggestions(data: List[Dict[str, Any]]):
    """Demonstrate intelligent chart suggestions."""
    print("\n=== Chart Suggestions Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # Simulate getting suggestions (would normally use DatasetClient)
    print("🧠 Analyzing dataset structure for chart suggestions...")
    
    suggestions = []
    sample_record = data[0]
    
    # Analyze columns for suggestions
    for column in list(sample_record.keys())[:8]:  # Analyze first 8 columns
        sample_values = [record.get(column) for record in data[:20]]
        non_null_values = [v for v in sample_values if v is not None]
        
        if not non_null_values:
            continue
        
        # Check if numeric
        numeric_count = 0
        for val in non_null_values:
            try:
                float(val)
                numeric_count += 1
            except (ValueError, TypeError):
                pass
        
        is_numeric = numeric_count > len(non_null_values) * 0.8
        
        if is_numeric:
            suggestions.append({
                "chart_type": "histogram",
                "column": column,
                "title": f"Distribution of {column}",
                "description": f"Shows frequency distribution of values in {column}",
                "priority": "high"
            })
        else:
            unique_count = len(set(str(v) for v in non_null_values))
            if unique_count <= 10:
                suggestions.append({
                    "chart_type": "bar",
                    "column": column,
                    "title": f"Count by {column}",
                    "description": f"Shows frequency of each category in {column}",
                    "priority": "high" if unique_count <= 5 else "medium"
                })
    
    print(f"   🎯 Generated {len(suggestions)} chart suggestions")
    print(f"\n   📋 Recommended visualizations:")
    
    for i, suggestion in enumerate(suggestions[:5], 1):
        priority_icon = "🔥" if suggestion["priority"] == "high" else "⭐"
        print(f"      {i}. {priority_icon} {suggestion['title']}")
        print(f"         Type: {suggestion['chart_type']}, Column: {suggestion['column']}")
        print(f"         Description: {suggestion['description']}")
    
    return suggestions


def demonstrate_export_functionality(charts_and_dashboards):
    """Demonstrate export functionality."""
    print("\n=== Export Functionality Demo ===\n")
    
    visualizer = DataVisualizer()
    
    # Export individual chart
    if charts_and_dashboards:
        first_chart = charts_and_dashboards[0]
        
        print("📤 Exporting chart configuration...")
        chart_json = visualizer.export_chart_config(first_chart, "json")
        
        print(f"   ✅ Chart exported to JSON")
        print(f"   📊 Export size: {len(chart_json):,} characters")
        
        # Show sample of exported data
        chart_dict = json.loads(chart_json)
        print(f"   📋 Chart type: {chart_dict['chart_type']}")
        print(f"   📈 Data points: {len(chart_dict['data'])}")
        print(f"   🏷️  Title: {chart_dict['title']}")
        
        return chart_json
    
    return None


def main():
    """Main demonstration function."""
    print("🚀 Sprint Lens SDK - Data Visualization Demo")
    print("=" * 60)
    print()
    
    try:
        # Create sample data
        sales_data = create_sample_sales_data()
        
        # Store charts for export demo
        all_charts = []
        
        # Run all demonstrations
        hist, box, quick_hist = demonstrate_distribution_charts(sales_data)
        all_charts.extend([hist, box, quick_hist])
        
        bar, pie, donut, quick_pie = demonstrate_categorical_charts(sales_data)
        all_charts.extend([bar, pie, donut, quick_pie])
        
        heatmap = demonstrate_correlation_analysis(sales_data)
        all_charts.append(heatmap)
        
        trend_line, scatter, multi = demonstrate_trend_charts(sales_data)
        all_charts.extend([trend_line, scatter, multi])
        
        quality_dashboard, profile = demonstrate_data_quality_dashboard(sales_data)
        
        overview_dashboard = demonstrate_overview_dashboard(sales_data)
        
        suggestions = demonstrate_chart_suggestions(sales_data)
        
        exported_config = demonstrate_export_functionality(all_charts)
        
        print("\n✅ Data visualization demonstration completed successfully!")
        
        # Summary
        print("\n📊 Demo Summary:")
        print(f"   📈 Individual charts created: {len(all_charts)}")
        print(f"   🏗️  Dashboards created: 2 (Quality + Overview)")
        print(f"   🧠 Chart suggestions generated: {len(suggestions)}")
        print(f"   📤 Export configurations: 1")
        
        print("\n📝 Key Features Demonstrated:")
        print("   • Distribution analysis (histograms, box plots)")
        print("   • Categorical data visualization (bar, pie, donut charts)")
        print("   • Correlation analysis with heatmaps")
        print("   • Trend analysis and time series visualization")
        print("   • Multi-series chart support")
        print("   • Comprehensive data quality dashboards")
        print("   • Intelligent chart suggestion system")
        print("   • Export functionality for chart configurations")
        print("   • Automatic data type detection and handling")
        
        print("\n🎯 Use Cases:")
        print("   • Sales performance analysis and reporting")
        print("   • Data quality assessment and monitoring")
        print("   • Business intelligence dashboards")
        print("   • Statistical analysis and exploration")
        print("   • Customer behavior analytics")
        print("   • Automated reporting and visualization")
        
        print("\n🔧 Technical Capabilities:")
        print("   • Framework-agnostic chart configurations")
        print("   • JSON export for frontend integration")
        print("   • Responsive dashboard layouts")
        print("   • Statistical computations (correlations, quartiles)")
        print("   • Error handling and graceful degradation")
        print("   • Configurable chart parameters and styling")
        
        # Show sample export preview
        if exported_config:
            print(f"\n📋 Sample Export Preview (first 200 chars):")
            print(f"   {exported_config[:200]}...")
        
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()