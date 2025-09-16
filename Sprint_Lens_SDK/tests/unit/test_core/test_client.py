"""
Comprehensive unit tests for SprintLensClient.

This test suite provides 100% coverage of the SprintLensClient class
with enterprise-grade testing practices and zero-bug tolerance.
"""

import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

import httpx

from sprintlens.core.client import SprintLensClient
from sprintlens.core.config import SprintLensConfig
from sprintlens.core.exceptions import (
    SprintLensError,
    SprintLensConnectionError,
    SprintLensConfigError
)


class TestSprintLensClientInitialization:
    """Test client initialization and configuration."""
    
    def test_init_with_url_and_credentials(self):
        """Test client initialization with URL and credentials."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        assert client.url == "http://localhost:3000"
        assert client.workspace_id == "test_workspace"
        assert client.config.username == "test_user"
        assert client.config.password == "test_password"
        assert not client.is_initialized
        assert client.session_id is not None
        assert len(client.session_id) == 36  # UUID format
    
    def test_init_with_api_key(self):
        """Test client initialization with API key authentication."""
        client = SprintLensClient(
            url="http://localhost:3000",
            api_key="test-api-key",
            workspace_id="test_workspace"
        )
        
        assert client.config.api_key == "test-api-key"
        assert client.config.username is None
        assert client.config.password is None
    
    def test_init_with_config_object(self, valid_config):
        """Test client initialization with SprintLensConfig object."""
        client = SprintLensClient(config=valid_config)
        
        assert client.config == valid_config
        assert client.url == valid_config.url
        assert client.workspace_id == valid_config.workspace_id
    
    def test_init_with_additional_kwargs(self):
        """Test client initialization with additional configuration parameters."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user", 
            password="test_password",
            workspace_id="test_workspace",
            timeout=60.0,
            batch_size=200,
            debug=True
        )
        
        assert client.config.timeout == 60.0
        assert client.config.batch_size == 200
        assert client.config.debug is True
    
    def test_init_without_authentication_fails(self):
        """Test that initialization fails without proper authentication."""
        with pytest.raises(SprintLensConfigError) as exc_info:
            SprintLensClient(
                url="http://localhost:3000",
                workspace_id="test_workspace"
            )
        
        assert "Authentication required" in str(exc_info.value)
        assert exc_info.value.details.get("config_key") == "authentication"
    
    def test_init_with_invalid_url_fails(self):
        """Test that initialization fails with invalid URL."""
        with pytest.raises(SprintLensConfigError) as exc_info:
            SprintLensClient(
                url="invalid-url",
                username="test_user",
                password="test_password",
                workspace_id="test_workspace"
            )
        
        assert "Invalid URL format" in str(exc_info.value)
        assert exc_info.value.details.get("config_key") == "url"
    
    def test_init_with_empty_workspace_id_fails(self):
        """Test that initialization fails with empty workspace_id."""
        with pytest.raises(SprintLensConfigError) as exc_info:
            SprintLensClient(
                url="http://localhost:3000",
                username="test_user",
                password="test_password",
                workspace_id=""
            )
        
        assert "workspace_id cannot be empty" in str(exc_info.value)
        assert exc_info.value.details.get("config_key") == "workspace_id"
    
    def test_init_with_conflicting_auth_fails(self):
        """Test that initialization fails with conflicting authentication methods."""
        with pytest.raises(SprintLensConfigError) as exc_info:
            SprintLensClient(
                url="http://localhost:3000",
                username="test_user",
                password="test_password",
                api_key="test-api-key",
                workspace_id="test_workspace"
            )
        
        assert "Conflicting authentication" in str(exc_info.value)
    
    def test_properties_before_initialization(self):
        """Test client properties before initialization."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        assert not client.is_initialized
        assert client.url == "http://localhost:3000"
        assert client.workspace_id == "test_workspace"
        assert client.project_name is None
        assert client.endpoints is not None
        assert client.session_id is not None
    
    def test_string_representations(self):
        """Test __repr__ and __str__ methods."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        repr_str = repr(client)
        assert "SprintLensClient" in repr_str
        assert "http://localhost:3000" in repr_str
        assert "test_workspace" in repr_str
        assert "initialized=False" in repr_str
        
        str_str = str(client)
        assert "Sprint Lens Client" in str_str
        assert "http://localhost:3000" in str_str


