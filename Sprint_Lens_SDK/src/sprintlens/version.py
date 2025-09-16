"""Version information for Sprint Lens SDK."""

__version__ = "1.0.0"

# Version components
VERSION_MAJOR = 1
VERSION_MINOR = 0  
VERSION_PATCH = 0
VERSION_PRE_RELEASE = None

# Build information
BUILD_DATE = "2025-01-03"
BUILD_HASH = None

# API version compatibility
API_VERSION = "v1"
MIN_BACKEND_VERSION = "1.0.0"

def get_version_info() -> dict:
    """Get detailed version information."""
    return {
        "version": __version__,
        "major": VERSION_MAJOR,
        "minor": VERSION_MINOR, 
        "patch": VERSION_PATCH,
        "pre_release": VERSION_PRE_RELEASE,
        "build_date": BUILD_DATE,
        "build_hash": BUILD_HASH,
        "api_version": API_VERSION,
        "min_backend_version": MIN_BACKEND_VERSION,
    }

def get_user_agent() -> str:
    """Get user agent string for HTTP requests."""
    return f"SprintLens-SDK/{__version__}"