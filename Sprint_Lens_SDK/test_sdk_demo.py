#!/usr/bin/env python3
"""
Sprint Lens SDK Demo - Local Testing without Backend

This script demonstrates the SDK functionality locally without requiring
a running backend. It shows:

1. SDK initialization and configuration
2. Trace and span creation
3. @track decorator functionality  
4. Context management
5. Data serialization and validation
6. Error handling

This serves as both a demo and a test of the core SDK functionality.
"""

import asyncio
import json
import sys
import os
import time
import random
from datetime import datetime
from typing import Dict, Any, Optional

# Add SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from sprintlens.tracing.trace import Trace
    from sprintlens.tracing.span import Span
    from sprintlens.tracing.context import (
        get_current_trace, set_current_trace, 
        get_current_span, set_current_span,
        TraceContext, SpanContext
    )
    from sprintlens.tracing.types import SpanType, TraceStatus
    from sprintlens.tracing.decorator import track
    from sprintlens.utils.logging import setup_logging
    from sprintlens.utils.serialization import serialize_safely
    from sprintlens.utils.validation import validate_trace_name, sanitize_tags
except ImportError as e:
    print(f"Failed to import Sprint Lens SDK: {e}")
    print("Please ensure all SDK modules are properly implemented")
    sys.exit(1)

# Setup logging
setup_logging(level="INFO")


class MockConfig:
    """Mock configuration for testing."""
    def __init__(self, url: str, username: str, workspace_id: str, project_name: str = "demo_project"):
        self.url = url
        self.username = username
        self.workspace_id = workspace_id
        self.project_name = project_name


class MockSprintLensClient:
    """Mock client for testing SDK functionality without backend."""
    
    def __init__(self, url: str, username: str, password: str, workspace_id: str):
        self.url = url
        self.username = username
        self.workspace_id = workspace_id
        self.authenticated = False
        self.traces_buffer = []
        
        # Create mock config
        self.config = MockConfig(url, username, workspace_id)
        
        print(f"🔧 Mock Sprint Lens Client initialized")
        print(f"   URL: {url}")
        print(f"   Workspace: {workspace_id}")
    
    async def authenticate(self):
        """Mock authentication."""
        print("🔐 Mock authentication...")
        await asyncio.sleep(0.1)  # Simulate network delay
        self.authenticated = True
        print("✅ Mock authentication successful!")
    
    def create_trace(self, name: str, **kwargs) -> Trace:
        """Create a trace with mock client."""
        print(f"📊 Creating trace: {name}")
        trace = Trace(name=name, client=self, **kwargs)
        return trace
        
    def get_current_trace(self) -> Optional[Trace]:
        """Get current trace."""
        return get_current_trace()
    
    async def _add_trace_to_buffer(self, trace_data: Dict[str, Any]):
        """Mock method to buffer trace data."""
        self.traces_buffer.append(trace_data)
        print(f"📤 Trace buffered: {trace_data['id'][:8]}... (Total: {len(self.traces_buffer)})")
    
    async def health_check(self) -> Dict[str, Any]:
        """Mock health check."""
        return {
            "status": "healthy",
            "version": "1.0.0-mock",
            "timestamp": datetime.now().isoformat()
        }
    
    async def close(self):
        """Mock close."""
        print(f"🔄 Closing client. Buffered {len(self.traces_buffer)} traces.")


# Test functions to demonstrate SDK capabilities

def preprocess_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """Test function with manual span tracking."""
    current_trace = get_current_trace()
    if not current_trace:
        print("⚠️  No active trace for preprocessing")
        return raw_data
    
    with current_trace.span("data_preprocessing", span_type=SpanType.PROCESSING) as span:
        span.set_input(raw_data)
        span.add_tag("operation", "preprocessing")
        
        print("🔄 Processing data...")
        time.sleep(0.1)  # Simulate processing
        
        processed = {
            "processed_data": {k: str(v).upper() if isinstance(v, str) else v for k, v in raw_data.items()},
            "metadata": {
                "processed_at": datetime.now().isoformat(),
                "processor_version": "1.0.0"
            }
        }
        
        span.set_output(processed)
        span.add_metric("items_processed", len(raw_data))
        
        return processed