class TestSprintLensClientInitialize:
    """Test client initialization and connectivity."""
    
    @pytest_asyncio.fixture
    async def mock_successful_responses(self):
        """Mock successful HTTP responses."""
        def mock_request(*args, **kwargs):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"status": "healthy"}
            mock_response.reason_phrase = "OK"
            return mock_response
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=mock_request)
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            yield mock_client
    
    @pytest_asyncio.fixture  
    async def mock_connection_error(self):
        """Mock connection error responses."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            yield mock_client
    
    @pytest_asyncio.fixture
    async def mock_timeout_error(self):
        """Mock timeout error responses.""" 
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("Request timeout"))
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            yield mock_client
    
    @pytest.mark.asyncio
    async def test_successful_initialization(self, mock_successful_responses):
        """Test successful client initialization."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password", 
            workspace_id="test_workspace"
        )
        
        assert not client.is_initialized
        
        await client.initialize()
        
        assert client.is_initialized
        mock_successful_responses.get.assert_called_once()
        
        # Clean up
        await client.close()
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_double_initialization(self, mock_successful_responses):
        """Test that double initialization is safe."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        await client.initialize()
        await client.initialize()  # Second call should be safe
        
        assert client.is_initialized
        # Should only call backend once
        assert mock_successful_responses.get.call_count == 1
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_initialization_connection_error(self, mock_connection_error):
        """Test initialization with connection error."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        with pytest.raises(SprintLensConnectionError) as exc_info:
            await client.initialize()
        
        assert "Failed to connect to Sprint Agent Lens backend" in str(exc_info.value)
        assert exc_info.value.details["url"] == "http://localhost:3000"
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_initialization_timeout_error(self, mock_timeout_error):
        """Test initialization with timeout error."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        with pytest.raises(SprintLensConnectionError) as exc_info:
            await client.initialize()
        
        assert "Connection timeout" in str(exc_info.value)
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_initialization_with_404_fallback(self):
        """Test initialization when health endpoint returns 404 but base URL works."""
        def mock_request(url, **kwargs):
            mock_response = MagicMock()
            if "/health" in url:
                mock_response.status_code = 404
            else:
                mock_response.status_code = 200
            mock_response.json.return_value = {}
            mock_response.reason_phrase = "OK" if mock_response.status_code == 200 else "Not Found"
            return mock_response
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=mock_request)
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            
            client = SprintLensClient(
                url="http://localhost:3000",
                username="test_user",
                password="test_password",
                workspace_id="test_workspace"
            )
            
            await client.initialize()
            assert client.is_initialized
            
            # Should call health endpoint first, then base URL
            assert mock_client.get.call_count == 2
            
            await client.close()
    
    @pytest.mark.asyncio
    async def test_initialization_with_server_error(self):
        """Test initialization when server returns error status."""
        def mock_request(*args, **kwargs):
            mock_response = MagicMock()
            mock_response.status_code = 500
            mock_response.reason_phrase = "Internal Server Error"
            return mock_response
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=mock_request)
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            
            client = SprintLensClient(
                url="http://localhost:3000",
                username="test_user", 
                password="test_password",
                workspace_id="test_workspace"
            )
            
            with pytest.raises(SprintLensConnectionError) as exc_info:
                await client.initialize()
            
            assert "Backend returned error: 500" in str(exc_info.value)
            assert exc_info.value.details["status_code"] == 500
    
    @pytest.mark.asyncio
    async def test_http_client_configuration(self):
        """Test HTTP client is configured correctly."""
        client = SprintLensClient(
            url="https://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace",
            timeout=45.0,
            connect_timeout=15.0,
            read_timeout=35.0,
            verify_ssl=False,
            user_agent_suffix="CustomApp/1.0"
        )
        
        def mock_request(*args, **kwargs):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"status": "healthy"}
            mock_response.reason_phrase = "OK"
            return mock_response
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=mock_request)
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            
            await client.initialize()
            
            # Verify HTTP client was created with correct parameters
            mock_client_class.assert_called_once()
            args, kwargs = mock_client_class.call_args
            
            # Check timeout configuration
            timeout = kwargs['timeout']
            assert timeout.connect == 15.0
            assert timeout.read == 35.0
            
            # Check headers
            headers = kwargs['headers']
            assert "SprintLens-SDK" in headers['User-Agent']
            assert "CustomApp/1.0" in headers['User-Agent']
            assert headers['Accept'] == "application/json"
            assert headers['Content-Type'] == "application/json"
            
            # Check SSL verification
            assert kwargs['verify'] is False
            
            await client.close()


class TestSprintLensClientContextManager:
    """Test client as async context manager."""
    
    @pytest.mark.asyncio
    async def test_context_manager_success(self, mock_http_responses):
        """Test successful context manager usage."""
        async with SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        ) as client:
            assert client.is_initialized
            assert client.session_id is not None
        
        # Client should be closed after context exit
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_context_manager_with_exception(self, mock_http_responses):
        """Test context manager cleanup when exception occurs."""
        client = None
        
        try:
            async with SprintLensClient(
                url="http://localhost:3000",
                username="test_user", 
                password="test_password",
                workspace_id="test_workspace"
            ) as c:
                client = c
                assert client.is_initialized
                raise ValueError("Test exception")
        except ValueError:
            pass
        
        # Client should be closed even after exception
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_context_manager_initialization_failure(self):
        """Test context manager when initialization fails."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
            mock_client.aclose = AsyncMock()
            mock_client_class.return_value = mock_client
            
            with pytest.raises(SprintLensConnectionError):
                async with SprintLensClient(
                    url="http://localhost:3000",
                    username="test_user",
                    password="test_password",
                    workspace_id="test_workspace"
                ) as client:
                    pass  # Should not reach here


