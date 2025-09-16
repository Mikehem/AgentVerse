"""
Sprint Lens API endpoint definitions.

This module contains all API endpoint paths and URL construction utilities.
"""

from typing import Optional, Dict, Any
from urllib.parse import urljoin, urlencode

from ..core.constants import (
    API_VERSION, LOGIN_PATH, LOGOUT_PATH, STATUS_PATH, CREATE_USER_PATH,
    TRACES_PATH, SPANS_PATH, DATASETS_PATH, EXPERIMENTS_PATH, PROJECTS_PATH,
    JOBS_PATH, HEALTH_PATH
)


class Endpoints:
    """API endpoint definitions and URL construction utilities."""
    
    def __init__(self, base_url: str):
        """Initialize endpoints with base URL."""
        self.base_url = base_url.rstrip('/')
    
    def _build_url(self, path: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Build complete URL with optional query parameters."""
        url = urljoin(self.base_url, path.lstrip('/'))
        
        if params:
            # Filter out None values and convert to strings
            clean_params = {k: str(v) for k, v in params.items() if v is not None}
            if clean_params:
                url += '?' + urlencode(clean_params)
        
        return url
    
    # Health and status endpoints
    def health(self) -> str:
        """Get health check endpoint URL."""
        return self._build_url(HEALTH_PATH)
    
    # Authentication endpoints
    def login(self) -> str:
        """Get login endpoint URL.""" 
        return self._build_url(LOGIN_PATH)
    
    def logout(self) -> str:
        """Get logout endpoint URL."""
        return self._build_url(LOGOUT_PATH)
    
    def auth_status(self) -> str:
        """Get authentication status endpoint URL."""
        return self._build_url(STATUS_PATH)
    
    def create_user(self) -> str:
        """Get create user endpoint URL."""
        return self._build_url(CREATE_USER_PATH)
    
    # Tracing endpoints
    def traces(self, trace_id: Optional[str] = None, **params) -> str:
        """Get traces endpoint URL."""
        path = f"{TRACES_PATH}/{trace_id}" if trace_id else TRACES_PATH
        return self._build_url(path, params)
    
    def traces_batch(self) -> str:
        """Get batch traces endpoint URL."""
        return self._build_url(f"{TRACES_PATH}/batch")
    
    def spans(self, span_id: Optional[str] = None, **params) -> str:
        """Get spans endpoint URL."""
        path = f"{SPANS_PATH}/{span_id}" if span_id else SPANS_PATH
        return self._build_url(path, params)
    
    def spans_batch(self) -> str:
        """Get batch spans endpoint URL."""
        return self._build_url(f"{SPANS_PATH}/batch")
    
    # Data management endpoints
    def datasets(self, dataset_id: Optional[str] = None, **params) -> str:
        """Get datasets endpoint URL."""
        path = f"{DATASETS_PATH}/{dataset_id}" if dataset_id else DATASETS_PATH
        return self._build_url(path, params)
    
    def dataset_items(self, dataset_id: str, item_id: Optional[str] = None, **params) -> str:
        """Get dataset items endpoint URL."""
        base_path = f"{DATASETS_PATH}/{dataset_id}/items"
        path = f"{base_path}/{item_id}" if item_id else base_path
        return self._build_url(path, params)
    
    def experiments(self, experiment_id: Optional[str] = None, **params) -> str:
        """Get experiments endpoint URL."""
        path = f"{EXPERIMENTS_PATH}/{experiment_id}" if experiment_id else EXPERIMENTS_PATH
        return self._build_url(path, params)
    
    def experiment_items(self, experiment_id: str, item_id: Optional[str] = None, **params) -> str:
        """Get experiment items endpoint URL."""
        base_path = f"{EXPERIMENTS_PATH}/{experiment_id}/items"
        path = f"{base_path}/{item_id}" if item_id else base_path
        return self._build_url(path, params)
    
    def projects(self, project_id: Optional[str] = None, **params) -> str:
        """Get projects endpoint URL."""
        path = f"{PROJECTS_PATH}/{project_id}" if project_id else PROJECTS_PATH
        return self._build_url(path, params)
    
    # Job management endpoints
    def jobs(self, job_id: Optional[str] = None, **params) -> str:
        """Get jobs endpoint URL."""
        path = f"{JOBS_PATH}/{job_id}" if job_id else JOBS_PATH
        return self._build_url(path, params)
    
    def job_status(self, job_id: str) -> str:
        """Get job status endpoint URL."""
        return self._build_url(f"{JOBS_PATH}/{job_id}/status")
    
    def job_cancel(self, job_id: str) -> str:
        """Get job cancellation endpoint URL."""
        return self._build_url(f"{JOBS_PATH}/{job_id}/cancel")
    
    # Query endpoints
    def traces_search(self, **params) -> str:
        """Get traces search endpoint URL."""
        return self._build_url(f"{TRACES_PATH}/search", params)
    
    def spans_search(self, **params) -> str:
        """Get spans search endpoint URL."""
        return self._build_url(f"{SPANS_PATH}/search", params)
    
    def datasets_search(self, **params) -> str:
        """Get datasets search endpoint URL."""
        return self._build_url(f"{DATASETS_PATH}/search", params)
    
    # Metrics and analytics endpoints
    def project_metrics(self, project_id: str, **params) -> str:
        """Get project metrics endpoint URL."""
        return self._build_url(f"{PROJECTS_PATH}/{project_id}/metrics", params)
    
    def trace_metrics(self, trace_id: str, **params) -> str:
        """Get trace metrics endpoint URL."""
        return self._build_url(f"{TRACES_PATH}/{trace_id}/metrics", params)
    
    # Export endpoints
    def export_traces(self, **params) -> str:
        """Get export traces endpoint URL."""
        return self._build_url(f"{TRACES_PATH}/export", params)
    
    def export_dataset(self, dataset_id: str, **params) -> str:
        """Get export dataset endpoint URL."""
        return self._build_url(f"{DATASETS_PATH}/{dataset_id}/export", params)
    
    def export_experiment(self, experiment_id: str, **params) -> str:
        """Get export experiment endpoint URL."""
        return self._build_url(f"{EXPERIMENTS_PATH}/{experiment_id}/export", params)