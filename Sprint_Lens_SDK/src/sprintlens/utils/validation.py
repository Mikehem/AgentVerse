"""
Validation utilities for Sprint Lens SDK.
"""

import re
from typing import Dict, Any


def validate_trace_name(name: str) -> bool:
    """
    Validate trace name format.
    
    Args:
        name: Trace name to validate
        
    Returns:
        True if valid
    """
    if not name or not isinstance(name, str):
        return False
    
    # Check length
    if len(name) > 255:
        return False
    
    # Check for invalid characters (basic validation)
    if not re.match(r'^[a-zA-Z0-9_\-\s\.]+$', name):
        return False
    
    return True


def validate_span_name(name: str) -> bool:
    """
    Validate span name format.
    
    Args:
        name: Span name to validate
        
    Returns:
        True if valid
    """
    return validate_trace_name(name)  # Same validation rules


def sanitize_tags(tags: Dict[str, Any]) -> Dict[str, str]:
    """
    Sanitize tags dictionary to ensure all values are strings.
    
    Args:
        tags: Dictionary of tags
        
    Returns:
        Dictionary with string values only
    """
    sanitized = {}
    
    for key, value in tags.items():
        # Ensure key is string
        key_str = str(key)
        
        # Ensure value is string and not too long
        if isinstance(value, str):
            value_str = value
        else:
            value_str = str(value)
        
        # Truncate if too long
        if len(value_str) > 255:
            value_str = value_str[:252] + "..."
        
        sanitized[key_str] = value_str
    
    return sanitized