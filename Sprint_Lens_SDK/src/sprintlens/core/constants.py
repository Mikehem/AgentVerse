"""
Sprint Lens SDK constants.

This module contains global constants used throughout the SDK.
"""

from typing import Final

# API and networking constants
DEFAULT_TIMEOUT: Final[float] = 30.0
DEFAULT_CONNECT_TIMEOUT: Final[float] = 10.0
DEFAULT_READ_TIMEOUT: Final[float] = 30.0
DEFAULT_RETRY_COUNT: Final[int] = 3
DEFAULT_RETRY_BACKOFF: Final[float] = 1.0
DEFAULT_MAX_RETRY_DELAY: Final[float] = 60.0

# Tracing and buffering constants
DEFAULT_BATCH_SIZE: Final[int] = 100
DEFAULT_FLUSH_INTERVAL: Final[float] = 10.0  # seconds
DEFAULT_MAX_BUFFER_SIZE: Final[int] = 10000
DEFAULT_MAX_SPAN_DEPTH: Final[int] = 100

# Authentication constants  
JWT_REFRESH_THRESHOLD: Final[float] = 300.0  # 5 minutes in seconds
DEFAULT_SESSION_TIMEOUT: Final[float] = 3600.0  # 1 hour in seconds

# Data limits
MAX_STRING_LENGTH: Final[int] = 100_000
MAX_METADATA_SIZE: Final[int] = 1_000_000  # 1MB in bytes
MAX_TAGS_COUNT: Final[int] = 100
MAX_TAG_KEY_LENGTH: Final[int] = 256
MAX_TAG_VALUE_LENGTH: Final[int] = 1024

# File and attachment limits
MAX_ATTACHMENT_SIZE: Final[int] = 100_000_000  # 100MB in bytes
SUPPORTED_ATTACHMENT_TYPES: Final[tuple] = (
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "text/plain", "text/csv", "text/html", "text/markdown",
    "application/json", "application/pdf", "application/zip",
    "application/octet-stream"
)

# Environment variable names
ENV_PREFIX: Final[str] = "SPRINTLENS_"
ENV_URL: Final[str] = f"{ENV_PREFIX}URL"
ENV_USERNAME: Final[str] = f"{ENV_PREFIX}USERNAME"  
ENV_PASSWORD: Final[str] = f"{ENV_PREFIX}PASSWORD"
ENV_WORKSPACE_ID: Final[str] = f"{ENV_PREFIX}WORKSPACE_ID"
ENV_PROJECT_NAME: Final[str] = f"{ENV_PREFIX}PROJECT_NAME"
ENV_API_KEY: Final[str] = f"{ENV_PREFIX}API_KEY"
ENV_DEBUG: Final[str] = f"{ENV_PREFIX}DEBUG"
ENV_TRACING_ENABLED: Final[str] = f"{ENV_PREFIX}TRACING_ENABLED"

# API endpoints
API_VERSION: Final[str] = "v1"
AUTH_ENDPOINT: Final[str] = f"/{API_VERSION}/enterprise/auth"
PRIVATE_ENDPOINT: Final[str] = f"/{API_VERSION}/private"
PUBLIC_ENDPOINT: Final[str] = f"/{API_VERSION}/public"

# Endpoint paths
LOGIN_PATH: Final[str] = f"{AUTH_ENDPOINT}/login"
LOGOUT_PATH: Final[str] = f"{AUTH_ENDPOINT}/logout" 
STATUS_PATH: Final[str] = f"{AUTH_ENDPOINT}/status"
CREATE_USER_PATH: Final[str] = f"{AUTH_ENDPOINT}/create-user"

TRACES_PATH: Final[str] = f"{PRIVATE_ENDPOINT}/traces"
SPANS_PATH: Final[str] = f"{PRIVATE_ENDPOINT}/spans"
DATASETS_PATH: Final[str] = f"{PRIVATE_ENDPOINT}/datasets"
EXPERIMENTS_PATH: Final[str] = f"{PRIVATE_ENDPOINT}/experiments"
PROJECTS_PATH: Final[str] = f"{PRIVATE_ENDPOINT}/projects"
JOBS_PATH: Final[str] = f"{PRIVATE_ENDPOINT}/jobs"

HEALTH_PATH: Final[str] = "/health"

# HTTP headers
AUTHORIZATION_HEADER: Final[str] = "Authorization"
CONTENT_TYPE_HEADER: Final[str] = "Content-Type"
USER_AGENT_HEADER: Final[str] = "User-Agent"
REQUEST_ID_HEADER: Final[str] = "X-Request-ID"
CORRELATION_ID_HEADER: Final[str] = "X-Correlation-ID"

# Content types
JSON_CONTENT_TYPE: Final[str] = "application/json"
FORM_CONTENT_TYPE: Final[str] = "application/x-www-form-urlencoded"
MULTIPART_CONTENT_TYPE: Final[str] = "multipart/form-data"

# Span types (matching backend enum)
class SpanTypes:
    GENERAL: Final[str] = "general"
    LLM: Final[str] = "llm"
    TOOL: Final[str] = "tool"
    RETRIEVER: Final[str] = "retriever"
    EMBEDDER: Final[str] = "embedder"
    RERANKER: Final[str] = "reranker"
    PARSER: Final[str] = "parser"
    AGENT: Final[str] = "agent"
    CHAIN: Final[str] = "chain"
    WORKFLOW: Final[str] = "workflow"

# LLM Providers (matching backend enum)
class LLMProviders:
    OPENAI: Final[str] = "openai"
    ANTHROPIC: Final[str] = "anthropic"
    AZURE_OPENAI: Final[str] = "azure_openai"
    BEDROCK: Final[str] = "bedrock"
    GOOGLE_AI: Final[str] = "google_ai"
    COHERE: Final[str] = "cohere"
    HUGGINGFACE: Final[str] = "huggingface"
    OLLAMA: Final[str] = "ollama"
    CUSTOM: Final[str] = "custom"

# Status values
class TraceStatuses:
    SUCCESS: Final[str] = "success"
    ERROR: Final[str] = "error"
    CANCELLED: Final[str] = "cancelled"

class ExperimentStatuses:
    RUNNING: Final[str] = "running"
    COMPLETED: Final[str] = "completed" 
    FAILED: Final[str] = "failed"
    CANCELLED: Final[str] = "cancelled"

# Configuration defaults
DEFAULT_CONFIG_FILE: Final[str] = "~/.sprintlens/config.yaml"
DEFAULT_CACHE_DIR: Final[str] = "~/.sprintlens/cache"
DEFAULT_LOG_LEVEL: Final[str] = "INFO"

# Performance constants
HIGH_VOLUME_THRESHOLD: Final[int] = 1000  # traces per minute
MEMORY_WARNING_THRESHOLD: Final[int] = 1_000_000  # bytes
CPU_WARNING_THRESHOLD: Final[float] = 0.8  # 80% CPU usage

# Feature flags
FEATURES = {
    "streaming_support": True,
    "async_batching": True,
    "pii_redaction": True,
    "compression": True,
    "circuit_breaker": True,
    "rate_limiting": True,
    "metrics_collection": True,
    "error_tracking": True,
}