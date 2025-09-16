"""
Base client for Sprint Lens SDK client modules.

This module provides the base class for all client modules.
"""

from typing import Optional

from ..rest_client.client import HTTPClient
from ..rest_client.endpoints import Endpoints
from ..core.auth import AuthManager


class BaseClient:
    """Base class for all client modules."""
    
    def __init__(
        self,
        http_client: HTTPClient,
        endpoints: Endpoints,
        auth_manager: AuthManager
    ):
        """
        Initialize base client.
        
        Args:
            http_client: HTTP client instance
            endpoints: Endpoints configuration
            auth_manager: Authentication manager
        """
        self.http_client = http_client
        self.endpoints = endpoints
        self.auth_manager = auth_manager