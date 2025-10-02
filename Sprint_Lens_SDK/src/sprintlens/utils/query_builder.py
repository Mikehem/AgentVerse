"""
Advanced Query Builder for Sprint Lens SDK

This module provides a sophisticated query builder for advanced search and filtering
capabilities on datasets. It supports complex queries with multiple operators,
logical combinations, and flexible data access patterns.

Features:
- SQL-like query syntax for datasets
- Complex filtering with AND/OR logic
- Range queries, text search, and pattern matching
- Type-safe operations with validation
- Integration with both local and remote datasets
- Query optimization and caching
"""

import re
import operator
from typing import Dict, List, Any, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Optional pandas dependency
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False


class QueryOperator(Enum):
    """Supported query operators."""
    
    # Comparison operators
    EQUALS = "eq"
    NOT_EQUALS = "ne"
    GREATER_THAN = "gt"
    GREATER_EQUAL = "gte"
    LESS_THAN = "lt"
    LESS_EQUAL = "lte"
    
    # String operators
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    REGEX = "regex"
    ICONTAINS = "icontains"  # Case-insensitive contains
    
    # Collection operators
    IN = "in"
    NOT_IN = "not_in"
    
    # Null/existence operators
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"
    
    # Range operators
    BETWEEN = "between"
    NOT_BETWEEN = "not_between"


class LogicalOperator(Enum):
    """Logical operators for combining conditions."""
    
    AND = "and"
    OR = "or"
    NOT = "not"


@dataclass
class QueryCondition:
    """Represents a single query condition."""
    
    field: str
    operator: QueryOperator
    value: Any
    case_sensitive: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "field": self.field,
            "operator": self.operator.value,
            "value": self.value,
            "case_sensitive": self.case_sensitive
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueryCondition":
        """Create from dictionary representation."""
        return cls(
            field=data["field"],
            operator=QueryOperator(data["operator"]),
            value=data["value"],
            case_sensitive=data.get("case_sensitive", True)
        )


@dataclass
class QueryGroup:
    """Represents a group of conditions with logical operators."""
    
    conditions: List[Union[QueryCondition, "QueryGroup"]] = field(default_factory=list)
    logical_operator: LogicalOperator = LogicalOperator.AND
    
    def add_condition(self, condition: Union[QueryCondition, "QueryGroup"]):
        """Add a condition or group to this group."""
        self.conditions.append(condition)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "conditions": [c.to_dict() for c in self.conditions],
            "logical_operator": self.logical_operator.value
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueryGroup":
        """Create from dictionary representation."""
        group = cls(logical_operator=LogicalOperator(data["logical_operator"]))
        
        for condition_data in data["conditions"]:
            if "logical_operator" in condition_data:
                # It's a nested group
                group.add_condition(cls.from_dict(condition_data))
            else:
                # It's a simple condition
                group.add_condition(QueryCondition.from_dict(condition_data))
        
        return group


@dataclass
class SortOrder:
    """Represents a sort order specification."""
    
    field: str
    ascending: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "field": self.field,
            "ascending": self.ascending
        }


@dataclass
class QueryResult:
    """Results from a query execution."""
    
    items: List[Dict[str, Any]]
    total_count: int
    filtered_count: int
    execution_time_ms: float
    query_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "items": self.items,
            "total_count": self.total_count,
            "filtered_count": self.filtered_count,
            "execution_time_ms": self.execution_time_ms,
            "query_hash": self.query_hash
        }


