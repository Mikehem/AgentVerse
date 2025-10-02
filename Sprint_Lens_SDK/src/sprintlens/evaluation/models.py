"""
Custom Model Integration for AgentLens Evaluation Framework

This module provides custom model integration capabilities for the AgentLens
evaluation framework, allowing users to integrate various language models
for evaluation metrics.
"""

import asyncio
import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Union
import httpx

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ModelResponse:
    """Response from a custom model."""
    content: str
    model: str
    usage: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    latency: Optional[float] = None
    cost: Optional[float] = None


class AgentLensBaseModel(ABC):
    """
    Abstract base class for custom models in AgentLens evaluation framework.
    
    All custom models must inherit from this class and implement the required methods.
    This provides a consistent interface for model integration across different providers.
    """
    
    def __init__(self, model_name: str, **kwargs):
        """
        Initialize the custom model.
        
        Args:
            model_name: Name/identifier of the model
            **kwargs: Additional model-specific configuration
        """
        self.model_name = model_name
        self.config = kwargs
        self._session = None
    
    @abstractmethod
    async def generate_string(self, input_text: str, **kwargs) -> str:
        """
        Generate a string response from the model.
        
        Args:
            input_text: Input prompt/text for the model
            **kwargs: Additional generation parameters
            
        Returns:
            Generated text response from the model
        """
        pass
    
    @abstractmethod
    async def generate_provider_response(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        """
        Generate a provider-specific response with full metadata.
        
        Args:
            messages: List of message objects with role and content
            **kwargs: Additional generation parameters
            
        Returns:
            ModelResponse object with content and metadata
        """
        pass
    
    async def close(self):
        """Close any open connections or cleanup resources."""
        if self._session:
            await self._session.aclose()
            self._session = None


class LiteLLMChatModel(AgentLensBaseModel):
    """
    Model wrapper for LiteLLM-compatible models.
    
    Supports a wide range of models through the LiteLLM library including
    OpenAI, Anthropic, Google, Azure, and many others.
    """
    
    def __init__(
        self,
        model_name: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: Optional[int] = 1000,
        **kwargs
    ):
        """
        Initialize LiteLLM model.
        
        Args:
            model_name: Model name (e.g., 'gpt-4', 'claude-3-sonnet', 'gemini-pro')
            api_key: API key for the model provider
            base_url: Custom base URL for the model API
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional LiteLLM parameters
        """
        super().__init__(model_name, **kwargs)
        self.api_key = api_key
        self.base_url = base_url
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Try to import litellm
        try:
            import litellm
            self.litellm = litellm
            # Configure litellm settings
            if api_key:
                litellm.api_key = api_key
            if base_url:
                litellm.api_base = base_url
        except ImportError:
            raise ImportError(
                "LiteLLM is required for LiteLLMChatModel. "
                "Install it with: pip install litellm"
            )
    
    async def generate_string(self, input_text: str, **kwargs) -> str:
        """Generate string response using LiteLLM."""
        messages = [{"role": "user", "content": input_text}]
        response = await self.generate_provider_response(messages, **kwargs)
        return response.content
    
    async def generate_provider_response(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        """Generate response using LiteLLM with full metadata."""
        start_time = time.time()
        
        try:
            # Merge configuration
            generation_kwargs = {
                "model": self.model_name,
                "messages": messages,
                "temperature": kwargs.get("temperature", self.temperature),
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                **{k: v for k, v in kwargs.items() if k not in ["temperature", "max_tokens"]}
            }
            
            # Add API key if provided
            if self.api_key:
                generation_kwargs["api_key"] = self.api_key
            if self.base_url:
                generation_kwargs["api_base"] = self.base_url
            
            # Call LiteLLM asynchronously
            response = await self.litellm.acompletion(**generation_kwargs)
            
            latency = time.time() - start_time
            
            # Extract content
            content = response.choices[0].message.content
            
            # Extract usage information
            usage = {}
            if hasattr(response, 'usage') and response.usage:
                usage = {
                    "prompt_tokens": getattr(response.usage, 'prompt_tokens', 0),
                    "completion_tokens": getattr(response.usage, 'completion_tokens', 0),
                    "total_tokens": getattr(response.usage, 'total_tokens', 0)
                }
            
            # Estimate cost (basic estimation)
            cost = self._estimate_cost(usage.get("total_tokens", 0))
            
            return ModelResponse(
                content=content,
                model=self.model_name,
                usage=usage,
                metadata={
                    "provider": "litellm",
                    "response_id": getattr(response, 'id', None),
                    "created": getattr(response, 'created', None)
                },
                latency=latency,
                cost=cost
            )
            
        except Exception as e:
            logger.error(f"LiteLLM model call failed: {e}")
            raise
    
    def _estimate_cost(self, total_tokens: int) -> float:
        """Basic cost estimation based on token usage."""
        # Simple cost estimation - can be enhanced with actual pricing
        cost_per_1k_tokens = 0.002  # Default rough estimate
        return (total_tokens / 1000) * cost_per_1k_tokens


class CustomOpenAICompatibleModel(AgentLensBaseModel):
    """
    Custom model for OpenAI-compatible APIs.
    
    This can be used for any API that follows the OpenAI chat completions format,
    including local models, custom deployments, and alternative providers.
    """
    
    def __init__(
        self,
        model_name: str,
        api_key: str,
        base_url: str,
        temperature: float = 0.0,
        max_tokens: Optional[int] = 1000,
        timeout: float = 30.0,
        **kwargs
    ):
        """
        Initialize custom OpenAI-compatible model.
        
        Args:
            model_name: Name of the model
            api_key: API key for authentication
            base_url: Base URL of the API endpoint
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            timeout: Request timeout in seconds
            **kwargs: Additional parameters
        """
        super().__init__(model_name, **kwargs)
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout
        
        # Initialize HTTP client
        self._session = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
    
    async def generate_string(self, input_text: str, **kwargs) -> str:
        """Generate string response."""
        messages = [{"role": "user", "content": input_text}]
        response = await self.generate_provider_response(messages, **kwargs)
        return response.content
    
    async def generate_provider_response(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        """Generate response using OpenAI-compatible API."""
        start_time = time.time()
        
        try:
            payload = {
                "model": self.model_name,
                "messages": messages,
                "temperature": kwargs.get("temperature", self.temperature),
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                **{k: v for k, v in kwargs.items() if k not in ["temperature", "max_tokens"]}
            }
            
            response = await self._session.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload
            )
            response.raise_for_status()
            
            latency = time.time() - start_time
            data = response.json()
            
            # Extract content
            content = data["choices"][0]["message"]["content"]
            
            # Extract usage information
            usage = data.get("usage", {})
            
            # Estimate cost
            cost = self._estimate_cost(usage.get("total_tokens", 0))
            
            return ModelResponse(
                content=content,
                model=self.model_name,
                usage=usage,
                metadata={
                    "provider": "openai_compatible",
                    "response_id": data.get("id"),
                    "created": data.get("created")
                },
                latency=latency,
                cost=cost
            )
            
        except Exception as e:
            logger.error(f"Custom OpenAI-compatible model call failed: {e}")
            raise
    
    def _estimate_cost(self, total_tokens: int) -> float:
        """Basic cost estimation."""
        cost_per_1k_tokens = 0.002
        return (total_tokens / 1000) * cost_per_1k_tokens


class HuggingFaceModel(AgentLensBaseModel):
    """
    Custom model for Hugging Face Inference API.
    
    Supports both Hugging Face hosted models and custom endpoints.
    """
    
    def __init__(
        self,
        model_name: str,
        api_key: str,
        endpoint_url: Optional[str] = None,
        max_new_tokens: int = 1000,
        temperature: float = 0.0,
        **kwargs
    ):
        """
        Initialize Hugging Face model.
        
        Args:
            model_name: Hugging Face model name or identifier
            api_key: Hugging Face API token
            endpoint_url: Custom endpoint URL (for inference endpoints)
            max_new_tokens: Maximum new tokens to generate
            temperature: Sampling temperature
            **kwargs: Additional parameters
        """
        super().__init__(model_name, **kwargs)
        self.api_key = api_key
        self.endpoint_url = endpoint_url or f"https://api-inference.huggingface.co/models/{model_name}"
        self.max_new_tokens = max_new_tokens
        self.temperature = temperature
        
        # Initialize HTTP client
        self._session = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
    
    async def generate_string(self, input_text: str, **kwargs) -> str:
        """Generate string response."""
        response = await self.generate_provider_response(
            [{"role": "user", "content": input_text}], 
            **kwargs
        )
        return response.content
    
    async def generate_provider_response(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        """Generate response using Hugging Face API."""
        start_time = time.time()
        
        try:
            # Convert messages to a single prompt (HF models often expect single text input)
            prompt = self._format_messages_as_prompt(messages)
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": kwargs.get("max_new_tokens", self.max_new_tokens),
                    "temperature": kwargs.get("temperature", self.temperature),
                    "return_full_text": False,
                    **{k: v for k, v in kwargs.items() if k not in ["max_new_tokens", "temperature"]}
                }
            }
            
            response = await self._session.post(self.endpoint_url, json=payload)
            response.raise_for_status()
            
            latency = time.time() - start_time
            data = response.json()
            
            # Handle different response formats
            if isinstance(data, list) and len(data) > 0:
                content = data[0].get("generated_text", "")
            else:
                content = str(data)
            
            return ModelResponse(
                content=content,
                model=self.model_name,
                usage={"total_tokens": len(content.split())},  # Rough estimation
                metadata={
                    "provider": "huggingface",
                    "endpoint": self.endpoint_url
                },
                latency=latency,
                cost=0.0  # HF inference API is often free
            )
            
        except Exception as e:
            logger.error(f"Hugging Face model call failed: {e}")
            raise
    
    def _format_messages_as_prompt(self, messages: List[Dict[str, str]]) -> str:
        """Format chat messages as a single prompt."""
        formatted_parts = []
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            if role == "user":
                formatted_parts.append(f"Human: {content}")
            elif role == "assistant":
                formatted_parts.append(f"Assistant: {content}")
            else:
                formatted_parts.append(f"{role.title()}: {content}")
        
        return "\n".join(formatted_parts) + "\nAssistant:"