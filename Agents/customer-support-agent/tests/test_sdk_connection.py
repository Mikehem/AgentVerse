"""
Test Sprint Lens SDK connection and basic functionality.
"""

import pytest
import asyncio
from typing import Dict, Any
import sprintlens
from customer_support_agent.config.sprintlens_config import (
    health_check, 
    get_client_info,
    settings
)

class TestSDKConnection:
    """Test suite for SDK connection and basic operations."""
    
    def test_configuration_loaded(self):
        """Test that configuration is properly loaded."""
        assert settings.url
        assert settings.project_name
        # Don't assert on credentials in tests for security
    
    def test_client_info(self):
        """Test getting client information."""
        info = get_client_info()
        assert isinstance(info, dict)
        assert "configured" in info
    
    def test_health_check(self):
        """Test health check functionality."""
        health = health_check()
        assert isinstance(health, dict)
        assert "status" in health
        assert health["status"] in ["healthy", "unhealthy"]
    
    @pytest.mark.asyncio
    async def test_basic_tracing(self):
        """Test basic tracing functionality."""
        
        @sprintlens.track
        def simple_function(x: int) -> int:
            """A simple function to test tracing."""
            return x * 2
        
        # Execute function
        result = simple_function(5)
        assert result == 10
        
        # Give some time for trace to be sent
        await asyncio.sleep(0.1)
    
    @pytest.mark.asyncio
    async def test_manual_trace_creation(self):
        """Test manual trace and span creation."""
        
        # Ensure client is configured and initialized
        from customer_support_agent.config.sprintlens_config import configure_sprintlens
        configure_sprintlens()
        
        # Get the configured client and ensure it's initialized
        client = sprintlens.get_client()
        
        # Initialize the client if not already initialized
        if not client.is_initialized:
            try:
                await client.initialize()
            except Exception as e:
                # If backend is not available, skip the test gracefully
                pytest.skip(f"Backend not available for testing: {e}")
        
        # Create a trace manually using Trace constructor
        from sprintlens.tracing.trace import Trace
        trace = Trace(
            name="test_trace",
            client=client,
            tags={"test_type": "manual"},
            metadata={"test_environment": "development"}
        )
        
        # Use trace as context manager
        async with trace:
            # Create a span within the trace
            with trace.span(name="test_span") as span:
                span.set_input({"operation": "test"})
                span.set_output({"result": "success"})
                span.set_metadata("step", 1)
        
        # Give some time for trace to be sent
        await asyncio.sleep(0.1)
    
    def test_trace_context(self):
        """Test trace context management."""
        from sprintlens.tracing.context import TraceContext
        from sprintlens.tracing.trace import Trace
        
        # Get the configured client
        client = sprintlens.get_client()
        
        # Create trace using Trace constructor
        trace = Trace(name="context_test", client=client)
        
        # Use trace context
        with TraceContext(trace):
            # Get current trace
            current = sprintlens.get_current_trace()
            assert current is not None
            assert current.name == "context_test"

@pytest.mark.integration
class TestSDKIntegration:
    """Integration tests requiring backend connectivity."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_trace(self):
        """Test complete end-to-end tracing workflow."""
        
        @sprintlens.track(span_type="llm")
        async def async_function(prompt: str) -> str:
            """Simulate an async AI function."""
            await asyncio.sleep(0.01)  # Simulate processing
            return f"Response to: {prompt}"
        
        # Execute function
        result = await async_function("Hello, Sprint Lens!")
        assert "Hello, Sprint Lens!" in result
        
        # Allow time for trace processing
        await asyncio.sleep(0.5)
    
    def test_error_handling(self):
        """Test error handling in traced functions."""
        
        @sprintlens.track()
        def function_with_error():
            """Function that raises an error."""
            raise ValueError("Test error")
        
        # Function should still raise error
        with pytest.raises(ValueError):
            function_with_error()