"""
Authentication management for Sprint Lens SDK
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import json
import base64

import httpx

from .exceptions import SprintLensAuthError, SprintLensConnectionError
from .config import SprintLensConfig
from ..utils.logging import get_logger

logger = get_logger(__name__)


class AuthManager:
    """
    Manages authentication with Sprint Agent Lens backend.
    
    Handles JWT token acquisition, renewal, and validation.
    Supports both username/password and API key authentication.
    """

    def __init__(self, config: SprintLensConfig):
        """
        Initialize authentication manager.
        
        Args:
            config: Sprint Lens configuration
        """
        self._config = config
        self._jwt_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._refresh_token: Optional[str] = None
        self._auth_lock = asyncio.Lock()
        self._authenticated = False
        
        # Create dedicated HTTP client for auth
        self._auth_client: Optional[httpx.AsyncClient] = None

    async def _get_auth_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client for authentication."""
        if not self._auth_client:
            timeout = httpx.Timeout(
                connect=self._config.connect_timeout,
                read=self._config.read_timeout,
                write=self._config.timeout,
                pool=self._config.timeout
            )
            
            headers = {
                "User-Agent": f"SprintLens-SDK/{self._config.user_agent_suffix or '1.0.0'}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
            
            self._auth_client = httpx.AsyncClient(
                timeout=timeout,
                headers=headers,
                verify=self._config.verify_ssl,
                follow_redirects=True
            )
        
        return self._auth_client

    async def authenticate(self) -> str:
        """
        Authenticate with the backend and get JWT token.
        
        Returns:
            JWT token string
            
        Raises:
            SprintLensAuthError: If authentication fails
            SprintLensConnectionError: If backend is unreachable
        """
        async with self._auth_lock:
            # Check if we already have a valid token
            if self._is_token_valid():
                return self._jwt_token

            try:
                if self._config.api_key:
                    await self._authenticate_with_api_key()
                else:
                    await self._authenticate_with_credentials()
                
                self._authenticated = True
                logger.info("Authentication successful", extra={
                    "username": self._config.username,
                    "workspace_id": self._config.workspace_id
                })
                
                return self._jwt_token
                
            except Exception as e:
                logger.error("Authentication failed", extra={"error": str(e)})
                self._authenticated = False
                self._jwt_token = None
                self._token_expires_at = None
                raise

    async def _authenticate_with_credentials(self) -> None:
        """Authenticate using username/password."""
        client = await self._get_auth_client()
        
        auth_url = f"{self._config.url.rstrip('/')}/v1/enterprise/auth/login"
        
        payload = {
            "username": self._config.username,
            "password": self._config.password,
            "workspaceId": self._config.workspace_id
        }
        
        try:
            logger.debug("Attempting authentication", extra={
                "auth_url": auth_url,
                "username": self._config.username,
                "workspace_id": self._config.workspace_id
            })
            
            response = await client.post(auth_url, json=payload)
            
            if response.status_code == 401:
                raise SprintLensAuthError("Invalid username, password, or workspace ID")
            elif response.status_code == 403:
                raise SprintLensAuthError("Access forbidden. Check workspace permissions.")
            elif response.status_code != 200:
                raise SprintLensAuthError(
                    f"Authentication failed with status {response.status_code}: {response.text}"
                )
            
            auth_response = response.json()
            
            # Extract JWT token from response
            if "token" in auth_response:
                self._jwt_token = auth_response["token"]
            elif "accessToken" in auth_response:
                self._jwt_token = auth_response["accessToken"]
            else:
                raise SprintLensAuthError("No JWT token in authentication response")
            
            # Extract token expiration if available
            if "expiresIn" in auth_response:
                expires_in = auth_response["expiresIn"]
                self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)
            elif "expiresAt" in auth_response:
                expires_at = auth_response["expiresAt"]
                if isinstance(expires_at, str):
                    self._token_expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                elif isinstance(expires_at, (int, float)):
                    self._token_expires_at = datetime.fromtimestamp(expires_at)
            else:
                # Default expiration of 1 hour minus 5 minutes buffer
                self._token_expires_at = datetime.utcnow() + timedelta(minutes=55)
            
            # Store refresh token if available
            if "refreshToken" in auth_response:
                self._refresh_token = auth_response["refreshToken"]
                
        except httpx.ConnectError as e:
            raise SprintLensConnectionError(
                f"Failed to connect to authentication endpoint: {auth_url}"
            ) from e
        except httpx.TimeoutException as e:
            raise SprintLensConnectionError(
                "Authentication request timed out"
            ) from e
        except SprintLensAuthError:
            raise
        except Exception as e:
            raise SprintLensAuthError(f"Authentication failed: {e}") from e

    async def _authenticate_with_api_key(self) -> None:
        """Authenticate using API key."""
        # For API key authentication, we might not need a login request
        # The API key can be used directly in requests
        # This depends on backend implementation
        
        # For now, assume API key is the JWT token itself
        # or implement API key exchange for JWT token
        
        client = await self._get_auth_client()
        auth_url = f"{self._config.url.rstrip('/')}/v1/enterprise/auth/api-key"
        
        headers = {"Authorization": f"Bearer {self._config.api_key}"}
        
        try:
            response = await client.post(auth_url, headers=headers, json={
                "workspaceId": self._config.workspace_id
            })
            
            if response.status_code == 401:
                raise SprintLensAuthError("Invalid API key")
            elif response.status_code == 403:
                raise SprintLensAuthError("API key access forbidden")
            elif response.status_code != 200:
                # If endpoint doesn't exist, use API key directly
                if response.status_code == 404:
                    self._jwt_token = self._config.api_key
                    self._token_expires_at = datetime.utcnow() + timedelta(hours=24)  # Long expiration
                    return
                
                raise SprintLensAuthError(
                    f"API key authentication failed with status {response.status_code}"
                )
            
            # Extract JWT from response
            auth_response = response.json()
            if "token" in auth_response:
                self._jwt_token = auth_response["token"]
                if "expiresIn" in auth_response:
                    expires_in = auth_response["expiresIn"]
                    self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                else:
                    self._token_expires_at = datetime.utcnow() + timedelta(hours=1)
            else:
                # Use API key directly
                self._jwt_token = self._config.api_key
                self._token_expires_at = datetime.utcnow() + timedelta(hours=24)
                
        except httpx.ConnectError as e:
            raise SprintLensConnectionError(
                "Failed to connect for API key authentication"
            ) from e
        except SprintLensAuthError:
            raise
        except Exception as e:
            raise SprintLensAuthError(f"API key authentication failed: {e}") from e

    def _is_token_valid(self) -> bool:
        """Check if current JWT token is valid."""
        if not self._jwt_token or not self._token_expires_at:
            return False
        
        # Check expiration with 5-minute buffer
        buffer_time = datetime.utcnow() + timedelta(minutes=5)
        return self._token_expires_at > buffer_time

    async def get_auth_header(self) -> Dict[str, str]:
        """
        Get authentication header for API requests.
        
        Returns:
            Dictionary with Authorization header
            
        Raises:
            SprintLensAuthError: If authentication fails
        """
        if not self._is_token_valid():
            await self.authenticate()
        
        return {"Authorization": f"Bearer {self._jwt_token}"}

    async def refresh_token_if_needed(self) -> bool:
        """
        Refresh token if it's expiring soon.
        
        Returns:
            True if token was refreshed, False if still valid
        """
        if self._is_token_valid():
            return False
        
        if self._refresh_token:
            try:
                await self._refresh_access_token()
                return True
            except Exception:
                # If refresh fails, fall back to full authentication
                pass
        
        await self.authenticate()
        return True

    async def _refresh_access_token(self) -> None:
        """Refresh access token using refresh token."""
        if not self._refresh_token:
            raise SprintLensAuthError("No refresh token available")
        
        client = await self._get_auth_client()
        refresh_url = f"{self._config.url.rstrip('/')}/v1/enterprise/auth/refresh"
        
        payload = {
            "refreshToken": self._refresh_token,
            "workspaceId": self._config.workspace_id
        }
        
        try:
            response = await client.post(refresh_url, json=payload)
            
            if response.status_code != 200:
                raise SprintLensAuthError(
                    f"Token refresh failed with status {response.status_code}"
                )
            
            refresh_response = response.json()
            
            if "token" in refresh_response:
                self._jwt_token = refresh_response["token"]
                
                if "expiresIn" in refresh_response:
                    expires_in = refresh_response["expiresIn"]
                    self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)
                else:
                    self._token_expires_at = datetime.utcnow() + timedelta(minutes=55)
                
                if "refreshToken" in refresh_response:
                    self._refresh_token = refresh_response["refreshToken"]
                    
        except Exception as e:
            raise SprintLensAuthError(f"Token refresh failed: {e}") from e

    def decode_jwt_payload(self) -> Optional[Dict[str, Any]]:
        """
        Decode JWT token payload (without verification).
        
        Returns:
            Decoded JWT payload or None if token is invalid
        """
        if not self._jwt_token:
            return None
        
        try:
            # Split JWT token
            parts = self._jwt_token.split('.')
            if len(parts) != 3:
                return None
            
            # Decode payload (middle part)
            payload_encoded = parts[1]
            
            # Add padding if needed
            padding = 4 - len(payload_encoded) % 4
            if padding != 4:
                payload_encoded += '=' * padding
            
            payload_bytes = base64.urlsafe_b64decode(payload_encoded)
            payload = json.loads(payload_bytes.decode('utf-8'))
            
            return payload
            
        except Exception:
            return None

    @property
    def is_authenticated(self) -> bool:
        """Check if currently authenticated."""
        return self._authenticated and self._is_token_valid()

    @property
    def token(self) -> Optional[str]:
        """Get current JWT token."""
        return self._jwt_token if self._is_token_valid() else None

    @property
    def token_expires_at(self) -> Optional[datetime]:
        """Get token expiration time."""
        return self._token_expires_at

    async def logout(self) -> None:
        """Logout and invalidate tokens."""
        if self._jwt_token:
            # Try to invalidate token on backend
            try:
                client = await self._get_auth_client()
                logout_url = f"{self._config.url.rstrip('/')}/v1/enterprise/auth/logout"
                
                headers = {"Authorization": f"Bearer {self._jwt_token}"}
                await client.post(logout_url, headers=headers, timeout=5.0)
                
            except Exception as e:
                logger.warning("Failed to logout from backend", extra={"error": str(e)})
        
        # Clear local state
        self._jwt_token = None
        self._token_expires_at = None
        self._refresh_token = None
        self._authenticated = False
        
        logger.info("Logged out successfully")

    async def close(self) -> None:
        """Close authentication manager and cleanup resources."""
        if self._auth_client:
            await self._auth_client.aclose()
            self._auth_client = None

    def __repr__(self) -> str:
        return (
            f"AuthManager("
            f"authenticated={self._authenticated}, "
            f"expires_at={self._token_expires_at})"
        )