"""
Customer Support Agent with Sprint Lens integration.
"""

import logging
from .config.sprintlens_config import configure_sprintlens

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Sprint Lens SDK
def initialize():
    """Initialize the customer support agent and Sprint Lens SDK."""
    logger.info("Initializing Customer Support Agent...")
    
    # Configure Sprint Lens SDK
    if configure_sprintlens():
        logger.info("✅ Sprint Lens SDK configured successfully")
    else:
        logger.error("❌ Failed to configure Sprint Lens SDK")
        raise RuntimeError("SDK configuration failed")
    
    logger.info("✅ Customer Support Agent initialized")

# Auto-initialize when module is imported
try:
    initialize()
except Exception as e:
    logger.warning(f"Auto-initialization failed: {e}")
    logger.info("Manual initialization may be required")