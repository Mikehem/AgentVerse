"""
Debug utilities for Sprint Lens SDK integration.
"""

import logging
import json
from typing import Dict, Any, Optional
import sprintlens
from customer_support_agent.config.sprintlens_config import get_client_info

logger = logging.getLogger(__name__)

def log_trace_info(trace: sprintlens.Trace) -> None:
    """Log detailed information about a trace."""
    logger.debug(f"Trace Info:")
    logger.debug(f"  ID: {trace.id}")
    logger.debug(f"  Name: {trace.name}")
    logger.debug(f"  Start Time: {trace.start_time}")
    logger.debug(f"  Status: {getattr(trace, 'status', 'Unknown')}")

def log_span_info(span: sprintlens.Span) -> None:
    """Log detailed information about a span."""
    logger.debug(f"Span Info:")
    logger.debug(f"  ID: {span.id}")
    logger.debug(f"  Name: {span.name}")
    logger.debug(f"  Trace ID: {span.trace_id}")
    logger.debug(f"  Parent ID: {getattr(span, 'parent_id', 'None')}")

def log_client_status() -> None:
    """Log current client status and configuration."""
    info = get_client_info()
    logger.info(f"Client Status: {json.dumps(info, indent=2)}")

def create_debug_trace(name: str = "debug_trace") -> sprintlens.Trace:
    """Create a trace specifically for debugging purposes."""
    trace = sprintlens.Trace(
        name=name,
        input={"debug": True, "purpose": "debugging"},
        metadata={"debug_mode": True, "timestamp": "now"}
    )
    
    log_trace_info(trace)
    return trace

class DebugTracer:
    """Context manager for debug tracing."""
    
    def __init__(self, name: str, input_data: Optional[Dict[str, Any]] = None):
        self.name = name
        self.input_data = input_data or {}
        self.trace: Optional[sprintlens.Trace] = None
    
    def __enter__(self) -> sprintlens.Trace:
        self.trace = sprintlens.Trace(
            name=self.name,
            input=self.input_data,
            metadata={"debug": True}
        )
        logger.debug(f"Started debug trace: {self.name}")
        return self.trace
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.trace:
            if exc_type:
                self.trace.end(
                    output={"error": str(exc_val)},
                    metadata={"exception_type": str(exc_type)}
                )
                logger.debug(f"Debug trace ended with error: {self.name}")
            else:
                self.trace.end(output={"success": True})
                logger.debug(f"Debug trace completed successfully: {self.name}")