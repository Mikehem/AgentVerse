#!/usr/bin/env python3
"""
Sprint Lens Pattern 2: Manual Trace Management

🎯 What it does: Gives you full control over trace creation and span organization
📍 When to use: When you need to group multiple operations into one logical workflow
✨ What you get: Custom trace names, grouped spans, detailed step-by-step tracking

This pattern creates ONE trace that contains multiple spans (steps).
You have complete control over trace structure and organization.
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
print("✅ Pattern 2: Manual Trace Management")
print("=" * 50)

# Helper functions (not decorated - we'll call them from within spans)
def validate_customer(customer_id: str) -> Dict[str, Any]:
    """Validate customer ID and return customer data."""
    time.sleep(0.1)  # Simulate database lookup
    
    if customer_id.startswith("CUST"):
        return {
            "id": customer_id,
            "name": "John Doe",
            "tier": "premium",
            "status": "active",
            "validation": "success"
        }
    else:
        return {
            "id": customer_id,
            "validation": "failed",
            "error": "Invalid customer ID format"
        }

def process_query(query: str) -> str:
    """Process customer query using business logic."""
    time.sleep(0.2)  # Simulate processing
    
    if "billing" in query.lower():
        return "Billing query processed: Connect to billing department"
    elif "technical" in query.lower():
        return "Technical query processed: Escalate to technical support"
    elif "account" in query.lower():
        return "Account query processed: Provide account management options"
    else:
        return "General query processed: Provide standard assistance"

def format_response(customer_data: Dict[str, Any], processed_query: str) -> Dict[str, Any]:
    """Format final response based on customer data and processed query."""
    time.sleep(0.05)  # Simulate formatting
    
    tier = customer_data.get("tier", "standard")
    customer_name = customer_data.get("name", "Customer")
    
    response = {
        "greeting": f"Hello {customer_name}",
        "message": processed_query,
        "priority": "high" if tier == "premium" else "normal",
        "estimated_response_time": "5 minutes" if tier == "premium" else "15 minutes"
    }
    
    return response

# Pattern 2 Example: Manual trace with multiple spans
async def handle_customer_interaction_manual(customer_id: str, query: str) -> Dict[str, Any]:
    """
    Handle complete customer interaction using manual trace management.
    
    This creates ONE trace with multiple spans for each step.
    Perfect for tracking complex workflows step-by-step.
    """
    # Get the Sprint Lens client
    client = sprintlens.get_client()
    
    # Create a manual trace for the entire interaction
    trace = sprintlens.Trace(
        name="customer_interaction_workflow",
        client=client,
        tags={
            "agent_id": "agent_simpleag_mfw0ut5k",
            "pattern": "2",
            "workflow": "customer_support",
            "customer_id": customer_id
        },
        metadata={
            "interaction_type": "support_request",
            "channel": "web_chat",
            "timestamp": time.time()
        }
    )
    
    try:
        # Use the trace as an async context manager
        async with trace:
            interaction_result = {}
            
            # Span 1: Customer Validation
            with trace.span(name="validate_customer") as validation_span:
                validation_span.set_input({"customer_id": customer_id})
                validation_span.set_metadata("step", "1")
                validation_span.set_metadata("description", "Validating customer credentials")
                
                customer_data = validate_customer(customer_id)
                
                validation_span.set_output(customer_data)
                validation_span.set_metadata("validation_result", customer_data.get("validation"))
                
                interaction_result["customer"] = customer_data
            
            # Span 2: Query Processing
            with trace.span(name="process_query") as processing_span:
                processing_span.set_input({
                    "query": query,
                    "customer_tier": customer_data.get("tier"),
                    "query_length": len(query)
                })
                processing_span.set_metadata("step", "2")
                processing_span.set_metadata("description", "Processing customer query")
                
                processed_result = process_query(query)
                
                processing_span.set_output({
                    "processed_query": processed_result,
                    "processing_method": "rule_based"
                })
                
                interaction_result["processing"] = processed_result
            
            # Span 3: Response Formatting
            with trace.span(name="format_response") as formatting_span:
                formatting_span.set_input({
                    "customer_data": customer_data,
                    "processed_query": processed_result
                })
                formatting_span.set_metadata("step", "3")
                formatting_span.set_metadata("description", "Formatting final response")
                
                final_response = format_response(customer_data, processed_result)
                
                formatting_span.set_output(final_response)
                
                interaction_result["response"] = final_response
            
            # Set overall trace output
            trace.set_output({
                "interaction_id": f"INT_{int(time.time())}",
                "customer_id": customer_id,
                "status": "completed",
                "total_spans": 3,
                "final_response": final_response
            })
            
            return {
                "interaction_id": f"INT_{int(time.time())}",
                "status": "success",
                "response": final_response,
                "customer": customer_data
            }
            
    except Exception as e:
        # Set error on trace if something goes wrong
        trace.set_error(e)
        print(f"❌ Error in customer interaction: {e}")
        raise

# Pattern 2 Advanced Example: Nested spans
async def complex_support_workflow(customer_id: str, issue_description: str) -> Dict[str, Any]:
    """
    Advanced workflow with nested spans showing hierarchical organization.
    """
    client = sprintlens.get_client()
    
    trace = sprintlens.Trace(
        name="complex_support_workflow",
        client=client,
        tags={
            "agent_id": "agent_simpleag_mfw0ut5k",
            "pattern": "2_advanced",
            "workflow_type": "complex_support"
        }
    )
    
    async with trace:
        # Main workflow span
        with trace.span(name="issue_resolution_workflow") as main_span:
            main_span.set_input({
                "customer_id": customer_id,
                "issue": issue_description
            })
            
            # Nested span for data gathering
            with trace.span(name="data_gathering", parent=main_span) as data_span:
                data_span.set_metadata("phase", "information_collection")
                
                # Simulate multiple data sources
                customer_data = validate_customer(customer_id)
                data_span.set_output({"customer_data": customer_data})
            
            # Nested span for analysis
            with trace.span(name="issue_analysis", parent=main_span) as analysis_span:
                analysis_span.set_input({
                    "issue": issue_description,
                    "customer_tier": customer_data.get("tier")
                })
                
                # Simulate AI analysis
                time.sleep(0.3)
                analysis_result = {
                    "category": "technical",
                    "severity": "medium",
                    "estimated_time": "30 minutes",
                    "requires_escalation": customer_data.get("tier") == "premium"
                }
                
                analysis_span.set_output(analysis_result)
            
            # Nested span for resolution
            with trace.span(name="issue_resolution", parent=main_span) as resolution_span:
                resolution_span.set_input(analysis_result)
                
                resolution = {
                    "solution": "Technical documentation provided",
                    "follow_up_required": True,
                    "satisfaction_survey_sent": True
                }
                
                resolution_span.set_output(resolution)
            
            main_span.set_output({
                "workflow_status": "completed",
                "total_time": "35 minutes",
                "customer_satisfaction": "pending"
            })
        
        return {
            "status": "resolved",
            "resolution": resolution,
            "analysis": analysis_result
        }

if __name__ == "__main__":
    print("🚀 Testing Pattern 2: Manual Trace Management")
    print("=" * 50)
    
    # Test 1: Basic manual workflow
    print("📍 Test 1: Customer interaction workflow...")
    
    async def test_basic_workflow():
        result = await handle_customer_interaction_manual("CUST123", "I need help with my billing")
        return result
    
    result1 = asyncio.run(test_basic_workflow())
    print(f"✅ Interaction completed: {result1['interaction_id']}")
    print(f"   Customer: {result1['customer']['name']} ({result1['customer']['tier']})")
    print(f"   Response: {result1['response']['message']}")
    print()
    
    # Test 2: Complex nested workflow
    print("📍 Test 2: Complex support workflow with nested spans...")
    
    async def test_complex_workflow():
        result = await complex_support_workflow("CUST456", "My premium features are not working")
        return result
    
    result2 = asyncio.run(test_complex_workflow())
    print(f"✅ Complex workflow: {result2['status']}")
    print(f"   Analysis: {result2['analysis']['category']} - {result2['analysis']['severity']}")
    print(f"   Resolution: {result2['resolution']['solution']}")
    print()
    
    # Pattern 2 Results Summary
    print("🎉 Pattern 2 Complete!")
    print("=" * 50)
    print("📊 What you'll see in the dashboard:")
    print("   • 2 main traces (one for each workflow)")
    print("   • Each trace contains multiple organized spans")
    print("   • Clear step-by-step progression")
    print("   • Hierarchical organization with nested spans")
    print("   • Rich metadata and custom tags")
    print()
    print("🌐 View your traces:")
    print("   📊 All traces: http://localhost:3001/traces")
    print("   📁 Project: http://localhost:3001/projects/project-1758599350381")
    print("   🔍 Filter by: agent_id = agent_simpleag_mfw0ut5k")
    print()
    print("💡 Pattern 2 is perfect for:")
    print("   • Complex multi-step workflows")
    print("   • Business process monitoring")
    print("   • Detailed step-by-step analysis")
    print("   • When you need precise control over trace structure")
    print("   • Workflows where steps depend on each other")