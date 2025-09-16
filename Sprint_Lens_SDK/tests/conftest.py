"""
Pytest configuration and shared fixtures for Sprint Lens SDK tests.

This module provides comprehensive test fixtures and configuration for testing
the Sprint Lens SDK with enterprise-grade quality and coverage.
"""

import asyncio
import json
import os
import tempfile
import pytest
import pytest_asyncio
from typing import Dict, Any, Optional, AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

import httpx
import yaml

from sprintlens.core.config import SprintLensConfig, reset_config
from sprintlens.core.client import SprintLensClient
from sprintlens.core.exceptions import SprintLensError


# Test configuration constants
TEST_BACKEND_URL = "http://localhost:3000"
TEST_USERNAME = "admin"
TEST_PASSWORD = "OpikAdmin2024!"
TEST_WORKSPACE_ID = "default"
TEST_PROJECT_NAME = "test_project"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def reset_global_config():
    """Reset global configuration before each test."""
    reset_config()
    yield
    reset_config()


@pytest.fixture
def temp_config_file() -> Generator[Path, None, None]:
    """Create a temporary configuration file for testing."""
    config_data = {
        "url": TEST_BACKEND_URL,
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "workspace_id": TEST_WORKSPACE_ID,
        "project_name": TEST_PROJECT_NAME,
        "timeout": 30.0,
        "batch_size": 50,
        "debug": True,
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        yaml.dump(config_data, f)
        temp_path = Path(f.name)
    
    try:
        yield temp_path
    finally:
        if temp_path.exists():
            temp_path.unlink()


@pytest.fixture
def valid_config() -> SprintLensConfig:
    """Create a valid SprintLensConfig for testing."""
    return SprintLensConfig(
        url=TEST_BACKEND_URL,
        username=TEST_USERNAME,
        password=TEST_PASSWORD,
        workspace_id=TEST_WORKSPACE_ID,
        project_name=TEST_PROJECT_NAME,
        timeout=30.0,
        batch_size=50,
        debug=True,
    )


@pytest.fixture
def invalid_config_data() -> Dict[str, Any]:
    """Invalid configuration data for testing validation."""
    return {
        "url": "invalid-url",
        "username": "",
        "password": None,
        "workspace_id": "",
        "timeout": -1,
        "batch_size": 0,
    }


@pytest.fixture
def mock_http_client():
    """Create a mock HTTP client for testing."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    
    # Mock successful health check
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "healthy"}
    mock_response.reason_phrase = "OK"
    mock_client.get.return_value = mock_response
    
    return mock_client


@pytest.fixture
def mock_backend_responses() -> Dict[str, Dict[str, Any]]:
    """Mock backend API responses."""
    return {
        "health": {
            "status_code": 200,
            "json": {"status": "healthy", "version": "1.0.0"}
        },
        "login": {
            "status_code": 200,
            "json": {
                "token": "mock-jwt-token",
                "expires_at": "2024-01-04T12:00:00Z",
                "user": {
                    "id": "user-123",
                    "username": TEST_USERNAME,
                    "workspace_id": TEST_WORKSPACE_ID
                }
            }
        },
        "auth_status": {
            "status_code": 200,
            "json": {"authenticated": True, "user_id": "user-123"}
        },
        "create_trace": {
            "status_code": 201,
            "json": {
                "id": "trace-123",
                "name": "test_trace",
                "created_at": "2024-01-03T12:00:00Z"
            }
        }
    }


class MockBackend:
    """Mock Sprint Agent Lens backend for testing."""
    
    def __init__(self, base_url: str = TEST_BACKEND_URL):
        self.base_url = base_url
        self.responses = {}
        self.request_history = []
        self.is_healthy = True
        self.auth_token = "mock-jwt-token"
        
    def set_response(self, endpoint: str, status_code: int, json_data: Dict[str, Any]):
        """Set mock response for an endpoint."""
        self.responses[endpoint] = {
            "status_code": status_code,
            "json": json_data
        }
    
    def add_request(self, method: str, url: str, **kwargs):
        """Record request for verification."""
        self.request_history.append({
            "method": method,
            "url": url,
            "kwargs": kwargs
        })
    
    def clear_history(self):
        """Clear request history."""
        self.request_history.clear()
    
    def get_requests(self, method: Optional[str] = None, endpoint: Optional[str] = None):
        """Get filtered request history."""
        requests = self.request_history
        
        if method:
            requests = [r for r in requests if r["method"] == method]
        
        if endpoint:
            requests = [r for r in requests if endpoint in r["url"]]
        
        return requests


@pytest.fixture
def mock_backend() -> MockBackend:
    """Create mock backend instance."""
    backend = MockBackend()
    
    # Set default responses
    backend.set_response("/health", 200, {"status": "healthy"})
    backend.set_response("/v1/enterprise/auth/login", 200, {
        "token": "mock-jwt-token",
        "expires_at": "2024-01-04T12:00:00Z"
    })
    
    return backend


@pytest_asyncio.fixture
async def mock_http_responses(mock_backend: MockBackend):
    """Mock httpx responses using the mock backend."""
    def mock_request(method: str, url: str, **kwargs):
        # Record the request
        mock_backend.add_request(method, url, **kwargs)
        
        # Find matching response
        for endpoint, response_data in mock_backend.responses.items():
            if endpoint in url:
                mock_response = MagicMock()
                mock_response.status_code = response_data["status_code"]
                mock_response.json.return_value = response_data["json"]
                mock_response.reason_phrase = "OK" if response_data["status_code"] < 400 else "Error"
                return mock_response
        
        # Default 404 response
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {"error": "Not found"}
        mock_response.reason_phrase = "Not Found"
        return mock_response
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=lambda url, **kwargs: mock_request("GET", url, **kwargs))
        mock_client.post = AsyncMock(side_effect=lambda url, **kwargs: mock_request("POST", url, **kwargs))
        mock_client.put = AsyncMock(side_effect=lambda url, **kwargs: mock_request("PUT", url, **kwargs))
        mock_client.delete = AsyncMock(side_effect=lambda url, **kwargs: mock_request("DELETE", url, **kwargs))
        mock_client.aclose = AsyncMock()
        
        mock_client_class.return_value = mock_client
        yield mock_client


@pytest_asyncio.fixture
async def client_with_valid_config(valid_config: SprintLensConfig) -> AsyncGenerator[SprintLensClient, None]:
    """Create initialized client with valid configuration."""
    client = SprintLensClient(config=valid_config)
    try:
        yield client
    finally:
        if client.is_initialized:
            await client.close()


@pytest_asyncio.fixture
async def initialized_client(mock_http_responses) -> AsyncGenerator[SprintLensClient, None]:
    """Create and initialize client for testing."""
    client = SprintLensClient(
        url=TEST_BACKEND_URL,
        username=TEST_USERNAME,
        password=TEST_PASSWORD,
        workspace_id=TEST_WORKSPACE_ID
    )
    
    try:
        await client.initialize()
        yield client
    finally:
        await client.close()


# Test data fixtures
@pytest.fixture
def sample_trace_data() -> Dict[str, Any]:
    """Sample trace data for testing."""
    return {
        "id": "trace-123",
        "name": "test_trace",
        "input": {"prompt": "Hello, world!"},
        "output": {"response": "Hello there!"},
        "metadata": {"model": "gpt-4", "temperature": 0.7},
        "tags": {"environment": "test", "version": "1.0.0"},
        "start_time": "2024-01-03T12:00:00Z",
        "end_time": "2024-01-03T12:00:01Z",
        "duration_ms": 1000,
        "status": "success"
    }


@pytest.fixture
def sample_span_data() -> Dict[str, Any]:
    """Sample span data for testing."""
    return {
        "id": "span-456",
        "trace_id": "trace-123",
        "parent_id": None,
        "name": "llm_call",
        "type": "llm",
        "input": {"messages": [{"role": "user", "content": "Hello"}]},
        "output": {"content": "Hello there!"},
        "metadata": {"model": "gpt-4", "tokens_used": 15},
        "start_time": "2024-01-03T12:00:00.100Z",
        "end_time": "2024-01-03T12:00:00.900Z",
        "duration_ms": 800,
        "status": "success"
    }


@pytest.fixture
def sample_dataset_data() -> Dict[str, Any]:
    """Sample dataset data for testing."""
    return {
        "id": "dataset-789",
        "name": "test_dataset",
        "description": "Test dataset for SDK testing",
        "items": [
            {
                "id": "item-1",
                "input": {"question": "What is AI?"},
                "expected_output": {"answer": "Artificial Intelligence"}
            },
            {
                "id": "item-2", 
                "input": {"question": "What is ML?"},
                "expected_output": {"answer": "Machine Learning"}
            }
        ],
        "created_at": "2024-01-03T12:00:00Z",
        "updated_at": "2024-01-03T12:00:00Z"
    }


# Environment setup - NOT autouse to avoid conflicts
@pytest.fixture
def setup_test_environment():
    """Set up test environment variables."""
    original_env = os.environ.copy()
    
    # Set test environment variables
    test_env = {
        "SPRINTLENS_URL": TEST_BACKEND_URL,
        "SPRINTLENS_USERNAME": TEST_USERNAME,
        "SPRINTLENS_PASSWORD": TEST_PASSWORD,
        "SPRINTLENS_WORKSPACE_ID": TEST_WORKSPACE_ID,
        "SPRINTLENS_DEBUG": "true",
    }
    
    for key, value in test_env.items():
        os.environ[key] = value
    
    yield
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


# Utility functions for tests
def assert_config_equals(config1: SprintLensConfig, config2: SprintLensConfig):
    """Assert two configurations are equal."""
    assert config1.url == config2.url
    assert config1.username == config2.username
    assert config1.workspace_id == config2.workspace_id
    assert config1.timeout == config2.timeout
    assert config1.batch_size == config2.batch_size


def create_mock_response(status_code: int = 200, json_data: Dict[str, Any] = None) -> MagicMock:
    """Create mock HTTP response."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = json_data or {}
    mock_response.reason_phrase = "OK" if status_code < 400 else "Error"
    return mock_response