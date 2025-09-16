"""
Sprint Lens SDK exception hierarchy.

This module defines all custom exceptions used throughout the SDK,
providing clear error categorization and helpful error messages.
"""

from typing import Optional, Dict, Any


class SprintLensError(Exception):
    """Base exception for all Sprint Lens SDK errors."""
    
    def __init__(
        self, 
        message: str, 
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.cause = cause
    
    def __str__(self) -> str:
        base_msg = self.message
        if self.details:
            details_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            base_msg += f" (Details: {details_str})"
        if self.cause:
            base_msg += f" (Caused by: {self.cause})"
        return base_msg


class SprintLensConnectionError(SprintLensError):
    """Raised when connection to Sprint Agent Lens backend fails."""
    
    def __init__(
        self, 
        message: str = "Failed to connect to Sprint Agent Lens backend",
        url: Optional[str] = None,
        status_code: Optional[int] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if url:
            details['url'] = url
        if status_code:
            details['status_code'] = status_code
        
        super().__init__(message, details=details, **kwargs)


class SprintLensAuthError(SprintLensError):
    """Raised when authentication with Sprint Agent Lens backend fails."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        username: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if username:
            details['username'] = username
            
        super().__init__(message, details=details, **kwargs)


class SprintLensConfigError(SprintLensError):
    """Raised when SDK configuration is invalid or incomplete."""
    
    def __init__(
        self,
        message: str = "Invalid configuration",
        config_key: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.pop('details', {})
        if config_key:
            details['config_key'] = config_key
            
        super().__init__(message, details=details, **kwargs)


class SprintLensValidationError(SprintLensError):
    """Raised when data validation fails."""
    
    def __init__(
        self,
        message: str = "Data validation failed",
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if field:
            details['field'] = field
        if value is not None:
            details['value'] = value
            
        super().__init__(message, details=details, **kwargs)


class SprintLensTimeoutError(SprintLensError):
    """Raised when operations timeout."""
    
    def __init__(
        self,
        message: str = "Operation timed out",
        timeout: Optional[float] = None,
        operation: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if timeout:
            details['timeout'] = timeout
        if operation:
            details['operation'] = operation
            
        super().__init__(message, details=details, **kwargs)


class SprintLensRateLimitError(SprintLensError):
    """Raised when API rate limits are exceeded."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if retry_after:
            details['retry_after_seconds'] = retry_after
            
        super().__init__(message, details=details, **kwargs)


class SprintLensNotFoundError(SprintLensError):
    """Raised when requested resource is not found."""
    
    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if resource_type:
            details['resource_type'] = resource_type
        if resource_id:
            details['resource_id'] = resource_id
            
        super().__init__(message, details=details, **kwargs)


class SprintLensPermissionError(SprintLensError):
    """Raised when user lacks required permissions for operation."""
    
    def __init__(
        self,
        message: str = "Insufficient permissions",
        required_permission: Optional[str] = None,
        resource: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if required_permission:
            details['required_permission'] = required_permission
        if resource:
            details['resource'] = resource
            
        super().__init__(message, details=details, **kwargs)


class SprintLensIntegrationError(SprintLensError):
    """Raised when third-party integration fails."""
    
    def __init__(
        self,
        message: str = "Integration error",
        integration: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if integration:
            details['integration'] = integration
            
        super().__init__(message, details=details, **kwargs)