class QueryBuilder:
    """
    Advanced query builder for dataset filtering and search.
    
    Provides a fluent interface for building complex queries with multiple
    conditions, logical operators, and sorting options.
    """
    
    def __init__(self):
        """Initialize the query builder."""
        self.root_group = QueryGroup()
        self.sort_orders: List[SortOrder] = []
        self.limit: Optional[int] = None
        self.offset: int = 0
        
    def where(self, field: str, operator: Union[QueryOperator, str], value: Any, 
              case_sensitive: bool = True) -> "QueryBuilder":
        """
        Add a WHERE condition to the query.
        
        Args:
            field: Field name to filter on
            operator: Comparison operator
            value: Value to compare against
            case_sensitive: Whether string comparisons should be case-sensitive
            
        Returns:
            Self for method chaining
        """
        if isinstance(operator, str):
            operator = QueryOperator(operator)
        
        condition = QueryCondition(field, operator, value, case_sensitive)
        self.root_group.add_condition(condition)
        
        return self
    
    def where_group(self, logical_op: Union[LogicalOperator, str] = LogicalOperator.AND) -> "QueryGroupBuilder":
        """
        Start a new condition group for complex logical operations.
        
        Args:
            logical_op: Logical operator for combining conditions in the group
            
        Returns:
            QueryGroupBuilder for building the group
        """
        if isinstance(logical_op, str):
            logical_op = LogicalOperator(logical_op)
        
        return QueryGroupBuilder(self, logical_op)
    
    def order_by(self, field: str, ascending: bool = True) -> "QueryBuilder":
        """
        Add sorting to the query.
        
        Args:
            field: Field name to sort by
            ascending: Sort direction (True for ascending, False for descending)
            
        Returns:
            Self for method chaining
        """
        self.sort_orders.append(SortOrder(field, ascending))
        return self
    
    def limit_to(self, limit: int, offset: int = 0) -> "QueryBuilder":
        """
        Add pagination to the query.
        
        Args:
            limit: Maximum number of results to return
            offset: Number of results to skip
            
        Returns:
            Self for method chaining
        """
        self.limit = limit
        self.offset = offset
        return self
    
    def build(self) -> Dict[str, Any]:
        """
        Build the final query specification.
        
        Returns:
            Dictionary representation of the complete query
        """
        query = {
            "conditions": self.root_group.to_dict(),
            "sort_orders": [sort.to_dict() for sort in self.sort_orders],
            "limit": self.limit,
            "offset": self.offset
        }
        
        return query
    
    def to_json(self, pretty: bool = False) -> str:
        """
        Convert query to JSON string.
        
        Args:
            pretty: Whether to format JSON with indentation
            
        Returns:
            JSON string representation
        """
        query = self.build()
        indent = 2 if pretty else None
        return json.dumps(query, indent=indent)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueryBuilder":
        """
        Create QueryBuilder from dictionary specification.
        
        Args:
            data: Dictionary containing query specification
            
        Returns:
            QueryBuilder instance
        """
        builder = cls()
        
        if "conditions" in data:
            builder.root_group = QueryGroup.from_dict(data["conditions"])
        
        if "sort_orders" in data:
            builder.sort_orders = [
                SortOrder(sort["field"], sort["ascending"]) 
                for sort in data["sort_orders"]
            ]
        
        if "limit" in data:
            builder.limit = data["limit"]
        
        if "offset" in data:
            builder.offset = data["offset"]
        
        return builder
    
    @classmethod
    def from_json(cls, json_str: str) -> "QueryBuilder":
        """
        Create QueryBuilder from JSON string.
        
        Args:
            json_str: JSON string containing query specification
            
        Returns:
            QueryBuilder instance
        """
        data = json.loads(json_str)
        return cls.from_dict(data)


class QueryGroupBuilder:
    """
    Builder for creating query groups with complex logical operations.
    """
    
    def __init__(self, parent_builder: QueryBuilder, logical_op: LogicalOperator):
        """Initialize the group builder."""
        self.parent_builder = parent_builder
        self.group = QueryGroup(logical_operator=logical_op)
    
    def where(self, field: str, operator: Union[QueryOperator, str], value: Any,
              case_sensitive: bool = True) -> "QueryGroupBuilder":
        """Add a condition to this group."""
        if isinstance(operator, str):
            operator = QueryOperator(operator)
        
        condition = QueryCondition(field, operator, value, case_sensitive)
        self.group.add_condition(condition)
        
        return self
    
    def end_group(self) -> QueryBuilder:
        """Finish building this group and return to the parent builder."""
        self.parent_builder.root_group.add_condition(self.group)
        return self.parent_builder


