"""
Configuration settings for the customer support agent.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AgentLensSettings(BaseSettings):
    """Agent Lens configuration settings."""
    
    url: str = "http://localhost:3000"
    username: str = ""
    password: str = ""
    project_id: str = ""
    
    model_config = {"env_prefix": "AGENT_LENS_"}

class LLMSettings(BaseSettings):
    """LLM provider configuration."""
    
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    
    model_config = {"env_prefix": "OPENAI_"}

class AgentSettings(BaseSettings):
    """Agent-specific configuration."""
    
    name: str = "customer-support-agent"
    version: str = "1.0.0"
    environment: str = "development"
    
    # Performance settings
    max_retries: int = 3
    timeout_seconds: int = 30
    
    model_config = {"env_prefix": "AGENT_"}

# Global settings instances
agent_lens_settings = AgentLensSettings()
llm_settings = LLMSettings()
agent_settings = AgentSettings()

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATASETS_DIR = DATA_DIR / "datasets"
PROMPTS_DIR = DATA_DIR / "prompts"