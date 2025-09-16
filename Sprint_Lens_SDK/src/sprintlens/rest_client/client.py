"""
HTTP Client for Sprint Lens SDK.

Handles all HTTP communication with the Sprint Agent Lens backend.
"""

import asyncio
from typing import Optional, Dict, Any, Union
from urllib.parse import urljoin

import httpx

from ..core.config import SprintLensConfig
from ..core.auth import AuthManager
from ..core.exceptions import SprintLensConnectionError, SprintLensAuthError
from ..utils.logging import get_logger

logger = get_logger(__name__)


class HTTPClient:
    """
    HTTP client for communicating with Sprint Agent Lens backend.
    
    Handles authentication, retries, and request/response processing.
    """

    def __init__(self, config: SprintLensConfig, auth_manager: AuthManager):
        """
        Initialize HTTP client.
        
        Args:
            config: Sprint Lens configuration
            auth_manager: Authentication manager
        """
        self._config = config
        self._auth_manager = auth_manager
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client instance."""
        if not self._client:
            timeout = httpx.Timeout(
                connect=self._config.connect_timeout,
                read=self._config.read_timeout,
                write=self._config.timeout,
                pool=self._config.timeout
            )
            
            headers = {
                "User-Agent": f"SprintLens-SDK/1.0.0",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
            
            self._client = httpx.AsyncClient(
                timeout=timeout,
                headers=headers,
                verify=self._config.verify_ssl,
                follow_redirects=True
            )
        
        return self._client

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated HTTP request.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            json: JSON payload for POST/PUT requests
            params: Query parameters
            headers: Additional headers
            timeout: Request timeout
            
        Returns:
            Response JSON data
            
        Raises:
            SprintLensConnectionError: If request fails
            SprintLensAuthError: If authentication fails
        """
        client = await self._get_client()
        
        # Build full URL
        url = urljoin(self._config.url.rstrip('/') + '/', endpoint.lstrip('/'))
        
        # Get authentication headers
        try:
            auth_headers = await self._auth_manager.get_auth_header()
        except Exception as e:
            raise SprintLensAuthError(f"Failed to get authentication: {e}") from e
        
        # Merge headers
        request_headers = auth_headers.copy()
        if headers:
            request_headers.update(headers)
        
        try:
            logger.debug("Making HTTP request", extra={
                "method": method,
                "url": url,
                "has_json": json is not None,
                "has_params": params is not None
            })
            
            response = await client.request(
                method=method,
                url=url,
                json=json,
                params=params,
                headers=request_headers,
                timeout=timeout or self._config.timeout
            )
            
            # Handle authentication errors
            if response.status_code == 401:
                # Try to refresh token and retry once
                try:
                    await self._auth_manager.refresh_token_if_needed()
                    auth_headers = await self._auth_manager.get_auth_header()
                    request_headers.update(auth_headers)
                    
                    response = await client.request(
                        method=method,
                        url=url,
                        json=json,
                        params=params,
                        headers=request_headers,
                        timeout=timeout or self._config.timeout
                    )
                except Exception:
                    raise SprintLensAuthError("Authentication failed")
            
            # Handle other HTTP errors
            if response.status_code >= 400:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                if response.status_code == 401:
                    raise SprintLensAuthError(error_msg)
                else:
                    raise SprintLensConnectionError(error_msg)
            
            # Parse response
            if response.headers.get('content-type', '').startswith('application/json'):
                return response.json()
            else:
                return {"data": response.text, "status_code": response.status_code}
                
        except httpx.ConnectError as e:
            raise SprintLensConnectionError(f"Failed to connect to backend: {e}") from e
        except httpx.TimeoutException as e:
            raise SprintLensConnectionError(f"Request timeout: {e}") from e
        except (SprintLensConnectionError, SprintLensAuthError):
            raise
        except Exception as e:
            raise SprintLensConnectionError(f"Request failed: {e}") from e

    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make GET request."""
        return await self._make_request("GET", endpoint, params=params, headers=headers, timeout=timeout)

    async def post(
        self,
        endpoint: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make POST request."""
        return await self._make_request("POST", endpoint, json=json, params=params, headers=headers, timeout=timeout)

    async def put(
        self,
        endpoint: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make PUT request."""
        return await self._make_request("PUT", endpoint, json=json, params=params, headers=headers, timeout=timeout)

    async def patch(
        self,
        endpoint: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make PATCH request."""
        return await self._make_request("PATCH", endpoint, json=json, params=params, headers=headers, timeout=timeout)

    async def delete(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make DELETE request."""
        return await self._make_request("DELETE", endpoint, params=params, headers=headers, timeout=timeout)

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None