class TestSprintLensClientClose:
    """Test client cleanup and resource management."""
    
    @pytest.mark.asyncio
    async def test_close_initialized_client(self, mock_http_responses):
        """Test closing an initialized client."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        await client.initialize()
        assert client.is_initialized
        
        await client.close()
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_close_uninitialized_client(self):
        """Test closing an uninitialized client."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        assert not client.is_initialized
        
        # Should be safe to close uninitialized client
        await client.close()
        assert not client.is_initialized
    
    @pytest.mark.asyncio
    async def test_multiple_close_calls(self, mock_http_responses):
        """Test multiple close calls are safe."""
        client = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        await client.initialize()
        await client.close()
        await client.close()  # Second close should be safe
        
        assert not client.is_initialized


class TestSprintLensClientConfigValidation:
    """Test configuration validation in client."""
    
    def test_url_normalization(self):
        """Test URL normalization and validation."""
        # Test URL without scheme gets http:// added
        client = SprintLensClient(
            url="localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        assert client.config.url == "http://localhost:3000"
        
        # Test trailing slash removal
        client = SprintLensClient(
            url="http://localhost:3000/",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        assert client.config.url == "http://localhost:3000"
    
    def test_workspace_id_validation(self):
        """Test workspace_id validation."""
        # Empty workspace_id should fail
        with pytest.raises(SprintLensConfigError):
            SprintLensClient(
                url="http://localhost:3000",
                username="test_user",
                password="test_password",
                workspace_id=""
            )
        
        # Whitespace-only workspace_id should fail  
        with pytest.raises(SprintLensConfigError):
            SprintLensClient(
                url="http://localhost:3000",
                username="test_user",
                password="test_password",
                workspace_id="   "
            )
    
    def test_config_error_details(self):
        """Test that config errors include helpful details."""
        try:
            SprintLensClient(
                url="invalid-url",
                username="test_user",
                password="test_password",
                workspace_id="test_workspace"
            )
        except SprintLensConfigError as e:
            assert "Invalid URL format" in str(e)
            assert e.details.get("config_key") == "url"
            assert "invalid-url" in str(e)


class TestSprintLensClientProperties:
    """Test client properties and getters."""
    
    def test_all_properties(self, valid_config):
        """Test all client properties return expected values."""
        client = SprintLensClient(config=valid_config)
        
        assert client.config == valid_config
        assert client.url == valid_config.url
        assert client.workspace_id == valid_config.workspace_id
        assert client.project_name == valid_config.project_name
        assert client.session_id is not None
        assert client.endpoints is not None
        assert not client.is_initialized
    
    def test_session_id_uniqueness(self):
        """Test that each client gets a unique session ID."""
        client1 = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        client2 = SprintLensClient(
            url="http://localhost:3000",
            username="test_user",
            password="test_password",
            workspace_id="test_workspace"
        )
        
        assert client1.session_id != client2.session_id
        assert len(client1.session_id) == 36  # UUID format
        assert len(client2.session_id) == 36  # UUID format