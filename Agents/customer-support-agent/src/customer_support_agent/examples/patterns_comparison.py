#!/usr/bin/env python3
"""
Sprint Lens Patterns Comparison - All Three Patterns Side by Side

This script demonstrates all three Sprint Lens tracing patterns using
the same customer support scenario so you can see the differences.

🔍 Compare how each pattern organizes the same operations differently!
"""

import time
import asyncio
import logging
from typing import Dict, Any, List
import sprintlens

# Configure logging for clear output
logging.basicConfig(level=logging.INFO)

# Configure Sprint Lens before using any decorators
sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="OpikAdmin2024!",
    workspace_id="default",
    project_name="project-1758599350381"
)

print("🔧 Sprint Lens SDK configured successfully")
print("📊 Sprint Lens Patterns Comparison")
print("=" * 60)

# Shared helper functions used across all patterns
def simulate_customer_lookup(customer_id: str) -> Dict[str, Any]:
    """Simulate customer data lookup."""
    time.sleep(0.1)
    return {
        "id": customer_id,
        "name": "Sarah Connor",
        "tier": "premium",
        "status": "active"
    }

def simulate_query_processing(query: str) -> str:
    """Simulate query processing logic."""
    time.sleep(0.15)
    if "billing" in query.lower():
        return "Billing support response generated"
    elif "technical" in query.lower():
        return "Technical support response generated"
    else:
        return "General support response generated"

# ===============================================================================
# PATTERN 1: AUTOMATIC FUNCTION TRACING
# Each function creates its own separate trace
# ===============================================================================

@sprintlens.track(tags={"pattern": "1", "component": "lookup"}, auto_flush=True)
def pattern1_lookup_customer(customer_id: str) -> Dict[str, Any]:
    """Pattern 1: Each decorated function creates its own trace."""
    return simulate_customer_lookup(customer_id)

@sprintlens.track(tags={"pattern": "1", "component": "processing"}, auto_flush=True)
def pattern1_process_query(query: str) -> str:
    """Pattern 1: Independent trace for query processing."""
    return simulate_query_processing(query)

@sprintlens.track(tags={"pattern": "1", "component": "formatting"}, auto_flush=True)
def pattern1_format_response(customer_data: Dict[str, Any], processed_query: str) -> Dict[str, Any]:
    """Pattern 1: Independent trace for response formatting."""
    time.sleep(0.05)
    return {
        "greeting": f"Hello {customer_data['name']}",
        "response": processed_query,
        "tier_benefits": "Premium support included" if customer_data.get("tier") == "premium" else None
    }

def run_pattern1_example(customer_id: str, query: str):
    """Run Pattern 1 example - creates 3 separate traces."""
    print("\n📝 PATTERN 1: Automatic Function Tracing")
    print("   Creates separate traces for each function call")
    
    # Each function call creates its own trace
    customer = pattern1_lookup_customer(customer_id)
    processed = pattern1_process_query(query)
    response = pattern1_format_response(customer, processed)
    
    print(f"   ✅ Result: {response['greeting']} - {response['response']}")
    print("   📊 Dashboard: 3 separate traces created")

# ===============================================================================
# PATTERN 2: MANUAL TRACE MANAGEMENT
# One trace with manually created spans
# ===============================================================================

async def run_pattern2_example(customer_id: str, query: str):
    """Run Pattern 2 example - creates 1 trace with 3 manual spans."""
    print("\n🎯 PATTERN 2: Manual Trace Management")
    print("   Creates ONE trace with manually organized spans")
    
    client = sprintlens.get_client()
    
    # Create one trace for the entire workflow
    trace = sprintlens.Trace(
        name="pattern2_customer_support_workflow",
        client=client,
        tags={"pattern": "2", "workflow": "customer_support"},
        metadata={"customer_id": customer_id}
    )
    
    async with trace:
        # Manual span 1: Customer lookup
        with trace.span("customer_lookup") as span1:
            span1.set_input({"customer_id": customer_id})
            customer = simulate_customer_lookup(customer_id)
            span1.set_output(customer)
        
        # Manual span 2: Query processing
        with trace.span("query_processing") as span2:
            span2.set_input({"query": query})
            processed = simulate_query_processing(query)
            span2.set_output({"processed_response": processed})
        
        # Manual span 3: Response formatting
        with trace.span("response_formatting") as span3:
            span3.set_input({"customer": customer, "processed": processed})
            response = {
                "greeting": f"Hello {customer['name']}",
                "response": processed,
                "tier_benefits": "Premium support included" if customer.get("tier") == "premium" else None
            }
            span3.set_output(response)
        
        # Set overall trace output
        trace.set_output({
            "workflow_completed": True,
            "customer_name": customer["name"],
            "final_response": response["response"]
        })
        
        print(f"   ✅ Result: {response['greeting']} - {response['response']}")
        print("   📊 Dashboard: 1 trace with 3 organized spans")

