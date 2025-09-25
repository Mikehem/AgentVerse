#!/usr/bin/env python3
"""
Sprint Lens Pattern 3: Context Propagation

🎯 What it does: Automatically groups multiple traced functions under one parent trace
📍 When to use: When you want automatic tracing (Pattern 1) but grouped under one workflow
✨ What you get: Best of both worlds - automatic tracing + logical grouping

This pattern sets a "current trace" and all @track() functions become child spans of that trace.
You get the convenience of decorators with the organization of manual traces.
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
print("✅ Pattern 3: Context Propagation")
print("=" * 50)

# Pattern 3: Decorated functions that will become child spans
@sprintlens.track(tags={"component": "data_access", "pattern": "3"})
def get_customer_data(customer_id: str) -> Dict[str, Any]:
    """
    Fetch customer data from database.
    
    When used in Pattern 3, this automatically becomes a child span
    of whatever trace is currently active via context propagation.
    """
    time.sleep(0.1)  # Simulate database query
    
    return {
        "id": customer_id,
        "name": "Alice Johnson",
        "tier": "premium",
        "preferences": {
            "language": "en",
            "channel": "email",
            "notifications": True
        },
        "support_history": [
            {"date": "2024-01-15", "issue": "billing", "resolved": True},
            {"date": "2024-02-01", "issue": "technical", "resolved": True}
        ]
    }

@sprintlens.track(tags={"component": "ai_analysis", "pattern": "3"})
def analyze_query_intent(query: str) -> Dict[str, Any]:
    """
    Analyze customer query to determine intent and urgency.
    
    This function automatically becomes a child span when a trace context is active.
    """
    time.sleep(0.15)  # Simulate AI processing
    
    # Simple intent detection
    intent_keywords = {
        "billing": ["bill", "charge", "payment", "invoice", "cost"],
        "technical": ["error", "bug", "not working", "broken", "problem"],
        "account": ["password", "login", "access", "account", "profile"],
        "cancellation": ["cancel", "stop", "end", "terminate", "quit"]
    }
    
    detected_intent = "general"
    urgency = "low"
    
    query_lower = query.lower()
    for intent, keywords in intent_keywords.items():
        if any(keyword in query_lower for keyword in keywords):
            detected_intent = intent
            break
    
    # Determine urgency based on keywords
    urgent_indicators = ["urgent", "emergency", "asap", "immediately", "critical"]
    if any(indicator in query_lower for indicator in urgent_indicators):
        urgency = "high"
    elif detected_intent in ["billing", "technical"]:
        urgency = "medium"
    
    return {
        "intent": detected_intent,
        "urgency": urgency,
        "confidence": 0.85,
        "keywords_found": [kw for kw in intent_keywords.get(detected_intent, []) if kw in query_lower]
    }

@sprintlens.track(tags={"component": "response_generation", "pattern": "3"})
def generate_personalized_response(customer_data: Dict[str, Any], query_analysis: Dict[str, Any], original_query: str) -> Dict[str, Any]:
    """
    Generate a personalized response based on customer data and query analysis.
    
    This function becomes a child span and shows how data flows through the workflow.
    """
    time.sleep(0.2)  # Simulate AI response generation
    
    customer_name = customer_data.get("name", "Customer")
    tier = customer_data.get("tier", "standard")
    intent = query_analysis.get("intent", "general")
    urgency = query_analysis.get("urgency", "low")
    
    # Generate response based on intent and customer tier
    responses = {
        "billing": f"Hello {customer_name}, I understand you have a billing question. As a {tier} customer, I'll prioritize your request.",
        "technical": f"Hi {customer_name}, I see you're experiencing a technical issue. Let me connect you with our technical team.",
        "account": f"Hello {customer_name}, I'm here to help with your account. What specific account issue can I assist you with?",
        "cancellation": f"Hi {customer_name}, I understand you're considering cancellation. Let me see how we can help address your concerns.",
        "general": f"Hello {customer_name}, thank you for contacting us. How can I assist you today?"
    }
    
    base_response = responses.get(intent, responses["general"])
    
    # Add urgency handling
    if urgency == "high":
        base_response += " I've marked this as urgent and will expedite your request."
    
    return {
        "response": base_response,
        "intent": intent,
        "urgency": urgency,
        "personalization_applied": True,
        "customer_tier": tier,
        "estimated_resolution": "15 minutes" if tier == "premium" else "30 minutes"
    }

@sprintlens.track(tags={"component": "routing", "pattern": "3"})
def route_to_agent(customer_data: Dict[str, Any], query_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Route customer to appropriate agent based on analysis.
    
    This final step in our workflow determines the best agent for the customer.
    """
    time.sleep(0.05)  # Simulate routing logic
    
    tier = customer_data.get("tier", "standard")
    intent = query_analysis.get("intent", "general")
    urgency = query_analysis.get("urgency", "low")
    
    # Routing logic
    if urgency == "high" or tier == "premium":
        agent_type = "senior"
        queue = "priority"
    elif intent in ["technical", "billing"]:
        agent_type = "specialist"
        queue = "specialized"
    else:
        agent_type = "general"
        queue = "standard"
    
    return {
        "assigned_agent_type": agent_type,
        "queue": queue,
        "priority": urgency,
        "estimated_wait_time": "0-5 minutes" if queue == "priority" else "5-15 minutes"
    }

