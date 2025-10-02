#!/usr/bin/env python3
"""
Sprint Lens Pattern 1: Automatic Function Tracing

🎯 What it does: Automatically tracks function execution with minimal setup
📍 When to use: Perfect for getting started - just add @sprintlens.track() above any function
✨ What you get: Automatic timing, input/output capture, error tracking

This pattern creates separate traces for each decorated function call.
Each function becomes its own independent trace in the dashboard.
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
    url="http://localhost:3000",
    username="admin",
    password="MasterAdmin2024!",
    workspace_id="default",
    project_name="project-1758599350381"
)

print("🔧 Sprint Lens SDK configured successfully")
print("✅ Pattern 1: Automatic Function Tracing")
print("=" * 50)

# Pattern 1 Example: Simple automatic function tracing
@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k", "pattern": "1"}, auto_flush=True)
def process_customer_query(query: str) -> str:
    """Process a customer query and return a response.
    
    This function is automatically traced with @sprintlens.track().
    Every call creates a separate trace in the dashboard.
    """
    # Simulate processing time
    time.sleep(0.1)
    
    # Simple response logic
    if "account" in query.lower():
        return "I can help you with your account. Please provide your account number."
    elif "billing" in query.lower():
        return "For billing questions, I'll transfer you to our billing department."
    elif "technical" in query.lower():
        return "Let me connect you with our technical support team."
    else:
        return "Thank you for your query. Let me find the best way to help you."

@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k", "pattern": "1"}, auto_flush=True)
async def async_sentiment_analysis(text: str) -> Dict[str, Any]:
    """Analyze sentiment of customer text asynchronously.
    
    This async function is also automatically traced.
    """
    # Simulate async API call
    await asyncio.sleep(0.2)
    
    # Simple sentiment analysis
    positive_words = ["good", "great", "excellent", "happy", "satisfied", "love"]
    negative_words = ["bad", "terrible", "awful", "angry", "frustrated", "hate"]
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "positive"
    elif negative_count > positive_count:
        sentiment = "negative"
    else:
        sentiment = "neutral"
    
    return {
        "sentiment": sentiment,
        "confidence": abs(positive_count - negative_count) / max(len(text.split()), 1),
        "positive_signals": positive_count,
        "negative_signals": negative_count
    }

@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k", "pattern": "1"}, auto_flush=True)
def analyze_customer_priority(customer_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze customer priority for support routing.
    
    This function shows how complex objects are automatically captured.
    """
    # Extract key information
    tier = customer_data.get("tier", "standard")
    history = customer_data.get("support_history", [])
    preferences = customer_data.get("preferences", {})
    
    # Simulate analysis
    time.sleep(0.05)
    
    # Calculate support priority
    priority_score = 0
    if tier == "premium":
        priority_score += 10
    elif tier == "gold":
        priority_score += 5
    
    # Consider history
    recent_issues = len([issue for issue in history if issue.get("recent", False)])
    priority_score += recent_issues * 2
    
    # Determine priority level
    if priority_score >= 15:
        priority = "high"
    elif priority_score >= 8:
        priority = "medium"
    else:
        priority = "low"
    
    return {
        "priority": priority,
        "priority_score": priority_score,
        "tier": tier,
        "recent_issues": recent_issues,
        "recommended_agent": "senior" if priority == "high" else "standard",
        "estimated_resolution_time": "15 min" if priority == "high" else "30 min"
    }

if __name__ == "__main__":
    print("🚀 Testing Pattern 1: Automatic Function Tracing")
    print("=" * 50)
    
    # Test 1: Simple synchronous function
    print("📍 Test 1: Processing customer query...")
    result1 = process_customer_query("I have a billing question")
    print(f"✅ Query Result: {result1}")
    print(f"🏷️  Tagged with agent_id: agent_simpleag_mfw0ut5k")
    print()
    
    # Test 2: Asynchronous function
    print("📍 Test 2: Analyzing sentiment...")
    result2 = asyncio.run(async_sentiment_analysis("This service is excellent!"))
    print(f"✅ Sentiment: {result2}")
    print()
    
    # Test 3: Complex function with structured data
    print("📍 Test 3: Analyzing customer priority...")
    customer_data = {
        "tier": "premium",
        "support_history": [
            {"recent": True, "issue": "billing"},
            {"recent": True, "issue": "technical"}
        ],
        "preferences": {"channel": "email", "language": "en"}
    }
    result3 = analyze_customer_priority(customer_data)
    print(f"✅ Priority Analysis: {result3}")
    print()
    
    # Pattern 1 Results Summary
    print("🎉 Pattern 1 Complete!")
    print("=" * 50)
    print("📊 What you'll see in the dashboard:")
    print("   • 3 separate traces (one for each function call)")
    print("   • Each trace captures inputs, outputs, and timing")
    print("   • All traces tagged with agent_id for filtering")
    print("   • Automatic error capture if exceptions occur")
    print()
    print("🌐 View your traces:")
    print("   📊 All traces: http://localhost:3001/traces")
    print("   📁 Project: http://localhost:3001/projects/project-1758599350381")
    print("   🔍 Filter by: agent_id = agent_simpleag_mfw0ut5k")
    print()
    print("💡 Pattern 1 is perfect for:")
    print("   • Quick function monitoring")
    print("   • Individual operation analysis")
    print("   • Getting started with observability")
    print("   • Functions that work independently")