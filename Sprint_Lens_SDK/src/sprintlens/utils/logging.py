"""
Logging utilities for Sprint Lens SDK.
"""

import logging
import sys
from typing import Optional

# Configure basic logging for SDK
_SDK_LOGGER_CONFIGURED = False

def setup_logging(level: str = "INFO", format_string: Optional[str] = None) -> None:
    """
    Setup logging for Sprint Lens SDK.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        format_string: Custom format string
    """
    global _SDK_LOGGER_CONFIGURED
    
    if _SDK_LOGGER_CONFIGURED:
        return
    
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Only configure if not already configured
    if not logging.getLogger().handlers:
        logging.basicConfig(
            level=getattr(logging, level.upper()),
            format=format_string,
            stream=sys.stdout
        )
    
    _SDK_LOGGER_CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for the given name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    # Ensure basic setup
    if not _SDK_LOGGER_CONFIGURED:
        setup_logging()
    
    return logging.getLogger(name)