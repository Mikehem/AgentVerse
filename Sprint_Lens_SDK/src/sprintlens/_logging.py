"""
Logging configuration for Sprint Lens SDK.

This module provides structured logging setup with enterprise-grade
logging practices and security considerations.
"""

import logging
import logging.config
import sys
from typing import Dict, Any, Optional

import structlog

from .core.constants import ENV_DEBUG, ENV_PREFIX


def setup() -> None:
    """Set up logging configuration for Sprint Lens SDK."""
    # Configure standard library logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout
    )
    
    # Configure structlog for structured logging
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Set SDK logger to appropriate level
    sdk_logger = logging.getLogger("sprintlens")
    
    # Check if debug mode is enabled
    import os
    debug_enabled = os.getenv(ENV_DEBUG, "").lower() in ("true", "1", "yes", "on")
    
    if debug_enabled:
        sdk_logger.setLevel(logging.DEBUG)
    else:
        sdk_logger.setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for the given name."""
    return logging.getLogger(f"sprintlens.{name}")


def configure_logging(config: Dict[str, Any]) -> None:
    """Configure logging with custom configuration."""
    logging.config.dictConfig(config)