# Pattern 3 Main Function: Context propagation in action
async def complete_customer_support_flow(customer_id: str, query: str) -> Dict[str, Any]:
    """
    Complete customer support flow using context propagation.
    
    This creates ONE parent trace, and all the @track() decorated functions
    automatically become child spans within this trace.
    """
    # Get the Sprint Lens client
    client = sprintlens.get_client()
    
    # Create the parent trace
    trace = sprintlens.Trace(
        name="complete_support_flow",
        client=client,
        tags={
            "agent_id": "agent_simpleag_mfw0ut5k",
            "pattern": "3",
            "workflow": "end_to_end_support",
            "customer_id": customer_id
        },
        metadata={
            "flow_type": "automated_support",
            "entry_point": "web_chat",
            "session_id": f"sess_{int(time.time())}"
        }
    )
    
    try:
        # Set this trace as the current context
        # All @track() decorated functions will now become child spans
        async with trace:
            print(f"   🔗 Setting trace context for customer {customer_id}")
            
            # Step 1: Get customer data (becomes child span automatically)
            print("   📊 Fetching customer data...")
            customer_data = get_customer_data(customer_id)
            
            # Step 2: Analyze query intent (becomes child span automatically)
            print("   🤖 Analyzing query intent...")
            query_analysis = analyze_query_intent(query)
            
            # Step 3: Generate personalized response (becomes child span automatically)
            print("   ✍️  Generating personalized response...")
            response_data = generate_personalized_response(customer_data, query_analysis, query)
            
            # Step 4: Route to appropriate agent (becomes child span automatically)
            print("   🎯 Routing to appropriate agent...")
            routing_data = route_to_agent(customer_data, query_analysis)
            
            # Compile final result
            final_result = {
                "customer": customer_data,
                "analysis": query_analysis,
                "response": response_data,
                "routing": routing_data,
                "flow_status": "completed",
                "total_processing_time": f"{time.time():.2f}s"
            }
            
            # Set the overall trace output
            trace.set_output({
                "flow_completed": True,
                "customer_tier": customer_data.get("tier"),
                "detected_intent": query_analysis.get("intent"),
                "assigned_queue": routing_data.get("queue"),
                "success": True
            })
            
            return final_result
            
    except Exception as e:
        trace.set_error(e)
        print(f"❌ Error in support flow: {e}")
        raise

