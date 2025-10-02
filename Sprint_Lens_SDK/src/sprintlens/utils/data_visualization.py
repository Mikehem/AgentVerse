"""
Data Visualization Components - Sprint Lens SDK

This module provides comprehensive data visualization capabilities for datasets including:
- Statistical charts and graphs
- Data distribution visualizations
- Data quality dashboards
- Interactive plotting utilities
- Export capabilities for reports

Example usage:
    >>> from sprintlens.utils.data_visualization import DataVisualizer
    >>> 
    >>> # Initialize visualizer
    >>> visualizer = DataVisualizer()
    >>> 
    >>> # Create distribution plots
    >>> chart_data = visualizer.create_distribution_chart(data, column="age")
    >>> 
    >>> # Generate data quality dashboard
    >>> dashboard = visualizer.create_data_quality_dashboard(profile_result)
"""

import json
import statistics
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class ChartData:
    """Represents chart data in a format suitable for frontend visualization."""
    chart_type: str
    title: str
    data: List[Dict[str, Any]]
    config: Dict[str, Any]
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return asdict(self)


@dataclass
class DashboardLayout:
    """Represents a dashboard layout with multiple charts."""
    title: str
    description: str
    charts: List[ChartData]
    layout_config: Dict[str, Any]
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        result = asdict(self)
        result['created_at'] = self.created_at.isoformat()
        result['charts'] = [chart.to_dict() for chart in self.charts]
        return result


