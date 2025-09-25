#!/usr/bin/env python3
"""
Interactive script to test Sprint Lens SDK functionality.
"""

import asyncio
import time
from typing import Dict, Any
import sprintlens
from customer_support_agent.config.sprintlens_config import health_check

async def test_basic_functionality():
    """Test basic SDK functionality interactively."""
    
    print("🧪 Testing Sprint Lens SDK Functionality\n")
    
    # 1. Health Check
    print("1. Testing connection health...")
    health = health_check()
    print(f"   Status: {health['status']}")
    if health['status'] == 'unhealthy':
        print(f"   Error: {health.get('error', 'Unknown')}")
        return False
    print("   ✅ Connection healthy\n")
    
    # 2. Simple Traced Function
    print("2. Testing simple traced function...")
    
    @sprintlens.track()
    def greet(name: str) -> str:
        """Simple greeting function."""
        time.sleep(0.1)  # Simulate processing
        return f"Hello, {name}!"
    
    result = greet("Agent Developer")
    print(f"   Result: {result}")
    print("   ✅ Function traced successfully\n")
    
    # 3. Async Traced Function
    print("3. Testing async traced function...")
    
    @sprintlens.track()
    async def async_process(data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate async processing."""
        await asyncio.sleep(0.2)
        return {
            "processed": True,
            "input_keys": list(data.keys()),
            "timestamp": time.time()
        }
    
    async_result = await async_process({"test": "data", "type": "async"})
    print(f"   Result: {async_result}")
    print("   ✅ Async function traced successfully\n")
    
    # 4. Manual Trace Management
    print("4. Testing manual trace management...")
    
    # Get the configured client
    client = sprintlens.get_client()
    
    # Create a trace manually using Trace constructor
    from sprintlens.tracing.trace import Trace
    trace = Trace(
        name="manual_test_trace",
        client=client,
        input_data={"test_type": "manual", "purpose": "SDK verification"},
        metadata={"version": "1.0", "environment": "development"}
    )
    
    # Use trace as context manager and add spans
    async with trace:
        with trace.span(name="preparation") as prep_span:
            prep_span.set_input({"task": "preparation"})
            time.sleep(0.05)
            prep_span.set_output({"status": "prepared"})
            prep_span.set_metadata("step", "1")
        
        with trace.span(name="processing") as proc_span:
            proc_span.set_input({"task": "processing"})
            time.sleep(0.1)
            proc_span.set_output({"status": "processed", "items": 5})
            proc_span.set_metadata("step", "2")
        
        with trace.span(name="finalization") as final_span:
            final_span.set_input({"task": "finalization"})
            time.sleep(0.05)
            final_span.set_output({"status": "finalized"})
            final_span.set_metadata("step", "3")
        
        # Set final trace output
        trace.set_output({"completed": True, "total_time": 0.2})
    print("   ✅ Manual trace created successfully\n")
    
    # 5. Error Handling
    print("5. Testing error handling...")
    
    @sprintlens.track()
    def function_with_error(should_fail: bool = False):
        """Function that may fail."""
        if should_fail:
            raise ValueError("Intentional test error")
        return "Success!"
    
    # Test success case
    success_result = function_with_error(False)
    print(f"   Success case: {success_result}")
    
    # Test error case
    try:
        function_with_error(True)
    except ValueError as e:
        print(f"   Error case handled: {e}")
    
    print("   ✅ Error handling tested successfully\n")
    
    print("🎉 All SDK tests completed successfully!")
    print("\n📊 Check your Agent Lens dashboard for the traces!")
    
    return True

def main():
    """Run interactive SDK tests."""
    print("🚀 Sprint Lens SDK Interactive Test\n")
    
    try:
        # Run async tests
        result = asyncio.run(test_basic_functionality())
        
        if result:
            print("\n✅ SDK is working correctly!")
            print("🔗 View traces in Agent Lens dashboard:")
            print("   http://localhost:3000/projects/your-project-id/traces")
        else:
            print("\n❌ SDK tests failed. Check configuration.")
            
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")

if __name__ == "__main__":
    main()