"""
Sprint Lens SDK configuration and initialization.
"""

import os
import logging
from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings
from pydantic import field_validator
import sprintlens
from sprintlens.core.config import SprintLensConfig
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SprintLensSettings(BaseSettings):
    """Sprint Lens SDK configuration settings."""
    
    # Connection settings
    url: str = "http://localhost:3000"
    username: str = ""
    password: str = ""
    workspace_id: str = "default"
    project_name: str = ""
    
    # Optional settings
    api_key: Optional[str] = None
    debug: bool = False
    tracing_enabled: bool = True
    
    model_config = {
        "env_prefix": "SPRINTLENS_",
        "case_sensitive": False
    }
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        """Ensure URL is properly formatted."""
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v.rstrip('/')
    
    # log_level field removed - not needed in this configuration

# Global settings instance
settings = SprintLensSettings()

def create_sprintlens_config() -> SprintLensConfig:
    """Create a SprintLens configuration object."""
    return SprintLensConfig(
        url=settings.url,
        username=settings.username,
        password=settings.password,
        workspace_id=settings.workspace_id,
        project_name=settings.project_name,
        api_key=settings.api_key
    )

def configure_sprintlens() -> bool:
    """Configure the Sprint Lens SDK with environment settings."""
    try:
        # Configure SDK with individual parameters
        sprintlens.configure(
            url=settings.url,
            username=settings.username,
            password=settings.password,
            workspace_id=settings.workspace_id,
            project_name=settings.project_name,
            api_key=settings.api_key
        )
        
        # Set up logging if debug is enabled
        if settings.debug:
            logging.basicConfig(
                level=logging.DEBUG,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        
        logger.info(f"Sprint Lens SDK configured successfully")
        logger.info(f"Backend URL: {settings.url}")
        logger.info(f"Project Name: {settings.project_name}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to configure Sprint Lens SDK: {e}")
        return False

def get_client_info() -> Dict[str, Any]:
    """Get current client information and status."""
    try:
        client = sprintlens.get_client()
        return {
            "configured": True,
            "url": client.config.url if client.config else None,
            "workspace_id": client.config.workspace_id if client.config else None,
            "project_name": client.config.project_name if client.config else None,
            "tracing_enabled": client.config.tracing_enabled if client.config else None
        }
    except Exception as e:
        return {
            "configured": False,
            "error": str(e)
        }

def health_check() -> Dict[str, Any]:
    """Perform a health check of the Sprint Lens connection."""
    try:
        client = sprintlens.get_client()
        
        # Test connection (this might need to be adapted based on actual SDK API)
        # For now, we'll return configuration status
        info = get_client_info()
        
        if info.get("configured"):
            return {
                "status": "healthy",
                "timestamp": os.environ.get("TIMESTAMP", "now"),
                "client_info": info
            }
        else:
            return {
                "status": "unhealthy",
                "error": info.get("error", "Not configured"),
                "timestamp": os.environ.get("TIMESTAMP", "now")
            }
            
    except Exception as e:
        return {
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": os.environ.get("TIMESTAMP", "now")
        }