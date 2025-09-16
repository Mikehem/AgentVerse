"""
Environment detection and utilities for Sprint Lens SDK.

This module provides utilities for detecting the runtime environment
and adjusting SDK behavior accordingly.
"""

import os
import sys
from typing import Optional


def is_pytest() -> bool:
    """Check if running under pytest."""
    return "pytest" in sys.modules or "PYTEST_CURRENT_TEST" in os.environ


def is_notebook() -> bool:
    """Check if running in a Jupyter notebook environment."""
    try:
        from IPython import get_ipython
        if get_ipython() is not None:
            return get_ipython().__class__.__name__ == 'ZMQInteractiveShell'
    except ImportError:
        pass
    return False


def is_streamlit() -> bool:
    """Check if running in Streamlit environment."""
    return "streamlit" in sys.modules


def is_fastapi() -> bool:
    """Check if running in FastAPI environment."""
    return "fastapi" in sys.modules


def is_docker() -> bool:
    """Check if running inside Docker container."""
    return os.path.exists("/.dockerenv") or os.path.exists("/proc/1/cgroup")


def is_ci() -> bool:
    """Check if running in CI environment."""
    ci_env_vars = [
        "CI", "CONTINUOUS_INTEGRATION", "GITHUB_ACTIONS", 
        "GITLAB_CI", "JENKINS_URL", "BUILDKITE", "CIRCLECI"
    ]
    return any(os.getenv(var) for var in ci_env_vars)


def get_python_version() -> str:
    """Get Python version string."""
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"


def get_platform() -> str:
    """Get platform information."""
    import platform
    return platform.platform()


def should_enable_error_tracking() -> bool:
    """Determine if error tracking should be enabled."""
    # Disable error tracking in test environments
    if is_pytest() or is_ci():
        return False
    
    # Check environment variable override
    error_tracking_env = os.getenv("SPRINTLENS_ERROR_TRACKING", "").lower()
    if error_tracking_env in ("false", "0", "no", "off"):
        return False
    
    return True


def get_environment_info() -> dict:
    """Get comprehensive environment information."""
    return {
        "python_version": get_python_version(),
        "platform": get_platform(),
        "is_pytest": is_pytest(),
        "is_notebook": is_notebook(),
        "is_streamlit": is_streamlit(),
        "is_fastapi": is_fastapi(),
        "is_docker": is_docker(),
        "is_ci": is_ci(),
    }