"""
Sprint Lens Client - Main SDK client class.

This module implements the core SprintLensClient class that serves as the primary
interface for interacting with the Sprint Agent Lens backend.
"""

import asyncio
import logging
import uuid
from typing import Optional, Dict, Any, List, Union
from urllib.parse import urlparse

import httpx

from .config import SprintLensConfig, get_config
from .exceptions import (
    SprintLensError, SprintLensConnectionError, SprintLensConfigError
)
from ..version import get_user_agent
from ..rest_client.endpoints import Endpoints
from ..rest_client.client import HTTPClient
from ..client.datasets import DatasetClient
from .auth import AuthManager

logger = logging.getLogger(__name__)


class SprintLensClient:
    """
    Main Sprint Lens SDK client for interacting with Sprint Agent Lens backend.
    
    This client provides the core functionality for authentication, configuration,
    and communication with the Sprint Agent Lens platform.
    
    Example:
        >>> client = SprintLensClient(
        ...     url="http://localhost:3000",
        ...     username="admin",
        ...     password="MasterAdmin2024!",
        ...     workspace_id="default"
        ... )
        >>> await client.initialize()
        >>> # Client is ready for use
    """
    
    def __init__(
        self,
        url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        workspace_id: Optional[str] = None,
        project_name: Optional[str] = None,
        api_key: Optional[str] = None,
        config: Optional[SprintLensConfig] = None,
        **kwargs
    ):
        """
        Initialize Sprint Lens client.
        
        Args:
            url: Sprint Agent Lens backend URL
            username: Username for authentication
            password: Password for authentication  
            workspace_id: Workspace ID for multi-tenant environments
            project_name: Default project name for traces
            api_key: API key for authentication (alternative to username/password)
            config: Pre-configured SprintLensConfig instance
            **kwargs: Additional configuration parameters
            
        Raises:
            SprintLensConfigError: If configuration is invalid
            SprintLensConnectionError: If URL is unreachable
        """
        self._session_id = str(uuid.uuid4())
        self._initialized = False
        self._http_client: Optional[HTTPClient] = None
        self._endpoints: Optional[Endpoints] = None
        self._auth_manager: Optional[AuthManager] = None
        self._current_loop: Optional[asyncio.AbstractEventLoop] = None
        self._raw_client: Optional[httpx.AsyncClient] = None
        
        # Client modules
        self._dataset_client: Optional[DatasetClient] = None
        
        # Initialize configuration
        if config is not None:
            self._config = config
        else:
            # Build config from parameters
            config_params = {}
            if url is not None:
                config_params['url'] = url
            if username is not None:
                config_params['username'] = username
            if password is not None:
                config_params['password'] = password
            if workspace_id is not None:
                config_params['workspace_id'] = workspace_id
            if project_name is not None:
                config_params['project_name'] = project_name
            if api_key is not None:
                config_params['api_key'] = api_key
            
            # Add any additional kwargs
            config_params.update(kwargs)
            
            try:
                if config_params:
                    self._config = SprintLensConfig(**config_params)
                else:
                    self._config = get_config()
            except Exception as e:
                # Extract more specific error information from validation errors
                error_msg = str(e)
                if "Authentication required" in error_msg:
                    raise SprintLensConfigError(
                        "Authentication required: provide either api_key or both username and password",
                        config_key="authentication",
                        cause=e
                    )
                elif "Invalid URL format" in error_msg:
                    raise SprintLensConfigError(
                        f"Invalid URL format: {config_params.get('url')}",
                        config_key="url", 
                        cause=e
                    )
                elif "Conflicting authentication" in error_msg:
                    raise SprintLensConfigError(
                        "Conflicting authentication: provide either api_key or username/password, not both",
                        config_key="authentication",
                        cause=e
                    )
                else:
                    raise SprintLensConfigError(
                        f"Configuration validation failed: {error_msg}",
                        details={"params": list(config_params.keys())},
                        cause=e
                    )
        
        # Validate configuration
        self._validate_config()
        
        # Initialize endpoints
        self._endpoints = Endpoints(self._config.url)
        
        logger.info(
            "Sprint Lens client initialized",
            extra={
                "session_id": self._session_id,
                "url": self._config.url,
                "workspace_id": self._config.workspace_id,
                "username": self._config.username,
            }
        )
    
    def _validate_config(self) -> None:
        """Validate client configuration."""
        try:
            # Validate URL format
            parsed_url = urlparse(self._config.url)
            if not parsed_url.scheme or not parsed_url.netloc:
                raise SprintLensConfigError(
                    f"Invalid URL format: {self._config.url}",
                    config_key="url"
                )
            
            # Additional URL validation - check if hostname looks valid
            hostname = parsed_url.hostname
            if not hostname or '.' not in hostname and hostname not in ['localhost']:
                # Only allow localhost or hostnames with dots (basic domain validation)
                if hostname != 'localhost':
                    raise SprintLensConfigError(
                        f"Invalid URL format: {self._config.url}",
                        config_key="url"
                    )
            
            # Validate authentication
            if not self._config.api_key:
                if not self._config.username or not self._config.password:
                    raise SprintLensConfigError(
                        "Authentication required: provide either api_key or username/password",
                        config_key="authentication"
                    )
            
            # Validate workspace_id
            if not self._config.workspace_id or not self._config.workspace_id.strip():
                raise SprintLensConfigError(
                    "workspace_id cannot be empty",
                    config_key="workspace_id"
                )
            
        except SprintLensConfigError:
            raise
        except Exception as e:
            raise SprintLensConfigError(
                "Configuration validation failed",
                cause=e
            )
    
    async def initialize(self) -> None:
        """
        Initialize the client and establish connection to backend.
        
        This method must be called before using other client methods.
        It sets up the HTTP client, validates connectivity, and prepares
        authentication.
        
        Raises:
            SprintLensConnectionError: If backend is unreachable
            SprintLensError: For other initialization errors
        """
        if self._initialized:
            return
        
        try:
            # Create HTTP client with configuration
            timeout = httpx.Timeout(
                connect=self._config.connect_timeout,
                read=self._config.read_timeout,
                write=self._config.timeout,
                pool=self._config.timeout
            )
            
            # Build client headers
            headers = {
                "User-Agent": get_user_agent(),
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
            
            # Add custom user agent suffix if configured
            if self._config.user_agent_suffix:
                headers["User-Agent"] += f" {self._config.user_agent_suffix}"
            
            # Add any custom headers
            headers.update(self._config.headers)
            
            # Create HTTP client wrapper
            client_kwargs = {
                "timeout": timeout,
                "headers": headers,
                "verify": self._config.verify_ssl,
                "follow_redirects": True,
                "max_redirects": 5,
            }
            
            # Add certificate configuration if provided
            if self._config.client_cert_path:
                client_kwargs["cert"] = (
                    self._config.client_cert_path, 
                    self._config.client_key_path
                )
            
            # Add proxy configuration if provided
            if self._config.proxy_url:
                client_kwargs["proxies"] = self._config.proxy_url
            
            raw_http_client = httpx.AsyncClient(**client_kwargs)
            
            # Create auth manager
            self._auth_manager = AuthManager(self._config)
            
            # Create HTTP client wrapper
            self._http_client = HTTPClient(self._config, self._auth_manager)
            
            # Store raw client for connectivity test
            self._raw_client = raw_http_client
            
            # Store current event loop for later detection of loop changes
            self._current_loop = asyncio.get_running_loop()
            
            # Initialize client modules
            self._dataset_client = DatasetClient(
                self._http_client,
                self._endpoints,
                self._auth_manager
            )
            
            # Test connectivity
            await self._test_connectivity()
            
            self._initialized = True
            
            logger.info(
                "Sprint Lens client initialized successfully",
                extra={"session_id": self._session_id}
            )
            
        except SprintLensConnectionError:
            raise
        except Exception as e:
            raise SprintLensError(
                "Client initialization failed",
                details={"session_id": self._session_id},
                cause=e
            )
    
    async def _test_connectivity(self) -> None:
        """Test connectivity to Sprint Agent Lens backend."""
        if not self._http_client or not self._endpoints:
            raise SprintLensError("HTTP client not initialized")
        
        try:
            # Test health endpoint
            health_url = self._endpoints.health()
            
            logger.debug(
                "Testing connectivity to Sprint Agent Lens backend",
                extra={
                    "session_id": self._session_id,
                    "health_url": health_url
                }
            )
            
            response = await self._raw_client.get(health_url)
            
            # Check if backend is reachable
            if response.status_code == 404:
                # Health endpoint might not exist, try base URL
                response = await self._raw_client.get(self._config.url)
            
            # Any 2xx or 3xx response indicates connectivity
            if response.status_code >= 400:
                raise SprintLensConnectionError(
                    f"Backend returned error: {response.status_code} {response.reason_phrase}",
                    url=self._config.url,
                    status_code=response.status_code
                )
            
            logger.debug(
                "Connectivity test successful",
                extra={
                    "session_id": self._session_id,
                    "status_code": response.status_code
                }
            )
            
        except httpx.ConnectError as e:
            raise SprintLensConnectionError(
                f"Failed to connect to Sprint Agent Lens backend at {self._config.url}",
                url=self._config.url,
                cause=e
            )
        except httpx.TimeoutException as e:
            raise SprintLensConnectionError(
                f"Connection timeout to Sprint Agent Lens backend",
                url=self._config.url,
                cause=e
            )
        except SprintLensConnectionError:
            raise
        except Exception as e:
            raise SprintLensConnectionError(
                f"Connectivity test failed: {e}",
                url=self._config.url,
                cause=e
            )
    
    async def close(self) -> None:
        """Close the client and clean up resources."""
        if self._http_client:
            await self._http_client.close()
            self._http_client = None
        
        if hasattr(self, '_raw_client') and self._raw_client:
            await self._raw_client.aclose()
            self._raw_client = None
        
        self._initialized = False
        
        logger.info(
            "Sprint Lens client closed",
            extra={"session_id": self._session_id}
        )
    
    async def __aenter__(self) -> 'SprintLensClient':
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
    
    # Properties
    @property
    def is_initialized(self) -> bool:
        """Check if client is initialized."""
        return self._initialized
    
    @property
    def config(self) -> SprintLensConfig:
        """Get client configuration."""
        return self._config
    
    @property
    def session_id(self) -> str:
        """Get client session ID."""
        return self._session_id
    
    @property
    def endpoints(self) -> Optional[Endpoints]:
        """Get endpoints helper."""
        return self._endpoints
    
    @property
    def url(self) -> str:
        """Get backend URL."""
        return self._config.url
    
    @property
    def workspace_id(self) -> str:
        """Get workspace ID."""
        return self._config.workspace_id
    
    @property
    def project_name(self) -> Optional[str]:
        """Get default project name."""
        return self._config.project_name
    
    @property
    def datasets(self) -> Optional[DatasetClient]:
        """Get dataset client for managing datasets."""
        return self._dataset_client
    
    async def create_agent(
        self, 
        name: str, 
        project_id: str, 
        agent_type: str = "custom",
        description: Optional[str] = None,
        configuration: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new agent in the specified project."""
        if not self._initialized:
            raise SprintLensError("Client not initialized")
        
        if not self._http_client or not self._endpoints:
            raise SprintLensError("Client not properly initialized")
        
        agent_data = {
            "name": name,
            "projectId": project_id,
            "agentType": agent_type,
            "description": description,
            "configuration": configuration or {}
        }
        
        # Remove None values
        agent_data = {k: v for k, v in agent_data.items() if v is not None}
        
        try:
            agents_url = f"{self._config.url}/v1/private/agents"
            response = await self._http_client.post(agents_url, json=agent_data)
            
            logger.info(
                "Agent created successfully",
                extra={
                    "agent_id": response.get("id"),
                    "agent_name": name,
                    "project_id": project_id
                }
            )
            
            return response
            
        except Exception as e:
            logger.error(
                "Failed to create agent",
                extra={
                    "agent_name": name,
                    "project_id": project_id,
                    "error": str(e)
                }
            )
            raise
    
    def __repr__(self) -> str:
        """String representation of client."""
        return (
            f"SprintLensClient(url='{self._config.url}', "
            f"workspace_id='{self._config.workspace_id}', "
            f"initialized={self._initialized})"
        )
    
    def __str__(self) -> str:
        """User-friendly string representation."""
        return f"Sprint Lens Client connected to {self._config.url}"
    
    async def _add_trace_to_buffer(self, trace_data: Dict[str, Any]) -> None:
        """Add trace data to buffer for sending to backend."""
        if not self._initialized:
            raise SprintLensError("Client not initialized")
        
        try:
            logger.debug("Adding trace to buffer", extra={
                "trace_id": trace_data.get("id"),
                "initialized": self._initialized,
                "http_client": self._http_client is not None,
                "endpoints": self._endpoints is not None
            })
            # Send trace directly to backend for now (no buffering)
            await self._send_trace_to_backend(trace_data)
        except Exception as e:
            logger.error(
                "Failed to send trace to backend",
                extra={
                    "trace_id": trace_data.get("id"),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "error_details": repr(e)
                }
            )
            raise
    
    async def _check_and_reinitialize_client(self) -> None:
        """
        Check if the event loop has changed and reinitialize HTTP client if needed.
        
        This handles the case where multiple asyncio.run() calls happen in the same
        process, which closes the previous event loop and makes the HTTP client unusable.
        """
        try:
            current_loop = asyncio.get_running_loop()
            
            # If loop hasn't changed, nothing to do
            if self._current_loop is current_loop:
                return
                
            # Event loop has changed, need to reinitialize HTTP client
            logger.info("Event loop changed, reinitializing HTTP client")
            
            # Close the old client if it exists
            if self._raw_client and not self._raw_client.is_closed:
                try:
                    await self._raw_client.aclose()
                except Exception as e:
                    logger.warning(f"Error closing old HTTP client: {e}")
            
            # Create new HTTP client with same configuration
            timeout = httpx.Timeout(
                connect=self._config.connect_timeout,
                read=self._config.read_timeout,
                write=self._config.timeout,
                pool=self._config.timeout
            )
            
            headers = {
                "User-Agent": get_user_agent(),
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
            
            if self._config.user_agent_suffix:
                headers["User-Agent"] += f" {self._config.user_agent_suffix}"
            
            headers.update(self._config.headers)
            
            client_kwargs = {
                "timeout": timeout,
                "headers": headers,
                "verify": self._config.verify_ssl,
                "follow_redirects": True,
                "max_redirects": 5,
            }
            
            if self._config.client_cert_path:
                client_kwargs["cert"] = (
                    self._config.client_cert_path, 
                    self._config.client_key_path
                )
            
            if self._config.proxy_url:
                client_kwargs["proxies"] = self._config.proxy_url
            
            # Create new raw client
            self._raw_client = httpx.AsyncClient(**client_kwargs)
            
            # Update the HTTP client wrapper with new raw client
            self._http_client._client = self._raw_client
            
            # Update stored loop reference
            self._current_loop = current_loop
            
            logger.info("HTTP client reinitialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to reinitialize HTTP client: {e}")
            raise

    async def _send_trace_to_backend(self, trace_data: Dict[str, Any]) -> None:
        """Send trace data to Sprint Agent Lens backend."""
        if not self._http_client or not self._endpoints:
            raise SprintLensError("Client not properly initialized")
        
        # Check if event loop changed and reinitialize client if needed
        await self._check_and_reinitialize_client()
        
        try:
            # Debug logging for trace data
            logger.debug("Raw trace data", extra={
                "trace_id": trace_data.get("id"),
                "project_name": trace_data.get("project_name"),
                "project_id": trace_data.get("project_id"),
                "client_project_name": self._config.project_name
            })
            
            # Extract agent_id from tags if available
            trace_tags = trace_data.get("tags", {})
            agent_id = trace_data.get("agent_id") or trace_tags.get("agent_id")
            
            # Debug logging for agent_id extraction
            logger.info(f"Debug: trace_data.agent_id = {trace_data.get('agent_id')}")
            logger.info(f"Debug: trace_tags = {trace_tags}")
            logger.info(f"Debug: final agent_id = {agent_id}")
            
            # Prepare trace data for API
            payload = {
                "operationName": trace_data.get("name"),
                "startTime": trace_data.get("start_time"),
                "endTime": trace_data.get("end_time"),
                "inputData": trace_data.get("input"),
                "outputData": trace_data.get("output"),
                "tags": trace_tags,
                "metadata": trace_data.get("metadata", {}),
                "feedback_scores": trace_data.get("metrics", {}),
                "projectId": trace_data.get("project_name") or self._config.project_name,
                "agentId": agent_id,
                "traceType": "function_call",
                "status": "success",
                "spans": trace_data.get("spans", []),
            }
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            # Debug logging for final payload
            logger.info(f"Sending payload structure: {list(payload.keys())}")
            logger.info(f"Sample payload: operationName={payload.get('operationName')}, projectId={payload.get('projectId')}, agentId={payload.get('agentId')}")
            if payload.get('spans'):
                logger.info(f"First span keys: {list(payload['spans'][0].keys()) if payload['spans'] else 'No spans'}")
            
            # Send to backend
            traces_url = self._endpoints.traces()
            response = await self._http_client.post(traces_url, json=payload)
            
            logger.info(
                "Trace sent to backend successfully",
                extra={
                    "trace_id": trace_data.get("id"),
                    "response_data": "success"
                }
            )
            
        except Exception as e:
            logger.error(
                "Failed to send trace to backend",
                extra={
                    "trace_id": trace_data.get("id"),
                    "error": str(e)
                }
            )
            raise


# Global client management (for the decorator)
_global_client: Optional[SprintLensClient] = None


def configure(
    url: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    workspace_id: Optional[str] = None,
    **kwargs
) -> SprintLensClient:
    """
    Configure global Sprint Lens client.
    
    This creates a global client instance that can be used with
    the standalone @track decorator.
    
    Args:
        url: Sprint Agent Lens backend URL
        username: Authentication username
        password: Authentication password  
        workspace_id: Target workspace ID
        **kwargs: Additional configuration parameters
        
    Returns:
        SprintLensClient: Configured client instance
        
    Example:
        >>> sprintlens.configure(
        ...     url="https://your-backend.com",
        ...     username="your-username",
        ...     password="your-password"
        ... )
    """
    global _global_client
    
    _global_client = SprintLensClient(
        url=url,
        username=username,
        password=password,
        workspace_id=workspace_id,
        **kwargs
    )
    
    # Initialize the client for immediate use
    import asyncio
    try:
        # Check if there's already an event loop running
        loop = asyncio.get_running_loop()
        # If we reach here, create a task for initialization
        asyncio.create_task(_global_client.initialize())
    except RuntimeError:
        # No event loop running, safe to use asyncio.run
        asyncio.run(_global_client.initialize())
    
    return _global_client


def get_client() -> Optional[SprintLensClient]:
    """Get the global client instance."""
    return _global_client