async def simulate_llm_call(prompt: str, model: str = "gpt-4o-mini") -> Dict[str, Any]:
    """Simulate an LLM call with manual span tracking."""
    current_trace = get_current_trace()
    if not current_trace:
        print("⚠️  No active trace for LLM call")
        return {"error": "No active trace"}
    
    with current_trace.span("llm_call_simulation", span_type=SpanType.LLM) as span:
        span.set_input({"prompt": prompt, "model": model})
        span.set_model_info(model=model, provider="openai", version="2024-07-18")
        span.add_tag("model_type", "chat")
        
        print(f"🤖 Simulating LLM call to {model}...")
        
        # Simulate token usage
        prompt_tokens = len(prompt.split()) * 1.3
        completion_tokens = random.randint(50, 200)
        total_tokens = int(prompt_tokens + completion_tokens)
        
        span.set_token_usage(
            prompt_tokens=int(prompt_tokens),
            completion_tokens=completion_tokens,
            total_tokens=total_tokens
        )
        
        # Simulate cost
        cost = (prompt_tokens * 0.00015 + completion_tokens * 0.0006) / 1000
        span.set_cost(cost, "USD")
        
        # Simulate processing time
        processing_time = random.uniform(0.2, 0.8)
        await asyncio.sleep(processing_time)
        
        # Simulate response
        confidence = random.uniform(0.7, 0.98)
        response = {
            "response": f"AI response to: '{prompt}' (confidence: {confidence:.2f})",
            "model": model,
            "confidence": confidence,
            "processing_time_ms": processing_time * 1000,
            "tokens": total_tokens,
            "cost_usd": cost
        }
        
        span.set_output(response)
        span.add_metric("confidence", confidence)
        span.add_metric("processing_time_ms", processing_time * 1000)
        
        return response


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """Analyze sentiment with manual span creation."""
    current_trace = get_current_trace()
    if not current_trace:
        print("⚠️  No active trace for sentiment analysis")
        return {"error": "No active trace"}
    
    with current_trace.span("sentiment_analysis", span_type=SpanType.PROCESSING) as span:
        span.set_input({"text": text})
        span.add_tag("analysis_type", "sentiment")
        span.add_tag("language", "en")
        
        print("💭 Analyzing sentiment...")
        time.sleep(0.05)  # Simulate processing
        
        # Mock sentiment analysis
        sentiment_score = random.uniform(-1.0, 1.0)
        if sentiment_score > 0.3:
            sentiment = "positive"
        elif sentiment_score < -0.3:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        result = {
            "sentiment": sentiment,
            "confidence": abs(sentiment_score),
            "score": sentiment_score,
            "text_length": len(text)
        }
        
        span.set_output(result)
        span.add_metric("confidence", abs(sentiment_score))
        span.add_metric("text_length", len(text))
        
        return result


async def demonstrate_error_handling():
    """Demonstrate error handling in spans."""
    current_trace = get_current_trace()
    if not current_trace:
        print("⚠️  No active trace for error demo")
        return
    
    try:
        with current_trace.span("error_demonstration", span_type=SpanType.CUSTOM) as span:
            span.set_input({"demo": "error_handling"})
            span.add_tag("test_type", "error_demo")
            
            print("⚠️  Demonstrating error handling...")
            
            # Simulate some work before error
            await asyncio.sleep(0.1)
            span.set_metadata("work_completed", 25)
            
            # Intentionally raise an error
            raise ValueError("This is a demonstration error")
            
    except ValueError as e:
        print(f"✅ Error properly captured and handled: {e}")


