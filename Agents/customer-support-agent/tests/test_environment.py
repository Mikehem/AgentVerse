"""
Test environment setup and configuration.
"""

import pytest
from customer_support_agent.config.settings import (
    agent_lens_settings,
    llm_settings,
    agent_settings
)

def test_agent_lens_configuration():
    """Test Agent Lens configuration is loaded."""
    assert agent_lens_settings.url
    # project_id can be empty in development
    assert isinstance(agent_lens_settings.project_id, str)

def test_llm_configuration():
    """Test LLM configuration is loaded."""
    # API key can be empty in development, just test structure
    assert isinstance(llm_settings.openai_api_key, str)
    assert llm_settings.openai_model
    assert llm_settings.openai_model in ["gpt-4", "gpt-4o-mini", "gpt-3.5-turbo"]

def test_agent_configuration():
    """Test agent configuration is loaded."""
    assert agent_settings.name
    assert agent_settings.version
    assert agent_settings.environment
    assert agent_settings.max_retries > 0
    assert agent_settings.timeout_seconds > 0

@pytest.mark.asyncio
async def test_import_dependencies():
    """Test that all required dependencies can be imported."""
    import sprintlens
    from langgraph.graph import StateGraph
    import langchain
    
    # Test basic imports work
    assert sprintlens.__version__
    assert StateGraph is not None
    assert langchain.__version__