# ===============================================================================
# PATTERN 3: CONTEXT PROPAGATION
# One trace with automatic child spans from decorated functions
# ===============================================================================

@sprintlens.track(tags={"pattern": "3", "component": "lookup"})
def pattern3_lookup_customer(customer_id: str) -> Dict[str, Any]:
    """Pattern 3: Becomes child span of current trace context."""
    return simulate_customer_lookup(customer_id)

@sprintlens.track(tags={"pattern": "3", "component": "processing"})
def pattern3_process_query(query: str) -> str:
    """Pattern 3: Becomes child span of current trace context."""
    return simulate_query_processing(query)

@sprintlens.track(tags={"pattern": "3", "component": "formatting"})
def pattern3_format_response(customer_data: Dict[str, Any], processed_query: str) -> Dict[str, Any]:
    """Pattern 3: Becomes child span of current trace context."""
    time.sleep(0.05)
    return {
        "greeting": f"Hello {customer_data['name']}",
        "response": processed_query,
        "tier_benefits": "Premium support included" if customer_data.get("tier") == "premium" else None
    }

async def run_pattern3_example(customer_id: str, query: str):
    """Run Pattern 3 example - creates 1 trace with 3 automatic child spans."""
    print("\n🔗 PATTERN 3: Context Propagation")
    print("   Creates ONE trace with automatic child spans from @track() functions")
    
    client = sprintlens.get_client()
    
    # Create parent trace - @track() functions become children automatically
    trace = sprintlens.Trace(
        name="pattern3_customer_support_workflow",
        client=client,
        tags={"pattern": "3", "workflow": "customer_support"},
        metadata={"customer_id": customer_id}
    )
    
    async with trace:
        # These decorated functions automatically become child spans
        customer = pattern3_lookup_customer(customer_id)
        processed = pattern3_process_query(query)
        response = pattern3_format_response(customer, processed)
        
        # Set overall trace output
        trace.set_output({
            "workflow_completed": True,
            "customer_name": customer["name"],
            "final_response": response["response"]
        })
        
        print(f"   ✅ Result: {response['greeting']} - {response['response']}")
        print("   📊 Dashboard: 1 trace with 3 automatic child spans")

# ===============================================================================
# COMPARISON TEST RUNNER
# ===============================================================================

async def run_all_patterns_comparison():
    """Run all three patterns with the same scenario for comparison."""
    customer_id = "CUST999"
    query = "I have a technical issue with my billing dashboard"
    
    print(f"🔍 Testing Scenario:")
    print(f"   Customer: {customer_id}")
    print(f"   Query: {query}")
    print(f"   Goal: Compare how each pattern organizes the same workflow")
    
    # Pattern 1: Automatic (3 separate traces)
    run_pattern1_example(customer_id, query)
    
    # Pattern 2: Manual (1 trace, 3 manual spans)
    await run_pattern2_example(customer_id, query)
    
    # Pattern 3: Context (1 trace, 3 automatic spans)
    await run_pattern3_example(customer_id, query)
    
    print("\n" + "=" * 60)
    print("📊 COMPARISON SUMMARY")
    print("=" * 60)
    
    comparison_table = """
┌─────────────┬──────────────────┬─────────────────┬──────────────────┐
│  Pattern    │    Traces        │     Spans       │   Organization   │
├─────────────┼──────────────────┼─────────────────┼──────────────────┤
│ Pattern 1   │  3 separate      │  N/A (each      │  Independent     │
│ @track()    │  traces          │  is own trace)  │  function calls  │
├─────────────┼──────────────────┼─────────────────┼──────────────────┤
│ Pattern 2   │  1 main trace    │  3 manual       │  Precise         │
│ Manual      │                  │  spans          │  control         │
├─────────────┼──────────────────┼─────────────────┼──────────────────┤
│ Pattern 3   │  1 main trace    │  3 automatic    │  Best of both    │
│ Context     │                  │  child spans    │  worlds          │
└─────────────┴──────────────────┴─────────────────┴──────────────────┘
"""
    print(comparison_table)
    
    print("\n💡 When to use each pattern:")
    print("   📝 Pattern 1: Quick function monitoring, independent operations")
    print("   🎯 Pattern 2: Complex workflows, precise control needed")
    print("   🔗 Pattern 3: Production workflows, reusable functions")
    
    print("\n🌐 View results in Sprint Lens Dashboard:")
    print("   📊 All traces: http://localhost:3001/traces")
    print("   📁 Project: http://localhost:3001/projects/project-1758599350381")
    print("   🔍 Filter by pattern: pattern=1, pattern=2, or pattern=3")

if __name__ == "__main__":
    print("🚀 Starting Sprint Lens Patterns Comparison")
    print("   This will demonstrate all 3 patterns using the same scenario")
    print("   so you can see exactly how each pattern organizes traces differently!")
    
    asyncio.run(run_all_patterns_comparison())
    
    print("\n🎉 Comparison complete!")
    print("   Check your dashboard to see the different trace organizations.")
    print("   Each pattern solves the same problem in a different way.")