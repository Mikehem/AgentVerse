"""
Sprint Lens SDK Configuration Management.

This module provides comprehensive configuration management for the Sprint Lens SDK,
supporting multiple configuration sources with proper validation and type safety.
"""

import os
import pathlib
import yaml
from typing import Optional, Dict, Any, Union
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .constants import (
    ENV_PREFIX, ENV_URL, ENV_USERNAME, ENV_PASSWORD, ENV_WORKSPACE_ID,
    ENV_PROJECT_NAME, ENV_API_KEY, ENV_DEBUG, ENV_TRACING_ENABLED,
    DEFAULT_TIMEOUT, DEFAULT_BATCH_SIZE, DEFAULT_FLUSH_INTERVAL,
    DEFAULT_MAX_BUFFER_SIZE, DEFAULT_CONFIG_FILE
)
from .exceptions import SprintLensConfigError


class SprintLensConfig(BaseSettings):
    """
    Sprint Lens SDK configuration with support for multiple sources:
    1. Programmatic configuration (highest priority)
    2. Environment variables
    3. Configuration file
    4. Defaults (lowest priority)
    """
    
    model_config = SettingsConfigDict(
        env_prefix=ENV_PREFIX,
        env_file=None,  # Don't auto-load .env file to prevent conflicts
        env_file_encoding="utf-8",
        case_sensitive=False,
        validate_assignment=True,
        extra="ignore"  # Ignore additional fields instead of forbidding them
    )
    
    # Core connection settings
    url: str = Field(
        default="http://localhost:3000",
        description="Sprint Agent Lens backend URL"
    )
    
    username: Optional[str] = Field(
        default=None,
        description="Username for authentication"
    )
    
    password: Optional[str] = Field(
        default=None,
        description="Password for authentication"
    )
    
    workspace_id: str = Field(
        default="default",
        description="Workspace ID for multi-tenant environments"
    )
    
    project_name: Optional[str] = Field(
        default=None,
        description="Default project name for traces"
    )
    
    api_key: Optional[str] = Field(
        default=None,
        description="API key for authentication (alternative to username/password)"
    )
    
    # Performance and reliability settings
    timeout: float = Field(
        default=DEFAULT_TIMEOUT,
        ge=1.0,
        le=300.0,
        description="HTTP request timeout in seconds"
    )
    
    connect_timeout: float = Field(
        default=10.0,
        ge=1.0,
        le=60.0,
        description="Connection timeout in seconds"
    )
    
    read_timeout: float = Field(
        default=30.0,
        ge=1.0,
        le=300.0,
        description="Read timeout in seconds"
    )
    
    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum number of retry attempts"
    )
    
    retry_backoff: float = Field(
        default=1.0,
        ge=0.1,
        le=10.0,
        description="Retry backoff multiplier"
    )
    
    # Tracing and buffering settings
    tracing_enabled: bool = Field(
        default=True,
        description="Enable/disable tracing globally"
    )
    
    batch_size: int = Field(
        default=DEFAULT_BATCH_SIZE,
        ge=1,
        le=10000,
        description="Number of traces to batch before sending"
    )
    
    flush_interval: float = Field(
        default=DEFAULT_FLUSH_INTERVAL,
        ge=1.0,
        le=3600.0,
        description="Automatic flush interval in seconds"
    )
    
    max_buffer_size: int = Field(
        default=DEFAULT_MAX_BUFFER_SIZE,
        ge=100,
        le=1000000,
        description="Maximum number of traces to buffer"
    )
    
    async_mode: bool = Field(
        default=True,
        description="Enable asynchronous operations"
    )
    
    compression: bool = Field(
        default=True,
        description="Enable request/response compression"
    )
    
    # Security settings
    verify_ssl: bool = Field(
        default=True,
        description="Verify SSL certificates"
    )
    
    ca_cert_path: Optional[str] = Field(
        default=None,
        description="Path to custom CA certificate file"
    )
    
    client_cert_path: Optional[str] = Field(
        default=None,
        description="Path to client certificate file"
    )
    
    client_key_path: Optional[str] = Field(
        default=None,
        description="Path to client private key file"
    )
    
    # Privacy and compliance
    pii_redaction_enabled: bool = Field(
        default=True,
        description="Enable automatic PII detection and redaction"
    )
    
    data_retention_days: int = Field(
        default=90,
        ge=1,
        le=3650,  # 10 years max
        description="Data retention period in days"
    )
    
    # Debugging and logging
    debug: bool = Field(
        default=False,
        description="Enable debug mode"
    )
    
    log_level: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )
    
    log_requests: bool = Field(
        default=False,
        description="Log HTTP requests and responses"
    )
    
    # Advanced settings
    user_agent_suffix: Optional[str] = Field(
        default=None,
        description="Custom suffix for User-Agent header"
    )
    
    proxy_url: Optional[str] = Field(
        default=None,
        description="HTTP proxy URL"
    )
    
    headers: Dict[str, str] = Field(
        default_factory=dict,
        description="Custom headers to include in requests"
    )
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate and normalize the backend URL."""
        if not v:
            raise ValueError("URL cannot be empty")
        
        # Add scheme if missing
        if not v.startswith(('http://', 'https://')):
            v = f"http://{v}"
        
        # Parse and validate URL
        parsed = urlparse(v)
        if not parsed.hostname:
            raise ValueError(f"Invalid URL format: {v}")
        
        # Remove trailing slash
        return v.rstrip('/')
    
    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return v_upper
    
    @field_validator('ca_cert_path', 'client_cert_path', 'client_key_path')
    @classmethod
    def validate_cert_paths(cls, v: Optional[str]) -> Optional[str]:
        """Validate certificate file paths."""
        if v is not None and not pathlib.Path(v).exists():
            raise ValueError(f"Certificate file not found: {v}")
        return v
    
    def model_post_init(self, __context) -> None:
        """Post-initialization validation."""
        # Validate authentication
        if not self.api_key and not (self.username and self.password):
            raise ValueError(
                "Authentication required: provide either api_key or both username and password"
            )
        
        # Cannot have both authentication methods
        if self.api_key and (self.username or self.password):
            raise ValueError(
                "Conflicting authentication: provide either api_key or username/password, not both"
            )
        
        # Validate client certificate config
        if bool(self.client_cert_path) != bool(self.client_key_path):
            raise ValueError(
                "Client certificate configuration incomplete: "
                "both client_cert_path and client_key_path must be provided together"
            )
    
    def model_dump_safe(self) -> Dict[str, Any]:
        """
        Dump configuration with sensitive values masked.
        Used for logging and debugging.
        """
        data = self.model_dump()
        
        # Mask sensitive fields
        sensitive_fields = ['password', 'api_key']
        for field in sensitive_fields:
            if data.get(field):
                data[field] = "***MASKED***"
        
        return data
    
    @classmethod
    def from_file(cls, config_path: Union[str, pathlib.Path]) -> 'SprintLensConfig':
        """Load configuration from YAML file."""
        config_path = pathlib.Path(config_path).expanduser()
        
        if not config_path.exists():
            raise SprintLensConfigError(
                f"Configuration file not found: {config_path}",
                details={"config_path": str(config_path)}
            )
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f) or {}
            
            return cls(**data)
        
        except yaml.YAMLError as e:
            raise SprintLensConfigError(
                f"Invalid YAML in configuration file: {e}",
                details={"config_path": str(config_path)},
                cause=e
            )
        except Exception as e:
            raise SprintLensConfigError(
                f"Failed to load configuration file: {e}",
                details={"config_path": str(config_path)},
                cause=e
            )


# Global configuration instance
_config: Optional[SprintLensConfig] = None


def get_config() -> SprintLensConfig:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = SprintLensConfig()
    return _config


def set_config(config: SprintLensConfig) -> None:
    """Set the global configuration instance."""
    global _config
    _config = config


def reset_config() -> None:
    """Reset the global configuration to defaults."""
    global _config
    _config = None


def load_config_from_file(config_path: Union[str, pathlib.Path]) -> SprintLensConfig:
    """Load configuration from file and set as global config."""
    config = SprintLensConfig.from_file(config_path)
    set_config(config)
    return config