class DataVisualizer:
    """
    Creates visualizations for dataset analysis and profiling.
    
    Provides methods to generate various types of charts and dashboards
    for data analysis, quality assessment, and reporting.
    """
    
    def __init__(self):
        """Initialize the data visualizer."""
        self.supported_chart_types = {
            'bar', 'line', 'pie', 'histogram', 'scatter', 'box',
            'heatmap', 'area', 'donut', 'gauge', 'treemap'
        }
    
    def create_distribution_chart(
        self,
        data: List[Dict[str, Any]],
        column: str,
        chart_type: str = "histogram",
        bins: int = 20,
        title: Optional[str] = None
    ) -> ChartData:
        """
        Create a distribution chart for a numeric column.
        
        Args:
            data: Dataset records
            column: Column name to analyze
            chart_type: Type of chart ('histogram', 'box', 'bar')
            bins: Number of bins for histogram
            title: Custom chart title
            
        Returns:
            ChartData: Chart configuration and data
        """
        if not data:
            raise ValueError("Data cannot be empty")
        
        if column not in data[0]:
            raise ValueError(f"Column '{column}' not found in data")
        
        # Extract values for the column
        values = []
        for record in data:
            value = record.get(column)
            if value is not None:
                try:
                    values.append(float(value))
                except (ValueError, TypeError):
                    continue
        
        if not values:
            raise ValueError(f"No numeric values found in column '{column}'")
        
        chart_title = title or f"Distribution of {column}"
        
        if chart_type == "histogram":
            return self._create_histogram(values, column, bins, chart_title)
        elif chart_type == "box":
            return self._create_box_plot(values, column, chart_title)
        elif chart_type == "bar":
            return self._create_value_frequency_chart(values, column, chart_title)
        else:
            raise ValueError(f"Unsupported chart type for distribution: {chart_type}")
    
    def create_categorical_chart(
        self,
        data: List[Dict[str, Any]],
        column: str,
        chart_type: str = "bar",
        max_categories: int = 20,
        title: Optional[str] = None
    ) -> ChartData:
        """
        Create a chart for categorical data.
        
        Args:
            data: Dataset records
            column: Column name to analyze
            chart_type: Type of chart ('bar', 'pie', 'donut')
            max_categories: Maximum categories to show
            title: Custom chart title
            
        Returns:
            ChartData: Chart configuration and data
        """
        if not data:
            raise ValueError("Data cannot be empty")
        
        if column not in data[0]:
            raise ValueError(f"Column '{column}' not found in data")
        
        # Count frequency of each category
        category_counts = {}
        for record in data:
            value = record.get(column)
            if value is not None:
                value_str = str(value)
                category_counts[value_str] = category_counts.get(value_str, 0) + 1
        
        if not category_counts:
            raise ValueError(f"No values found in column '{column}'")
        
        # Sort by frequency and limit
        sorted_categories = sorted(
            category_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:max_categories]
        
        chart_title = title or f"Distribution of {column}"
        
        if chart_type == "bar":
            return self._create_category_bar_chart(sorted_categories, column, chart_title)
        elif chart_type == "pie":
            return self._create_pie_chart(sorted_categories, column, chart_title)
        elif chart_type == "donut":
            return self._create_donut_chart(sorted_categories, column, chart_title)
        else:
            raise ValueError(f"Unsupported chart type for categorical data: {chart_type}")
    
    def create_correlation_heatmap(
        self,
        data: List[Dict[str, Any]],
        numeric_columns: Optional[List[str]] = None,
        title: Optional[str] = None
    ) -> ChartData:
        """
        Create a correlation heatmap for numeric columns.
        
        Args:
            data: Dataset records
            numeric_columns: Columns to include (auto-detect if None)
            title: Custom chart title
            
        Returns:
            ChartData: Heatmap chart configuration
        """
        if not data:
            raise ValueError("Data cannot be empty")
        
        # Auto-detect numeric columns if not provided
        if numeric_columns is None:
            numeric_columns = self._detect_numeric_columns(data)
        
        if len(numeric_columns) < 2:
            raise ValueError("Need at least 2 numeric columns for correlation")
        
        # Extract numeric data
        numeric_data = {}
        for col in numeric_columns:
            values = []
            for record in data:
                value = record.get(col)
                if value is not None:
                    try:
                        values.append(float(value))
                    except (ValueError, TypeError):
                        values.append(None)
                else:
                    values.append(None)
            numeric_data[col] = values
        
        # Calculate correlation matrix
        correlation_matrix = self._calculate_correlation_matrix(numeric_data)
        
        chart_title = title or "Correlation Heatmap"
        
        return ChartData(
            chart_type="heatmap",
            title=chart_title,
            data=[
                {
                    "x": col1,
                    "y": col2,
                    "value": correlation_matrix.get(col1, {}).get(col2, 0)
                }
                for col1 in numeric_columns
                for col2 in numeric_columns
            ],
            config={
                "xAxis": {"categories": numeric_columns},
                "yAxis": {"categories": numeric_columns},
                "colorScale": {
                    "min": -1,
                    "max": 1,
                    "colors": ["#d73027", "#ffffff", "#1a9850"]
                }
            },
            metadata={
                "columns": numeric_columns,
                "records_analyzed": len(data)
            }
        )
    
    def create_data_quality_dashboard(
        self,
        profile_result: Dict[str, Any],
        title: str = "Data Quality Dashboard"
    ) -> DashboardLayout:
        """
        Create a comprehensive data quality dashboard.
        
        Args:
            profile_result: Data profiling results
            title: Dashboard title
            
        Returns:
            DashboardLayout: Complete dashboard with multiple charts
        """
        charts = []
        
        # 1. Missing values chart
        missing_chart = self._create_missing_values_chart(profile_result)
        if missing_chart:
            charts.append(missing_chart)
        
        # 2. Data types distribution
        types_chart = self._create_data_types_chart(profile_result)
        if types_chart:
            charts.append(types_chart)
        
        # 3. Data quality scores
        quality_chart = self._create_quality_scores_chart(profile_result)
        if quality_chart:
            charts.append(quality_chart)
        
        # 4. Column completeness
        completeness_chart = self._create_completeness_chart(profile_result)
        if completeness_chart:
            charts.append(completeness_chart)
        
        # 5. Outliers summary
        outliers_chart = self._create_outliers_chart(profile_result)
        if outliers_chart:
            charts.append(outliers_chart)
        
        return DashboardLayout(
            title=title,
            description="Comprehensive analysis of data quality metrics",
            charts=charts,
            layout_config={
                "grid": {"rows": 3, "cols": 2},
                "responsive": True,
                "export_enabled": True
            },
            created_at=datetime.now()
        )
    
    def create_trend_chart(
        self,
        data: List[Dict[str, Any]],
        x_column: str,
        y_column: str,
        chart_type: str = "line",
        title: Optional[str] = None
    ) -> ChartData:
        """
        Create a trend chart showing relationship between two variables.
        
        Args:
            data: Dataset records
            x_column: X-axis column
            y_column: Y-axis column
            chart_type: Chart type ('line', 'scatter', 'area')
            title: Custom chart title
            
        Returns:
            ChartData: Trend chart configuration
        """
        if not data:
            raise ValueError("Data cannot be empty")
        
        # Extract and sort data points
        points = []
        for record in data:
            x_val = record.get(x_column)
            y_val = record.get(y_column)
            
            if x_val is not None and y_val is not None:
                try:
                    points.append({
                        "x": self._convert_to_chart_value(x_val),
                        "y": float(y_val)
                    })
                except (ValueError, TypeError):
                    continue
        
        if not points:
            raise ValueError(f"No valid data points found for {x_column} vs {y_column}")
        
        # Sort by x value
        points.sort(key=lambda p: p["x"])
        
        chart_title = title or f"{y_column} vs {x_column}"
        
        return ChartData(
            chart_type=chart_type,
            title=chart_title,
            data=points,
            config={
                "xAxis": {"title": x_column},
                "yAxis": {"title": y_column},
                "smooth": chart_type == "line",
                "showPoints": chart_type == "scatter"
            },
            metadata={
                "x_column": x_column,
                "y_column": y_column,
                "data_points": len(points)
            }
        )
    
    def create_multi_series_chart(
        self,
        data: List[Dict[str, Any]],
        x_column: str,
        y_columns: List[str],
        chart_type: str = "line",
        title: Optional[str] = None
    ) -> ChartData:
        """
        Create a chart with multiple data series.
        
        Args:
            data: Dataset records
            x_column: X-axis column
            y_columns: List of Y-axis columns
            chart_type: Chart type ('line', 'bar', 'area')
            title: Custom chart title
            
        Returns:
            ChartData: Multi-series chart configuration
        """
        if not data or not y_columns:
            raise ValueError("Data and y_columns cannot be empty")
        
        # Organize data by series
        series_data = {col: [] for col in y_columns}
        x_values = []
        
        for record in data:
            x_val = record.get(x_column)
            if x_val is not None:
                x_chart_val = self._convert_to_chart_value(x_val)
                x_values.append(x_chart_val)
                
                for y_col in y_columns:
                    y_val = record.get(y_col)
                    try:
                        series_data[y_col].append({
                            "x": x_chart_val,
                            "y": float(y_val) if y_val is not None else None
                        })
                    except (ValueError, TypeError):
                        series_data[y_col].append({
                            "x": x_chart_val,
                            "y": None
                        })
        
        # Format for chart library
        formatted_series = []
        for col, points in series_data.items():
            formatted_series.append({
                "name": col,
                "data": points
            })
        
        chart_title = title or f"Multi-Series: {', '.join(y_columns)} vs {x_column}"
        
        return ChartData(
            chart_type=chart_type,
            title=chart_title,
            data=formatted_series,
            config={
                "xAxis": {"title": x_column},
                "yAxis": {"title": "Values"},
                "legend": {"enabled": True},
                "series": len(y_columns)
            },
            metadata={
                "x_column": x_column,
                "y_columns": y_columns,
                "series_count": len(y_columns)
            }
        )
    
    def export_chart_config(
        self,
        chart: ChartData,
        format_type: str = "json"
    ) -> Union[str, Dict[str, Any]]:
        """
        Export chart configuration for external use.
        
        Args:
            chart: Chart data to export
            format_type: Export format ('json', 'dict')
            
        Returns:
            Exported chart configuration
        """
        chart_dict = chart.to_dict()
        
        if format_type == "json":
            return json.dumps(chart_dict, indent=2)
        elif format_type == "dict":
            return chart_dict
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    def export_dashboard_config(
        self,
        dashboard: DashboardLayout,
        format_type: str = "json"
    ) -> Union[str, Dict[str, Any]]:
        """
        Export dashboard configuration for external use.
        
        Args:
            dashboard: Dashboard to export
            format_type: Export format ('json', 'dict')
            
        Returns:
            Exported dashboard configuration
        """
        dashboard_dict = dashboard.to_dict()
        
        if format_type == "json":
            return json.dumps(dashboard_dict, indent=2)
        elif format_type == "dict":
            return dashboard_dict
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    # Private helper methods
    
    def _create_histogram(
        self,
        values: List[float],
        column: str,
        bins: int,
        title: str
    ) -> ChartData:
        """Create histogram chart data."""
        if not values:
            raise ValueError("No values provided for histogram")
        
        min_val = min(values)
        max_val = max(values)
        bin_width = (max_val - min_val) / bins
        
        # Create bins
        bin_counts = [0] * bins
        bin_labels = []
        
        for i in range(bins):
            bin_start = min_val + i * bin_width
            bin_end = min_val + (i + 1) * bin_width
            bin_labels.append(f"{bin_start:.2f}-{bin_end:.2f}")
        
        # Count values in each bin
        for value in values:
            bin_index = min(int((value - min_val) / bin_width), bins - 1)
            bin_counts[bin_index] += 1
        
        return ChartData(
            chart_type="histogram",
            title=title,
            data=[
                {"x": label, "y": count}
                for label, count in zip(bin_labels, bin_counts)
            ],
            config={
                "xAxis": {"title": column, "type": "category"},
                "yAxis": {"title": "Frequency"},
                "bins": bins
            },
            metadata={
                "column": column,
                "total_values": len(values),
                "min": min_val,
                "max": max_val,
                "mean": statistics.mean(values),
                "std": statistics.stdev(values) if len(values) > 1 else 0
            }
        )
    
    def _create_box_plot(
        self,
        values: List[float],
        column: str,
        title: str
    ) -> ChartData:
        """Create box plot chart data."""
        if len(values) < 5:
            raise ValueError("Need at least 5 values for box plot")
        
        sorted_values = sorted(values)
        n = len(sorted_values)
        
        # Calculate quartiles
        q1_index = n // 4
        q2_index = n // 2
        q3_index = 3 * n // 4
        
        q1 = sorted_values[q1_index]
        q2 = sorted_values[q2_index]  # median
        q3 = sorted_values[q3_index]
        
        iqr = q3 - q1
        lower_fence = q1 - 1.5 * iqr
        upper_fence = q3 + 1.5 * iqr
        
        # Find whiskers
        lower_whisker = min([v for v in sorted_values if v >= lower_fence])
        upper_whisker = max([v for v in sorted_values if v <= upper_fence])
        
        # Find outliers
        outliers = [v for v in values if v < lower_fence or v > upper_fence]
        
        return ChartData(
            chart_type="box",
            title=title,
            data=[{
                "name": column,
                "min": lower_whisker,
                "q1": q1,
                "median": q2,
                "q3": q3,
                "max": upper_whisker,
                "outliers": outliers
            }],
            config={
                "yAxis": {"title": column},
                "showOutliers": True
            },
            metadata={
                "column": column,
                "total_values": len(values),
                "outliers_count": len(outliers),
                "iqr": iqr
            }
        )
    
    def _create_value_frequency_chart(
        self,
        values: List[float],
        column: str,
        title: str
    ) -> ChartData:
        """Create frequency chart for numeric values."""
        # Round values and count frequency
        rounded_values = [round(v, 2) for v in values]
        frequency = {}
        for val in rounded_values:
            frequency[val] = frequency.get(val, 0) + 1
        
        # Sort by value
        sorted_items = sorted(frequency.items())
        
        return ChartData(
            chart_type="bar",
            title=title,
            data=[
                {"x": str(val), "y": count}
                for val, count in sorted_items
            ],
            config={
                "xAxis": {"title": column, "type": "category"},
                "yAxis": {"title": "Frequency"}
            },
            metadata={
                "column": column,
                "unique_values": len(frequency),
                "total_values": len(values)
            }
        )
    
    def _create_category_bar_chart(
        self,
        categories: List[Tuple[str, int]],
        column: str,
        title: str
    ) -> ChartData:
        """Create bar chart for categorical data."""
        return ChartData(
            chart_type="bar",
            title=title,
            data=[
                {"x": category, "y": count}
                for category, count in categories
            ],
            config={
                "xAxis": {"title": column, "type": "category"},
                "yAxis": {"title": "Count"}
            },
            metadata={
                "column": column,
                "categories_shown": len(categories),
                "total_count": sum(count for _, count in categories)
            }
        )
    
    def _create_pie_chart(
        self,
        categories: List[Tuple[str, int]],
        column: str,
        title: str
    ) -> ChartData:
        """Create pie chart for categorical data."""
        total = sum(count for _, count in categories)
        
        return ChartData(
            chart_type="pie",
            title=title,
            data=[
                {
                    "name": category,
                    "value": count,
                    "percentage": round(100 * count / total, 1)
                }
                for category, count in categories
            ],
            config={
                "showLabels": True,
                "showPercentages": True
            },
            metadata={
                "column": column,
                "categories_shown": len(categories),
                "total_count": total
            }
        )
    
    def _create_donut_chart(
        self,
        categories: List[Tuple[str, int]],
        column: str,
        title: str
    ) -> ChartData:
        """Create donut chart for categorical data."""
        chart_data = self._create_pie_chart(categories, column, title)
        chart_data.chart_type = "donut"
        chart_data.config["innerRadius"] = 0.5
        return chart_data
    
    def _create_missing_values_chart(
        self,
        profile_result: Dict[str, Any]
    ) -> Optional[ChartData]:
        """Create chart showing missing values by column."""
        field_profiles = profile_result.get("field_profiles", {})
        
        if not field_profiles:
            return None
        
        missing_data = []
        for field_name, profile in field_profiles.items():
            missing_count = profile.get("missing_count", 0)
            total_count = profile.get("total_count", 1)
            missing_percentage = (missing_count / total_count) * 100
            
            missing_data.append({
                "x": field_name,
                "y": missing_percentage,
                "count": missing_count,
                "total": total_count
            })
        
        # Sort by missing percentage
        missing_data.sort(key=lambda x: x["y"], reverse=True)
        
        return ChartData(
            chart_type="bar",
            title="Missing Values by Column",
            data=missing_data,
            config={
                "xAxis": {"title": "Columns", "type": "category"},
                "yAxis": {"title": "Missing %", "max": 100},
                "color": "#ff6b6b"
            },
            metadata={
                "total_columns": len(missing_data),
                "avg_missing_rate": sum(d["y"] for d in missing_data) / len(missing_data)
            }
        )
    
    def _create_data_types_chart(
        self,
        profile_result: Dict[str, Any]
    ) -> Optional[ChartData]:
        """Create chart showing distribution of data types."""
        field_profiles = profile_result.get("field_profiles", {})
        
        if not field_profiles:
            return None
        
        type_counts = {}
        for profile in field_profiles.values():
            data_type = profile.get("data_type", "unknown")
            type_counts[data_type] = type_counts.get(data_type, 0) + 1
        
        return ChartData(
            chart_type="pie",
            title="Data Types Distribution",
            data=[
                {"name": data_type, "value": count}
                for data_type, count in type_counts.items()
            ],
            config={
                "showLabels": True,
                "showPercentages": True
            },
            metadata={
                "total_columns": sum(type_counts.values()),
                "unique_types": len(type_counts)
            }
        )
    
    def _create_quality_scores_chart(
        self,
        profile_result: Dict[str, Any]
    ) -> Optional[ChartData]:
        """Create chart showing data quality scores."""
        quality_metrics = profile_result.get("quality_metrics", {})
        
        if not quality_metrics:
            return None
        
        scores = [
            {"name": "Completeness", "value": quality_metrics.get("completeness_score", 0)},
            {"name": "Validity", "value": quality_metrics.get("validity_score", 0)},
            {"name": "Consistency", "value": quality_metrics.get("consistency_score", 0)},
            {"name": "Uniqueness", "value": quality_metrics.get("uniqueness_score", 0)}
        ]
        
        return ChartData(
            chart_type="gauge",
            title="Data Quality Scores",
            data=scores,
            config={
                "min": 0,
                "max": 100,
                "thresholds": [
                    {"value": 50, "color": "#ff6b6b"},
                    {"value": 75, "color": "#ffa726"},
                    {"value": 90, "color": "#66bb6a"}
                ]
            },
            metadata={
                "overall_score": sum(s["value"] for s in scores) / len(scores)
            }
        )
    
    def _create_completeness_chart(
        self,
        profile_result: Dict[str, Any]
    ) -> Optional[ChartData]:
        """Create chart showing column completeness."""
        field_profiles = profile_result.get("field_profiles", {})
        
        if not field_profiles:
            return None
        
        completeness_data = []
        for field_name, profile in field_profiles.items():
            missing_count = profile.get("missing_count", 0)
            total_count = profile.get("total_count", 1)
            completeness = ((total_count - missing_count) / total_count) * 100
            
            completeness_data.append({
                "x": field_name,
                "y": completeness
            })
        
        # Sort by completeness
        completeness_data.sort(key=lambda x: x["y"])
        
        return ChartData(
            chart_type="bar",
            title="Column Completeness",
            data=completeness_data,
            config={
                "xAxis": {"title": "Columns", "type": "category"},
                "yAxis": {"title": "Completeness %", "min": 0, "max": 100},
                "color": "#4caf50"
            },
            metadata={
                "total_columns": len(completeness_data),
                "avg_completeness": sum(d["y"] for d in completeness_data) / len(completeness_data)
            }
        )
    
    def _create_outliers_chart(
        self,
        profile_result: Dict[str, Any]
    ) -> Optional[ChartData]:
        """Create chart showing outliers by column."""
        field_profiles = profile_result.get("field_profiles", {})
        
        if not field_profiles:
            return None
        
        outlier_data = []
        for field_name, profile in field_profiles.items():
            if profile.get("data_type") in ["integer", "float", "numeric"]:
                outlier_count = profile.get("outlier_count", 0)
                total_count = profile.get("total_count", 1)
                outlier_percentage = (outlier_count / total_count) * 100
                
                outlier_data.append({
                    "x": field_name,
                    "y": outlier_percentage,
                    "count": outlier_count
                })
        
        if not outlier_data:
            return None
        
        # Sort by outlier percentage
        outlier_data.sort(key=lambda x: x["y"], reverse=True)
        
        return ChartData(
            chart_type="bar",
            title="Outliers by Numeric Column",
            data=outlier_data,
            config={
                "xAxis": {"title": "Columns", "type": "category"},
                "yAxis": {"title": "Outliers %"},
                "color": "#ff9800"
            },
            metadata={
                "numeric_columns": len(outlier_data),
                "avg_outlier_rate": sum(d["y"] for d in outlier_data) / len(outlier_data) if outlier_data else 0
            }
        )
    
    def _detect_numeric_columns(self, data: List[Dict[str, Any]]) -> List[str]:
        """Detect numeric columns in the dataset."""
        if not data:
            return []
        
        numeric_columns = []
        sample_record = data[0]
        
        for column in sample_record.keys():
            # Check a sample of values
            sample_size = min(10, len(data))
            numeric_count = 0
            
            for i in range(sample_size):
                value = data[i].get(column)
                if value is not None:
                    try:
                        float(value)
                        numeric_count += 1
                    except (ValueError, TypeError):
                        pass
            
            # If most values are numeric, consider it a numeric column
            if numeric_count > sample_size * 0.8:
                numeric_columns.append(column)
        
        return numeric_columns
    
    def _calculate_correlation_matrix(
        self,
        numeric_data: Dict[str, List[Optional[float]]]
    ) -> Dict[str, Dict[str, float]]:
        """Calculate correlation matrix for numeric columns."""
        columns = list(numeric_data.keys())
        correlation_matrix = {}
        
        for col1 in columns:
            correlation_matrix[col1] = {}
            for col2 in columns:
                if col1 == col2:
                    correlation_matrix[col1][col2] = 1.0
                else:
                    # Calculate Pearson correlation
                    correlation = self._calculate_correlation(
                        numeric_data[col1],
                        numeric_data[col2]
                    )
                    correlation_matrix[col1][col2] = correlation
        
        return correlation_matrix
    
    def _calculate_correlation(
        self,
        x_values: List[Optional[float]],
        y_values: List[Optional[float]]
    ) -> float:
        """Calculate Pearson correlation coefficient."""
        # Filter out None values
        valid_pairs = [
            (x, y) for x, y in zip(x_values, y_values)
            if x is not None and y is not None
        ]
        
        if len(valid_pairs) < 2:
            return 0.0
        
        x_vals = [pair[0] for pair in valid_pairs]
        y_vals = [pair[1] for pair in valid_pairs]
        
        n = len(x_vals)
        x_mean = sum(x_vals) / n
        y_mean = sum(y_vals) / n
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals))
        x_var = sum((x - x_mean) ** 2 for x in x_vals)
        y_var = sum((y - y_mean) ** 2 for y in y_vals)
        
        denominator = (x_var * y_var) ** 0.5
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator
    
    def _convert_to_chart_value(self, value: Any) -> Union[float, str]:
        """Convert value to chart-compatible format."""
        if isinstance(value, (int, float)):
            return float(value)
        elif isinstance(value, str):
            # Try to parse as number first
            try:
                return float(value)
            except ValueError:
                return value
        else:
            return str(value)