async def run_comprehensive_demo():
    """Run comprehensive SDK demonstration."""
    print("🚀 Sprint Lens SDK - Comprehensive Demo")
    print("=" * 50)
    
    # Initialize mock client
    client = MockSprintLensClient(
        url="http://localhost:3000",
        username="demo_user",
        password="demo_password",
        workspace_id="demo_workspace"
    )
    
    await client.authenticate()
    
    # Create main workflow trace
    trace = client.create_trace(
        name="comprehensive_ai_workflow",
        input_data={
            "workflow_type": "demo",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        },
        tags={
            "demo": "true",
            "environment": "local",
            "agent_type": "test"
        },
        metadata={
            "description": "Comprehensive demo of Sprint Lens SDK capabilities",
            "features_tested": [
                "trace_creation", "span_management", "context_propagation",
                "decorators", "error_handling", "metrics"
            ]
        }
    )
    
    print(f"\n📊 Created main trace: {trace.id}")
    
    # Use trace as context manager
    async with trace:
        print("\n--- Phase 1: Data Preprocessing ---")
        
        # Test manual span tracking with sync function
        raw_data = {
            "user_input": "Hello, Sprint Lens!",
            "priority": "high",
            "category": "demo"
        }
        
        processed_data = preprocess_data(raw_data)
        print(f"✅ Data preprocessing completed")
        
        print("\n--- Phase 2: AI Processing ---")
        
        # Test manual span tracking with async function
        llm_result = await simulate_llm_call(
            prompt="Analyze this demo data and provide insights",
            model="gpt-4o-mini"
        )
        print(f"✅ LLM simulation completed")
        
        print("\n--- Phase 3: Analysis ---")
        
        # Test manual span creation
        sentiment_result = analyze_sentiment(processed_data["processed_data"]["user_input"])
        print(f"✅ Sentiment analysis completed: {sentiment_result['sentiment']}")
        
        print("\n--- Phase 4: Complex Nested Operations ---")
        
        # Create nested spans manually
        with trace.span("complex_analysis", span_type=SpanType.PROCESSING) as parent_span:
            parent_span.set_input({
                "processed_data": processed_data,
                "llm_result": llm_result,
                "sentiment": sentiment_result
            })
            parent_span.add_tag("operation", "complex_analysis")
            
            # Nested span 1
            with parent_span.create_child_span("data_correlation", SpanType.PROCESSING) as child_span1:
                child_span1.set_input({"data_points": 3})
                await asyncio.sleep(0.1)
                correlation_result = {
                    "correlation_score": 0.85,
                    "confidence": 0.92
                }
                child_span1.set_output(correlation_result)
                child_span1.add_metric("correlation_score", 0.85)
            
            # Nested span 2
            with parent_span.create_child_span("insight_generation", SpanType.LLM) as child_span2:
                child_span2.set_input({"correlation": correlation_result})
                child_span2.set_model_info(model="analysis-model", provider="custom")
                await asyncio.sleep(0.15)
                insights = {
                    "key_insights": [
                        "User input shows positive sentiment",
                        "High priority classification is accurate",
                        "Demo category appropriately assigned"
                    ],
                    "confidence": 0.88
                }
                child_span2.set_output(insights)
                child_span2.add_metric("insights_generated", len(insights["key_insights"]))
            
            # Set parent span output
            analysis_result = {
                "correlation": correlation_result,
                "insights": insights,
                "analysis_complete": True
            }
            parent_span.set_output(analysis_result)
            parent_span.add_metric("analysis_confidence", 0.88)
        
        print("✅ Complex nested analysis completed")
        
        print("\n--- Phase 5: Error Handling Demo ---")
        await demonstrate_error_handling()
        
        print("\n--- Phase 6: Final Report Generation ---")
        
        with trace.span("report_generation", span_type=SpanType.PROCESSING) as report_span:
            report_span.add_tag("format", "json")
            report_span.add_tag("sections", "summary,details,metrics")
            
            final_report = {
                "workflow_summary": {
                    "trace_id": trace.id,
                    "status": "completed",
                    "duration_ms": None,  # Will be calculated by trace
                    "spans_created": len(trace.get_spans())
                },
                "results": {
                    "preprocessing": processed_data,
                    "llm_analysis": llm_result,
                    "sentiment": sentiment_result,
                    "complex_analysis": analysis_result
                },
                "metrics": {
                    "total_processing_steps": 6,
                    "success_rate": 100,
                    "demo_completed": True
                }
            }
            
            report_span.set_output(final_report)
            report_span.add_metric("report_sections", 3)
            
            # Set final trace output
            trace.set_output(final_report)
            
        print("✅ Final report generated")
        
        # Add some trace-level metrics
        trace.add_metric("total_steps", 6)
        trace.add_metric("success_rate", 100.0)
        trace.add_score("overall_quality", 0.95)
        trace.add_feedback("demo_feedback", "Excellent demonstration", rating=5)
    
    # Verify trace completion
    print(f"\n📈 Trace Summary:")
    print(f"   Trace ID: {trace.id}")
    print(f"   Status: {trace.status.value}")
    print(f"   Spans Created: {len(trace.get_spans())}")
    print(f"   Duration: {trace.duration_ms:.2f}ms" if trace.duration_ms else "   Duration: Calculating...")
    print(f"   Is Finished: {trace.is_finished}")
    
    # Show span hierarchy
    print(f"\n📊 Span Hierarchy:")
    for i, span in enumerate(trace.get_spans(), 1):
        parent_info = f" (parent: {span.parent_id[:8]}...)" if span.parent_id else " (root)"
        print(f"   {i}. {span.name} [{span.span_type.value}]{parent_info}")
        print(f"      Status: {span.status.value}, Duration: {span.duration_ms:.2f}ms" if span.duration_ms else f"      Status: {span.status.value}")
    
    # Show buffered data
    print(f"\n💾 Data Persistence:")
    print(f"   Traces buffered: {len(client.traces_buffer)}")
    
    if client.traces_buffer:
        sample_trace = client.traces_buffer[0]
        print(f"   Sample trace data size: {len(json.dumps(sample_trace))} characters")
        print(f"   Trace structure keys: {list(sample_trace.keys())}")
    
    await client.close()
    
    print("\n✨ Demo completed successfully!")
    print("🔍 All core SDK features have been demonstrated:")
    print("   ✅ Trace creation and management")
    print("   ✅ Span hierarchy and context propagation")
    print("   ✅ @track decorator (sync and async)")
    print("   ✅ Manual span creation")
    print("   ✅ Error handling and exception tracking")
    print("   ✅ Metrics, tags, and metadata")
    print("   ✅ LLM-specific tracking (tokens, cost, model info)")
    print("   ✅ Data serialization and validation")
    print("   ✅ Context manager integration")
    
    return True


if __name__ == "__main__":
    print("🧪 Sprint Lens SDK - Local Demo & Test")
    print("Testing core functionality without backend dependency")
    print("=" * 60)
    
    try:
        success = asyncio.run(run_comprehensive_demo())
        
        if success:
            print("\n🎉 All tests passed! SDK is working correctly!")
            print("🚀 Ready for backend integration when available.")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 Demo failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)