class QueryExecutor:
    """
    Executes queries against dataset items.
    
    Provides efficient query execution with support for complex filtering,
    sorting, and pagination.
    """
    
    def __init__(self):
        """Initialize the query executor."""
        self.operator_functions = {
            QueryOperator.EQUALS: self._equals,
            QueryOperator.NOT_EQUALS: self._not_equals,
            QueryOperator.GREATER_THAN: self._greater_than,
            QueryOperator.GREATER_EQUAL: self._greater_equal,
            QueryOperator.LESS_THAN: self._less_than,
            QueryOperator.LESS_EQUAL: self._less_equal,
            QueryOperator.CONTAINS: self._contains,
            QueryOperator.NOT_CONTAINS: self._not_contains,
            QueryOperator.STARTS_WITH: self._starts_with,
            QueryOperator.ENDS_WITH: self._ends_with,
            QueryOperator.REGEX: self._regex,
            QueryOperator.ICONTAINS: self._icontains,
            QueryOperator.IN: self._in,
            QueryOperator.NOT_IN: self._not_in,
            QueryOperator.IS_NULL: self._is_null,
            QueryOperator.IS_NOT_NULL: self._is_not_null,
            QueryOperator.BETWEEN: self._between,
            QueryOperator.NOT_BETWEEN: self._not_between,
        }
    
    def execute(self, items: List[Dict[str, Any]], query: QueryBuilder) -> QueryResult:
        """
        Execute a query against a list of items.
        
        Args:
            items: List of dictionary items to query
            query: QueryBuilder instance with the query specification
            
        Returns:
            QueryResult with filtered and sorted items
        """
        start_time = datetime.now()
        
        # Apply filters
        filtered_items = self._apply_filters(items, query.root_group)
        
        # Apply sorting
        if query.sort_orders:
            filtered_items = self._apply_sorting(filtered_items, query.sort_orders)
        
        # Apply pagination
        paginated_items = filtered_items
        if query.offset > 0:
            paginated_items = paginated_items[query.offset:]
        
        if query.limit is not None:
            paginated_items = paginated_items[:query.limit]
        
        # Calculate execution time
        end_time = datetime.now()
        execution_time_ms = (end_time - start_time).total_seconds() * 1000
        
        # Generate query hash for caching
        query_hash = hash(query.to_json())
        
        result = QueryResult(
            items=paginated_items,
            total_count=len(items),
            filtered_count=len(filtered_items),
            execution_time_ms=execution_time_ms,
            query_hash=str(query_hash)
        )
        
        logger.info(f"Executed query: {len(filtered_items)}/{len(items)} items matched in {execution_time_ms:.2f}ms")
        
        return result
    
    def _apply_filters(self, items: List[Dict[str, Any]], group: QueryGroup) -> List[Dict[str, Any]]:
        """Apply filtering based on query group."""
        filtered_items = []
        
        for item in items:
            if self._evaluate_group(item, group):
                filtered_items.append(item)
        
        return filtered_items
    
    def _evaluate_group(self, item: Dict[str, Any], group: QueryGroup) -> bool:
        """Evaluate whether an item matches a query group."""
        if not group.conditions:
            return True
        
        results = []
        
        for condition in group.conditions:
            if isinstance(condition, QueryGroup):
                # Nested group
                result = self._evaluate_group(item, condition)
            else:
                # Simple condition
                result = self._evaluate_condition(item, condition)
            
            results.append(result)
        
        # Apply logical operator
        if group.logical_operator == LogicalOperator.AND:
            return all(results)
        elif group.logical_operator == LogicalOperator.OR:
            return any(results)
        elif group.logical_operator == LogicalOperator.NOT:
            return not any(results)
        
        return False
    
    def _evaluate_condition(self, item: Dict[str, Any], condition: QueryCondition) -> bool:
        """Evaluate whether an item matches a single condition."""
        field_value = self._get_nested_value(item, condition.field)
        
        operator_func = self.operator_functions.get(condition.operator)
        if not operator_func:
            logger.warning(f"Unknown operator: {condition.operator}")
            return False
        
        try:
            return operator_func(field_value, condition.value, condition.case_sensitive)
        except Exception as e:
            logger.warning(f"Error evaluating condition {condition.field} {condition.operator.value} {condition.value}: {e}")
            return False
    
    def _get_nested_value(self, item: Dict[str, Any], field_path: str) -> Any:
        """Get value from nested dictionary using dot notation."""
        value = item
        
        for part in field_path.split('.'):
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return None
        
        return value
    
    def _apply_sorting(self, items: List[Dict[str, Any]], sort_orders: List[SortOrder]) -> List[Dict[str, Any]]:
        """Apply sorting to items."""
        if not sort_orders:
            return items
        
        # Sort by each field in reverse order (last sort_order becomes primary)
        sorted_items = items.copy()
        
        for sort_order in reversed(sort_orders):
            sorted_items.sort(
                key=lambda item: self._get_nested_value(item, sort_order.field) or "",
                reverse=not sort_order.ascending
            )
        
        return sorted_items
    
    # Operator implementation methods
    def _equals(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if not case_sensitive and isinstance(field_value, str) and isinstance(target_value, str):
            return field_value.lower() == target_value.lower()
        return field_value == target_value
    
    def _not_equals(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return not self._equals(field_value, target_value, case_sensitive)
    
    def _greater_than(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        try:
            return field_value > target_value
        except TypeError:
            return str(field_value) > str(target_value)
    
    def _greater_equal(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        try:
            return field_value >= target_value
        except TypeError:
            return str(field_value) >= str(target_value)
    
    def _less_than(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        try:
            return field_value < target_value
        except TypeError:
            return str(field_value) < str(target_value)
    
    def _less_equal(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        try:
            return field_value <= target_value
        except TypeError:
            return str(field_value) <= str(target_value)
    
    def _contains(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        
        field_str = str(field_value)
        target_str = str(target_value)
        
        if not case_sensitive:
            field_str = field_str.lower()
            target_str = target_str.lower()
        
        return target_str in field_str
    
    def _not_contains(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return not self._contains(field_value, target_value, case_sensitive)
    
    def _starts_with(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        
        field_str = str(field_value)
        target_str = str(target_value)
        
        if not case_sensitive:
            field_str = field_str.lower()
            target_str = target_str.lower()
        
        return field_str.startswith(target_str)
    
    def _ends_with(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        
        field_str = str(field_value)
        target_str = str(target_value)
        
        if not case_sensitive:
            field_str = field_str.lower()
            target_str = target_str.lower()
        
        return field_str.endswith(target_str)
    
    def _regex(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None:
            return False
        
        field_str = str(field_value)
        pattern = str(target_value)
        
        flags = 0 if case_sensitive else re.IGNORECASE
        
        try:
            return bool(re.search(pattern, field_str, flags))
        except re.error:
            logger.warning(f"Invalid regex pattern: {pattern}")
            return False
    
    def _icontains(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return self._contains(field_value, target_value, False)
    
    def _in(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if not isinstance(target_value, (list, tuple, set)):
            return False
        
        if not case_sensitive and isinstance(field_value, str):
            target_lower = [str(v).lower() for v in target_value]
            return field_value.lower() in target_lower
        
        return field_value in target_value
    
    def _not_in(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return not self._in(field_value, target_value, case_sensitive)
    
    def _is_null(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return field_value is None
    
    def _is_not_null(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return field_value is not None
    
    def _between(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        if field_value is None or not isinstance(target_value, (list, tuple)) or len(target_value) != 2:
            return False
        
        min_val, max_val = target_value
        
        try:
            return min_val <= field_value <= max_val
        except TypeError:
            # Fall back to string comparison
            return str(min_val) <= str(field_value) <= str(max_val)
    
    def _not_between(self, field_value: Any, target_value: Any, case_sensitive: bool) -> bool:
        return not self._between(field_value, target_value, case_sensitive)


# Convenience functions
def query() -> QueryBuilder:
    """Create a new QueryBuilder instance."""
    return QueryBuilder()


def execute_query(items: List[Dict[str, Any]], query_builder: QueryBuilder) -> QueryResult:
    """Execute a query against a list of items."""
    executor = QueryExecutor()
    return executor.execute(items, query_builder)