# Utility functions for common visualization tasks

def create_quick_histogram(
    data: List[Dict[str, Any]],
    column: str,
    title: Optional[str] = None
) -> ChartData:
    """
    Quick utility to create a histogram.
    
    Args:
        data: Dataset records
        column: Column to visualize
        title: Chart title
        
    Returns:
        ChartData: Histogram chart
    """
    visualizer = DataVisualizer()
    return visualizer.create_distribution_chart(data, column, "histogram", title=title)


def create_quick_pie_chart(
    data: List[Dict[str, Any]],
    column: str,
    title: Optional[str] = None
) -> ChartData:
    """
    Quick utility to create a pie chart.
    
    Args:
        data: Dataset records
        column: Column to visualize
        title: Chart title
        
    Returns:
        ChartData: Pie chart
    """
    visualizer = DataVisualizer()
    return visualizer.create_categorical_chart(data, column, "pie", title=title)


def create_dashboard_from_profile(
    profile_result: Dict[str, Any],
    title: str = "Dataset Analysis Dashboard"
) -> DashboardLayout:
    """
    Quick utility to create a dashboard from profiling results.
    
    Args:
        profile_result: Data profiling results
        title: Dashboard title
        
    Returns:
        DashboardLayout: Complete dashboard
    """
    visualizer = DataVisualizer()
    return visualizer.create_data_quality_dashboard(profile_result, title)