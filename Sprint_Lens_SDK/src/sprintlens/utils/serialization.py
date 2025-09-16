"""
Serialization utilities for Sprint Lens SDK.
"""

import json
import sys
from typing import Any, Dict


def serialize_safely(data: Any, max_size: int = 1024 * 1024) -> Any:
    """
    Safely serialize data, truncating if too large.
    
    Args:
        data: Data to serialize
        max_size: Maximum size in bytes
        
    Returns:
        Serializable data
    """
    try:
        # Try to serialize as-is first
        serialized = json.dumps(data)
        
        if len(serialized.encode()) <= max_size:
            return json.loads(serialized)
        
        # If too large, try to truncate
        if isinstance(data, str):
            # For strings, truncate directly
            max_chars = max_size // 4  # Rough estimate for UTF-8
            return data[:max_chars] + "... [truncated]"
        
        elif isinstance(data, (list, tuple)):
            # For sequences, truncate items
            truncated = []
            size = 0
            for item in data:
                item_serialized = json.dumps(item)
                item_size = len(item_serialized.encode())
                
                if size + item_size > max_size:
                    truncated.append("... [truncated]")
                    break
                
                truncated.append(item)
                size += item_size
            
            return truncated
        
        elif isinstance(data, dict):
            # For dictionaries, truncate entries
            truncated = {}
            size = 0
            
            for key, value in data.items():
                item_serialized = json.dumps({key: value})
                item_size = len(item_serialized.encode())
                
                if size + item_size > max_size:
                    truncated["..."] = "[truncated]"
                    break
                
                truncated[key] = value
                size += item_size
            
            return truncated
        
        else:
            # For other types, convert to string and truncate
            str_repr = str(data)
            if len(str_repr.encode()) <= max_size:
                return str_repr
            
            max_chars = max_size // 4
            return str_repr[:max_chars] + "... [truncated]"
    
    except Exception:
        # If all else fails, return a safe representation
        return f"<{type(data).__name__}: serialization failed>"


def calculate_size(data: Any) -> int:
    """
    Calculate the size of serialized data in bytes.
    
    Args:
        data: Data to measure
        
    Returns:
        Size in bytes
    """
    try:
        serialized = json.dumps(data)
        return len(serialized.encode('utf-8'))
    except Exception:
        # Fallback to system size
        return sys.getsizeof(data)