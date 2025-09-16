"""
LLM provider implementations for Sprint Lens SDK.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Union
import asyncio


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    async def generate_async(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """Generate response asynchronously."""
        pass
    
    def generate(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """Generate response synchronously."""
        return asyncio.run(self.generate_async(messages, model, temperature, max_tokens, **kwargs))


class OpenAIProvider(LLMProvider):
    """OpenAI LLM provider."""
    
    def __init__(self, api_key: str, **kwargs):
        self.api_key = api_key
        self.config = kwargs
    
    async def generate_async(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        # Placeholder implementation - would integrate with OpenAI API
        return "Mock OpenAI response"


class AzureOpenAIProvider(LLMProvider):
    """Azure OpenAI LLM provider."""
    
    def __init__(
        self,
        api_key: str,
        endpoint: str,
        api_version: str = "2024-02-15-preview",
        **kwargs
    ):
        self.api_key = api_key
        self.endpoint = endpoint
        self.api_version = api_version
        self.config = kwargs
    
    async def generate_async(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        # Placeholder implementation - would integrate with Azure OpenAI API
        return "Mock Azure OpenAI response"