# Advanced Pattern 3: Multiple workflows with shared functions
async def batch_customer_processing(customer_queries: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Process multiple customers using the same traced functions.
    
    This shows how the same @track() functions can be reused across different workflows
    while maintaining proper trace context for each workflow.
    """
    client = sprintlens.get_client()
    
    trace = sprintlens.Trace(
        name="batch_customer_processing",
        client=client,
        tags={
            "agent_id": "agent_simpleag_mfw0ut5k",
            "pattern": "3_batch",
            "batch_size": len(customer_queries)
        }
    )
    
    results = []
    
    async with trace:
        for i, item in enumerate(customer_queries):
            # Create a sub-span for each customer (manual span within context)
            with trace.span(name=f"process_customer_{i+1}") as customer_span:
                customer_span.set_input(item)
                
                # These @track() functions become children of the customer_span
                customer_data = get_customer_data(item["customer_id"])
                analysis = analyze_query_intent(item["query"])
                response = generate_personalized_response(customer_data, analysis, item["query"])
                
                result = {
                    "customer_id": item["customer_id"],
                    "processed": True,
                    "intent": analysis["intent"],
                    "response": response["response"]
                }
                
                customer_span.set_output(result)
                results.append(result)
        
        trace.set_output({
            "batch_completed": True,
            "total_processed": len(results),
            "success_rate": "100%"
        })
    
    return results

if __name__ == "__main__":
    print("🚀 Testing Pattern 3: Context Propagation")
    print("=" * 50)
    
    # Test 1: Complete support flow with context propagation
    print("📍 Test 1: Complete customer support flow...")
    
    async def test_support_flow():
        result = await complete_customer_support_flow(
            "CUST789", 
            "I have an urgent billing problem that needs immediate attention!"
        )
        return result
    
    result1 = asyncio.run(test_support_flow())
    print(f"✅ Support flow completed for {result1['customer']['name']}")
    print(f"   Intent: {result1['analysis']['intent']} (urgency: {result1['analysis']['urgency']})")
    print(f"   Queue: {result1['routing']['queue']} ({result1['routing']['assigned_agent_type']} agent)")
    print(f"   Response: {result1['response']['response'][:80]}...")
    print()
    
    # Test 2: Batch processing with shared functions
    print("📍 Test 2: Batch processing multiple customers...")
    
    async def test_batch_processing():
        batch_queries = [
            {"customer_id": "CUST001", "query": "My password is not working"},
            {"customer_id": "CUST002", "query": "I want to cancel my subscription"},
            {"customer_id": "CUST003", "query": "Technical error in the app"}
        ]
        result = await batch_customer_processing(batch_queries)
        return result
    
    result2 = asyncio.run(test_batch_processing())
    print(f"✅ Batch processing completed: {len(result2)} customers processed")
    for i, customer in enumerate(result2):
        print(f"   Customer {i+1}: {customer['intent']} query processed")
    print()
    
    # Pattern 3 Results Summary
    print("🎉 Pattern 3 Complete!")
    print("=" * 50)
    print("📊 What you'll see in the dashboard:")
    print("   • 2 main traces (support_flow + batch_processing)")
    print("   • Each main trace contains multiple child spans")
    print("   • Child spans are automatically created from @track() functions")
    print("   • Clear hierarchical organization with automatic grouping")
    print("   • Reusable functions across different workflows")
    print()
    print("🌐 View your traces:")
    print("   📊 All traces: http://localhost:3001/traces")
    print("   📁 Project: http://localhost:3001/projects/project-1758599350381")
    print("   🔍 Filter by: agent_id = agent_simpleag_mfw0ut5k")
    print()
    print("💡 Pattern 3 is perfect for:")
    print("   • Production workflows with multiple steps")
    print("   • Reusable functions across different workflows")
    print("   • Automatic organization without manual span management")
    print("   • When you want decorator simplicity + trace grouping")
    print("   • Complex applications with multiple entry points")